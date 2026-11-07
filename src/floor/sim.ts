// The shift's rules, run by the host phone (or the only phone, in practice): groups arrive and queue, the door, seating,
// orders and tickets, the kitchen (noodles → pot → bowl → topping → pass), serving, the goodbye, dirty tables,
// patience and walkouts, rush hour, tips and combos, the food critic and the VIP. The partner's phone gets snapshots.
import { Walker, nearestFree, distRect } from './world';
import { TABLES, STATIONS, chairsOf, DOOR, QUEUE, OUTSIDE, BENCH, WHO, COUNT, PIECES, DISHES, DISH_IDS, COOK, SHIFT, type Who, type Dish, type Station, type Table } from './data';

export type Item = { k: 'noodles' } | { k: 'bowl'; noodles: '' | 'perfect' | 'ok'; tops: Dish[] } | { k: 'dishes'; n: number };
export interface Player { x: number; y: number; face: number; moving: boolean; hold: Item | null; name: string; bot: boolean }
export interface Guest { who: Who; x: number; y: number; m: boolean; w?: Walker }
export type GSt = 'queue' | 'arrive' | 'door' | 'wait' | 'follow' | 'seating' | 'ask' | 'food' | 'eat' | 'leave' | 'bye' | 'out' | 'angry';
export interface Group {
  id: number; kind: 'normal' | 'critic' | 'vip'; size: number; guests: Guest[]; st: GSt; t: number; step: 'greet' | 'count' | 'seat';
  table: number; follow: number; pat: number; mood: '' | 'happy' | 'hmm'; moodT: number; reply: string; replyT: number;
  bowls?: Dish[][]; left?: Dish[][]; leftN: number; orderT: number;
}
export interface Ticket { id: number; gid: number; table: number; items: Dish[][] | null; left: number; by: number; called: boolean; kind: Group['kind'] }
export interface Pot { st: 'empty' | 'boil'; t: number }
export interface World {
  t: number; phase: 'play' | 'over'; yen: number; combo: number; bestCombo: number; walkouts: number; ok: number; bad: number; served: number;
  P: Player[]; groups: Group[]; tickets: Ticket[]; pots: Pot[]; slots: Record<string, Item | null>; dirty: Record<number, number>;
  floats: { x: number; y: number; txt: string; t: number; good: boolean }[]; ev: { id: number; k: string }[]; evN: number;
  rush: boolean; banner: string; bannerT: number; shake: number;
}

const fresh = (names: string[], bot: boolean): World => ({
  t: 0, phase: 'play', yen: 0, combo: 0, bestCombo: 0, walkouts: 0, ok: 0, bad: 0, served: 0,
  P: names.map((name, i) => ({ x: i ? 820 : 560, y: i ? 400 : 470, face: 1, moving: false, hold: null, name, bot: bot && i === 1 })),
  groups: [], tickets: [], pots: [{ st: 'empty', t: 0 }, { st: 'empty', t: 0 }], slots: Object.fromEntries(STATIONS.filter(s => s.kind === 'island' || s.kind === 'pass').map(s => [s.id, null])),
  dirty: {}, floats: [], ev: [], evN: 0, rush: false, banner: '', bannerT: 0, shake: 0,
});
export const W: World = fresh(['', ''], false);
let GID = 0, TID = 0, spawnT = 1.5, critic = false, vip = false;
export function reset(names: string[], bot: boolean) { Object.assign(W, fresh(names, bot)); GID = 0; TID = 0; spawnT = 1.5; critic = false; vip = false; }

// ---------- small helpers ----------
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
export const ev = (k: string) => { W.ev.push({ id: ++W.evN, k }); if (W.ev.length > 40) W.ev.shift(); };
export const float = (x: number, y: number, txt: string, good = true) => { W.floats.push({ x, y, txt, t: 0, good }); if (W.floats.length > 16) W.floats.shift(); };
const banner = (k: string) => { W.banner = k; W.bannerT = 3; };
export const comboMult = (c: number) => 1 + Math.min(1, c * 0.1);
export const doneness = (p: Pot) => (p.st !== 'boil' ? '' : p.t < COOK.ready ? 'raw' : p.t < COOK.soft ? 'perfect' : p.t < COOK.burnt ? 'ok' : 'burnt');
const potIx = (sid: string) => +sid.slice(3);
const tableOf = (id: number) => TABLES.find(t => t.id === id)!;
const sameTops = (a: Dish[], b: Dish[]) => a.length === b.length && a.every(d => b.includes(d));

/** what anything that looks like a world needs for the decisions below (the host's world, or a snapshot on the partner's phone) */
export type View = Pick<World, 'P' | 'groups' | 'pots' | 'slots' | 'dirty' | 'tickets'>;
const LIVE = new Set<GSt>(['seating', 'ask', 'food', 'eat']);
export const tableBusy = (w: View, id: number) => w.groups.some(g => g.table === id && LIVE.has(g.st)) || (w.dirty[id] || 0) > 0;
export const fitTable = (w: View, size: number) => TABLES.find(t => !tableBusy(w, t.id) && t.seats >= size);
const finished = (h: Item | null) => !!h && h.k === 'bowl' && !!h.noodles && h.tops.length > 0;

/** the line a group needs from player pi right now (null: nothing to say) */
export function wants(w: View, g: Group, pi: number): string | null {
  if (g.st === 'door') return g.step === 'greet' ? 'irasshai' : g.step === 'count' ? 'nanmei' : fitTable(w, g.size) ? 'douzo' : 'shoushou';
  if (g.st === 'wait') return fitTable(w, g.size) ? 'douzo' : null;
  if (g.st === 'ask') return 'gochuumon';
  if (g.st === 'food' && finished(w.P[pi]?.hold)) return 'omatase';
  if (g.st === 'bye') return 'arigatou';
  return null;
}
/** the group close enough to player pi to talk to (the nearest one that needs a line) */
export function talkTarget(w: View, pi: number): Group | null {
  const p = w.P[pi]; if (!p || w.groups.some(g => g.st === 'follow' && g.follow === pi)) return null;
  let best: Group | null = null, bd = 1e9;
  for (const g of w.groups) {
    if (!wants(w, g, pi)) continue;
    const d = g.table && (g.st === 'ask' || g.st === 'food') ? Math.hypot(p.x - tableOf(g.table).x, (p.y - tableOf(g.table).y) / 0.8) - tableOf(g.table).r - 30 : Math.hypot(p.x - g.guests[0].x, p.y - g.guests[0].y) - 40;
    if (d < 60 && d < bd) { bd = d; best = g; }
  }
  return best;
}

// ---------- the action button ----------
export interface Act { key: string; sid?: string; table?: number }
function stationAct(w: View, s: Station, h: Item | null): Act | null {
  switch (s.kind) {
    case 'noodles': return h ? null : { key: 'noodles', sid: s.id };
    case 'pot': {
      const pot = w.pots[potIx(s.id)], d = doneness(pot);
      if (h?.k === 'noodles' && pot.st === 'empty') return { key: 'boil', sid: s.id };
      if (h?.k === 'bowl' && !h.noodles && (d === 'perfect' || d === 'ok')) return { key: 'plate', sid: s.id };
      if (!h && d === 'burnt') return { key: 'dump', sid: s.id };
      return null;
    }
    case 'bowls': return h ? null : { key: 'bowl', sid: s.id };
    case 'tamago': case 'negi': case 'naruto': return h?.k === 'bowl' && h.noodles && !h.tops.includes(s.kind) && h.tops.length < 2 ? { key: 'top', sid: s.id } : null;
    case 'trash': return h ? { key: 'trash', sid: s.id } : null;
    case 'sink': return h?.k === 'dishes' ? { key: 'wash', sid: s.id } : null;
    case 'island': case 'pass': {
      const it = w.slots[s.id];
      if (h && !it && (s.kind === 'island' || h.k === 'bowl')) return { key: 'put', sid: s.id };
      if (!h && it) return { key: 'take', sid: s.id };
      return null;
    }
  }
}
/** what the action button would do for player pi, and on what (null: nothing in reach) */
export function actionTarget(w: View, pi: number): Act | null {
  const p = w.P[pi]; if (!p) return null;
  let best: Act | null = null, bd = 1e9;
  for (const s of STATIONS) { const d = distRect(p, s); if (d < 38 && d < bd) { const a = stationAct(w, s, p.hold); if (a) { best = a; bd = d; } } }
  for (const t of TABLES) {
    const d = Math.hypot(p.x - t.x, (p.y - t.y) / 0.8) - t.r; if (d > 52 || d >= bd) continue;
    if (w.groups.some(g => g.st === 'follow' && g.follow === pi)) { best = { key: 'seat', table: t.id }; bd = d; }
    else if (!p.hold && (w.dirty[t.id] || 0) > 0) { best = { key: 'clear', table: t.id }; bd = d; }
  }
  return best;
}
export function act(pi: number): boolean {
  const a = actionTarget(W, pi), p = W.P[pi]; if (!a || !p) return false;
  const h = p.hold;
  switch (a.key) {
    case 'noodles': p.hold = { k: 'noodles' }; ev('pick'); break;
    case 'boil': W.pots[potIx(a.sid!)] = { st: 'boil', t: 0 }; p.hold = null; ev('plop'); break;
    case 'plate': {
      const i = potIx(a.sid!), good = doneness(W.pots[i]) === 'perfect';
      if (h?.k === 'bowl') h.noodles = good ? 'perfect' : 'ok';
      W.pots[i] = { st: 'empty', t: 0 }; ev('plate');
      const s = STATIONS.find(x => x.id === a.sid)!; if (good) float(s.ax, s.ay - 40, 'PERFECT');
      break;
    }
    case 'dump': W.pots[potIx(a.sid!)] = { st: 'empty', t: 0 }; ev('trash'); break;
    case 'bowl': p.hold = { k: 'bowl', noodles: '', tops: [] }; ev('pick'); break;
    case 'top': if (h?.k === 'bowl') h.tops.push(STATIONS.find(s => s.id === a.sid)!.kind as Dish); ev('top'); break;
    case 'trash': p.hold = null; ev('trash'); break;
    case 'wash': p.hold = null; ev('wash'); break;
    case 'put': W.slots[a.sid!] = h; p.hold = null; ev('drop'); break;
    case 'take': p.hold = W.slots[a.sid!]; W.slots[a.sid!] = null; ev('pick'); break;
    case 'clear': p.hold = { k: 'dishes', n: W.dirty[a.table!] }; W.dirty[a.table!] = 0; ev('pick'); break;
    case 'seat': seat(pi, a.table!); break;
  }
  return true;
}
function seat(pi: number, id: number) {
  const g = W.groups.find(x => x.st === 'follow' && x.follow === pi), t = tableOf(id), p = W.P[pi];
  if (!g) return;
  if (tableBusy(W, id)) { float(p.x, p.y - 100, 'あいてない…', false); ev('wrong'); return; }
  if (t.seats < g.size) { float(p.x, p.y - 100, 'せまい…', false); ev('wrong'); return; }
  g.table = id; g.st = 'seating'; g.t = 0; g.follow = -1;
  const ch = chairsOf(t); g.guests.forEach((q, i) => q.w!.goTo({ x: t.x + ch[i].x, y: t.y + ch[i].y }));
  ev('seat'); if (t.seats === g.size) { W.yen += 50; float(t.x, t.y - t.r - 24, '+¥50 ぴったり'); }
}

// ---------- talking ----------
/** player pi says a line: the right one moves things on; anything else confuses the group */
export function say(pi: number, line: string): boolean {
  const g = talkTarget(W, pi), want = g && wants(W, g, pi), p = W.P[pi];
  if (!g || line !== want) {
    W.bad++; if (g) { g.mood = 'hmm'; g.moodT = 1.4; } ev('wrong');
    const at = g ? g.guests[0] : p; float(at.x, at.y - 110, '？', false); return false;
  }
  W.ok++; g.mood = 'happy'; g.moodT = 1.2; ev('good');
  if (line === 'irasshai') { g.step = 'count'; g.pat = Math.min(1, g.pat + 0.3); }
  else if (line === 'nanmei') { g.step = 'seat'; g.reply = COUNT[g.size]; g.replyT = 4; g.pat = Math.min(1, g.pat + 0.3); }
  else if (line === 'shoushou') { g.st = 'wait'; g.pat = 1; g.reply = ''; g.guests.forEach((q, i) => q.w!.goTo({ x: BENCH.x + 8, y: BENCH.y - 54 + i * 36 })); }
  else if (line === 'douzo') { g.st = 'follow'; g.follow = pi; g.reply = ''; g.pat = 1; }
  else if (line === 'gochuumon') takeOrder(g, pi);
  else if (line === 'omatase') serve(g, pi);
  else if (line === 'arigatou') goodbye(g);
  return true;
}
/** how the group says its order: 「たまごをふたつと、ねぎをひとつください」 */
function orderPhrase(bowls: Dish[][]): string {
  if (bowls.length === 1 && bowls[0].length === 2) return `${DISHES[bowls[0][0]].k}と${DISHES[bowls[0][1]].k}のラーメンをください`;
  const n: Partial<Record<Dish, number>> = {}; for (const b of bowls) n[b[0]] = (n[b[0]] || 0) + 1;
  return (Object.entries(n) as [Dish, number][]).map(([d, c]) => `${DISHES[d].k}${PIECES[c]}`).join('と') + 'ください';
}
function takeOrder(g: Group, pi: number) {
  g.st = 'food'; g.orderT = W.t; g.pat = 1; g.reply = orderPhrase(g.bowls!); g.replyT = 5;
  W.tickets.push({ id: ++TID, gid: g.id, table: g.table, items: g.bowls!.map(b => b.slice()), left: g.bowls!.length, by: pi, called: false, kind: g.kind });
  ev('ticket');
}
/** player pi has called out a ticket: now everyone (and しばBot) can read it */
export function call(pi: number, id: number) { const tk = W.tickets.find(t => t.id === id); if (tk && tk.by === pi && !tk.called) { tk.called = true; ev('call'); } }
function serve(g: Group, pi: number) {
  const p = W.P[pi], h = p.hold, t = tableOf(g.table);
  if (h?.k !== 'bowl') return;
  const i = g.left!.findIndex(b => sameTops(b, h.tops));
  if (i < 0) { g.mood = 'hmm'; g.moodT = 2; g.reply = 'ちがいます…'; g.replyT = 2.5; W.combo = 0; W.bad++; ev('wrong'); return; }
  g.left!.splice(i, 1); g.leftN = g.left!.length; p.hold = null;
  const quick = W.t - g.orderT < 25, base = 500 + (h.noodles === 'perfect' ? 100 : 0) + (quick ? 150 : 0);
  const pay = Math.round(base * comboMult(W.combo) * (g.kind === 'critic' ? 3 : 1));
  W.yen += pay; W.combo++; W.bestCombo = Math.max(W.bestCombo, W.combo); W.served++;
  float(t.x, t.y - t.r - 26, `+¥${pay}${quick ? ' はやい！' : ''}`); ev('coin'); if (W.combo === 3 || W.combo === 6 || W.combo === 10) ev('combo');
  g.pat = Math.min(1, g.pat + 0.35);
  const tk = W.tickets.find(x => x.gid === g.id); if (tk) tk.left = g.leftN;
  if (!g.leftN) { g.st = 'eat'; g.t = 0; W.tickets = W.tickets.filter(x => x.gid !== g.id); }
}
function goodbye(g: Group) {
  const tip = Math.round((60 * g.size + (g.kind === 'vip' ? 600 : 0)) * comboMult(W.combo));
  W.yen += tip; float(g.guests[0].x, g.guests[0].y - 110, `+¥${tip} ♪`); ev('coin');
  leave(g, 'out');
}
function leave(g: Group, st: 'out' | 'angry') { g.st = st; g.t = 0; g.follow = -1; g.guests.forEach((q, i) => { q.w!.speed = st === 'angry' ? 230 : 150; q.w!.goTo({ x: OUTSIDE.x + (i % 2) * 20, y: OUTSIDE.y + i * 10 }); }); }
function walkout(g: Group) {
  W.walkouts++; W.combo = 0; W.shake = 0.5; ev('walkout');
  float(g.guests[0].x, g.guests[0].y - 110, 'もういい！', false);
  W.tickets = W.tickets.filter(x => x.gid !== g.id); g.table = 0; g.reply = ''; leave(g, 'angry');
  if (W.walkouts >= SHIFT.maxWalkouts) end();
}
function end() { W.phase = 'over'; banner('close'); ev('end'); }

// ---------- arrivals ----------
function spawn() {
  const kind: Group['kind'] = !critic && W.t > 70 ? 'critic' : !vip && W.t > 135 ? 'vip' : 'normal';
  if (kind === 'critic') critic = true; if (kind === 'vip') vip = true;
  const size = kind === 'critic' ? 1 : kind === 'vip' ? 2 : W.t < 35 ? pick([1, 2]) : pick([1, 2, 2, 2, 3, 3, 4, 4]);
  const used = new Set<Who>(), guests: Guest[] = [];
  for (let i = 0; i < size; i++) {
    let who = pick(WHO); for (let k = 0; k < 8 && used.has(who); k++) who = pick(WHO); used.add(who);
    const w = new Walker({ x: OUTSIDE.x + (i % 2) * 24, y: OUTSIDE.y + i * 14 }, 150);
    guests.push({ who, x: w.x, y: w.y, m: false, w });
  }
  const bowls: Dish[][] = kind === 'critic' ? [[pick(DISH_IDS), 'naruto']] : guests.map(() => [pick(DISH_IDS)]);
  if (kind === 'critic' && bowls[0][0] === 'naruto') bowls[0][0] = 'tamago';
  W.groups.push({ id: ++GID, kind, size, guests, st: 'queue', t: 0, step: 'greet', table: 0, follow: -1, pat: 1, mood: '', moodT: 0, reply: '', replyT: 0, bowls, left: bowls.map(b => b.slice()), leftN: bowls.length, orderT: 0 });
  if (kind !== 'normal') { banner(kind); ev(kind); }
}
const DRAIN: Partial<Record<GSt, number>> = { door: 1 / 22, queue: 1 / 55, wait: 1 / 38, ask: 1 / 26, food: 1 / 48 };

export function tick(dt: number) {
  if (W.phase !== 'play') return;
  W.t += dt; W.shake = Math.max(0, W.shake - dt); W.bannerT = Math.max(0, W.bannerT - dt);
  if (!W.rush && W.t >= SHIFT.rush) { W.rush = true; banner('rush'); ev('rush'); }
  if (W.t >= SHIFT.len) { end(); return; }
  for (const f of W.floats) f.t += dt; W.floats = W.floats.filter(f => f.t < 1.5);
  // the stove
  for (const p of W.pots) if (p.st === 'boil') { const before = doneness(p); p.t += dt; const now = doneness(p); if (now !== before) ev(now === 'perfect' ? 'ready' : now === 'burnt' ? 'burn' : 'soft'); }
  // arrivals: never more than two groups waiting at the door
  spawnT -= dt;
  const atDoor = W.groups.filter(g => g.st === 'queue' || g.st === 'arrive' || g.st === 'door').length;
  if (spawnT <= 0 && atDoor < 2) { spawn(); spawnT = W.rush ? 6.5 : 13 - 4 * Math.min(1, W.t / SHIFT.rush); }
  // the front of the queue steps up to the door
  if (!W.groups.some(g => g.st === 'arrive' || g.st === 'door')) { const q = W.groups.find(g => g.st === 'queue'); if (q) { q.st = 'arrive'; q.t = 0; q.guests.forEach((g, i) => g.w!.goTo({ x: DOOR.x + (i % 2) * 34 - 12, y: DOOR.y - Math.floor(i / 2) * 32 + 8 })); } }
  for (const g of W.groups) {
    g.t += dt; g.moodT = Math.max(0, g.moodT - dt); if (!g.moodT) g.mood = '';
    g.replyT = Math.max(0, g.replyT - dt); if (!g.replyT) g.reply = '';
    for (const q of g.guests) { q.w!.step(dt); q.x = q.w!.x; q.y = q.w!.y; q.m = q.w!.moving; }
    const rate = (DRAIN[g.st] || 0) * (g.kind === 'critic' ? 1.6 : g.kind === 'vip' ? 1.3 : 1) * (W.rush ? 1.2 : 1);
    if (rate) { g.pat -= rate * dt; if (g.pat <= 0) { walkout(g); if (W.phase !== 'play') return; continue; } }
    switch (g.st) {
      case 'queue': if (g.guests.every(q => q.w!.idle) && g.t < 0.1) g.guests.forEach((q, i) => q.w!.goTo({ x: QUEUE.x + 90 + i * 26, y: QUEUE.y - 70 })); break;
      case 'arrive': if (g.guests.every(q => q.w!.idle)) { g.st = 'door'; g.t = 0; } break;
      case 'follow': { // trail behind your waiter
        const p = W.P[g.follow]; if (!p) { g.st = 'wait'; break; }
        if (g.t > 0.3) { g.t = 0; g.guests.forEach((q, i) => q.w!.goTo(nearestFree({ x: p.x - p.face * (42 + i * 30), y: p.y + 16 + (i % 2) * 20 }))); }
        break;
      }
      case 'seating': if (g.guests.every(q => q.w!.idle) && g.t > 2) { g.st = 'ask'; g.t = 0; g.pat = 1; } break;
      case 'eat': if (g.t > 6) { W.dirty[g.table] = g.size; g.st = 'leave'; g.t = 0; g.reply = 'ごちそうさま！'; g.replyT = 2; g.guests.forEach((q, i) => q.w!.goTo({ x: DOOR.x + 40 + (i % 2) * 34, y: DOOR.y - 50 - Math.floor(i / 2) * 32 })); g.table = 0; } break;
      case 'leave': if (g.guests.every(q => q.w!.idle)) { g.st = 'bye'; g.t = 0; } break;
      case 'bye': if (g.t > 6) leave(g, 'out'); break;
    }
  }
  W.groups = W.groups.filter(g => !((g.st === 'out' || g.st === 'angry') && g.guests.every(q => q.w!.idle)));
}

/** what the partner's phone gets: the world without the walkers, orders it hasn't been told hidden */
export function snapshot(viewer: number) {
  return {
    t: W.t, phase: W.phase, yen: W.yen, combo: W.combo, bestCombo: W.bestCombo, walkouts: W.walkouts, ok: W.ok, bad: W.bad, served: W.served,
    rush: W.rush, banner: W.banner, bannerT: W.bannerT, shake: W.shake, pots: W.pots, slots: W.slots, dirty: W.dirty, floats: W.floats, ev: W.ev,
    P: W.P.map(p => ({ ...p })),
    groups: W.groups.map(({ bowls, left, ...g }) => ({ ...g, guests: g.guests.map(q => ({ who: q.who, x: q.x, y: q.y, m: q.m })) })),
    tickets: W.tickets.map(tk => ({ ...tk, items: tk.by === viewer || tk.called ? tk.items : null })),
  };
}
export type Snap = ReturnType<typeof snapshot>;
export const starsFor = (yen: number) => SHIFT.stars.filter(s => yen >= s).length;
