// the counter: guests, orders, tea, serving, clearing
import { G } from './G';
import { C } from './night-state';
import { CL } from '../data/layout';
import { EATING, kenEat, kenLeave, kenLen, kenOn, kenPay } from '../render/stage';
import { NIGHTS } from '../data/content';
import { SFX } from '../audio/sfx';
import { clamp, rnd } from '../core/env';
import { closeNight } from './flow';
import { doorTick, groupOut } from './door';
import { newWord } from '../ui/overlays';
import { noteAct } from './teach';
import { sparkle } from '../render/particles';
import { toCook } from '../net/messages';

export const NOW_GUEST = () => NIGHTS[C.n - 1].guests;
export function spawnGuest() {
  const N = NIGHTS[C.n - 1];
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
  };
  s.cup = 0;
  SFX.pop();
  noteAct();
  toCook({ t: 'guest', cid: q.id, teach: q.teach, who: q.who, nw: q.nw });
  if (q.nw) newWord(q.nw);
  return true;
}
export function cTake(si) {
  const s = C.seats[si],
    g = s && s.g;
  if (!g || g.st !== 'ask') return false;
  g.st = 'order';
  g.t = 0;
  SFX.ding();
  noteAct();
  toCook({ t: 'order', cid: g.id, who: g.who });
  return true;
}
export function cSend(si) {
  const s = C.seats[si],
    g = s && s.g;
  if (!g || (g.st !== 'order' && g.st !== 'refused') || g.sent) return false;
  g.sent = true;
  SFX.slide();
  noteAct();
  toCook({ t: 'ticket', cid: g.id, o: g.o, who: g.who });
  return true;
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
export function judge(b, o) {
  if (!b.noodles) return { ok: false, why: 'noodles' };
  if (b.noodles === 'raw') return { ok: false, why: 'raw' };
  if (b.broth < 0.5) return { ok: false, why: 'broth' };
  const miss = o.filter(x => !b.tops.includes(x)),
    extra = b.tops.filter(x => !o.includes(x));
  if (miss.length || extra.length) return { ok: false, why: 'tops', miss, extra };
  return { ok: true, q: (b.noodles === 'ready' ? 1 : 0.6) * (b.broth >= 0.7 && b.broth <= 1.06 ? 1 : 0.8) };
}
export function cServe(pi, si) {
  const b = C.pass[pi],
    s = C.seats[si],
    g = s && s.g;
  if (!b || !g || (g.st !== 'order' && g.st !== 'refused') || s.bowl) return false;
  C.pass.splice(pi, 1);
  const r = judge(b, g.o);
  if (r.ok) {
    s.bowl = Object.assign(b, { eat: 0 });
    g.st = 'eat';
    g.t = 0;
    g.q = r.q;
    const pay = 500 + Math.round(r.q * 300) + (g.tea ? 60 : 0);
    g.pay = pay;
    C.served++;
    C.quality += r.q;
    for (const w of g.o) {
      C.words[w] = (C.words[w] || 0) + 1;
    }
    SFX.clink();
    SFX.happy();
    toCook({ t: 'result', cid: g.id, ok: true });
    noteAct();
  } else {
    s.bowl = Object.assign(b, { refused: true });
    g.st = 'refused';
    g.t = 0;
    g.why = r;
    SFX.hmm();
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
    bowl: { id: b.id, noodles: b.noodles, broth: b.broth, tops: b.tops },
    why: g.why,
    o: g.o,
    cid: g.id,
  });
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
  if (C.next < N.guests.length) {
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
    if (!N.gentle && q.wait > 75) {
      q.gone = true;
    }
  });
  for (const q of C.queue.filter(q => q.gone)) {
    C.left++;
  }
  C.queue = C.queue.filter(q => !q.gone);
  for (const s of C.seats) {
    const g = s.g;
    if (!g) continue;
    g.t += dt;
    if (g.happyT > 0) g.happyT -= dt;
    const ken = kenOn(g);
    if (g.st === 'walk' && g.t > (ken ? kenLen('arrive') : 0.6)) {
      g.st = 'look';
      g.t = 0;
    } else if (g.st === 'look' && g.t > (ken ? kenLen('choose') : 1.1)) {
      g.st = 'ask';
      g.t = 0;
      SFX.pop();
    } else if ((g.st === 'ask' || g.st === 'order' || g.st === 'refused') && !N.gentle) {
      g.pat -= dt / 85;
      if (g.pat <= 0) {
        g.st = 'leave';
        g.t = 0;
        g.sad = true;
        C.left++;
        if (s.bowl && s.bowl.refused) s.bowl = null;
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
        g.wallet = !N.gentle && C.next >= N.guests.length;
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
  if (
    !C.done &&
    C.next >= N.guests.length &&
    !C.queue.length &&
    C.seats.every(s => !seated(s) && !s.bowl && !s.coins && !s.dirty)
  ) {
    C.done = true;
    closeNight();
  }
}
