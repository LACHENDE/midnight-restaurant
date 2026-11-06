// the words, the guests, the nights
import { G } from '../game/G';
import { ART, artReady } from '../render/stage';
import { T, store } from '../core/env';

/** a guest in a night's line-up: who comes, what they order, how much the game teaches, a new word, the group they arrive with */
export interface GuestSpec {
  who: string;
  o: string[];
  teach: number;
  nw?: string;
  grp?: number;
}
export interface Night {
  n: number;
  name: [string, string];
  seats: number;
  gentle: boolean;
  door?: boolean;
  words: string[];
  guests: GuestSpec[];
}
export interface Look {
  nm: string;
  skin: string;
  hair: string;
  style: string;
  coat: string;
  id?: string;
}
export const WORDS = {
  tamago: { k: 'たまご', ro: 'tamago', m: ['egg', '鸡蛋'] },
  negi: { k: 'ねぎ', ro: 'negi', m: ['spring onion', '葱花'] },
  naruto: { k: 'なると', ro: 'naruto', m: ['fish-cake swirl', '鱼板'] },
};
export const mean = w => T(WORDS[w].m[0], WORDS[w].m[1]);
export const LOOKS: Record<string, Look> = {
  haru: { nm: 'ハル', skin: '#F6CBA4', hair: '#4A2A1C', style: 'pony', coat: '#C8463A' },
  ken: { nm: 'ケン', skin: '#EFC09A', hair: '#2B2420', style: 'cap', coat: '#5E7B4C' },
  mika: { nm: 'ミカ', skin: '#F3C9A8', hair: '#3A2A22', style: 'bob', coat: '#E0A93A' },
  sora: { nm: 'ソラ', skin: '#E9B98F', hair: '#1F2430', style: 'spiky', coat: '#3E6EA8' },
  yuki: { nm: 'ユキ', skin: '#F7D1B0', hair: '#5A3A2A', style: 'long', coat: '#7E5BA6' },
};
// where each painted guest's blank face sits, as fractions of the picture: x = centre, t = top (under the bangs), w = width.
// Measured by tests/mr_art_import.js; the game draws the dot eyes there.
// the same, on the "calling for staff" pictures (the same framing as the sitting ones)
export const FACE_ASK = {
  haru: { x: 0.471, t: 0.45, w: 0.374 },
  ken: { x: 0.481, t: 0.414, w: 0.397 },
  mika: { x: 0.482, t: 0.367, w: 0.371 },
  sora: { x: 0.487, t: 0.397, w: 0.404 },
  yuki: { x: 0.479, t: 0.345, w: 0.362 },
};
// the owner's painted things (art/prop-*.webp), each laid over the shape the code drew before so every drag and drop spot still fits:
// [width on the stage at scale 1, anchor x, anchor y] — the anchor (fractions of the picture) lands on the code's reference point
export const PROP_FIT = {
  bowl: [118, 0.5, 0.24],
  'bowl-full': [118, 0.5, 0.24],
  egg: [46, 0.5, 0.5],
  naruto: [40, 0.5, 0.5],
  negi: [36, 0.5, 0.5],
  box: [136, 0.5, 0.52],
  nest: [36, 0.5, 0.5],
  ladle: [84, 0.2, 0.86],
  pot: [232, 0.5, 0.27],
  broth: [132, 0.5, 0.28],
  basket: [100, 0.3, 0.62],
  'basket-full': [100, 0.3, 0.62],
  tray: [122, 0.5, 0.5],
};
export function prop(g, n, x, y, s = 1) {
  const im = ART['prop-' + n];
  if (!artReady('prop-' + n)) return false;
  const F = PROP_FIT[n],
    w = F[0] * s,
    h = (w * im.naturalHeight) / im.naturalWidth;
  g.drawImage(im, x - F[1] * w, y - F[2] * h, w, h);
  return true;
}
export const FACE = {
  haru: { x: 0.47, t: 0.452, w: 0.37 },
  ken: { x: 0.486, t: 0.414, w: 0.399 },
  mika: { x: 0.485, t: 0.369, w: 0.375 },
  sora: { x: 0.487, t: 0.395, w: 0.404 },
  yuki: { x: 0.484, t: 0.344, w: 0.374 },
};
// teach 2: every step is shown; 1: a hint after a few idle seconds; 0: only if you are stuck for a while
export const NIGHTS: Night[] = [
  {
    n: 1,
    name: ['First night', '第一晚'],
    seats: 1,
    gentle: true,
    words: ['tamago'],
    guests: [
      { who: 'haru', o: ['tamago'], teach: 2 },
      { who: 'ken', o: ['tamago'], teach: 1 },
      { who: 'mika', o: ['negi'], teach: 1, nw: 'negi' },
    ],
  },
  {
    n: 2,
    name: ['A busier night', '更忙的一晚'],
    seats: 2,
    gentle: false,
    words: ['tamago', 'negi'],
    guests: [
      { who: 'ken', o: ['tamago', 'negi'], teach: 0 },
      { who: 'sora', o: ['naruto'], teach: 1, nw: 'naruto' },
      { who: 'haru', o: ['tamago'], teach: 0 },
      { who: 'mika', o: ['negi', 'naruto'], teach: 0 },
      { who: 'yuki', o: ['tamago', 'naruto'], teach: 0 },
      { who: 'ken', o: ['negi'], teach: 0 },
    ],
  },
  // 接客 at the door: groups come in, and the counter greets them, asks how many, shows them in (or asks them to wait), and sees them off
  {
    n: 3,
    name: ['At the door · 接客', '门口接客'],
    seats: 3,
    gentle: true,
    door: true,
    words: ['tamago', 'negi', 'naruto'],
    guests: [
      { who: 'haru', o: ['tamago'], teach: 2, grp: 1 },
      { who: 'ken', o: ['negi'], teach: 1, grp: 2 },
      { who: 'mika', o: ['tamago'], teach: 1, grp: 2 },
      { who: 'sora', o: ['naruto'], teach: 0, grp: 3 },
      { who: 'yuki', o: ['tamago', 'negi'], teach: 0, grp: 4 },
      { who: 'haru', o: ['naruto'], teach: 0, grp: 4 },
      { who: 'mika', o: ['negi'], teach: 0, grp: 4 },
    ],
  },
];
// a word's romaji and meaning step back once you have served it right three times
export let MASTER = store.get('mastery', {});
export const known = w => (MASTER[w] || 0) >= 3;
G.BANK = store.get('bank', 0);
export const DECOR = [
  { id: 'lanterns', at: 1200, nm: ['A string of lanterns', '一串灯笼'] },
  { id: 'neko', at: 3000, nm: ['A lucky cat', '招财猫'] },
  { id: 'ajisai', at: 5200, nm: ['A pot of hydrangeas', '一盆绣球花'] },
];
export const hasDecor = id => G.BANK >= DECOR.find(d => d.id === id).at;

// runs once at start, after every module has loaded (main.ts calls these in order)
export function init(): void {
  for (const k in LOOKS) LOOKS[k].id = k;
}
