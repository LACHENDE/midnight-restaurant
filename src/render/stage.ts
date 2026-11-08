// canvas: a 1000×460 stage scaled to the phone
import { G } from '../game/G';
import { $, HUB } from '../core/env';
import { C } from '../game/night-state';
import { LOOKS, NIGHTS } from '../data/content';
import { applySafe } from '../main-loop';
import { makeIcons } from './shapes';

import { VW, VH, LIFT } from './dims';
export { VW, VH, LIFT };
export const cv = $('#cv'),
  ctx = cv.getContext('2d');
export let W = 0,
  H = 0,
  DPR = 1,
  S = 1,
  OX = 0,
  OY = 0;
export const LAYER: Record<string, any> = {};
/** the 3D page plugs in here: kitchen(dt) draws the cook's view in 3D (and the 2D words over it); off() hides it */
export const HOOK3D: { kitchen: null | ((dt: number) => void); counter: null | ((dt: number) => void); off: null | (() => void) } = { kitchen: null, counter: null, off: null };
export function resize() {
  W = innerWidth;
  H = innerHeight;
  DPR = Math.min(2, devicePixelRatio || 1);
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  S = Math.min(W / VW, H / VH) * 1.0;
  OX = (W - VW * S) / 2;
  OY = (H - VH * S) / 2;
  for (const k in LAYER) LAYER[k] = null;
}
export const toV = e => ({ x: (e.clientX - OX) / S, y: (e.clientY - OY) / S });
export const toS = (x, y) => ({ x: x * S + OX, y: y * S + OY });
export let seed = 7;
export const srand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export function mkLayer(draw) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(VW * S * DPR);
  c.height = Math.ceil(VH * S * DPR);
  const g = c.getContext('2d');
  g.setTransform(S * DPR, 0, 0, S * DPR, 0, 0);
  seed = 7;
  draw(g);
  return c;
}
// the owner's painted art (art/*.webp); until a picture has loaded, the code-drawn version stands in
export const ART: Record<string, HTMLImageElement> = {},
  artReady = n => !!(ART[n] && ART[n].complete && ART[n].naturalWidth);
export const PROPS = [
  'egg',
  'naruto',
  'negi',
  'box',
  'nest',
  'ladle',
  'pot',
  'broth',
  'basket',
  'basket-full',
  'tray',
  'bowl',
  'bowl-full',
];
// Ken's animation clips: the owner's handoff, cut by tests/mr_ken_import.js into art/ken (a 4-column atlas per clip, the frame order and timing
// of the preview GIFs, a waist anchor, and where his blank face is on each frame). Until they load, Ken is his still picture.
export const KEN: { d: any; im: Record<string, HTMLImageElement> } = { d: null, im: {} };
export const kenOn = g => !!(g && g.who === 'ken' && KEN.d),
  kenLen = id => KEN.d.clips[id].len;
export const KSP = 1.25;
// the long reactions play a little faster so the stall keeps moving
export const kenEat = () => ({ a: kenLen('itadaki') / KSP, e: kenLen('eat') / KSP, y: kenLen('yum') / KSP });
export const kenPay = g => ({
  b: kenLen('bill') / KSP,
  w: g.wallet ? kenLen('wallet') / KSP : 0,
  p: kenLen('pay') / KSP,
});
export const kenLeave = g => (kenLen(g.sad ? 'furious' : 'bye') + kenLen('leave')) / KSP;
export const EATING = new Set(['eat', 'spicy', 'pay', 'leave']);
// a guest past ordering
// the clip Ken plays in each guest state; t = seconds into it
export function kenClip(g) {
  const t = g.t,
    N = NIGHTS[C.n - 1];
  if (g.st === 'walk') return { id: 'arrive', t };
  if (g.st === 'look') return { id: 'choose', t };
  if (g.st === 'ask') return { id: g.teach >= 1 ? 'hand' : 'excited', t, loop: true };
  if (g.st === 'order') {
    if (g.hover) return { id: 'confused', t: G.clock, loop: true };
    if (t < kenLen('confirmed')) return { id: 'confirmed', t };
    if (!g.sent && t > 7) return { id: 'confused', t: t - 7, loop: true };
    if (!N.gentle && g.pat < 0.25) return { id: 'complain', t, loop: true };
    if (!N.gentle && g.pat < 0.5) return { id: 'annoyed', t, loop: true };
    return { id: 'wait', t, loop: true };
  }
  if (g.st === 'refused') {
    const w = kenLen('wrong');
    return t < w ? { id: 'wrong', t } : { id: 'annoyed', t: t - w, loop: true };
  }
  if (g.st === 'eat') {
    const P = kenEat();
    return t < P.a
      ? { id: 'itadaki', t: t * KSP }
      : t < P.a + P.e
        ? { id: 'eat', t: (t - P.a) * KSP, loop: true }
        : { id: 'yum', t: (t - P.a - P.e) * KSP };
  }
  if (g.st === 'spicy') return { id: 'spicy', t, loop: true };
  if (g.st === 'pay') {
    const P = kenPay(g);
    return t < P.b
      ? { id: 'bill', t: t * KSP }
      : t < P.b + P.w
        ? { id: 'wallet', t: (t - P.b) * KSP }
        : { id: 'pay', t: (t - P.b - P.w) * KSP };
  }
  if (g.st === 'leave') {
    const f = g.sad ? 'furious' : 'bye',
      l = kenLen(f) / KSP;
    return t < l ? { id: f, t: t * KSP } : { id: 'leave', t: (t - l) * KSP };
  }
  return { id: 'idle', t: G.clock, loop: true };
}
export function kenFrame(c, t, loop) {
  const L = c.len * 1000;
  let ms = loop ? (((t * 1000) % L) + L) % L : Math.min(t * 1000, L - 1);
  for (let i = 0; i < c.seq.length; i++) {
    ms -= c.dur[i];
    if (ms < 0) return c.seq[i];
  }
  return c.seq[c.seq.length - 1];
}
// the face the game paints over each clip
// fine adjustments per clip (size ×, pos = [x, y] in stage units). Empty: the consistent-size export (every frame on one
// 1024×1280 canvas with one anchor and scale) already sizes every clip alike; set values here only if one still needs a nudge
export const KEN_TUNE: { size: Record<string, number>; pos: Record<string, [number, number]> } = { size: {}, pos: {} };
export const KEN_MOOD = {
  confirmed: 'happy',
  excited: 'happy',
  itadaki: 'happy',
  yum: 'happy',
  bye: 'happy',
  pay: 'happy',
  eat: 'eat',
  wrong: 'hmm',
  annoyed: 'hmm',
  complain: 'hmm',
  furious: 'hmm',
  confused: 'hmm',
  spicy: 'hmm',
  wallet: 'hmm',
};

// runs once at start, after every module has loaded (main.ts calls these in order)
export function init(): void {
  addEventListener('resize', () => {
    resize();
    if (HUB) applySafe();
  });
  resize();
  if (document.fonts)
    document.fonts
      .load('900 20px "M PLUS Rounded 1c"', 'たまごねぎなるとまよなか屋ラーメン')
      .then(() => {
        for (const k in LAYER) LAYER[k] = null;
      })
      .catch(() => {});
  for (const n of [
    'kitchen',
    'counter',
    ...Object.keys(LOOKS).flatMap(k => ['guest-' + k, 'ask-' + k]),
    ...PROPS.map(p => 'prop-' + p),
  ]) {
    const im = new Image();
    im.onload = () => {
      for (const k in LAYER) LAYER[k] = null;
      if (/^prop-(egg|negi|naruto)$/.test(n)) makeIcons();
    };
    im.src = 'art/' + n + '.webp';
    ART[n] = im;
  }
  fetch('art/ken/ken.json')
    .then(r => r.json())
    .then((d: any) => {
      for (const c of Object.values(d.clips) as any[]) {
        c.len = c.dur.reduce((a, b) => a + b, 0) / 1000;
        if (!KEN.im[c.file]) {
          const im = new Image();
          im.src = 'art/ken/' + c.file;
          KEN.im[c.file] = im;
        }
      }
      KEN.d = d;
    })
    .catch(() => {});
}
