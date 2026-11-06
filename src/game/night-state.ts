// the night: state
import { G } from './G';
import { NIGHTS } from '../data/content';
import { seatX } from '../data/layout';

// MODE 'bot' | 'net'; ROLE 'cook' | 'counter'. The counter's phone runs the guests and the night; the cook's phone runs the kitchen.
G.MODE = '';
// MODE 'bot' | 'net'; ROLE 'cook' | 'counter'. The counter's phone runs the guests and the night; the cook's phone runs the kitchen.
G.ROLE = '';
// MODE 'bot' | 'net'; ROLE 'cook' | 'counter'. The counter's phone runs the guests and the night; the cook's phone runs the kitchen.
G.NIGHT = null;
// MODE 'bot' | 'net'; ROLE 'cook' | 'counter'. The counter's phone runs the guests and the night; the cook's phone runs the kitchen.
G.PAUSED = false;
// MODE 'bot' | 'net'; ROLE 'cook' | 'counter'. The counter's phone runs the guests and the night; the cook's phone runs the kitchen.
G.clock = 0;
export const NET_ = { ch: null };
export let K = null,
  C = null;
export const meCook = () => G.ROLE === 'cook',
  meCounter = () => G.ROLE === 'counter';
export const kitchenHere = () => G.ROLE === 'cook' || G.MODE === 'bot',
  counterHere = () => G.ROLE === 'counter' || G.MODE === 'bot';
G.BID = 0;
G.CID = 0;
export const newBowl = () => ({ id: ++G.BID, noodles: null, broth: 0, tops: [], pop: 1 });
export const isEmpty = b => !b.noodles && b.broth < 0.02 && !b.tops.length;
export function kReset() {
  K = {
    basket: { st: 'hook', t: 0, done: 'raw' },
    slots: [newBowl(), newBowl()],
    refill: [0, 0],
    tickets: [],
    back: [],
    slid: [],
    ladleHeld: false,
    trays: {},
    shown: {},
  };
}
export function cReset(n) {
  const N = NIGHTS[n - 1],
    xs = seatX(N.seats);
  C = {
    n,
    queue: [],
    seats: xs.map((x, i) => ({ i, x, g: null, bowl: null, coins: 0, dirty: 0, cup: 0 })),
    pass: [],
    next: 0,
    spawnT: 1.6,
    served: 0,
    left: 0,
    earned: 0,
    words: {},
    quality: 0,
    done: false,
    last: null,
    door: null,
    bye: [],
    leftG: {},
    sk: { ok: 0, bad: 0 },
  };
}
export function trayOpen(w) {
  if (!G.NIGHT) return false;
  const N = NIGHTS[G.NIGHT.n - 1];
  return N.words.includes(w) || (K && K.trays[w]);
}
