// rush nights and the combo: the shift clock, the waves of guests, いそぎ guests, tips for speed, ×2 ×3 streaks
import { G } from './G';
import { C } from './night-state';
import { CL } from '../data/layout';
import { LOOKS, NIGHTS } from '../data/content';
import { SFX, buzz } from '../audio/sfx';
import { clamp, rnd } from '../core/env';
import { toCook } from '../net/messages';
import { banner } from '../ui/overlays';
import { PT } from '../render/particles';

const N_ = () => NIGHTS[C.n - 1];
export const rushOn = () => !!(C && N_() && N_().rush);
// the shift's clock: seconds left, which wave (0 calm, 1 rush, 2 the last-train rush), closed yet
export function rushClock() {
  const R = N_().rush;
  const t = C.rt || 0,
    w = R.waves.some(([a, b]) => t >= a && t < b) ? (R.last !== undefined && t >= R.last ? 2 : 1) : 0;
  return { left: Math.max(0, R.secs - t), wave: C.over ? 0 : w, over: !!C.over };
}
// what both HUDs show (the counter's phone owns it and sends it to the kitchen)
export function hudNow() {
  const R = rushOn() ? rushClock() : null;
  return {
    s: R ? Math.ceil(R.left) : -1,
    w: R ? R.wave : 0,
    o: R ? R.over : false,
    x: C.mult || 1,
    k: C.streak || 0,
    y: C.earned,
  };
}
let hudK = '';
export function hudPush() {
  const h = hudNow(),
    k = JSON.stringify(h);
  if (k === hudK) return;
  hudK = k;
  toCook(Object.assign({ t: 'hud' }, h));
}
// a callout on both phones: on this one now, and on the kitchen's
export function announce(k) {
  if (G.ROLE === 'counter') banner(k);
  toCook({ t: 'banner', k });
}

// the combo: every right bowl in a row; ×2 from 3 in a row, ×3 from 6
export const multOf = n => (n >= 6 ? 3 : n >= 3 ? 2 : 1);
export function comboUp() {
  C.streak = (C.streak || 0) + 1;
  C.bestStreak = Math.max(C.bestStreak || 0, C.streak);
  const m = multOf(C.streak),
    up = m > (C.mult || 1);
  C.mult = m;
  announce(up ? (m === 3 ? 'saikou' : 'sugoi') : 'iine');
  if (up) buzz(30);
  hudPush();
}
export function comboBreak() {
  if (C.streak) announce('aa');
  C.streak = 0;
  C.mult = 1;
  hudPush();
}
// the pay for a right bowl on a night with patience: the bowl's ¥500, plus a tip (quality, tea, speed)
// that いそぎ doubles and the combo multiplies
export function payFor(g, q) {
  const speed = Math.round((clamp(g.pat, 0, 1) * 400) / 10) * 10,
    tip = Math.round(q * 300) + (g.tea ? 60 : 0) + speed;
  return Math.round((500 + tip * (g.hurry ? 2 : 1) * (C.mult || 1)) / 10) * 10;
}
// the yen floats up over the seat
export function floatYen(x, y, yen) {
  PT.push({
    k: 'txt',
    x,
    y,
    vx: 0,
    vy: -38,
    g: 0,
    life: 0,
    max: 1.6,
    s: '+¥' + yen.toLocaleString('ja-JP'),
    c: C.mult >= 3 ? '#FF7A5C' : C.mult >= 2 ? '#FFC24A' : '#FFF4E2',
    size: C.mult >= 2 ? 26 : 20,
  });
}

// a new guest for a rush night: anyone not already here, one to three toppings, maybe in a hurry
export function rushGuest() {
  const N = N_(),
    R = N.rush,
    here = new Set([...C.queue.map(q => q.who), ...C.seats.filter(s => s.g).map(s => s.g.who)]),
    pool = Object.keys(LOOKS).filter(w => !here.has(w)),
    who = (pool.length ? pool : Object.keys(LOOKS))[Math.floor(Math.random() * (pool.length || 5))],
    words = N.words.slice().sort(() => Math.random() - 0.5),
    n = Math.random() < R.tops3 ? 3 : Math.random() < 0.5 ? 1 : 2,
    t = C.rt || 0,
    hurry = (R.last !== undefined && t >= R.last) || Math.random() < R.hurry;
  C.next++;
  C.queue.push({
    id: ++G.CID,
    who,
    o: N.words.filter(w => words.slice(0, n).includes(w)),
    teach: 0,
    nw: null,
    wait: 0,
    x: CL.queue[C.queue.length % 3].x + 60,
    idx: C.next,
    hurry,
  });
  SFX.bell();
}
// the shift: the clock runs, waves come and go, and at 閉店 the line outside goes home
export function rushTick(dt) {
  const R = N_().rush;
  const before = rushClock();
  C.rt = (C.rt || 0) + dt;
  const now = rushClock();
  if (!C.over && C.rt >= R.secs) {
    C.over = true;
    C.queue = [];
    C.door = null;
    announce('close');
    SFX.close();
  }
  if (!C.over && now.wave && now.wave !== before.wave) {
    announce(now.wave === 2 ? 'last' : 'rush');
    SFX.rush();
  }
  if (!C.over) {
    C.spawnT -= dt;
    if (C.spawnT <= 0) {
      if (C.queue.length < 3) {
        rushGuest();
        const [a, b] = now.wave ? R.busy : R.calm;
        C.spawnT = rnd(a, b);
      } else C.spawnT = 1;
    }
  }
  hudPush();
}
// seconds a seated guest waits, on a night with patience
export const patSecs = g => {
  const R = N_().rush;
  return (R ? R.pat : 85) * (g.hurry ? 0.5 : 1);
};
// the kitchen sees how impatient each order's guest is getting (0 fine, 1 annoyed, 2 about to go)
export function patTell(g) {
  const lv = g.pat < 0.25 ? 2 : g.pat < 0.5 ? 1 : 0;
  if (lv !== g.lv) {
    g.lv = lv;
    toCook({ t: 'pat', cid: g.id, lv });
  }
}
export function rushReset() {
  hudK = '';
}
