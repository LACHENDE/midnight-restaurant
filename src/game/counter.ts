// the counter: guests, orders, tea, serving, clearing
import { G } from './G';
import { C } from './night-state';
import { CL } from '../data/layout';
import { EATING, kenEat, kenLeave, kenLen, kenOn, kenPay } from '../render/stage';
import { NIGHTS, known } from '../data/content';
import { SFX } from '../audio/sfx';
import { clamp, rnd } from '../core/env';
import { closeNight } from './flow';
import { doorTick, groupOut } from './door';
import { newMod, newWord } from '../ui/overlays';
import { noteAct } from './teach';
import { sparkle } from '../render/particles';
import { toCook } from '../net/messages';
import { comboBreak, comboUp, floatYen, hudPush, patSecs, patTell, payFor, rushTick } from './rush';
import { AGAIN, hidden, orderLine, whyLine } from './tel';

export const NOW_GUEST = () => NIGHTS[C.n - 1].guests;
export function spawnGuest() {
  const N = NIGHTS[C.n - 1];
  if (N.rush) return; // a rush night's guests come from its waves (rush.ts)
  if (C.next >= N.guests.length) return;
  const grp = N.guests[C.next].grp,
    gsz = N.guests.filter(x => grp && x.grp === grp).length || 1;
  do {
    const spec = N.guests[C.next++],
      id = ++G.CID; // on a door night the whole group arrives together
    C.queue.push({
      id,
      who: spec.who,
      o: spec.o.slice(),
      mod: spec.mod || null,
      teach: spec.teach,
      nw: spec.nw || null,
      wait: 0,
      x: CL.queue[C.queue.length % 3].x + 60,
      idx: C.next,
      grp,
      gsz,
    });
  } while (N.door && C.next < N.guests.length && N.guests[C.next].grp === grp);
  SFX.bell();
}
export const seated = s => !!s.g && s.g.st !== 'leave';
export const freeSeat = () => C.seats.findIndex(s => !seated(s) && !s.bowl && !s.coins && !s.dirty);
export function cSeat(gid, si) {
  const qi = C.queue.findIndex(q => q.id === gid),
    s = C.seats[si];
  if (qi < 0 || !s || seated(s) || s.bowl || s.coins || s.dirty) return false;
  if (seated(s)) return false;
  const q = C.queue.splice(qi, 1)[0];
  s.g = {
    id: q.id,
    who: q.who,
    o: q.o,
    mod: q.mod || null,
    teach: q.teach,
    nw: q.nw,
    st: 'walk',
    t: 0,
    pat: 1,
    tea: false,
    sent: false,
    idx: q.idx,
    from: q.x,
    grp: q.grp,
    gsz: q.gsz,
    hurry: !!q.hurry,
    lv: 0,
  };
  s.cup = 0;
  SFX.pop();
  noteAct();
  let nm = null;
  if (q.mod && !C.modSeen[q.mod]) {
    C.modSeen[q.mod] = 1;
    if (!known(q.mod)) nm = q.mod;
  }
  s.g.intro = !!(q.nw || nm); // a new-word card covers the stall for a moment: their order stays up longer
  toCook({ t: 'guest', cid: q.id, teach: q.teach, who: q.who, nw: q.nw, nm, hurry: !!q.hurry });
  if (G.ROLE === 'counter') {
    if (q.nw) newWord(q.nw);
    else if (nm) newMod(nm);
  }
  return true;
}
export function cTake(si) {
  const s = C.seats[si],
    g = s && s.g;
  if (!g || g.st !== 'ask') return false;
  g.st = 'order';
  g.t = 0;
  g.saidAt = G.clock;
  SFX.ding();
  noteAct();
  toCook({ t: 'order', cid: g.id, who: g.who, hurry: !!g.hurry });
  return true;
}
export function cSend(si) {
  const s = C.seats[si],
    g = s && s.g;
  if (!g || (g.st !== 'order' && g.st !== 'refused') || g.sent) return false;
  g.sent = true;
  SFX.slide();
  noteAct();
  toCook({ t: 'ticket', cid: g.id, o: g.o, mod: g.mod, who: g.who, hurry: !!g.hurry });
  return true;
}
/** しばBot at the counter, with a person cooking: it says the order out loud instead of writing it on the ticket */
export function cTell(si) {
  const s = C.seats[si],
    g = s && s.g;
  if (!g || (g.st !== 'order' && g.st !== 'refused') || g.sent) return false;
  g.sent = true;
  toCook({ t: 'tell', cid: g.id, who: g.who, line: orderLine(g.o, g.mod), hurry: !!g.hurry });
  return true;
}
/** もう一度お願いします: the guest says it again, and waits a little less happily */
export function cAgain(si) {
  const s = C.seats[si],
    g = s && s.g;
  if (!g || (g.st !== 'order' && g.st !== 'refused')) return false;
  g.saidAt = G.clock;
  askedAgain(g);
  noteAct();
  return true;
}
function askedAgain(g) {
  g.again = (g.again || 0) + 1;
  C.again++;
  if (!NIGHTS[C.n - 1].gentle) g.pat = Math.max(0.04, g.pat - AGAIN);
  g.annoyT = 0.9;
  SFX.hmm();
}
export function cTea(si, dt) {
  const s = C.seats[si],
    g = s && s.g;
  if (!g || g.st === 'leave' || g.st === 'walk') return false;
  s.cup = Math.min(1.15, s.cup + dt * 0.7);
  if (s.cup >= 0.9 && !g.tea) {
    g.tea = true;
    g.pat = Math.min(1.25, g.pat + 0.25);
    g.happyT = 1.2;
    SFX.happy();
    noteAct();
    if (g.st === 'spicy') {
      g.st = 'eat';
      g.t = g.tsave;
    }
  }
  return true;
}
export function judge(b, o, mod?) {
  if (!b.noodles) return { ok: false, why: 'noodles' };
  if (b.noodles === 'raw') return { ok: false, why: 'raw' };
  if (b.broth < 0.5) return { ok: false, why: 'broth' };
  const miss = o.filter(x => !b.tops.includes(x)),
    extra = b.tops.filter(x => !o.includes(x));
  if (miss.length || extra.length) return { ok: false, why: 'tops', miss, extra };
  // かため: out before the gold; やわらかめ: left in until the orange; スープおおめ: poured until it drips
  if (mod === 'katame' && !(b.nt < 5.5)) return { ok: false, why: 'katame' };
  if (mod === 'yawa' && !(b.nt >= 12)) return { ok: false, why: 'yawa' };
  if (mod === 'oome' && b.broth < 0.98) return { ok: false, why: 'oome' };
  // made just the way they asked counts as カンペキ
  const nq =
    mod === 'katame' || mod === 'yawa' ? 1.25 : b.noodles === 'perfect' ? 1.25 : b.noodles === 'ready' ? 1 : 0.6;
  return { ok: true, q: nq * (mod === 'oome' || (b.broth >= 0.7 && b.broth <= 1.06) ? 1 : 0.8) };
}
/** a line for the end-of-night card: what they asked for, and what reached them */
function logIt(g, b, r) {
  C.log.push({
    who: g.who,
    o: g.o,
    mod: g.mod || null,
    b: b ? { tops: b.tops.slice(), nt: b.nt, noodles: b.noodles, broth: b.broth } : null,
    ok: !!(r && r.ok),
    why: r && !r.ok ? r.why : null,
    gone: !r,
  });
}
export function cServe(pi, si) {
  const b = C.pass[pi],
    s = C.seats[si],
    g = s && s.g;
  if (!b || !g || (g.st !== 'order' && g.st !== 'refused') || s.bowl) return false;
  C.pass.splice(pi, 1);
  const r = judge(b, g.o, g.mod);
  logIt(g, b, r);
  if (r.ok) {
    s.bowl = Object.assign(b, { eat: 0 });
    g.st = 'eat';
    g.t = 0;
    g.q = r.q;
    let pay = 500 + Math.round(r.q * 300) + (g.tea ? 60 : 0);
    if (!NIGHTS[C.n - 1].gentle) {
      comboUp();
      pay = payFor(g, r.q);
      floatYen(s.x, 336, pay);
    }
    g.pay = pay;
    C.served++;
    C.quality += r.q;
    for (const w of g.o) {
      C.words[w] = (C.words[w] || 0) + 1;
    }
    if (g.mod) C.mods[g.mod] = (C.mods[g.mod] || 0) + 1;
    SFX.clink();
    SFX.happy();
    toCook({ t: 'result', cid: g.id, ok: true });
    noteAct();
  } else {
    s.bowl = Object.assign(b, { refused: true });
    g.st = 'refused';
    g.t = 0;
    g.why = r;
    g.saidAt = G.clock; // they say what's wrong (and the counter has to pass it on)
    SFX.hmm();
    if (!NIGHTS[C.n - 1].gentle) comboBreak();
    toCook({ t: 'result', cid: g.id, ok: false, why: r.why });
    noteAct();
  }
  return true;
}
export function cReturn(si) {
  const s = C.seats[si],
    g = s && s.g;
  if (!s || !s.bowl || !s.bowl.refused) return false;
  const b = s.bowl;
  s.bowl = null;
  g.st = 'order';
  SFX.slide();
  toCook({
    t: 'back',
    bowl: { id: b.id, noodles: b.noodles, broth: b.broth, tops: b.tops, nt: b.nt },
    why: g.why,
    o: hidden() ? [] : g.o,
    mod: hidden() ? null : g.mod,
    cid: g.id,
  });
  // しばBot at the counter tells a cook practising alone what was wrong
  if (hidden() && G.MODE === 'bot')
    toCook({ t: 'tell', cid: g.id, who: g.who, line: whyLine(g.why), hurry: !!g.hurry });
  noteAct();
  return true;
}
export function cCollect(si) {
  const s = C.seats[si];
  if (!s || !s.coins) return false;
  C.earned += s.coins;
  s.coins = 0;
  SFX.coins();
  noteAct();
  return true;
}
export function cClear(si) {
  const s = C.seats[si];
  if (!s || !s.bowl || !s.bowl.empty) return false;
  s.bowl = null;
  s.dirty = 1;
  SFX.clink();
  noteAct();
  return true;
}
export function cWipe(si, amt) {
  const s = C.seats[si];
  if (!s || !s.dirty || s.bowl) return false;
  s.dirty = Math.max(0, s.dirty - amt);
  if (!s.dirty) {
    SFX.sparkle();
    sparkle(s.x, 392, 8);
    noteAct();
  }
  return true;
}
export function cRecv(m) {
  if (!C) return;
  // a cook practising alone asked しばBot to say it again: the guest waits a little less happily
  if (m.t === 'repeat') {
    const s = C.seats.find(s => s.g && s.g.id === m.cid);
    if (s && (s.g.st === 'order' || s.g.st === 'refused')) askedAgain(s.g);
    return;
  }
  if (m.t === 'bowl') {
    if (!C.pass.some(b => b.id === m.bowl.id) && !C.seats.some(s => s.bowl && s.bowl.id === m.bowl.id)) {
      C.pass.push(Object.assign({}, m.bowl, { at: G.clock }));
      SFX.ding();
    }
  }
}
export function counterTick(dt) {
  const N = NIGHTS[C.n - 1];
  // guests arrive one at a time on the first night (the next comes when the last one starts eating); later, every so often, never more than two orders open
  const active = C.seats.filter(s => s.g && !EATING.has(s.g.st)).length + C.queue.length;
  if (N.rush) rushTick(dt);
  else if (C.next < N.guests.length) {
    C.spawnT -= dt;
    if (N.door) {
      if (!C.queue.length && !C.door && C.spawnT <= 0) {
        spawnGuest();
        C.spawnT = rnd(7, 11);
      }
    } else if (N.seats === 1) {
      const busy = C.queue.length || C.seats.some(s => s.g && !EATING.has(s.g.st));
      if (!busy && C.spawnT <= 0) {
        spawnGuest();
        C.spawnT = 2.5;
      }
    } else if (C.spawnT <= 0 && C.queue.length < 2 && active < 3) {
      spawnGuest();
      C.spawnT = rnd(14, 20);
    }
  }
  doorTick(dt);
  C.queue.forEach((q, i) => {
    q.wait += dt;
    const tx = CL.queue[i % 3].x;
    q.x += (tx - q.x) * Math.min(1, dt * 3);
    if (!N.gentle && q.wait > (N.rush ? 40 : 75)) {
      q.gone = true;
    }
  });
  // on a rush night someone who gives up in the rain was never seated: a missed guest, not an angry one
  for (const q of C.queue.filter(q => q.gone)) {
    if (N.rush) C.missed = (C.missed || 0) + 1;
    else C.left++;
  }
  C.queue = C.queue.filter(q => !q.gone);
  for (const s of C.seats) {
    const g = s.g;
    if (!g) continue;
    g.t += dt;
    if (g.happyT > 0) g.happyT -= dt;
    if (g.annoyT > 0) g.annoyT -= dt;
    const ken = kenOn(g);
    if (g.st === 'walk' && g.t > (ken ? kenLen('arrive') : 0.6)) {
      g.st = 'look';
      g.t = 0;
    } else if (g.st === 'look' && g.t > (ken ? kenLen('choose') : 1.1)) {
      g.st = 'ask';
      g.t = 0;
      SFX.pop();
    } else if ((g.st === 'ask' || g.st === 'order' || g.st === 'refused') && !N.gentle) {
      g.pat -= dt / patSecs(g);
      patTell(g);
      if (g.pat <= 0) {
        g.st = 'leave';
        g.t = 0;
        g.sad = true;
        C.left++;
        logIt(g, null, null);
        if (s.bowl && s.bowl.refused) s.bowl = null;
        comboBreak();
        toCook({ t: 'gone', cid: g.id });
      }
    }
    if (g.st === 'eat' && ken) {
      const P = kenEat();
      s.bowl.eat = clamp((g.t - P.a) / P.e, 0, 1);
      // too spicy: served on a busy night without tea, Ken stops eating until the counter pours him some (or 12 s pass)
      if (!N.gentle && !g.tea && !g.spiced && g.t > P.a + 0.8) {
        g.spiced = true;
        g.tsave = g.t;
        g.st = 'spicy';
        g.t = 0;
        SFX.hmm();
      } else if (g.t > P.a + P.e + P.y) {
        s.bowl.empty = true;
        s.bowl.eat = 1;
        g.st = 'pay';
        g.t = 0;
        g.wallet = !N.gentle && !N.rush && C.next >= N.guests.length;
      }
    } else if (g.st === 'eat') {
      s.bowl.eat = Math.min(1, g.t / 4.2);
      if (g.t > 4.4) {
        g.st = 'leave';
        g.t = 0;
        s.coins = g.pay;
        s.bowl.empty = true;
        s.bowl.eat = 1;
        C.last = g.who;
        SFX.happy();
        groupOut(g, s);
      }
    }
    if (g.st === 'spicy' && g.t > 12) {
      g.st = 'eat';
      g.t = g.tsave;
    }
    if (g.st === 'pay') {
      const P = kenPay(g);
      if (g.t > P.b + P.w + P.p) {
        g.st = 'leave';
        g.t = 0;
        s.coins = g.pay;
        C.last = g.who;
        SFX.happy();
        groupOut(g, s);
      }
    }
    if (g.st === 'leave' && g.t > (ken ? kenLeave(g) : 1.4)) {
      s.g = null;
    }
  }
  // closing time: everyone served (or gone), and the counter clean
  if (!N.gentle) hudPush();
  if (
    !C.done &&
    (N.rush ? C.over : C.next >= N.guests.length) &&
    !C.queue.length &&
    C.seats.every(s => !seated(s) && !s.bowl && !s.coins && !s.dirty)
  ) {
    C.done = true;
    closeNight();
  }
}
