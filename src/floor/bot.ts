// しばBot, the practice partner: it runs the kitchen. It can't hear the guests, so it only cooks orders that have been
// called out (the 📣 on a ticket). It walks to a station and presses the same action button a player would.
import { W, act, actionTarget, doneness, type Item } from './sim';
import { STATIONS, type Dish } from './data';
import { Walker } from './world';

const ME = 1;
let walker: Walker | null = null, wait = 0;
export function botReset() { walker = null; wait = 0; }
const station = (id: string) => STATIONS.find(s => s.id === id)!;
const sameTops = (a: Dish[], b: Dish[]) => a.length === b.length && a.every(d => b.includes(d));
const finishedIn = (it: Item | null | undefined) => (it && it.k === 'bowl' && it.noodles && it.tops.length ? it.tops : null);

/** the bowls the called orders still need, minus the finished ones already waiting on the pass, the island or in hands */
function needed(): Dish[][] {
  const need: Dish[][] = [];
  for (const tk of W.tickets) { if (!tk.called) continue; const g = W.groups.find(x => x.id === tk.gid); if (g?.left) need.push(...g.left.map(b => b.slice())); }
  const made = [...Object.values(W.slots), W.P[0]?.hold].map(finishedIn).filter(Boolean) as Dish[][];
  for (const m of made) { const i = need.findIndex(b => sameTops(b, m)); if (i >= 0) need.splice(i, 1); }
  return need;
}
const ready = (i: number) => ['perfect', 'ok'].includes(doneness(W.pots[i]));
/** the station to work at next (null: nothing to do) */
function decide(): string | null {
  const h = W.P[ME].hold, need = needed();
  const burnt = W.pots.findIndex(p => doneness(p) === 'burnt');
  if (!h && burnt >= 0) return 'pot' + burnt;
  if (h?.k === 'dishes') return 'sink';
  if (h?.k === 'noodles') { const i = W.pots.findIndex(p => p.st === 'empty'); return i >= 0 ? 'pot' + i : null; }
  if (h?.k === 'bowl') {
    if (!h.noodles) { const i = [0, 1].find(ready) ?? [0, 1].find(i => W.pots[i].st === 'boil'); return i != null ? 'pot' + i : 'trash'; }
    const target = need.find(b => h.tops.every(d => b.includes(d)) && b.length > h.tops.length);
    if (target) return target.find(d => !h.tops.includes(d))!;
    if (h.tops.length && need.some(b => sameTops(b, h.tops))) return !W.slots.pass0 ? 'pass0' : !W.slots.pass1 ? 'pass1' : !W.slots.island0 ? 'island0' : !W.slots.island1 ? 'island1' : null;
    return h.tops.length ? 'trash' : null;
  }
  if (!h && need.length) {
    const boiling = W.pots.filter(p => p.st === 'boil').length;
    if (boiling && (ready(0) || ready(1) || boiling >= Math.min(2, need.length))) return 'bowls';
    if (boiling < Math.min(2, need.length) && W.pots.some(p => p.st === 'empty')) return 'noodles';
    if (boiling) return 'bowls';
  }
  return null;
}
export function botTick(dt: number) {
  const p = W.P[ME]; if (!p?.bot || W.phase !== 'play') return;
  walker ??= new Walker({ x: p.x, y: p.y }, 175);
  walker.step(dt); p.x = walker.x; p.y = walker.y; p.face = walker.face; p.moving = walker.moving;
  if (!walker.idle || (wait -= dt) > 0) return;
  const id = decide(); if (!id) { wait = 0.4; return; }
  const s = station(id);
  if (Math.hypot(p.x - s.ax, p.y - s.ay) > 6) { walker.goTo({ x: s.ax, y: s.ay }); return; }
  const a = actionTarget(W, ME);
  if (a && a.sid === id) { act(ME); wait = 0.3; } else wait = 0.25; // e.g. the noodles aren't ready yet
}
