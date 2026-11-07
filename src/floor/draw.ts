// Drawing the floor from above: the dining room and the kitchen, the stations, the guests (the painted figures with the
// game's faces), both waiters and what they carry, patience rings, the critic and VIP badges, replies and effects.
import { doneness, wants, type Snap, type Item, type Act, type Group } from './sim';
import { WORLD, TABLES, STATIONS, chairsOf, DOOR, BENCH, DIVIDER, FACE, WHO, COOK, type Who } from './data';

const IMG: Record<string, HTMLImageElement> = {};
const load = (k: string, src: string) => { const im = new Image(); im.onload = () => { floorLayer = null; }; im.src = src; IMG[k] = im; };
for (const w of WHO) { load(`guest-${w}`, `art/guest-${w}.webp`); load(`ask-${w}`, `art/ask-${w}.webp`); }
for (const p of ['bowl', 'bowl-full', 'egg', 'negi', 'naruto', 'pot', 'box', 'nest', 'tray']) load(p, `art/prop-${p}.webp`);
const ready = (k: string) => !!(IMG[k]?.complete && IMG[k].naturalWidth);
type G2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const el = (g: G2, x: number, y: number, rx: number, ry: number) => { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); };
const rr = (g: G2, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const pic = (g: G2, k: string, cx: number, cy: number, w: number) => { if (!ready(k)) return false; const im = IMG[k], h = (w * im.naturalHeight) / im.naturalWidth; g.drawImage(im, cx - w / 2, cy - h / 2, w, h); return true; };
const FONT = '"M PLUS Rounded 1c", system-ui, sans-serif';

/** the dot-eye face (as in the side view), drawn around the point between the eyes; a face is 74 units wide */
export function face(g: G2, mood: string, t: number, seed: number) {
  const ex = 19, ink = '#2A1810', blink = (t + seed) % 3.7 < 0.12;
  for (const sx of [-1, 1]) { const gr = g.createRadialGradient(sx * 30, 13, 0, sx * 30, 13, 12); gr.addColorStop(0, 'rgba(255,120,120,.55)'); gr.addColorStop(1, 'rgba(255,120,120,0)'); g.fillStyle = gr; el(g, sx * 30, 13, 12, 8); g.fill(); }
  g.lineCap = 'round'; g.strokeStyle = ink;
  if (mood === 'happy' || mood === 'eat') { g.lineWidth = 3.6; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * ex, 3, 6.5, Math.PI * 1.12, Math.PI * 1.88); g.stroke(); } }
  else if (mood === 'angry') { g.lineWidth = 3.4; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * (ex + 6), -4); g.lineTo(sx * (ex - 6), 2); g.stroke(); } }
  else if (blink) { g.lineWidth = 3.2; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * ex - 5, 1); g.quadraticCurveTo(sx * ex, 4, sx * ex + 5, 1); g.stroke(); } }
  else for (const sx of [-1, 1]) { g.fillStyle = ink; el(g, sx * ex, 0, 6.2, 8.4); g.fill(); }
  if (mood === 'hmm') { g.lineWidth = 2.6; g.beginPath(); g.moveTo(-23, -14); g.lineTo(-12, -11); g.moveTo(23, -14); g.lineTo(12, -11); g.stroke(); }
  g.lineWidth = 2.4; g.beginPath();
  if (mood === 'happy') { g.moveTo(-9, 13); g.quadraticCurveTo(0, 14.5, 9, 13); g.quadraticCurveTo(8, 26, 0, 26); g.quadraticCurveTo(-8, 26, -9, 13); g.closePath(); g.fillStyle = '#7A2418'; g.fill(); }
  else if (mood === 'eat') { el(g, 0, 17, 4.5, 2.6 + Math.abs(Math.sin(t * 14)) * 3); g.fillStyle = '#7A2418'; g.fill(); }
  else if (mood === 'hmm' || mood === 'angry') { g.moveTo(-7, 19); g.quadraticCurveTo(0, 13, 7, 19); g.stroke(); }
  else { g.moveTo(-5, 15); g.quadraticCurveTo(-2.5, 18.5, 0, 15.5); g.quadraticCurveTo(2.5, 18.5, 5, 15); g.stroke(); }
}
const GH = 88; // a figure's height on the floor
function guest(g: G2, who: Who, x: number, y: number, mood: string, ask: boolean, bob: number, seed: number, t: number) {
  g.fillStyle = 'rgba(30,14,6,.28)'; el(g, x, y, 22, 7); g.fill();
  const key = `${ask && ready(`ask-${who}`) ? 'ask' : 'guest'}-${who}`;
  if (!ready(key)) { g.fillStyle = '#C8463A'; el(g, x, y - 30, 20, 26); g.fill(); return; }
  const im = IMG[key], H = GH, W = (H * im.naturalWidth) / im.naturalHeight, x0 = x - W / 2, y0 = y - H + 4 + bob;
  g.drawImage(im, x0, y0, W, H);
  const F = FACE[who], fw = (71 / 212) * H, u = fw / 74;
  g.save(); g.translate(x0 + F.x * W, y0 + F.t * H + fw * 0.25); g.scale(u, u); face(g, mood, t, seed); g.restore();
}
/** a waiter: white shirt, an apron in the player's colour, a hachimaki; しばBot is a shiba in an apron */
const APRON = ['#23305C', '#2F6B4F'], BAND = ['#C8463A', '#3E6EA8'];
function waiter(g: G2, i: number, x: number, y: number, moving: boolean, bot: boolean, t: number, me: boolean) {
  const bob = moving ? Math.abs(Math.sin(t * 12 + i)) * 3 : 0;
  if (me) { g.strokeStyle = 'rgba(94,211,176,.85)'; g.lineWidth = 3; el(g, x, y, 26, 9); g.stroke(); }
  g.fillStyle = 'rgba(30,14,6,.3)'; el(g, x, y, 22, 7); g.fill();
  g.save(); g.translate(x, y - bob);
  g.fillStyle = '#F4EFE6'; rr(g, -20, -44, 40, 42, 14); g.fill();
  g.fillStyle = APRON[i]; rr(g, -16, -32, 32, 32, 9); g.fill();
  if (bot) {
    g.fillStyle = '#E39A4E'; el(g, 0, -62, 24, 21); g.fill();
    g.beginPath(); g.moveTo(-20, -70); g.lineTo(-15, -90); g.lineTo(-5, -76); g.moveTo(20, -70); g.lineTo(15, -90); g.lineTo(5, -76); g.fill();
    g.fillStyle = '#FFF4E2'; el(g, 0, -54, 13, 9); g.fill(); g.fillStyle = '#2A1810'; el(g, -8, -64, 2.6, 3.4); g.fill(); el(g, 8, -64, 2.6, 3.4); g.fill(); el(g, 0, -57, 3, 2); g.fill();
  } else {
    g.fillStyle = '#F6CBA4'; el(g, 0, -62, 24, 22); g.fill();
    g.fillStyle = '#2B2420'; g.beginPath(); g.ellipse(0, -70, 25, 17, 0, Math.PI, TAU); g.fill();
    g.fillStyle = BAND[i]; rr(g, -25, -81, 50, 8, 4); g.fill();
    g.translate(0, -56); g.scale(0.48, 0.48); face(g, '', t, 1.3 + i);
  }
  g.restore();
}
function item(g: G2, x: number, y: number, it: Item, s = 1) {
  if (it.k === 'noodles') { if (!pic(g, 'nest', x, y, 34 * s)) { g.fillStyle = '#E8C25A'; el(g, x, y, 15 * s, 10 * s); g.fill(); } return; }
  if (it.k === 'dishes') { for (let i = 0; i < Math.min(4, it.n); i++) { g.fillStyle = '#E6DED1'; el(g, x, y - i * 4 * s, 16 * s, 6 * s); g.fill(); g.strokeStyle = '#B9AE9F'; g.lineWidth = 1; g.stroke(); } return; }
  if (!pic(g, it.noodles ? 'bowl-full' : 'bowl', x, y, 44 * s)) { g.fillStyle = '#fff'; el(g, x, y, 20 * s, 12 * s); g.fill(); }
  it.tops.forEach((d, i) => pic(g, d === 'tamago' ? 'egg' : d, x + (i ? 9 : -8) * s, y - 6 * s, 17 * s));
}
function bubble(g: G2, x: number, y: number, txt: string) {
  g.font = `900 16px ${FONT}`; const w = g.measureText(txt).width + 22, cx = Math.max(w / 2 + 4, Math.min(WORLD.w - w / 2 - 4, x));
  g.fillStyle = '#FFF4E2'; rr(g, cx - w / 2, y - 32, w, 30, 11); g.fill(); g.beginPath(); g.moveTo(x - 7, y - 3); g.lineTo(x, y + 7); g.lineTo(x + 7, y - 3); g.fill();
  g.fillStyle = '#3B2618'; g.textAlign = 'center'; g.fillText(txt, cx, y - 11);
}
function ring(g: G2, x: number, y: number, p: number, r = 12) {
  g.lineWidth = 5; g.strokeStyle = 'rgba(20,12,8,.45)'; el(g, x, y, r, r); g.stroke();
  g.strokeStyle = p > 0.5 ? '#5ED3B0' : p > 0.25 ? '#F0B04E' : '#E0563E';
  g.beginPath(); g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.max(0, p) * TAU); g.stroke();
}

// ---------- the room, drawn once ----------
let floorLayer: HTMLCanvasElement | null = null;
function room(): HTMLCanvasElement {
  if (floorLayer) return floorLayer;
  const c = document.createElement('canvas'); c.width = WORLD.w; c.height = WORLD.h; const g = c.getContext('2d')!;
  g.fillStyle = '#8C5732'; g.fillRect(0, 0, DIVIDER.x1, WORLD.h);
  for (let y = 0, r = 0; y < WORLD.h; y += 40, r++) for (let x = r % 2 ? -110 : 0, k = 0; x < DIVIDER.x1; x += 220, k++) {
    g.fillStyle = (r * 7 + k * 3) % 4 === 0 ? 'rgba(255,220,170,.06)' : (r + k) % 3 === 0 ? 'rgba(40,18,6,.07)' : 'rgba(0,0,0,0)'; g.fillRect(x, y, 220, 40); g.fillStyle = 'rgba(40,18,6,.16)'; g.fillRect(x, y, 1.5, 40); }
  g.fillStyle = 'rgba(40,18,6,.14)'; for (let y = 40; y < WORLD.h; y += 40) g.fillRect(0, y - 1, DIVIDER.x1, 1.5);
  // the kitchen: slate tiles with grout lines (a light grey checker read as a missing picture)
  g.fillStyle = '#4F6371'; g.fillRect(DIVIDER.x1, 0, WORLD.w - DIVIDER.x1, WORLD.h);
  for (let y = 0, r = 0; y < WORLD.h; y += 36, r++) for (let x = DIVIDER.x1, k = 0; x < WORLD.w; x += 36, k++) {
    const n = ((r * 73856093) ^ (k * 19349663)) >>> 0, l = 52 + (n % 5) - 2; // a little shade per tile
    g.fillStyle = `hsl(204,16%,${l}%)`; rr(g, x + 1.5, y + 1.5, 33, 33, 3); g.fill();
    g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x + 3, y + 2.5, 29, 2);
  }
  // a rubber mat in front of the stove and a floor drain: something to stand on
  g.fillStyle = 'rgba(28,30,34,.55)'; rr(g, 896, 186, 52, 150, 8); g.fill();
  g.fillStyle = 'rgba(255,255,255,.07)'; for (let y = 196; y < 330; y += 14) for (let x = 904; x < 944; x += 14) { el(g, x + 3, y + 3, 3, 3); g.fill(); }
  g.fillStyle = '#3E4F5A'; el(g, 800, 420, 15, 15); g.fill(); g.strokeStyle = '#2C3940'; g.lineWidth = 2; for (let i = -8; i <= 8; i += 4) { g.beginPath(); g.moveTo(800 + i, 409); g.lineTo(800 + i, 431); g.stroke(); }
  g.fillStyle = '#4A2814'; g.fillRect(0, 0, WORLD.w, 30); g.fillStyle = '#B8332A'; for (let x = 18; x < 620; x += 66) { rr(g, x, 8, 58, 24, 4); g.fill(); }
  g.fillStyle = '#5A3520'; g.fillRect(DIVIDER.x0, 30, DIVIDER.x1 - DIVIDER.x0, DIVIDER.gapY - 30);
  const counter = (x0: number, y0: number, x1: number, y1: number) => { g.fillStyle = '#9EA7AF'; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.fillStyle = '#C9D1D8'; g.fillRect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 6); };
  counter(662, 30, 1000, 78); counter(952, 78, 1000, 512); counter(760, 512, 1000, 560); counter(770, 256, 870, 306);
  g.font = `900 13px ${FONT}`; g.textAlign = 'center';
  for (const s of STATIONS) {
    const cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2;
    if (s.kind === 'bowls') { for (let i = 0; i < 3; i++) pic(g, 'bowl', cx, cy + 4 - i * 6, 40); }
    else if (s.kind === 'tamago' || s.kind === 'negi' || s.kind === 'naruto') {
      pic(g, 'tray', cx, cy - 2, 56); const k = s.kind === 'tamago' ? 'egg' : s.kind; pic(g, k, cx - 10, cy - 4, 22); pic(g, k, cx + 10, cy - 2, 22);
      g.fillStyle = '#FFF4E2'; rr(g, cx - 26, cy + 10, 52, 18, 6); g.fill(); g.fillStyle = '#3B2618'; g.fillText(s.kind === 'tamago' ? 'たまご' : s.kind === 'negi' ? 'ねぎ' : 'なると', cx, cy + 24);
    }
    else if (s.kind === 'noodles') { if (!pic(g, 'box', cx, cy, 46)) { g.fillStyle = '#7A4A28'; g.fillRect(s.x0 + 4, s.y0 + 6, 40, 56); } g.fillStyle = '#3B2618'; g.fillText('めん', cx - 2, s.y0 - 4); }
    else if (s.kind === 'trash') { g.fillStyle = '#4E5A62'; rr(g, s.x0 + 6, s.y0 + 6, 36, 38, 6); g.fill(); g.fillStyle = '#2E3A42'; rr(g, s.x0 + 10, s.y0 + 10, 28, 8, 3); g.fill(); }
    else if (s.kind === 'sink') { g.fillStyle = '#E6EDF1'; rr(g, s.x0 + 8, s.y0 + 6, 84, 36, 8); g.fill(); g.fillStyle = '#9FB6C2'; rr(g, s.x0 + 14, s.y0 + 12, 72, 24, 6); g.fill(); }
    else if (s.kind === 'pass') { g.fillStyle = '#B07A48'; g.fillRect(s.x0, s.y0 + 1, s.x1 - s.x0, s.y1 - s.y0 - 2); }
  }
  g.fillStyle = '#B8332A'; g.fillRect(DIVIDER.x0 - 4, 226, DIVIDER.x1 - DIVIDER.x0 + 8, 10);
  g.save(); g.translate(DIVIDER.x0 - 12, 290); g.rotate(-Math.PI / 2); g.fillStyle = '#FFF4E2'; g.font = `900 11px ${FONT}`; g.fillText('パス', 0, 0); g.restore();
  g.fillStyle = '#3A2012'; g.fillRect(40, WORLD.h - 8, 120, 8); g.fillStyle = '#5E7B4C'; rr(g, DOOR.x - 52, WORLD.h - 46, 104, 36, 8); g.fill();
  g.fillStyle = '#FFF4E2'; g.font = `900 12px ${FONT}`; g.fillText('いりぐち', DOOR.x, WORLD.h - 23);
  g.fillStyle = '#6E4026'; rr(g, BENCH.x - 26, BENCH.y - 70, 18, 140, 6); g.fill();
  for (const t of TABLES) {
    for (const ch of chairsOf(t)) { g.fillStyle = '#5A3520'; el(g, t.x + ch.x, t.y + ch.y + 4, 15, 13); g.fill(); g.fillStyle = '#7A4A28'; el(g, t.x + ch.x, t.y + ch.y, 14, 11); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.25)'; el(g, t.x + 4, t.y + 8, t.r, t.r * 0.8); g.fill();
    const gr = g.createRadialGradient(t.x - t.r * 0.3, t.y - t.r * 0.3, 4, t.x, t.y, t.r); gr.addColorStop(0, '#D9A066'); gr.addColorStop(1, '#A26830');
    g.fillStyle = gr; el(g, t.x, t.y, t.r, t.r * 0.8); g.fill();
    g.fillStyle = 'rgba(255,244,226,.85)'; el(g, t.x, t.y - t.r * 0.8 + 2, 11, 9); g.fill(); g.fillStyle = '#3B2618'; g.font = `900 12px ${FONT}`; g.fillText(String(t.id), t.x, t.y - t.r * 0.8 + 7);
  }
  return (floorLayer = c);
}

// positions shown smoothly on the partner's phone (snapshots come ~12 times a second)
const SMOOTH = new Map<string, { x: number; y: number }>();
const smooth = (k: string, x: number, y: number, dt: number) => { const s = SMOOTH.get(k); if (!s || Math.hypot(s.x - x, s.y - y) > 120) { const n = { x, y }; SMOOTH.set(k, n); return n; } const a = 1 - Math.exp(-dt * 16); s.x += (x - s.x) * a; s.y += (y - s.y) * a; return s; };

export function draw(g: G2, v: Snap, me: number, target: Act | null, dt: number, t: number, smoothOthers: boolean) {
  if (v.shake > 0) g.translate((Math.random() - 0.5) * 12 * v.shake, (Math.random() - 0.5) * 12 * v.shake);
  g.drawImage(room(), 0, 0);
  // the pots, with a doneness ring: grey while raw, green when ready, amber when soft, red when burnt
  STATIONS.filter(s => s.kind === 'pot').forEach((s, i) => {
    const pot = v.pots[i], cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2, d = doneness(pot);
    if (!pic(g, 'pot', cx, cy, 50)) { g.fillStyle = '#7A838C'; el(g, cx, cy, 22, 22); g.fill(); }
    if (pot.st !== 'boil') return;
    g.fillStyle = d === 'burnt' ? '#5A4636' : '#F3E9CF'; el(g, cx, cy - 2, 13, 9); g.fill();
    for (let k = 0; k < 4; k++) { const ph = (t * 1.6 + k * 0.27) % 1; g.fillStyle = `rgba(255,255,255,${(0.7 * (1 - ph)).toFixed(2)})`; el(g, cx - 12 + k * 8, cy - 10 - ph * 22, 4 + ph * 4, 3 + ph * 3); g.fill(); }
    const p = Math.min(1, pot.t / COOK.burnt); g.lineWidth = 5; g.strokeStyle = 'rgba(20,12,8,.4)'; el(g, cx - 34, cy, 12, 12); g.stroke();
    g.strokeStyle = d === 'raw' ? '#9EA7AF' : d === 'perfect' ? '#5ED3B0' : d === 'ok' ? '#F0B04E' : '#E0563E';
    g.beginPath(); g.arc(cx - 34, cy, 12, -Math.PI / 2, -Math.PI / 2 + p * TAU); g.stroke();
    if (d === 'burnt' && Math.floor(t * 4) % 2) { g.fillStyle = '#E0563E'; g.font = `900 16px ${FONT}`; g.textAlign = 'center'; g.fillText('！', cx - 34, cy + 6); }
  });
  for (const s of STATIONS) { const it = v.slots[s.id]; if (it) item(g, (s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2 - 4, it, s.kind === 'pass' ? 0.62 : 0.8); }
  for (const tb of TABLES) { const n = v.dirty[tb.id] || 0; for (let i = 0; i < n; i++) { const a = (i / Math.max(1, n)) * TAU; item(g, tb.x + Math.cos(a) * tb.r * 0.45, tb.y + Math.sin(a) * tb.r * 0.3, { k: 'dishes', n: 1 }); } }
  // what your action button would act on
  if (target) {
    g.strokeStyle = 'rgba(94,211,176,.95)'; g.lineWidth = 3; g.setLineDash([7, 5]); g.lineDashOffset = -t * 30;
    if (target.sid) { const s = STATIONS.find(x => x.id === target.sid)!; rr(g, s.x0 - 3, s.y0 - 3, s.x1 - s.x0 + 6, s.y1 - s.y0 + 6, 8); g.stroke(); }
    else if (target.table) { const tb = TABLES.find(x => x.id === target.table)!; el(g, tb.x, tb.y, tb.r + 10, tb.r * 0.8 + 10); g.stroke(); }
    g.setLineDash([]);
  }
  // tables a following group fits at glow green
  const follow = v.groups.find(x => x.st === 'follow' && x.follow === me);
  if (follow) for (const tb of TABLES) {
    const busy = v.groups.some(x => x.table === tb.id && ['seating', 'ask', 'food', 'eat'].includes(x.st)) || (v.dirty[tb.id] || 0) > 0;
    if (busy || tb.seats < follow.size) continue; g.strokeStyle = 'rgba(94,211,176,.6)'; g.lineWidth = 4; el(g, tb.x, tb.y, tb.r + 16, tb.r * 0.8 + 16); g.stroke();
  }
  // everyone, back to front
  const list: { y: number; f: () => void }[] = [];
  for (const gr of v.groups) gr.guests.forEach((q, i) => {
    const p = smoothOthers ? smooth(`g${gr.id}.${i}`, q.x, q.y, dt) : q;
    const mood = gr.st === 'angry' ? 'angry' : gr.mood || (gr.st === 'eat' ? 'eat' : gr.st === 'bye' || gr.st === 'out' ? 'happy' : '');
    list.push({ y: p.y, f: () => guest(g, q.who, p.x, p.y, mood, gr.st === 'ask' && i === 0, q.m ? -Math.abs(Math.sin(t * 10 + i)) * 3 : 0, gr.id + i, t) });
  });
  v.P.forEach((pl, i) => {
    const p = i !== me && smoothOthers ? smooth(`p${i}`, pl.x, pl.y, dt) : pl;
    list.push({ y: p.y, f: () => { waiter(g, i, p.x, p.y, pl.moving, pl.bot, t, i === me); if (pl.hold) item(g, p.x + pl.face * 4, p.y - 98, pl.hold, 0.85); } });
  });
  list.sort((a, b) => a.y - b.y).forEach(d => d.f());
  // over each group: patience, the critic / VIP badge, what they need, their reply
  for (const gr of v.groups) {
    if (gr.st === 'out' || gr.st === 'angry') continue;
    const tb = gr.table ? TABLES.find(x => x.id === gr.table) : null, lead = gr.guests[0];
    const x = tb ? tb.x : lead.x, y = tb ? tb.y - tb.r * 0.8 - 40 : lead.y - GH - 14;
    if (['queue', 'door', 'wait', 'ask', 'food'].includes(gr.st)) { const s = gr.pat < 0.25 ? 1 + Math.sin(t * 18) * 0.12 : 1; g.save(); g.translate(x + 24, y + 6); g.scale(s, s); ring(g, 0, 0, gr.pat); g.restore(); }
    if (gr.kind !== 'normal') { g.fillStyle = gr.kind === 'critic' ? '#1E1E24' : '#E2B33C'; el(g, x - 26, y + 6, 13, 13); g.fill(); g.fillStyle = gr.kind === 'critic' ? '#fff' : '#3B2618'; g.font = `900 ${gr.kind === 'critic' ? 15 : 9}px ${FONT}`; g.textAlign = 'center'; g.fillText(gr.kind === 'critic' ? '評' : 'VIP', x - 26, y + 11); }
    if (gr.reply) bubble(g, x, y - 6, gr.reply);
    else if (gr.st === 'food') { g.fillStyle = 'rgba(255,244,226,.92)'; rr(g, x - 22, y - 10, 44, 22, 9); g.fill(); item(g, x - 7, y + 1, { k: 'bowl', noodles: 'ok', tops: [] }, 0.42); g.fillStyle = '#3B2618'; g.font = `900 12px ${FONT}`; g.textAlign = 'center'; g.fillText(`×${gr.leftN}`, x + 11, y + 6); }
    else if (gr.st !== 'queue' && (wants(v, gr as Group, me) || gr.st === 'ask' || gr.st === 'door')) { const s = 1 + Math.sin(t * 6) * 0.07; g.save(); g.translate(x, y - 2); g.scale(s, s); g.fillStyle = '#FFF4E2'; rr(g, -13, -13, 26, 24, 9); g.fill(); g.fillStyle = '#D8452F'; g.font = `900 18px ${FONT}`; g.textAlign = 'center'; g.fillText('！', 0, 6); g.restore(); }
  }
  for (const f of v.floats) { g.globalAlpha = Math.max(0, 1 - f.t / 1.5); g.fillStyle = f.good ? '#FFE07A' : '#FF8A6B'; g.strokeStyle = 'rgba(40,20,8,.6)'; g.lineWidth = 4; g.font = `900 19px ${FONT}`; g.textAlign = 'center'; g.strokeText(f.txt, f.x, f.y - f.t * 34); g.fillText(f.txt, f.x, f.y - f.t * 34); g.globalAlpha = 1; }
  // rush hour: a red pulse at the edges
  if (v.rush && v.phase === 'play') { const a = 0.18 + Math.sin(t * 5) * 0.08, gr = g.createRadialGradient(WORLD.w / 2, WORLD.h / 2, WORLD.h * 0.45, WORLD.w / 2, WORLD.h / 2, WORLD.w * 0.62); gr.addColorStop(0, 'rgba(224,60,40,0)'); gr.addColorStop(1, `rgba(224,60,40,${a.toFixed(2)})`); g.fillStyle = gr; g.fillRect(0, 0, WORLD.w, WORLD.h); }
}
