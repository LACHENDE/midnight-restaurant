// rush nights and the combo. A rush night runs like Plants vs Zombies: guests come in trickles and big waves,
// each big wave is announced first (お客さんの大群が来る！), a progress bar with lantern flags shows what's coming,
// and the night ends once the final wave is served. The combo (×2, ×3) runs on every night with patience.
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
export const QUEUE_MAX = 3; // guests standing in the rain; the rest of a crowd waits further down the street
const READY = 3.2; // よーい… then いらっしゃいませ！ before the first guest
// the night's guests, and where its big waves start on the progress bar (0..1)
export function rushPlan(n) {
  const R = NIGHTS[n - 1].rush,
    total = R.waves.reduce((a, w) => a + w.n, 0);
  let at = 0;
  const flags = [];
  for (const w of R.waves) {
    if (w.big) flags.push(at / total);
    at += w.n;
  }
  return { total, flags };
}
// the wave now: 0 a trickle (or before the first guest), 1 a big wave arriving, 2 the final wave arriving
function waveNow() {
  const W = N_().rush.waves[C.seg];
  if (!W || !W.big || !C.warned) return 0;
  return W.final ? 2 : 1;
}
// what both HUDs show (the counter's phone owns it and sends it to the kitchen)
export function hudNow() {
  const R = rushOn();
  return {
    p: R ? Math.round((C.next / rushPlan(C.n).total) * 100) / 100 : -1,
    w: R ? waveNow() : 0,
    o: R ? !!C.over : false,
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
// the pay for a right bowl on a night with patience: the bowl's ¥500, plus a bonus (quality, tea, speed)
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

// a new guest for a rush night: anyone not already here, one to three toppings, maybe in a hurry.
// They stand in the rain if there's room, or wait further down the street until there is.
export function rushGuest(W) {
  const N = N_(),
    R = N.rush,
    here = new Set([
      ...C.queue.map(q => q.who),
      ...C.pending.map(q => q.who),
      ...C.seats.filter(s => s.g).map(s => s.g.who),
    ]),
    all = Object.keys(LOOKS),
    pool = all.filter(w => !here.has(w)),
    from = pool.length ? pool : all,
    who = from[Math.floor(Math.random() * from.length)],
    words = N.words.slice().sort(() => Math.random() - 0.5),
    n = Math.random() < R.tops3 ? 3 : Math.random() < 0.5 ? 1 : 2,
    hurry = Math.random() < (W.hurry !== undefined ? W.hurry : R.hurry);
  C.next++;
  const q = {
    id: ++G.CID,
    who,
    o: N.words.filter(w => words.slice(0, n).includes(w)),
    teach: 0,
    nw: null,
    wait: 0,
    x: 1060,
    idx: C.next,
    hurry,
  };
  if (C.queue.length < QUEUE_MAX) {
    q.x = CL.queue[C.queue.length % 3].x + 60;
    C.queue.push(q);
  } else C.pending.push(q);
  SFX.bell();
}
// nobody is waiting for anything: the next trickle needn't keep them waiting
const idle = () =>
  !C.queue.length &&
  !C.pending.length &&
  !C.seats.some(s => s.g && ['walk', 'look', 'ask', 'order', 'refused'].includes(s.g.st));
// the night: よーい… いらっしゃいませ！, then each stretch in turn, a warning before every big wave
export function rushTick(dt) {
  const R = N_().rush;
  const t0 = C.rt;
  C.rt += dt;
  if (t0 === 0) announce('ready');
  if (t0 < READY - 1.2 && C.rt >= READY - 1.2) {
    announce('go');
    SFX.open();
  }
  if (C.rt < READY) return hudPush();
  const W = R.waves[C.seg];
  if (W) {
    if (C.segLeft < 0) {
      // a new stretch: the first guest of the night comes at once, a trickle after a breather
      C.segLeft = W.n;
      C.warned = false;
      C.spawnT = C.seg ? (W.big ? 0 : rnd(6, 9)) : 0.4;
    }
    if (W.big && !C.warned) {
      // a big wave is announced, and comes a few seconds later
      C.warned = true;
      announce(W.final ? (W.hurry === 1 ? 'last' : 'final') : 'warn');
      SFX.warn();
      buzz(60);
      C.spawnT = 4;
    }
    // between big waves the line keeps moving: if the stall is idle, the next guest comes sooner
    if (!W.big && C.spawnT > 1.5 && idle()) C.spawnT = 1.5;
    C.spawnT -= dt;
    if (C.spawnT <= 0) {
      rushGuest(W);
      C.segLeft--;
      C.spawnT = rnd(W.gap[0], W.gap[1]);
      if (C.segLeft <= 0) {
        C.seg++;
        C.segLeft = -1;
      }
    }
  }
  // the crowd down the street steps up as room opens in the rain
  while (C.pending.length && C.queue.length < QUEUE_MAX) {
    const q = C.pending.shift();
    q.x = 1060;
    C.queue.push(q);
  }
  if (!C.over && C.seg >= R.waves.length && !C.pending.length) C.over = true;
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
