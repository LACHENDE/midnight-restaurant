// Walking on the floor plan: a coarse grid with the tables blocked, and A* between cells
import { WORLD, TABLES, BENCH } from './data';

const CELL = 20;
const GW = Math.ceil(WORLD.w / CELL), GH = Math.ceil(WORLD.h / CELL);
const blocked = new Uint8Array(GW * GH);
const block = (x0: number, y0: number, x1: number, y1: number) => {
  for (let y = Math.max(0, Math.floor(y0 / CELL)); y <= Math.min(GH - 1, Math.floor(y1 / CELL)); y++)
    for (let x = Math.max(0, Math.floor(x0 / CELL)); x <= Math.min(GW - 1, Math.floor(x1 / CELL)); x++) blocked[y * GW + x] = 1;
};
for (const t of TABLES) block(t.x - t.r - 14, t.y - t.r - 8, t.x + t.r + 14, t.y + t.r + 8);
block(880, 0, WORLD.w, WORLD.h); // the kitchen behind the pass
block(0, 0, WORLD.w, 30); // the back wall
block(BENCH.x - 34, BENCH.y - 80, BENCH.x - 14, BENCH.y + 80); // the bench

export interface Pt { x: number; y: number }
const cellOf = (p: Pt) => ({ cx: Math.max(0, Math.min(GW - 1, Math.floor(p.x / CELL))), cy: Math.max(0, Math.min(GH - 1, Math.floor(p.y / CELL))) });
const free = (cx: number, cy: number) => cx >= 0 && cy >= 0 && cx < GW && cy < GH && !blocked[cy * GW + cx];
/** the nearest walkable spot to p */
export function nearestFree(p: Pt): Pt {
  const { cx, cy } = cellOf(p);
  if (free(cx, cy)) return p;
  for (let r = 1; r < 12; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) if (free(cx + dx, cy + dy)) return { x: (cx + dx + 0.5) * CELL, y: (cy + dy + 0.5) * CELL };
  return p;
}
/** a path of points from a to b (b itself last); straight when nothing is in the way */
export function findPath(a: Pt, b: Pt): Pt[] {
  if (clearLine(a, b)) return [b];
  const s = cellOf(a), g = cellOf(nearestFree(b)), N = GW * GH;
  const cost = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), open: number[] = [];
  const si = s.cy * GW + s.cx, gi = g.cy * GW + g.cx, h = (i: number) => Math.hypot((i % GW) - g.cx, ((i / GW) | 0) - g.cy);
  cost[si] = 0; open.push(si);
  const score = (i: number) => cost[i] + h(i);
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (score(open[k]) < score(open[bi])) bi = k;
    const cur = open.splice(bi, 1)[0]; if (cur === gi) break;
    const x = cur % GW, y = (cur / GW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (!free(nx, ny)) continue;
      if (dx && dy && (!free(x + dx, y) || !free(x, y + dy))) continue; // no corner cutting
      const ni = ny * GW + nx, c = cost[cur] + (dx && dy ? 1.414 : 1);
      if (c < cost[ni]) { cost[ni] = c; from[ni] = cur; if (!open.includes(ni)) open.push(ni); }
    }
  }
  if (from[gi] < 0 && gi !== si) return [b];
  const cells: Pt[] = []; for (let i = gi; i !== si && i >= 0; i = from[i]) cells.unshift({ x: ((i % GW) + 0.5) * CELL, y: (((i / GW) | 0) + 0.5) * CELL });
  // smooth: skip points that can be seen past
  const out: Pt[] = []; let at = a;
  for (let i = 0; i < cells.length; i++) { const nxt = cells[i + 1] || b; if (!clearLine(at, nxt)) { out.push(cells[i]); at = cells[i]; } }
  out.push(b); return out;
}
function clearLine(a: Pt, b: Pt): boolean {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (CELL / 2));
  for (let i = 1; i < n; i++) { const { cx, cy } = cellOf({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }); if (!free(cx, cy)) return false; }
  return true;
}

/** something that walks: the player, a guest */
export class Walker {
  x: number; y: number; path: Pt[] = []; speed: number; face = 1; moving = false;
  constructor(p: Pt, speed: number) { this.x = p.x; this.y = p.y; this.speed = speed; }
  goTo(p: Pt) { this.path = findPath({ x: this.x, y: this.y }, p); }
  step(dt: number) {
    let left = this.speed * dt; this.moving = false;
    while (left > 0 && this.path.length) {
      const t = this.path[0], dx = t.x - this.x, dy = t.y - this.y, d = Math.hypot(dx, dy);
      if (d <= left) { this.x = t.x; this.y = t.y; this.path.shift(); left -= d; }
      else { this.x += (dx / d) * left; this.y += (dy / d) * left; left = 0; }
      if (Math.abs(dx) > 1) this.face = dx > 0 ? 1 : -1; this.moving = true;
    }
  }
  get idle() { return !this.path.length; }
}
