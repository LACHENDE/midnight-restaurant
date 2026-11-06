// input: drag, hold, pour, rub, tap
import { G } from '../game/G';
import { C, K, isEmpty, meCook, trayOpen } from '../game/night-state';
import { CL, KL } from '../data/layout';
import { CUPY, PTRS, cupX } from '../render/views';
import { cv, toV } from '../render/stage';
import { LIFT, VH, VW } from '../render/dims';
import { NIGHTS } from '../data/content';
import { SFX, audio, buzz } from '../audio/sfx';
import { bowlTopAt } from '../render/shapes';
import { cClear, cCollect, cReturn, cSeat, cSend, cServe, cTake, cTea, cWipe } from '../game/counter';
import { cSay, micListen } from '../game/door';
import { dist } from '../core/env';
import { kDump, kLift, kLower, kNest, kPour, kSlide, kTakeBack, kTop, kUntop } from '../game/kitchen';

export const PTR = { x: VW / 2, y: VH / 2 };
/** what a press picked up (kind + where it came from); kept in PTRS while the finger is down */
export function kDown(p): any {
  const b = K.basket;
  for (let j = 0; j < K.back.length; j++) {
    if (dist(p, { x: KL.pass.x - 30 + j * 60, y: KL.pass.y + 8 }) < 46) return { kind: 'back', back: j };
  }
  // toppings already in a bowl can be picked off again
  for (let i = 0; i < 2; i++) {
    const bw = K.slots[i];
    if (!bw) continue;
    for (const w of bw.tops) {
      const q = bowlTopAt(KL.slots[i].x, KL.slots[i].y, 1, w);
      if (dist(p, q) < 18 && p.y < KL.slots[i].y + 8) return { kind: 'untop', i, w };
    }
  }
  if (b.st === 'pot' && dist(p, { x: KL.pot.x + 30, y: KL.pot.y - 30 }) < 70) return { kind: 'basket', from: 'pot' };
  if (b.st !== 'pot' && dist(p, { x: KL.hook.x + 10, y: KL.hook.y }) < 52) return { kind: 'basket', from: 'hook' };
  if (dist(p, { x: KL.box.x, y: KL.box.y }) < 64) return { kind: 'nest' };
  if (dist(p, { x: KL.ladle.x - 10, y: KL.ladle.y - 10 }) < 50 || dist(p, { x: KL.broth.x, y: KL.broth.y }) < 56)
    return { kind: 'ladle' };
  for (const w of Object.keys(KL.trays)) {
    const t = KL.trays[w];
    if (Math.abs(p.x - t.x) < 58 && Math.abs(p.y - t.y) < 34 && trayOpen(w)) {
      K.shown[w] = 1;
      return { kind: 'top', w };
    }
  }
  for (let i = 0; i < 2; i++) {
    const s = KL.slots[i],
      bw = K.slots[i];
    if (bw && !isEmpty(bw) && Math.abs(p.x - s.x) < 66 && p.y > s.y - 30 && p.y < s.y + 52) return { kind: 'bowl', i };
  }
  return null;
}
export const slotAt = q => KL.slots.findIndex(s => Math.abs(q.x - s.x) < 72 && q.y > s.y - 46 && q.y < s.y + 56);
export function kMove(it) {
  if (it.kind === 'ladle') {
    const q = { x: it.x, y: it.y - LIFT },
      i = slotAt({ x: q.x - 6, y: q.y + 30 });
    it.over = i >= 0 && K.slots[i] ? i : null;
  }
}
export function kDrop(it, p) {
  const q = { x: p.x, y: p.y - LIFT };
  if (it.kind === 'nest') {
    if (dist(q, KL.hook) < 64 || dist(q, { x: KL.hook.x, y: KL.hook.y + 20 }) < 64) kNest();
    return;
  }
  if (it.kind === 'basket') {
    if (it.from === 'hook') {
      if (dist(q, KL.pot) < 120) kLower();
      return;
    }
    const i = slotAt(q);
    if (i >= 0) kLift(i);
    return;
  }
  if (it.kind === 'top') {
    const i = slotAt(q);
    if (i >= 0) kTop(i, it.w);
    return;
  }
  if (it.kind === 'untop') {
    const i = slotAt(q);
    if (i !== it.i) kUntop(it.i, it.w);
    return;
  }
  if (it.kind === 'bowl') {
    if (q.x > 820 && q.y > 220) kSlide(it.i);
    else if (dist(q, KL.scrap) < 60) kDump(it.i);
    return;
  }
  if (it.kind === 'back') {
    const i = slotAt(q);
    if (i >= 0) kTakeBack(it.back, i);
    return;
  }
}
export function cDown(p): any {
  for (const s of C.seats) {
    if (s.coins && dist(p, { x: s.x + 92, y: 384 }) < 38) return { kind: 'tap', fn: () => cCollect(s.i) };
  }
  for (const s of C.seats) {
    const g = s.g;
    if (g && g.st === 'ask' && Math.abs(p.x - s.x) < 110 && p.y > 80 && p.y < 320)
      return { kind: 'tap', fn: () => cTake(s.i) };
  }
  for (const s of C.seats) {
    if (s.bowl && s.bowl.refused && dist(p, { x: s.x, y: 372 }) < 56) return { kind: 'refused', si: s.i };
    if (s.bowl && s.bowl.empty && dist(p, { x: s.x, y: 372 }) < 56) return { kind: 'dish', si: s.i };
  }
  for (let j = 0; j < C.pass.length; j++) {
    const P = CL.pass[j % 2];
    if (dist(p, { x: P.x, y: P.y + (j > 1 ? -14 : 0) + 8 }) < 50) return { kind: 'pbowl', id: C.pass[j].id };
  }
  if (!NIGHTS[C.n - 1].door)
    for (const q of C.queue) {
      if (Math.abs(p.x - q.x) < 40 && p.y > 170 && p.y < 300) return { kind: 'guest', id: q.id };
    }
  if (dist(p, CL.teapot) < 46) return { kind: 'teapot' };
  if (dist(p, CL.cloth) < 40) return { kind: 'cloth' };
  return null;
}
export const seatAtX = x => C.seats.reduce((bi, s, i) => (Math.abs(s.x - x) < Math.abs(C.seats[bi].x - x) ? i : bi), 0);
export function cMove(it, dt) {
  const q = { x: it.x, y: it.y - LIFT };
  if (it.kind === 'teapot') {
    const si = seatAtX(q.x),
      s = C.seats[si];
    it.over =
      s.g &&
      s.g.st !== 'walk' &&
      s.g.st !== 'leave' &&
      Math.abs(q.x + 40 - cupX(s)) < 60 &&
      q.y > CUPY - 140 &&
      q.y < CUPY + 20
        ? si
        : null;
  }
  if (it.kind === 'cloth') {
    const n = it.path.length;
    if (n > 1) {
      const a = it.path[n - 2],
        b = it.path[n - 1];
      const si = seatAtX(b.x),
        s = C.seats[si];
      if (s.dirty && Math.abs(b.x - s.x) < 80 && b.y > 360 && b.y < 440) {
        cWipe(si, Math.hypot(b.x - a.x, b.y - a.y) / 260);
        if (Math.random() < 0.3) SFX.wipe();
      }
    }
  }
}
export function cDrop(it, p) {
  const q = { x: p.x, y: p.y - LIFT };
  if (it.kind === 'guest') {
    const si = C.seats.findIndex(s => Math.abs(q.x - s.x) < 120 && q.y > 110 && q.y < 380);
    if (si >= 0) cSeat(it.id, si);
    return;
  }
  if (it.kind === 'pbowl') {
    const si = C.seats.findIndex(s => Math.abs(q.x - s.x) < 110 && q.y > 150 && q.y < 450);
    const pi = C.pass.findIndex(b => b.id === it.id);
    if (si >= 0 && pi >= 0) cServe(pi, si);
    return;
  }
  if (it.kind === 'refused') {
    if (q.x < 280 && q.y < 380) cReturn(it.si);
    return;
  }
  if (it.kind === 'dish') {
    if (dist(q, CL.tub) < 80) cClear(it.si);
    return;
  }
}
export const up = e => {
  const it = PTRS.get(e.pointerId);
  if (!it) return;
  PTRS.delete(e.pointerId);
  const p = toV(e);
  if (!G.PAUSED && G.NIGHT && G.NIGHT.ph === 'run') (meCook() ? kDrop : cDrop)(it, p);
};
// holding: the ladle pours while it's over a bowl, the teapot while it's over a cup
export function holdTick(dt) {
  for (const it of PTRS.values()) {
    if (it.kind === 'ladle' && it.over != null) {
      kPour(it.over, dt);
      it.snd = (it.snd || 0) - dt;
      if (it.snd <= 0) {
        SFX.pour();
        it.snd = 0.3;
      }
    }
    if (it.kind === 'teapot' && it.over != null) {
      cTea(it.over, dt);
      it.snd = (it.snd || 0) - dt;
      if (it.snd <= 0) {
        SFX.pour();
        it.snd = 0.32;
      }
    }
  }
}
export let lastTouchEnd = 0;

// runs once at start, after every module has loaded (main.ts calls these in order)
export function init(): void {
  document.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLElement>('#say button');
    if (!b) return;
    if (b.dataset.mic) {
      micListen();
      return;
    }
    audio();
    cSay(b.dataset.say);
  });
  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    audio();
    const p = toV(e);
    PTR.x = p.x;
    PTR.y = p.y;
    if (!G.NIGHT || G.NIGHT.ph !== 'run' || G.PAUSED) return;
    const it = (meCook() ? kDown : cDown)(p);
    if (!it) return;
    it.x = p.x;
    it.y = p.y;
    it.path = [{ x: p.x, y: p.y }];
    if (it.kind === 'tap') {
      it.fn();
      buzz(6);
      return;
    }
    PTRS.set(e.pointerId, it);
    try {
      cv.setPointerCapture(e.pointerId);
    } catch (x) {}
    SFX.grab();
  });
  cv.addEventListener('pointermove', e => {
    const p = toV(e);
    PTR.x = p.x;
    PTR.y = p.y;
    const it = PTRS.get(e.pointerId);
    if (!it) return;
    it.x = p.x;
    it.y = p.y;
    it.path.push({ x: p.x, y: p.y });
    if (it.path.length > 20) it.path.shift();
    (meCook() ? kMove : cMove)(it, 0);
  });
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', e => PTRS.delete(e.pointerId));
  document.addEventListener('click', e => {
    const b = (e.target as Element).closest('button');
    if (!b) return;
    if (b.dataset.send != null) {
      audio();
      cSend(+b.dataset.send);
      return;
    }
    if (b.dataset.reveal != null) {
      const s = C.seats[+b.dataset.reveal];
      if (s && s.g) {
        s.g.reveal = 1;
      }
      return;
    }
  });
  document.addEventListener(
    'touchend',
    e => {
      const now = Date.now();
      if (now - lastTouchEnd < 350 && e.target === cv) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false },
  );
  ['gesturestart', 'gesturechange', 'dblclick'].forEach(t =>
    document.addEventListener(t, e => e.preventDefault(), { passive: false }),
  );
}
