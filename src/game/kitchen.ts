// the kitchen: the cook's station
import { G } from './G';
import { AC, BOIL, SFX, buzz } from '../audio/sfx';
import { cue } from '../audio/music';
import { K, isEmpty, meCook, newBowl, trayOpen } from './night-state';
import { KL } from '../data/layout';
import { PT, drips, sparkle, splash } from '../render/particles';
import { T, rnd } from '../core/env';
import { botHear, toCounter } from '../net/messages';
import { bowlTopAt } from '../render/shapes';
import { newWord, toast } from '../ui/overlays';
import { noteAct } from './teach';

export function doneOf(t) {
  return t < 3.5 ? 'raw' : t < 12 ? 'ready' : t < 16 ? 'soft' : 'soggy';
}
export function kRecv(m) {
  if (!K) return;
  if (m.t === 'order') {
    if (!K.tickets.some(t => t.cid === m.cid)) {
      K.tickets.push({ cid: m.cid, o: null, who: m.who, done: false, at: G.clock });
      SFX.pop();
    }
    return;
  }
  if (m.t === 'ticket') {
    let t = K.tickets.find(t => t.cid === m.cid);
    if (!t) {
      t = { cid: m.cid, o: null, who: m.who, done: false, at: G.clock };
      K.tickets.push(t);
    }
    if (!t.o) {
      t.o = m.o.slice();
      SFX.ding();
    }
    botHear(m);
    return;
  }
  if (m.t === 'result') {
    const t = K.tickets.find(t => t.cid === m.cid);
    if (t) {
      t.done = !!m.ok;
      t.ok = m.ok;
      t.why = m.why;
    }
    if (m.ok && meCook()) toast(T('They loved it!', '客人很喜欢！'), 'ok');
    if (meCook() && G.MODE === 'net') cue(m.ok ? 'good' : 'oops');
    botHear(m);
    return;
  }
  if (m.t === 'back') {
    if (!K.back.some(b => b.id === m.bowl.id)) {
      K.back.push(Object.assign(m.bowl, { why: m.why, o: m.o, cid: m.cid }));
      if (meCook()) {
        SFX.hmm();
        toast(T('A bowl came back', '有一碗被退回来了'), 'bad');
      }
    }
    botHear(m);
    return;
  }
  if (m.t === 'guest') {
    K.cur = { cid: m.cid, teach: m.teach, who: m.who };
    if (m.nw) {
      K.trays[m.nw] = 1;
      newWord(m.nw);
    }
    return;
  }
}
export function kitchenTick(dt) {
  const b = K.basket;
  if (b.st === 'pot') {
    b.t += dt;
    const d = doneOf(b.t);
    if (d !== b.done) {
      b.done = d;
      if (d === 'ready') SFX.tick();
    }
  }
  for (let i = 0; i < 2; i++) {
    if (!K.slots[i]) {
      K.refill[i] -= dt;
      if (K.refill[i] <= 0) {
        K.slots[i] = newBowl();
      }
    } else if (K.slots[i].pop > 0) K.slots[i].pop = Math.max(0, K.slots[i].pop - dt * 4);
  }
  K.slid = K.slid.filter(s => (s.t += dt) < 0.45);
  K.tickets = K.tickets.filter(
    t => !(t.done && G.clock - t.at > 0 && (t.doneAt = t.doneAt || G.clock) && G.clock - t.doneAt > 2.5),
  );
  if (meCook() && BOIL && AC)
    try {
      BOIL.gain.setTargetAtTime(b.st === 'pot' ? 0.09 : 0.03, AC.currentTime, 0.3);
    } catch (e) {}
}
// the cook's actions (each one checks it still makes sense, so a double tap or a late drop does nothing twice)
export function kNest() {
  if (K.basket.st !== 'hook') return false;
  K.basket.st = 'full';
  K.basket.t = 0;
  K.basket.done = 'raw';
  SFX.land();
  noteAct();
  return true;
}
export function kLower() {
  if (K.basket.st !== 'full') return false;
  K.basket.st = 'pot';
  K.basket.t = 0;
  K.basket.done = 'raw';
  SFX.plop();
  splash(KL.pot.x, KL.pot.y);
  noteAct();
  return true;
}
export function kLift(i) {
  const bw = K.slots[i];
  if (K.basket.st !== 'pot' || !bw || bw.noodles) return false;
  bw.noodles = K.basket.done;
  bw.pop = 1;
  K.basket.st = 'hook';
  K.basket.t = 0;
  SFX.plop();
  drips(KL.slots[i].x, KL.slots[i].y);
  noteAct();
  return true;
}
export function kPour(i, dt) {
  const bw = K.slots[i];
  if (!bw) return false;
  const before = bw.broth;
  bw.broth = Math.min(1.12, bw.broth + dt * 0.45);
  if (bw.broth > 1.04 && Math.random() < dt * 8)
    PT.push({
      k: 'drop',
      x: KL.slots[i].x + rnd(-50, 50),
      y: KL.slots[i].y,
      vx: rnd(-30, 30),
      vy: rnd(-60, -20),
      g: 400,
      life: 0,
      max: 0.5,
      c: 'rgba(176,106,46,.9)',
      size: 2.4,
    });
  if (before < 0.7 && bw.broth >= 0.7) SFX.tick();
  return true;
}
export function kTop(i, w) {
  const bw = K.slots[i];
  if (!bw || bw.tops.includes(w) || !trayOpen(w)) return false;
  bw.tops.push(w);
  bw.pop = 1;
  SFX.land();
  const p = bowlTopAt(KL.slots[i].x, KL.slots[i].y, 1, w);
  sparkle(p.x, p.y, 4);
  noteAct();
  return true;
}
export function kUntop(i, w) {
  const bw = K.slots[i];
  if (!bw || !bw.tops.includes(w)) return false;
  bw.tops = bw.tops.filter(x => x !== w);
  SFX.grab();
  noteAct();
  return true;
}
export function kDump(i) {
  const bw = K.slots[i];
  if (!bw || isEmpty(bw)) return false;
  K.slots[i] = newBowl();
  SFX.splash();
  noteAct();
  return true;
}
export function kSlide(i) {
  const bw = K.slots[i];
  if (!bw || isEmpty(bw)) return false;
  K.slots[i] = null;
  K.refill[i] = 0.6;
  K.slid.push({ bowl: bw, x: KL.slots[i].x, y: KL.slots[i].y, t: 0 });
  SFX.slide();
  buzz(10);
  toCounter({
    t: 'bowl',
    bowl: { id: bw.id, noodles: bw.noodles, broth: +bw.broth.toFixed(2), tops: bw.tops.slice() },
  });
  noteAct();
  return true;
}
export function kTakeBack(j, i) {
  const r = K.back[j];
  if (!r || (K.slots[i] && !isEmpty(K.slots[i]))) return false;
  K.back.splice(j, 1);
  K.slots[i] = { id: r.id, noodles: r.noodles, broth: r.broth, tops: r.tops.slice(), pop: 1, why: r.why, o: r.o };
  SFX.land();
  noteAct();
  return true;
}
