// The floor's rules: groups come in, you greet and seat them, take orders to the kitchen, serve and see them off
import { Walker, nearestFree, type Pt } from './path';
import { TABLES, chairsOf, DOOR, OUTSIDE, BENCH, PASS, START, SHIFT, WHO, COUNT, DISHES, type Table, type Who, type Dish } from './data';

export type GroupState = 'arrive' | 'door' | 'wait' | 'follow' | 'seating' | 'sit' | 'ask' | 'ordered' | 'eat' | 'leave' | 'bye' | 'gone';
export interface Guest { who: Who; w: Walker; dish: Dish; eaten: number }
export interface Group {
  id: number; size: number; guests: Guest[]; st: GroupState; t: number;
  step: 'greet' | 'count' | 'seat'; // at the door
  table: Table | null; mood: '' | 'happy' | 'hmm'; moodT: number; reply: string; replyT: number; served: number;
}
export interface Bowl { gid: number; dish: Dish }

export const S = {
  t: 0, player: new Walker(START, 270), groups: [] as Group[], next: 0, spawnT: 1.5,
  tickets: [] as Bowl[], // orders you carry to the kitchen
  cooking: [] as { b: Bowl; t: number }[], ready: [] as Bowl[], // in the kitchen, and waiting on the pass
  carry: [] as Bowl[], // bowls in your hands (two at most)
  yen: 0, ok: 0, bad: 0, done: false, floats: [] as { x: number; y: number; txt: string; t: number; good: boolean }[],
};
let GID = 0;
export function reset() {
  Object.assign(S, { t: 0, player: new Walker(START, 270), groups: [], next: 0, spawnT: 1.5, tickets: [], cooking: [], ready: [], carry: [], yen: 0, ok: 0, bad: 0, done: false, floats: [] });
}
export const float = (x: number, y: number, txt: string, good = true) => S.floats.push({ x, y, txt, t: 0, good });
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const lead = (g: Group) => g.guests[0].w;
export const tableFree = (t: Table) => !S.groups.some(g => g.table === t && g.st !== 'gone' && g.st !== 'leave' && g.st !== 'bye');
export const fitsSomewhere = (g: Group) => TABLES.some(t => tableFree(t) && t.seats >= g.size);

function spawn() {
  const size = SHIFT[S.next++], used = new Set<Who>(), guests: Guest[] = [];
  for (let i = 0; i < size; i++) {
    let who = pick(WHO); for (let k = 0; k < 8 && used.has(who); k++) who = pick(WHO); used.add(who);
    const w = new Walker({ x: OUTSIDE.x + i * 14, y: OUTSIDE.y + i * 26 }, 150);
    w.goTo({ x: DOOR.x + (i % 2) * 34 - 10, y: DOOR.y - Math.floor(i / 2) * 36 + 10 });
    guests.push({ who, w, dish: pick(Object.keys(DISHES) as Dish[]), eaten: 0 });
  }
  S.groups.push({ id: ++GID, size, guests, st: 'arrive', t: 0, step: 'greet', table: null, mood: '', moodT: 0, reply: '', replyT: 0, served: 0 });
}

/** the line each group needs from you right now, and where you say it (null: nothing to say) */
export function wants(g: Group): string | null {
  if (g.st === 'door') return g.step === 'greet' ? 'irasshai' : g.step === 'count' ? 'nanmei' : fitsSomewhere(g) ? 'douzo' : 'shoushou';
  if (g.st === 'wait') return fitsSomewhere(g) ? 'douzo' : null;
  if (g.st === 'ask') return 'gochuumon';
  if (g.st === 'ordered' && S.carry.some(b => b.gid === g.id)) return 'omatase';
  if (g.st === 'bye') return 'arigatou';
  return null;
}
export const spotOf = (g: Group): Pt => (g.table ? { x: g.table.x, y: g.table.y } : { x: lead(g).x, y: lead(g).y });
export const TALK_R = 95;
/** the group you're close enough to talk to (the nearest that needs a line) */
export function talkTarget(): Group | null {
  if (S.groups.some(g => g.st === 'follow')) return null; // leading a group to a table: nothing else pops up
  let best: Group | null = null, bd = TALK_R;
  for (const g of S.groups) { if (!wants(g)) continue; const p = spotOf(g), d = Math.hypot(p.x - S.player.x, p.y - S.player.y) - (g.table ? g.table.r : 0); if (d < bd) { bd = d; best = g; } }
  return best;
}

/** you say a line to a group: the right one moves things on; anything else confuses them */
export function say(line: string, g: Group | null): boolean {
  const want = g && wants(g);
  if (!g || line !== want) {
    S.bad++; if (g) { g.mood = 'hmm'; g.moodT = 1.4; }
    const p = g ? spotOf(g) : S.player; float(p.x, p.y - 70, '？', false); return false;
  }
  S.ok++; g.mood = 'happy'; g.moodT = 1.2;
  if (line === 'irasshai') g.step = 'count';
  else if (line === 'nanmei') { g.step = 'seat'; g.reply = COUNT[g.size]; g.replyT = 3.5; }
  else if (line === 'shoushou') { g.st = 'wait'; g.guests.forEach((q, i) => q.w.goTo({ x: BENCH.x + 6, y: BENCH.y - 60 + i * 38 })); }
  else if (line === 'douzo') { g.st = 'follow'; g.reply = ''; }
  else if (line === 'gochuumon') {
    g.st = 'ordered'; const dishes = g.guests.map(q => q.dish);
    g.reply = [...new Set(dishes)].map(d => DISHES[d].k).join('と') + 'ください'; g.replyT = 4;
    for (const q of g.guests) S.tickets.push({ gid: g.id, dish: q.dish });
  } else if (line === 'omatase') {
    const mine = S.carry.filter(b => b.gid === g.id); S.carry = S.carry.filter(b => b.gid !== g.id); g.served += mine.length;
    float(g.table!.x, g.table!.y - 40, `+${mine.length * 600}`, true); S.yen += mine.length * 600;
    if (g.served >= g.size) { g.st = 'eat'; g.t = 0; }
  } else if (line === 'arigatou') {
    const tip = 50 * g.size; S.yen += tip; float(DOOR.x + 40, DOOR.y - 90, `+¥${tip} ♪`, true); g.st = 'gone';
    g.guests.forEach(q => q.w.goTo(OUTSIDE));
  }
  return true;
}

/** you walked a following group to a table: they sit if it's free and big enough */
export function trySeat(t: Table): string | null {
  const g = S.groups.find(x => x.st === 'follow'); if (!g) return null;
  if (!tableFree(t)) return 'taken';
  if (t.seats < g.size) return 'small';
  g.table = t; g.st = 'seating'; g.t = 0;
  const ch = chairsOf(t); g.guests.forEach((q, i) => q.w.goTo({ x: t.x + ch[i].x, y: t.y + ch[i].y }));
  // a snug table earns a little more
  if (t.seats === g.size) { S.yen += 40; float(t.x, t.y - t.r - 20, '+¥40 ぴったり', true); }
  return 'ok';
}

export function tick(dt: number) {
  S.t += dt; const P = S.player; P.step(dt);
  for (const f of S.floats) f.t += dt; S.floats = S.floats.filter(f => f.t < 1.4);
  // the next group comes in when the door is clear
  S.spawnT -= dt;
  if (S.next < SHIFT.length && S.spawnT <= 0 && !S.groups.some(g => g.st === 'arrive' || g.st === 'door')) { spawn(); S.spawnT = 9 + Math.random() * 5; }
  // the kitchen (しばBot): tickets you bring to the pass get cooked, then wait on the pass
  if (S.tickets.length && Math.hypot(P.x - PASS.x, P.y - PASS.y) < 90) {
    for (const b of S.tickets) S.cooking.push({ b, t: 0 }); float(PASS.x, PASS.y - 60, `× ${S.tickets.length} 🎫`, true); S.tickets = [];
  }
  for (const c of S.cooking) c.t += dt;
  for (const c of S.cooking.filter(c => c.t >= 4.5)) S.ready.push(c.b); S.cooking = S.cooking.filter(c => c.t < 4.5);
  if (S.ready.length && S.carry.length < 2 && Math.hypot(P.x - PASS.x, P.y - PASS.y) < 90) { while (S.ready.length && S.carry.length < 2) S.carry.push(S.ready.shift()!); }
  for (const g of S.groups) {
    g.t += dt; g.moodT = Math.max(0, g.moodT - dt); if (!g.moodT) g.mood = ''; g.replyT = Math.max(0, g.replyT - dt); if (!g.replyT && g.st !== 'door') g.reply = '';
    g.guests.forEach(q => q.w.step(dt));
    if (g.st === 'arrive' && g.guests.every(q => q.w.idle)) { g.st = 'door'; g.t = 0; }
    if (g.st === 'follow') { // they trail behind you
      g.guests.forEach((q, i) => { if (q.w.idle || g.t > 0.4) { const back = { x: P.x - P.face * (46 + i * 34), y: P.y + 20 + (i % 2) * 22 }; q.w.goTo(nearestFree(back)); } });
      if (g.t > 0.4) g.t = 0;
    }
    if (g.st === 'seating' && g.guests.every(q => q.w.idle)) { g.st = 'sit'; g.t = 0; }
    if (g.st === 'sit' && g.t > 2.5) { g.st = 'ask'; g.t = 0; }
    if (g.st === 'eat') { g.guests.forEach(q => (q.eaten = Math.min(1, g.t / 7))); if (g.t > 7.5) { g.st = 'leave'; g.t = 0; g.guests.forEach((q, i) => q.w.goTo({ x: DOOR.x + (i % 2) * 34 + 30, y: DOOR.y - 40 - Math.floor(i / 2) * 34 })); } }
    if (g.st === 'leave' && g.guests.every(q => q.w.idle)) { g.st = 'bye'; g.t = 0; g.table = null; }
    if (g.st === 'bye' && g.t > 7) { g.st = 'gone'; g.guests.forEach(q => q.w.goTo(OUTSIDE)); } // nobody saw them off: no tip
  }
  if (!S.done && S.next >= SHIFT.length && S.groups.every(g => g.st === 'gone' && g.guests.every(q => q.w.idle))) S.done = true;
}

/** the hint at the top: the one thing to do next */
export function hintText(T: (en: string, zh: string) => string): string {
  const g = talkTarget(); if (g) return '';
  const follow = S.groups.find(x => x.st === 'follow');
  if (follow) return T(`Walk them to a free table with ${follow.size}+ seats and tap it`, `带他们去一张至少${follow.size}个座位的空桌，点一下桌子`);
  if (S.carry.length) return T('Take the bowls to their table', '把面端到他们的桌子');
  if (S.ready.length) return T('Bowls are ready: pick them up at the pass', '面好了：去出餐口取');
  if (S.tickets.length) return T('Take the order to the kitchen pass', '把订单送到出餐口');
  const need = S.groups.find(x => wants(x));
  if (need) return T('Someone needs you: walk over to them', '有客人需要你：走过去');
  return '';
}
