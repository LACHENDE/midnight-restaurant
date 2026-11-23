// しばBot, the third pair of hands: it cooks (when you wait tables) or waits tables (when you cook). It walks to a station
// or a guest and presses the same action button, or says the same line, a player would.
// As the cook it can't hear the guests: it only cooks orders that were called out (the 📣 on a ticket).
// As the waiter it calls every order out as soon as it takes it, so the cooks can read it.
import { W, act, actionTarget, call, doneness, fitTable, float, say, talkTarget, wants, type Group, type Item } from './sim';
import { DISHES, STATIONS, TABLES, type Dish, type Pt } from './data';
import { Walker, nearestFree } from './world';

const walkers: Record<number, Walker> = {},
  waits: Record<number, number> = {},
  tries: Record<number, number> = {};
export function botReset() {
  for (const o of [walkers, waits, tries]) for (const k in o) delete o[k];
}
const station = (id: string) => STATIONS.find(s => s.id === id)!;
const sameTops = (a: Dish[], b: Dish[]) => a.length === b.length && a.every(d => b.includes(d));
const finishedIn = (it: Item | null | undefined) => (it && it.k === 'bowl' && it.noodles && it.tops.length ? it.tops : null);

// ---------- the cook ----------
/** the bowls the called orders still need, minus the finished ones already on the pass, the island or in other hands */
function needed(bi: number): Dish[][] {
  const need: Dish[][] = [];
  for (const tk of W.tickets) {
    if (!tk.called) continue;
    const g = W.groups.find(x => x.id === tk.gid);
    if (g?.left) need.push(...g.left.map(b => b.slice()));
  }
  const made = [...Object.values(W.slots), ...W.P.filter((_, i) => i !== bi).map(p => p.hold)].map(finishedIn).filter(Boolean) as Dish[][];
  for (const m of made) {
    const i = need.findIndex(b => sameTops(b, m));
    if (i >= 0) need.splice(i, 1);
  }
  return need;
}
const ready = (i: number) => ['perfect', 'ok'].includes(doneness(W.pots[i]));
/** the station to work at next (null: nothing to do) */
function cookDecide(bi: number): string | null {
  const h = W.P[bi].hold,
    need = needed(bi);
  const burnt = W.pots.findIndex(p => doneness(p) === 'burnt');
  if (!h && burnt >= 0) return 'pot' + burnt;
  if (h?.k === 'dishes') return 'sink';
  if (h?.k === 'noodles') {
    const i = W.pots.findIndex(p => p.st === 'empty');
    return i >= 0 ? 'pot' + i : null;
  }
  if (h?.k === 'bowl') {
    if (!h.noodles) {
      const i = [0, 1].find(ready) ?? [0, 1].find(i => W.pots[i].st === 'boil');
      return i != null ? 'pot' + i : 'trash';
    }
    const target = need.find(b => h.tops.every(d => b.includes(d)) && b.length > h.tops.length);
    if (target) return target.find(d => !h.tops.includes(d))!;
    if (h.tops.length && need.some(b => sameTops(b, h.tops)))
      return !W.slots.pass0 ? 'pass0' : !W.slots.pass1 ? 'pass1' : !W.slots.island0 ? 'island0' : !W.slots.island1 ? 'island1' : null;
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
function cookStep(bi: number, w: Walker) {
  const p = W.P[bi],
    id = cookDecide(bi);
  if (!id) {
    waits[bi] = 0.4;
    return;
  }
  const s = station(id);
  if (Math.hypot(p.x - s.ax, p.y - s.ay) > 6) {
    w.goTo({ x: s.ax, y: s.ay });
    return;
  }
  const a = actionTarget(W, bi);
  if (a && a.sid === id) {
    act(bi);
    waits[bi] = 0.3;
  } else waits[bi] = 0.25; // e.g. the noodles aren't ready yet
}

// ---------- the waiter ----------
type Plan = { to: Pt; line?: string; g?: Group; act?: string; sid?: string; table?: number };
/** where to stand to serve a table, take its order or clear it: just in front of it */
const tableSpot = (id: number): Pt => {
  const t = TABLES.find(x => x.id === id)!;
  return nearestFree({ x: t.x, y: t.y + t.r * 0.8 + 36 });
};
/** where to stand to talk to a group that isn't at a table: beside the first guest */
const groupSpot = (g: Group): Pt => nearestFree({ x: g.guests[0].x + 54, y: g.guests[0].y - 8 });
const spotOf = (g: Group) => (g.table && (g.st === 'ask' || g.st === 'food') ? tableSpot(g.table) : groupSpot(g));
const REST: Pt = { x: 700, y: 330 }; // by the pass, waiting for something to do
function waiterPlan(bi: number): Plan | null {
  const p = W.P[bi],
    h = p.hold;
  // dishes go to the sink; a finished bowl to the group that ordered it (anything else to the trash)
  if (h?.k === 'dishes') return { to: { x: station('sink').ax, y: station('sink').ay }, act: 'wash', sid: 'sink' };
  if (h) {
    const tops = finishedIn(h),
      g = tops && W.groups.find(x => x.st === 'food' && x.left?.some(b => sameTops(b, tops)));
    if (g) return { to: tableSpot(g.table), line: 'omatase', g };
    return { to: { x: station('trash').ax, y: station('trash').ay }, act: 'trash', sid: 'trash' };
  }
  // a group following me: to a table that fits them
  const lead = W.groups.find(g => g.st === 'follow' && g.follow === bi);
  if (lead) {
    const t = fitTable(W, lead.size);
    return t ? { to: tableSpot(t.id), act: 'seat', table: t.id } : null;
  }
  // someone who needs a line (nobody else is leading them), the most impatient first
  const talk = W.groups
    .filter(g => {
      const l = wants(W, g, bi);
      return l && l !== 'omatase' && !(g.st === 'follow');
    })
    .sort((a, b) => a.pat - b.pat);
  if (talk.length && talk[0].pat < 0.45) return { to: spotOf(talk[0]), line: wants(W, talk[0], bi)!, g: talk[0] };
  // a finished bowl waiting on the pass or the island for a group
  const slot = ['pass0', 'pass1', 'island0', 'island1'].find(id => {
    const tops = finishedIn(W.slots[id]);
    return tops && W.groups.some(g => g.st === 'food' && g.left?.some(b => sameTops(b, tops)));
  });
  if (slot) {
    const s = station(slot);
    return { to: nearestFree({ x: s.kind === 'pass' ? s.x0 - 24 : s.ax, y: s.kind === 'pass' ? (s.y0 + s.y1) / 2 : s.ay }), act: 'take', sid: slot };
  }
  if (talk.length) return { to: spotOf(talk[0]), line: wants(W, talk[0], bi)!, g: talk[0] };
  // a table to clear
  const dirty = TABLES.find(t => (W.dirty[t.id] || 0) > 0 && !W.groups.some(g => g.table === t.id && ['seating', 'ask', 'food', 'eat'].includes(g.st)));
  if (dirty) return { to: tableSpot(dirty.id), act: 'clear', table: dirty.id };
  return null;
}
/** the waiter has just taken an order: it calls it out at once (📣), so the cooks can read the ticket */
function callOut(bi: number) {
  const p = W.P[bi],
    tk = W.tickets.find(t => t.by === bi && !t.called);
  if (!tk) return;
  call(bi, tk.id);
  if (tk.items) float(p.x, p.y - 124, '📣 ' + tk.items.map(b => b.map(d => DISHES[d].k).join('と')).join('・'));
}
function waiterStep(bi: number, w: Walker) {
  const p = W.P[bi],
    plan = waiterPlan(bi);
  if (!plan) {
    if (Math.hypot(p.x - REST.x, p.y - REST.y) > 30) w.goTo(REST);
    waits[bi] = 0.4;
    return;
  }
  // not there yet (after a few failed tries at the same spot, step a little to the side)
  const to = (tries[bi] || 0) > 3 ? nearestFree({ x: plan.to.x + ((tries[bi] % 2) * 2 - 1) * 26, y: plan.to.y - 14 }) : plan.to;
  if (Math.hypot(p.x - to.x, p.y - to.y) > 8) {
    w.goTo(to);
    return;
  }
  let done = false;
  if (plan.line) {
    const tg = talkTarget(W, bi);
    if (tg && plan.g && tg.id === plan.g.id && wants(W, tg, bi) === plan.line) {
      say(bi, plan.line);
      if (plan.line === 'gochuumon') callOut(bi);
      done = true;
    }
  } else if (plan.act) {
    const a = actionTarget(W, bi);
    if (a && a.key === plan.act && (!plan.sid || a.sid === plan.sid) && (!plan.table || a.table === plan.table)) {
      act(bi);
      done = true;
    }
  }
  tries[bi] = done ? 0 : (tries[bi] || 0) + 1;
  if (tries[bi] > 8) tries[bi] = 0;
  waits[bi] = done ? 0.35 : 0.25; // a beat between lines, so you can watch it work
}

// ---------- every bot on the floor (as quick as a player: 230, now the shop is wider) ----------
export function botTick(dt: number) {
  if (W.phase !== 'play') return;
  W.P.forEach((p, bi) => {
    if (!p.bot) return;
    const w = (walkers[bi] ??= new Walker({ x: p.x, y: p.y }, 230));
    w.step(dt);
    p.x = w.x;
    p.y = w.y;
    p.face = w.face;
    p.moving = w.moving;
    if (!w.idle || (waits[bi] = (waits[bi] || 0) - dt) > 0) return;
    if (p.job === 'wait') waiterStep(bi, w);
    else cookStep(bi, w);
  });
}
