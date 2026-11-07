// The restaurant as obstacles: walls, counters, the divider, the bench and the tables.
// The waiters slide along them; guests and しばBot walk A* paths on a 20-unit grid.
import { WORLD, TABLES, STATIONS, COUNTERS, DIVIDER, ROOM, applyRoom, type RoomId, type Box, type Pt } from './data';

export type { Pt };
let RECTS: Box[] = [];
/** is (x, y) inside something, with a margin of pad? Waiters also stay indoors. */
export function blocked(x: number, y: number, pad: number, indoors = false): boolean {
  if (indoors && (y - ROOM.exit.y) * ROOM.exit.dir > 0) return true;
  for (const r of RECTS) if (x > r.x0 - pad && x < r.x1 + pad && y > r.y0 - pad && y < r.y1 + pad) return true;
  for (const t of TABLES) { const rx = t.r + pad, ry = t.r * 0.8 + pad; if (((x - t.x) / rx) ** 2 + ((y - t.y) / ry) ** 2 < 1) return true; }
  return false;
}
/** move a waiter by (dx, dy), sliding along whatever is in the way */
export function slide(p: Pt, dx: number, dy: number, pad = 13) {
  if (!blocked(p.x + dx, p.y, pad, true)) p.x += dx;
  if (!blocked(p.x, p.y + dy, pad, true)) p.y += dy;
}
/** distance from a point to a station's counter */
export function distRect(p: Pt, r: Box): number {
  const dx = Math.max(r.x0 - p.x, 0, p.x - r.x1), dy = Math.max(r.y0 - p.y, 0, p.y - r.y1);
  return Math.hypot(dx, dy);
}

// ---------- paths for guests and しばBot ----------
const CELL = 20;
let GW = 0, GH = 0, GY0 = 0, free = new Uint8Array(0);
/** play in this shop: its walls, counters and tables become the obstacles, and the paths' grid is rebuilt */
export function useRoom(id: RoomId) {
  applyRoom(id);
  RECTS = [...ROOM.walls, { ...DIVIDER }, { ...ROOM.bench }, ...COUNTERS, ...STATIONS.map(s => ({ x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 }))];
  GY0 = ROOM.gridY[0]; GW = Math.ceil(WORLD.w / CELL); GH = Math.ceil((ROOM.gridY[1] - GY0) / CELL); free = new Uint8Array(GW * GH);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) free[y * GW + x] = blocked((x + 0.5) * CELL, GY0 + (y + 0.5) * CELL, 10) ? 0 : 1;
}
useRoom('wide');
const ok = (cx: number, cy: number) => cx >= 0 && cy >= 0 && cx < GW && cy < GH && free[cy * GW + cx] === 1;
const cellOf = (p: Pt) => ({ cx: Math.max(0, Math.min(GW - 1, Math.floor(p.x / CELL))), cy: Math.max(0, Math.min(GH - 1, Math.floor((p.y - GY0) / CELL))) });
const centre = (cx: number, cy: number): Pt => ({ x: (cx + 0.5) * CELL, y: GY0 + (cy + 0.5) * CELL });
export function nearestFree(p: Pt): Pt {
  const { cx, cy } = cellOf(p);
  if (ok(cx, cy)) return p;
  for (let r = 1; r < 14; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (ok(cx + dx, cy + dy)) return centre(cx + dx, cy + dy);
  return p;
}
function clearLine(a: Pt, b: Pt): boolean {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (CELL / 2));
  for (let i = 1; i < n; i++) { const { cx, cy } = cellOf({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }); if (!ok(cx, cy)) return false; }
  return true;
}
export function findPath(a: Pt, b: Pt): Pt[] {
  if (clearLine(a, b)) return [b];
  const s = cellOf(a), g = cellOf(nearestFree(b)), N = GW * GH, si = s.cy * GW + s.cx, gi = g.cy * GW + g.cx;
  const cost = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), open: number[] = [si], h = (i: number) => Math.hypot((i % GW) - g.cx, ((i / GW) | 0) - g.cy);
  cost[si] = 0;
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (cost[open[k]] + h(open[k]) < cost[open[bi]] + h(open[bi])) bi = k;
    const cur = open.splice(bi, 1)[0]; if (cur === gi) break;
    const x = cur % GW, y = (cur / GW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((!dx && !dy) || !ok(x + dx, y + dy) || (dx && dy && (!ok(x + dx, y) || !ok(x, y + dy)))) continue;
      const ni = (y + dy) * GW + x + dx, c = cost[cur] + (dx && dy ? 1.414 : 1);
      if (c < cost[ni]) { cost[ni] = c; from[ni] = cur; if (!open.includes(ni)) open.push(ni); }
    }
  }
  if (from[gi] < 0) return [b];
  const cells: Pt[] = []; for (let i = gi; i !== si && i >= 0; i = from[i]) cells.unshift(centre(i % GW, (i / GW) | 0));
  const out: Pt[] = []; let at = a;
  for (let i = 0; i < cells.length; i++) { const nxt = cells[i + 1] || b; if (!clearLine(at, nxt)) { out.push(cells[i]); at = cells[i]; } }
  out.push(b); return out;
}
/** something that walks a path: a guest, しばBot */
export class Walker {
  x: number; y: number; path: Pt[] = []; speed: number; face = 1; moving = false;
  constructor(p: Pt, speed: number) { this.x = p.x; this.y = p.y; this.speed = speed; }
  goTo(p: Pt) { this.path = findPath({ x: this.x, y: this.y }, p); }
  step(dt: number) {
    let left = this.speed * dt; this.moving = false;
    while (left > 0 && this.path.length) {
      const t = this.path[0], dx = t.x - this.x, dy = t.y - this.y, d = Math.hypot(dx, dy);
      if (Math.abs(dx) > 1) this.face = dx > 0 ? 1 : -1;
      if (d <= left) { this.x = t.x; this.y = t.y; this.path.shift(); left -= d; } else { this.x += (dx / d) * left; this.y += (dy / d) * left; left = 0; }
      this.moving = true;
    }
  }
  get idle() { return !this.path.length; }
}
