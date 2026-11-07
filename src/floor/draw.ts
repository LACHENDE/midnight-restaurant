// Drawing the floor from above: the dining room and the kitchen, the stations, the guests (the painted figures with the
// game's faces), both waiters and what they carry, patience rings, the critic and VIP badges, replies and effects.
import { doneness, wants, type Snap, type Item, type Act, type Group } from './sim';
import ART3D from './art3d.json';
import { WORLD, TABLES, STATIONS, chairsOf, DOOR, DIVIDER, ROOM, FACE, WHO, COOK, type Who, type Table } from './data';

const IMG: Record<string, HTMLImageElement> = {};
const load = (k: string, src: string) => { const im = new Image(); im.onload = () => { floorLayer = null; }; im.src = src; IMG[k] = im; };
for (const w of WHO) { load(`guest-${w}`, `art/guest-${w}.webp`); load(`ask-${w}`, `art/ask-${w}.webp`); }
for (const p of ['bowl', 'bowl-full', 'egg', 'negi', 'naruto', 'pot', 'box', 'nest', 'tray', 'ladle']) load(p, `art/prop-${p}.webp`);
const ready = (k: string) => !!(IMG[k]?.complete && IMG[k].naturalWidth);
// the tall shop rendered in Blender (blender/tall_shop.py): the room at 2 px per unit, tables and stools apart so they sort
// with the people. Anchors are the floor centre, in game units (sprites.json from the render).
// art3d.json (blender/pack_art.py): the front pieces (x, y, w, h in game units; sorted at `sort`), the counter tops where
// pots and bowls sit (`tops`), and where the game writes words on the render (`labels`)
const A3 = ART3D as unknown as { tops: Record<string, [number, number]>; labels: Record<string, [number, number]>; occ: { k: string; x: number; y: number; w: number; h: number; sort: number; table?: number }[] };
for (const k of ['room-tall', ...A3.occ.map(o => o.k)]) load(k, `art/floor/${k}.webp`);
const art3d = () => ROOM.id === 'tall' && ready('room-tall');
const top3d = (id: string) => (art3d() && A3.tops[id]) || null;
const ISLAND = ['island0', 'island1'];
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
/** a speech bubble pointing down at (x, y); with down, it hangs below (x, y) instead (when the HUD would cover it) */
function bubble(g: G2, x: number, y: number, txt: string, down = false) {
  g.font = `900 16px ${FONT}`; const w = g.measureText(txt).width + 22, cx = Math.max(w / 2 + 4, Math.min(WORLD.w - w / 2 - 4, x)), top = down ? y + 9 : y - 32;
  g.fillStyle = '#FFF4E2'; rr(g, cx - w / 2, top, w, 30, 11); g.fill(); g.beginPath();
  if (down) { g.moveTo(x - 7, top + 1); g.lineTo(x, top - 9); g.lineTo(x + 7, top + 1); } else { g.moveTo(x - 7, y - 3); g.lineTo(x, y + 7); g.lineTo(x + 7, y - 3); }
  g.fill(); g.fillStyle = '#3B2618'; g.textAlign = 'center'; g.fillText(txt, cx, top + 21);
}
function ring(g: G2, x: number, y: number, p: number, r = 12) {
  g.lineWidth = 5; g.strokeStyle = 'rgba(20,12,8,.45)'; el(g, x, y, r, r); g.stroke();
  g.strokeStyle = p > 0.5 ? '#5ED3B0' : p > 0.25 ? '#F0B04E' : '#E0563E';
  g.beginPath(); g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.max(0, p) * TAU); g.stroke();
}

// ---------- the room, drawn once per shop (at 2×, so it stays sharp on a phone) ----------
let floorLayer: HTMLCanvasElement | null = null, layerOf = '';
function room(): HTMLCanvasElement {
  if (floorLayer && layerOf === ROOM.id) return floorLayer;
  const c = document.createElement('canvas'); c.width = WORLD.w * 2; c.height = WORLD.h * 2; const g = c.getContext('2d')!; g.scale(2, 2);
  if (ROOM.id === 'tall') { if (art3d()) roomArt(g); else roomTall(g); } else roomWide(g);
  layerOf = ROOM.id; return (floorLayer = c);
}
function roomWide(g: G2) {
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
  g.fillStyle = '#5A3520'; g.fillRect(DIVIDER.x0, 30, DIVIDER.x1 - DIVIDER.x0, DIVIDER.y1 - 30);
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
  const B = ROOM.bench; g.fillStyle = '#6E4026'; rr(g, B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0, 6); g.fill();
  for (const t of TABLES) {
    for (const ch of chairsOf(t)) { g.fillStyle = '#5A3520'; el(g, t.x + ch.x, t.y + ch.y + 4, 15, 13); g.fill(); g.fillStyle = '#7A4A28'; el(g, t.x + ch.x, t.y + ch.y, 14, 11); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.25)'; el(g, t.x + 4, t.y + 8, t.r, t.r * 0.8); g.fill();
    const gr = g.createRadialGradient(t.x - t.r * 0.3, t.y - t.r * 0.3, 4, t.x, t.y, t.r); gr.addColorStop(0, '#D9A066'); gr.addColorStop(1, '#A26830');
    g.fillStyle = gr; el(g, t.x, t.y, t.r, t.r * 0.8); g.fill();
    g.fillStyle = 'rgba(255,244,226,.85)'; el(g, t.x, t.y - t.r * 0.8 + 2, 11, 9); g.fill(); g.fillStyle = '#3B2618'; g.font = `900 12px ${FONT}`; g.fillText(String(t.id), t.x, t.y - t.r * 0.8 + 7);
  }
}
/** the tall shop, after the owner's picture: the shop front with the noren and a paper lantern at the top, honey planks,
 * the kitchen's pale tiles, the bowls and the stove on the back wall, the prep island with the toppings, the bin and the
 * sink, the pass with its bell on the counter between, and the railing with a cherry tree and a stone lantern below */
function roomTall(g: G2) {
  const KX = DIVIDER.x1, W0 = WORLD.w, FL = 262, BOT = 850, H0 = WORLD.h;
  // dining floor: honey planks across the room, the joints staggered
  g.fillStyle = '#B9793F'; g.fillRect(0, FL, KX, BOT - FL + 12);
  for (let y = FL, r = 0; y < BOT + 12; y += 30, r++) {
    for (let x = -((r * 83) % 190), k = 0; x < KX; x += 190, k++) {
      const n = (r * 7 + k * 3) % 5;
      if (n === 0) { g.fillStyle = 'rgba(255,228,180,.13)'; g.fillRect(x, y, 190, 30); } else if (n === 2) { g.fillStyle = 'rgba(80,36,10,.11)'; g.fillRect(x, y, 190, 30); }
      g.fillStyle = 'rgba(74,36,12,.32)'; g.fillRect(x, y, 1.5, 30);
    }
    g.fillStyle = 'rgba(74,36,12,.26)'; g.fillRect(0, y + 28.5, KX, 1.5);
  }
  // kitchen floor: big pale tiles with grout
  g.fillStyle = '#A7AEB4'; g.fillRect(KX, FL, W0 - KX, BOT - FL + 12);
  for (let y = FL, r = 0; y < BOT + 12; y += 36, r++) for (let x = KX, k = 0; x < W0; x += 36, k++) {
    const n = ((r * 73856093) ^ (k * 19349663)) >>> 0;
    g.fillStyle = `hsl(205,9%,${84 + (n % 4) - 1.5}%)`; rr(g, x + 1.5, y + 1.5, 33, 33, 3); g.fill();
    g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x + 3, y + 2.5, 29, 1.5);
  }
  // the back walls: dark boards on the shop front; plaster in the kitchen, with tiles behind the stove and a hood over it
  g.fillStyle = '#5A3420'; g.fillRect(0, 0, KX, FL + 8);
  for (let x = 0; x < KX; x += 24) { g.fillStyle = (x / 24) % 2 ? 'rgba(255,220,180,.05)' : 'rgba(0,0,0,.08)'; g.fillRect(x, 56, 24, FL - 48); g.fillStyle = 'rgba(28,12,4,.4)'; g.fillRect(x, 56, 1.2, FL - 48); }
  g.fillStyle = '#E6DAC4'; g.fillRect(KX, 0, W0 - KX, FL);
  g.fillStyle = '#CDC4B4'; g.fillRect(444, 140, W0 - 444, FL - 140);
  for (let y = 140, r = 0; y < FL; y += 14, r++) for (let x = 444 - (r % 2) * 14; x < W0; x += 28) { const a = Math.max(444, x + 1), b = Math.min(W0, x + 27); if (b > a) { g.fillStyle = '#F7F3EB'; g.fillRect(a, y + 1, b - a, 12); } }
  g.fillStyle = '#AEB8C0'; g.beginPath(); g.moveTo(462, 84); g.lineTo(576, 84); g.lineTo(592, 134); g.lineTo(446, 134); g.closePath(); g.fill();
  g.fillStyle = '#8E99A2'; g.fillRect(444, 132, 148, 8); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(468, 88, 100, 3);
  g.fillStyle = '#2A1609'; g.fillRect(0, 0, W0, 40);
  g.fillStyle = '#3E2212'; g.fillRect(0, 40, W0, 16); g.fillStyle = 'rgba(255,220,170,.1)'; g.fillRect(0, 40, W0, 3);
  g.fillStyle = '#3B200F'; g.fillRect(0, FL - 4, KX, 12); g.fillStyle = '#B5AA98'; g.fillRect(KX, FL - 6, W0 - KX, 8);
  // a shelf of bowls and three ladles on the kitchen wall
  g.fillStyle = '#7A4A28'; g.fillRect(372, 196, 64, 7); for (const x of [388, 418]) for (let i = 0; i < 3; i++) pic(g, 'bowl', x, 188 - i * 6, 28);
  g.fillStyle = '#4B5359'; g.fillRect(372, 70, 64, 4); for (const x of [382, 402, 422]) { g.strokeStyle = '#4B5359'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 74); g.lineTo(x, 80); g.stroke(); if (!pic(g, 'ladle', x, 108, 26)) { g.fillStyle = '#9AA4AD'; g.fillRect(x - 1.5, 80, 3, 40); el(g, x, 124, 8, 6); g.fill(); } }
  // the lattice window, lit from inside
  g.fillStyle = '#3E2212'; rr(g, 58, 108, 124, 112, 4); g.fill();
  const wg = g.createLinearGradient(0, 114, 0, 214); wg.addColorStop(0, '#FCE6B4'); wg.addColorStop(1, '#F0BC74'); g.fillStyle = wg; g.fillRect(64, 114, 112, 100);
  g.strokeStyle = '#6E4026'; g.lineWidth = 3; g.beginPath();
  for (let x = 92; x < 176; x += 28) { g.moveTo(x, 114); g.lineTo(x, 214); }
  for (let y = 139; y < 214; y += 25) { g.moveTo(64, y); g.lineTo(176, y); }
  g.stroke();
  // the entrance: the night street, the frame, the noren with a bowl on it
  const night = g.createLinearGradient(0, 96, 0, FL); night.addColorStop(0, '#121828'); night.addColorStop(1, '#2A3352'); g.fillStyle = night; g.fillRect(190, 96, 100, FL - 88);
  g.fillStyle = 'rgba(255,214,140,.8)'; for (const [x, y] of [[212, 214], [262, 226], [246, 204]]) { el(g, x, y, 2, 2); g.fill(); }
  g.fillStyle = '#2E190B'; g.fillRect(182, 90, 116, 10); g.fillRect(182, 90, 8, FL - 82); g.fillRect(290, 90, 8, FL - 82);
  g.fillStyle = '#1E1007'; g.fillRect(178, 106, 124, 5);
  for (let i = 0; i < 3; i++) {
    const x = 184 + i * 38, ng = g.createLinearGradient(x, 0, x + 36, 0); ng.addColorStop(0, '#A92C24'); ng.addColorStop(0.5, '#D44A3B'); ng.addColorStop(1, '#A92C24');
    g.fillStyle = ng; rr(g, x, 110, 36, 74, 3); g.fill(); g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(x, 176, 36, 8);
  }
  g.fillStyle = '#FFF4E2'; g.beginPath(); g.ellipse(240, 152, 13, 8, 0, 0, Math.PI); g.fill(); g.fillRect(227, 150, 26, 3);
  g.strokeStyle = '#FFF4E2'; g.lineWidth = 2; g.lineCap = 'round';
  for (const k of [-6, 0, 6]) { g.beginPath(); g.moveTo(240 + k, 145); g.quadraticCurveTo(244 + k, 139, 240 + k, 132); g.stroke(); }
  // a paper lantern on its bracket, glowing over the floor
  const glow = g.createRadialGradient(36, 230, 6, 36, 230, 220); glow.addColorStop(0, 'rgba(255,196,120,.42)'); glow.addColorStop(1, 'rgba(255,196,120,0)'); g.fillStyle = glow; g.fillRect(0, 60, 260, 420);
  g.strokeStyle = '#1E1007'; g.lineWidth = 3; g.beginPath(); g.moveTo(14, 160); g.lineTo(36, 160); g.lineTo(36, 178); g.stroke();
  const lb = g.createRadialGradient(31, 202, 4, 36, 210, 30); lb.addColorStop(0, '#FFF7DE'); lb.addColorStop(1, '#F0A850'); g.fillStyle = lb; el(g, 36, 210, 22, 30); g.fill();
  g.strokeStyle = 'rgba(150,70,20,.35)'; g.lineWidth = 1;
  for (let dy = -21; dy <= 21; dy += 7) { const hw = 22 * Math.sqrt(1 - (dy / 30) ** 2); g.beginPath(); g.moveTo(36 - hw, 210 + dy); g.lineTo(36 + hw, 210 + dy); g.stroke(); }
  g.fillStyle = '#1E1007'; rr(g, 24, 178, 24, 6, 2); g.fill(); rr(g, 24, 237, 24, 6, 2); g.fill();
  g.fillStyle = '#C8463A'; g.beginPath(); g.ellipse(36, 214, 9, 6, 0, 0, Math.PI); g.fill(); g.fillRect(27, 212, 18, 2.5);
  // a plant by the entrance
  g.fillStyle = '#7A4A28'; rr(g, 300, 236, 26, 26, 3); g.fill(); g.fillStyle = '#5A3520'; g.fillRect(300, 256, 26, 6);
  for (const [x, y, rx, ry, c] of [[306, 230, 9, 6, '#4E8A44'], [320, 228, 9, 6, '#5E9C50'], [313, 220, 8, 7, '#6DAE5C'], [304, 216, 6, 5, '#5E9C50'], [322, 214, 6, 5, '#4E8A44']] as [number, number, number, number, string][]) { g.fillStyle = c; el(g, x, y, rx, ry); g.fill(); }
  // side walls
  g.fillStyle = '#3E2212'; g.fillRect(0, FL, 14, BOT - FL); g.fillStyle = '#B5AA98'; g.fillRect(590, FL, 10, BOT - FL);
  // the kitchen: steel with a top, a front and a shadow
  const steel = (x0: number, y0: number, x1: number, y1: number, front = 11) => {
    g.fillStyle = 'rgba(30,36,42,.22)'; g.fillRect(x0 + 3, y1, x1 - x0, 6);
    g.fillStyle = '#98A2AB'; g.fillRect(x0, y1 - front, x1 - x0, front);
    g.fillStyle = '#DCE2E7'; g.fillRect(x0, y0, x1 - x0, y1 - y0 - front); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x0, y0, x1 - x0, 2);
  };
  g.font = `900 11px ${FONT}`; g.textAlign = 'center';
  for (const s of STATIONS) {
    const cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2;
    if (s.kind === 'bowls') { steel(s.x0, s.y0 - 6, s.x1, s.y1 + 4); for (let i = 0; i < 4; i++) pic(g, 'bowl', cx, cy - 4 - i * 6, 38); }
    else if (s.kind === 'noodles') { steel(s.x0 - 4, s.y0 - 4, s.x1, s.y1 + 6); if (!pic(g, 'box', cx + 2, cy - 2, 44)) { g.fillStyle = '#7A4A28'; g.fillRect(s.x0 + 4, s.y0 + 4, 40, 44); } g.fillStyle = '#3B2618'; g.fillText('めん', cx, s.y0 - 8); }
    else if (s.kind === 'trash') { g.fillStyle = 'rgba(30,36,42,.25)'; el(g, cx + 2, s.y1 + 2, 22, 6); g.fill(); g.fillStyle = '#6E7A82'; rr(g, s.x0 + 4, s.y0 + 6, 40, 44, 6); g.fill(); g.fillStyle = '#3E4A52'; rr(g, s.x0 + 2, s.y0, 44, 11, 4); g.fill(); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(s.x0 + 10, s.y0 + 14, 4, 30); }
    else if (s.kind === 'sink') {
      steel(s.x0, s.y0, s.x1, s.y1); g.fillStyle = '#8FA7B4'; rr(g, s.x0 + 14, s.y0 + 8, s.x1 - s.x0 - 28, 22, 6); g.fill(); g.fillStyle = '#B9CDD8'; rr(g, s.x0 + 17, s.y0 + 13, s.x1 - s.x0 - 34, 15, 5); g.fill();
      g.strokeStyle = '#7F8A93'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - 8, s.y0 + 6); g.lineTo(cx - 8, s.y0 - 12); g.quadraticCurveTo(cx - 8, s.y0 - 20, cx + 2, s.y0 - 20); g.lineTo(cx + 6, s.y0 - 14); g.stroke();
      g.fillStyle = '#F4EFE6'; rr(g, s.x0 + 18, s.y1 - 9, 26, 22, 3); g.fill(); g.fillStyle = '#C8463A'; g.fillRect(s.x0 + 18, s.y1 + 6, 26, 2.5);
    }
  }
  // the stove: burners under the pots, knobs on the front
  g.fillStyle = 'rgba(30,36,42,.25)'; g.fillRect(447, 316, 143, 6);
  g.fillStyle = '#7F8A93'; g.fillRect(444, 300, 146, 16); g.fillStyle = '#4B5359'; g.fillRect(444, 256, 146, 44); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(444, 256, 146, 2);
  for (const s of STATIONS.filter(x => x.kind === 'pot')) { const cx = (s.x0 + s.x1) / 2; g.strokeStyle = '#2B3035'; g.lineWidth = 4; el(g, cx, 284, 22, 11); g.stroke(); g.fillStyle = '#1F2327'; el(g, cx, 284, 14, 7); g.fill(); }
  g.fillStyle = '#2B3035'; for (const x of [470, 502, 540, 572]) { el(g, x, 308, 4, 4); g.fill(); }
  // the prep island: the topping trays on the cook's side, bare steel on the near side to put bowls down
  const I0 = STATIONS.find(s => s.id === 'island0')!, I1 = STATIONS.find(s => s.id === 'island1')!, tops = STATIONS.filter(s => s.kind === 'tamago' || s.kind === 'negi' || s.kind === 'naruto');
  steel(tops[0].x0, tops[0].y0, I1.x1, I1.y1 + 4, 12); g.fillStyle = 'rgba(120,132,142,.5)'; g.fillRect(I0.x0 + 4, I0.y0 + 1, I1.x1 - I0.x0 - 8, 1.5);
  for (const s of tops) {
    const cx = (s.x0 + s.x1) / 2, k = s.kind === 'tamago' ? 'egg' : s.kind;
    g.fillStyle = '#B9C2CA'; rr(g, s.x0 + 3, s.y0 + 3, s.x1 - s.x0 - 6, s.y1 - s.y0 - 8, 4); g.fill();
    pic(g, k, cx - 8, s.y0 + 15, 20); pic(g, k, cx + 8, s.y0 + 17, 20);
    g.fillStyle = '#FFF4E2'; rr(g, cx - 19, s.y1 - 10, 38, 13, 5); g.fill(); g.fillStyle = '#3B2618'; g.font = `900 9.5px ${FONT}`; g.fillText(s.kind === 'tamago' ? 'たまご' : s.kind === 'negi' ? 'ねぎ' : 'なると', cx, s.y1);
  }
  // the counter between the rooms: the pass (red ends, a bell) where the cook puts bowls out
  const D = DIVIDER, P0 = STATIONS.find(s => s.id === 'pass0')!, P1 = STATIONS.find(s => s.id === 'pass1')!, dx = (D.x0 + D.x1) / 2;
  g.fillStyle = 'rgba(40,20,8,.22)'; g.fillRect(D.x1, D.y0 + 8, 7, D.y1 - D.y0);
  g.fillStyle = '#6E4026'; rr(g, D.x0, D.y1 - 6, D.x1 - D.x0, 18, 4); g.fill();
  const dg = g.createLinearGradient(D.x0, 0, D.x1, 0); dg.addColorStop(0, '#9A6236'); dg.addColorStop(0.5, '#C68B55'); dg.addColorStop(1, '#9A6236'); g.fillStyle = dg; g.fillRect(D.x0, D.y0, D.x1 - D.x0, D.y1 - D.y0);
  g.fillStyle = '#E5B57F'; g.fillRect(D.x0 + 2, P0.y0, D.x1 - D.x0 - 4, P1.y1 - P0.y0);
  g.fillStyle = '#B8332A'; g.fillRect(D.x0 - 3, P0.y0 - 6, D.x1 - D.x0 + 6, 6); g.fillRect(D.x0 - 3, P1.y1, D.x1 - D.x0 + 6, 6);
  g.fillStyle = '#5A3520'; el(g, dx, P0.y1 + 3, 8, 3.5); g.fill(); g.fillStyle = '#E2B33C'; g.beginPath(); g.arc(dx, P0.y1 + 2, 6.5, Math.PI, 0); g.fill(); g.fillStyle = '#FFE9A0'; el(g, dx - 2, P0.y1 - 1.5, 1.8, 1.4); g.fill(); g.fillRect(dx - 1, P0.y1 - 7, 2, 3);
  // the bench by the left wall
  const B = ROOM.bench; g.fillStyle = 'rgba(40,20,8,.25)'; g.fillRect(B.x1, B.y0 + 4, 6, B.y1 - B.y0);
  g.fillStyle = '#6E4026'; g.fillRect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0); g.fillStyle = '#A86F3E'; g.fillRect(B.x0 + 2, B.y0, B.x1 - B.x0 - 4, B.y1 - B.y0 - 8);
  // below: the railing, then the night garden with a cherry tree and a stone lantern
  g.fillStyle = '#2C1D12'; g.fillRect(0, BOT, W0, H0 - BOT);
  for (let y = BOT + 34; y < H0; y += 26) { g.fillStyle = 'rgba(255,220,180,.05)'; g.fillRect(0, y, W0, 1.5); }
  g.fillStyle = '#5A3520'; for (let x = 6; x < W0; x += 48) g.fillRect(x, BOT - 14, 8, 44);
  g.fillStyle = '#8A5531'; g.fillRect(0, BOT - 16, W0, 9); g.fillStyle = '#6E4026'; g.fillRect(0, BOT + 20, W0, 6); g.fillStyle = 'rgba(255,230,190,.25)'; g.fillRect(0, BOT - 16, W0, 2);
  g.strokeStyle = '#4A2C18'; g.lineCap = 'round'; g.lineWidth = 8; g.beginPath(); g.moveTo(-10, H0 - 30); g.quadraticCurveTo(70, 960, 160, 918); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.moveTo(58, 975); g.quadraticCurveTo(84, 930, 70, 896); g.stroke();
  const bloom = (x: number, y: number, r: number) => { g.fillStyle = '#F7BCCB'; for (let k = 0; k < 5; k++) { const a = (k * TAU) / 5 - Math.PI / 2; el(g, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.5); g.fill(); } g.fillStyle = '#E9839F'; el(g, x, y, r * 0.22, r * 0.22); g.fill(); };
  for (const [x, y, r] of [[30, 1000, 14], [58, 966, 12], [94, 944, 13], [130, 926, 12], [156, 914, 10], [72, 898, 11], [40, 940, 10], [112, 972, 9], [16, 962, 9], [178, 930, 8]]) bloom(x, y, r);
  const lx = 548, ly = 1044;
  g.fillStyle = 'rgba(255,200,120,.22)'; el(g, lx, ly - 80, 64, 44); g.fill();
  g.fillStyle = '#8D8A85'; rr(g, lx - 26, ly - 14, 52, 14, 3); g.fill(); g.fillStyle = '#9B9893'; rr(g, lx - 9, ly - 64, 18, 52, 3); g.fill();
  g.fillStyle = '#8D8A85'; rr(g, lx - 24, ly - 74, 48, 12, 3); g.fill(); g.fillStyle = '#A7A49F'; rr(g, lx - 18, ly - 110, 36, 38, 4); g.fill();
  g.fillStyle = '#FFD58A'; rr(g, lx - 10, ly - 102, 20, 20, 2); g.fill();
  g.fillStyle = '#6F6C67'; g.beginPath(); g.moveTo(lx - 34, ly - 108); g.lineTo(lx, ly - 132); g.lineTo(lx + 34, ly - 108); g.closePath(); g.fill(); g.fillStyle = '#8D8A85'; el(g, lx, ly - 134, 6, 6); g.fill();
}
/** the rendered room, plus the words the render leaves to the game (the shop sign, menu slips, めん) */
function roomArt(g: G2) {
  g.drawImage(IMG['room-tall'], 0, 0, WORLD.w, WORLD.h);
  const L = A3.labels; g.textAlign = 'center'; g.fillStyle = '#3B2618';
  if (L.shopsign) { g.font = `900 13px ${FONT}`; g.fillText('まよなか屋', L.shopsign[0], L.shopsign[1] + 5); }
  g.font = `900 8.5px ${FONT}`;
  for (const [k, word] of [['slip0', 'らーめん'], ['slip1', 'ぎょうざ']] as const) { const p = L[k]; if (p) [...word].forEach((ch, i) => g.fillText(ch, p[0], p[1] - 18 + i * 10)); }
  if (L.noodles) { g.fillStyle = 'rgba(255,244,226,.94)'; rr(g, L.noodles[0] - 16, L.noodles[1] - 11, 32, 15, 5); g.fill(); g.fillStyle = '#3B2618'; g.font = `900 11px ${FONT}`; g.fillText('めん', L.noodles[0], L.noodles[1]); }
}
/** a front piece of the render, with what sits on it (dishes and the number on a table, bowls on the island, the topping names) */
function piece(g: G2, o: (typeof A3.occ)[number], v: Snap) {
  if (!ready(o.k)) return;
  g.drawImage(IMG[o.k], o.x, o.y, o.w, o.h);
  if (o.table) {
    const tb = TABLES.find(t => t.id === o.table); if (!tb) return;
    const ry = tb.r * 0.53, ty = tb.y - 6, dirty = v.dirty[tb.id] || 0;
    for (let i = 0; i < dirty; i++) { const a = (i / Math.max(1, dirty)) * TAU; item(g, tb.x + Math.cos(a) * tb.r * 0.42, ty + Math.sin(a) * ry * 0.4 + 2, { k: 'dishes', n: 1 }, 0.9); }
    g.fillStyle = 'rgba(255,244,226,.92)'; el(g, tb.x - tb.r * 0.3, ty - ry + 10, 11, 8.5); g.fill(); g.fillStyle = '#3B2618'; g.font = `900 12px ${FONT}`; g.textAlign = 'center'; g.fillText(String(tb.id), tb.x - tb.r * 0.3, ty - ry + 14.5);
  } else if (o.k === 'island') {
    for (const id of ISLAND) { const it = v.slots[id], p = A3.tops[id]; if (it && p) item(g, p[0], p[1] - 4, it, 0.8); }
    g.textAlign = 'center';
    for (const [k, word] of [['tamago', 'たまご'], ['negi', 'ねぎ'], ['naruto', 'なると']] as const) { const p = A3.labels[k]; if (!p) continue; g.fillStyle = 'rgba(255,244,226,.94)'; rr(g, p[0] - 19, p[1] - 9, 38, 13, 5); g.fill(); g.fillStyle = '#3B2618'; g.font = `900 9.5px ${FONT}`; g.fillText(word, p[0], p[1] + 1); }
  } else if (o.k === 'sink') { const it = v.slots.sink, p = A3.tops.sink; if (it && p) item(g, p[0], p[1] - 4, it, 0.8); }
}
/** a table in the tall shop, drawn in among the people: whoever sits behind it is hidden from the waist down */
function tableTall(g: G2, tb: Table, dirty: number) {
  const ry = tb.r * 0.62, ty = tb.y - 6;
  g.fillStyle = 'rgba(40,20,8,.26)'; el(g, tb.x + 5, tb.y + 26, tb.r * 0.85, tb.r * 0.36); g.fill();
  g.fillStyle = '#3E2212'; g.fillRect(tb.x - 6, ty + ry - 6, 12, 30); el(g, tb.x, tb.y + 26, 17, 5.5); g.fill();
  g.fillStyle = '#8A5531'; el(g, tb.x, ty + 8, tb.r, ry); g.fill();
  const gr = g.createRadialGradient(tb.x - tb.r * 0.35, ty - ry * 0.45, 3, tb.x, ty, tb.r * 1.05); gr.addColorStop(0, '#EDBE84'); gr.addColorStop(1, '#B4773B'); g.fillStyle = gr; el(g, tb.x, ty, tb.r, ry); g.fill();
  g.strokeStyle = 'rgba(255,236,200,.4)'; g.lineWidth = 1.5; el(g, tb.x, ty, tb.r - 5, ry - 4); g.stroke();
  for (let i = 0; i < dirty; i++) { const a = (i / Math.max(1, dirty)) * TAU; item(g, tb.x + Math.cos(a) * tb.r * 0.42, ty + Math.sin(a) * ry * 0.4 + 2, { k: 'dishes', n: 1 }, 0.9); }
  g.fillStyle = 'rgba(255,244,226,.92)'; el(g, tb.x, ty - ry + 9, 11, 8.5); g.fill(); g.fillStyle = '#3B2618'; g.font = `900 12px ${FONT}`; g.textAlign = 'center'; g.fillText(String(tb.id), tb.x, ty - ry + 13.5);
}
function stool(g: G2, x: number, y: number) {
  g.fillStyle = 'rgba(40,20,8,.24)'; el(g, x + 2, y + 3, 13, 5); g.fill();
  g.fillStyle = '#4A2C18'; g.fillRect(x - 10, y - 12, 20, 13); el(g, x, y + 1, 10, 4); g.fill();
  g.fillStyle = '#8A5531'; el(g, x, y - 12, 12, 6); g.fill(); g.fillStyle = 'rgba(255,220,180,.25)'; el(g, x - 2, y - 13, 7, 3); g.fill();
}
/** a pot's doneness: grey while raw, green when ready, amber when soft, red (blinking !) when burnt */
function potRing(g: G2, x: number, y: number, pot: { st: string; t: number }, t: number) {
  const d = doneness(pot as any), p = Math.min(1, pot.t / COOK.burnt);
  g.lineWidth = 5; g.strokeStyle = 'rgba(20,12,8,.4)'; el(g, x, y, 12, 12); g.stroke();
  g.strokeStyle = d === 'raw' ? '#9EA7AF' : d === 'perfect' ? '#5ED3B0' : d === 'ok' ? '#F0B04E' : '#E0563E';
  g.beginPath(); g.arc(x, y, 12, -Math.PI / 2, -Math.PI / 2 + p * TAU); g.stroke();
  if (d === 'burnt' && Math.floor(t * 4) % 2) { g.fillStyle = '#E0563E'; g.font = `900 16px ${FONT}`; g.textAlign = 'center'; g.fillText('！', x, y + 6); }
}

// positions shown smoothly on the partner's phone (snapshots come ~12 times a second)
const SMOOTH = new Map<string, { x: number; y: number }>();
const smooth = (k: string, x: number, y: number, dt: number) => { const s = SMOOTH.get(k); if (!s || Math.hypot(s.x - x, s.y - y) > 120) { const n = { x, y }; SMOOTH.set(k, n); return n; } const a = 1 - Math.exp(-dt * 16); s.x += (x - s.x) * a; s.y += (y - s.y) * a; return s; };

/** topSafe: the world y the HUD reaches down to; a bubble that would go under it hangs below its guests instead */
export function draw(g: G2, v: Snap, me: number, target: Act | null, dt: number, t: number, smoothOthers: boolean, topSafe = -1e9) {
  const tall = ROOM.id === 'tall';
  if (v.shake > 0) g.translate((Math.random() - 0.5) * 12 * v.shake, (Math.random() - 0.5) * 12 * v.shake);
  g.drawImage(room(), 0, 0, WORLD.w, WORLD.h);
  // the pots, with a doneness ring: grey while raw, green when ready, amber when soft, red when burnt
  STATIONS.filter(s => s.kind === 'pot').forEach((s, i) => {
    const tp = top3d(s.id), pot = v.pots[i], cx = tp ? tp[0] : (s.x0 + s.x1) / 2, cy = tp ? tp[1] - 14 : (s.y0 + s.y1) / 2, d = doneness(pot);
    if (tall && pot.st === 'boil') for (let k = -2; k <= 2; k++) { g.fillStyle = `rgba(90,170,255,${(0.55 + 0.3 * Math.sin(t * 20 + k * 2)).toFixed(2)})`; el(g, cx + k * 8, cy + 14, 3, 5 + Math.sin(t * 17 + k) * 1.5); g.fill(); }
    if (!pic(g, 'pot', cx, cy, 50)) { g.fillStyle = '#7A838C'; el(g, cx, cy, 22, 22); g.fill(); }
    if (pot.st !== 'boil') return;
    g.fillStyle = d === 'burnt' ? '#5A4636' : '#F3E9CF'; el(g, cx, cy - 2, 13, 9); g.fill();
    for (let k = 0; k < 4; k++) { const ph = (t * 1.6 + k * 0.27) % 1; g.fillStyle = `rgba(255,255,255,${(0.7 * (1 - ph)).toFixed(2)})`; el(g, cx - 12 + k * 8, cy - 10 - ph * 22, 4 + ph * 4, 3 + ph * 3); g.fill(); }
    if (!tall) potRing(g, cx + ROOM.ring[0], cy + ROOM.ring[1], pot, t); // the tall shop draws it over the cook, below
  });
  const a3 = art3d();
  for (const s of STATIONS) {
    const it = v.slots[s.id]; if (!it || (a3 && (ISLAND.includes(s.id) || s.id === 'sink'))) continue; // those are drawn on their front piece
    const tp = top3d(s.id); item(g, tp ? tp[0] : (s.x0 + s.x1) / 2, (tp ? tp[1] : (s.y0 + s.y1) / 2) - 4, it, s.kind === 'pass' ? 0.62 : 0.8);
  }
  if (!tall) for (const tb of TABLES) { const n = v.dirty[tb.id] || 0; for (let i = 0; i < n; i++) { const a = (i / Math.max(1, n)) * TAU; item(g, tb.x + Math.cos(a) * tb.r * 0.45, tb.y + Math.sin(a) * tb.r * 0.3, { k: 'dishes', n: 1 }); } }
  if (!tall) marks(g, v, me, target, t);
  // everyone, back to front (in the tall shop the tables and their stools too)
  const list: { y: number; f: () => void }[] = [];
  if (tall && a3) for (const o of A3.occ) list.push({ y: o.sort, f: () => piece(g, o, v) });
  else if (tall) for (const tb of TABLES) {
    list.push({ y: tb.y, f: () => tableTall(g, tb, v.dirty[tb.id] || 0) });
    for (const ch of chairsOf(tb)) if (ch.y > 0) list.push({ y: tb.y + ch.y - 0.5, f: () => stool(g, tb.x + ch.x, tb.y + ch.y) });
  }
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
  if (tall) {
    STATIONS.filter(s => s.kind === 'pot').forEach((s, i) => { if (v.pots[i].st === 'boil') { const tp = top3d(s.id); potRing(g, tp ? tp[0] : (s.x0 + s.x1) / 2 + ROOM.ring[0], tp ? tp[1] - 50 : (s.y0 + s.y1) / 2 + ROOM.ring[1], v.pots[i], t); }; });
    marks(g, v, me, target, t);
  }
  groupMarks(g, v, me, t, topSafe);
  for (const f of v.floats) { g.globalAlpha = Math.max(0, 1 - f.t / 1.5); g.fillStyle = f.good ? '#FFE07A' : '#FF8A6B'; g.strokeStyle = 'rgba(40,20,8,.6)'; g.lineWidth = 4; g.font = `900 19px ${FONT}`; g.textAlign = 'center'; g.strokeText(f.txt, f.x, f.y - f.t * 34); g.fillText(f.txt, f.x, f.y - f.t * 34); g.globalAlpha = 1; }
  // rush hour: a red pulse at the edges
  if (v.rush && v.phase === 'play') { const a = 0.18 + Math.sin(t * 5) * 0.08, gr = g.createRadialGradient(WORLD.w / 2, WORLD.h / 2, Math.min(WORLD.w, WORLD.h) * 0.45, WORLD.w / 2, WORLD.h / 2, Math.max(WORLD.w, WORLD.h) * 0.62); gr.addColorStop(0, 'rgba(224,60,40,0)'); gr.addColorStop(1, `rgba(224,60,40,${a.toFixed(2)})`); g.fillStyle = gr; g.fillRect(0, 0, WORLD.w, WORLD.h); }
}
/** what your action button would act on (a dashed outline), and the tables a group you're leading fits at (green) */
function marks(g: G2, v: Snap, me: number, target: Act | null, t: number) {
  const tall = ROOM.id === 'tall', oval = (tb: Table, m: number) => (tall ? el(g, tb.x, tb.y - 6, tb.r + m, tb.r * 0.62 + m) : el(g, tb.x, tb.y, tb.r + m, tb.r * 0.8 + m));
  if (target) {
    g.strokeStyle = 'rgba(94,211,176,.95)'; g.lineWidth = 3; g.setLineDash([7, 5]); g.lineDashOffset = -t * 30;
    if (target.sid) { const s = STATIONS.find(x => x.id === target.sid)!; rr(g, s.x0 - 3, s.y0 - 3, s.x1 - s.x0 + 6, s.y1 - s.y0 + 6, 8); g.stroke(); }
    else if (target.table) { oval(TABLES.find(x => x.id === target.table)!, 10); g.stroke(); }
    g.setLineDash([]);
  }
  const follow = v.groups.find(x => x.st === 'follow' && x.follow === me);
  if (follow) for (const tb of TABLES) {
    const busy = v.groups.some(x => x.table === tb.id && ['seating', 'ask', 'food', 'eat'].includes(x.st)) || (v.dirty[tb.id] || 0) > 0;
    if (busy || tb.seats < follow.size) continue; g.strokeStyle = 'rgba(94,211,176,.6)'; g.lineWidth = 4; oval(tb, 16); g.stroke();
  }
}
/** over each group: patience, the critic / VIP badge, what they need, their reply */
function groupMarks(g: G2, v: Snap, me: number, t: number, topSafe: number) {
  for (const gr of v.groups) {
    if (gr.st === 'out' || gr.st === 'angry') continue;
    const tb = gr.table ? TABLES.find(x => x.id === gr.table) : null, lead = gr.guests[0];
    const x = tb ? tb.x : lead.x, y = tb ? ROOM.headY(tb) : lead.y - GH - 14;
    if (['queue', 'door', 'wait', 'ask', 'food'].includes(gr.st)) { const s = gr.pat < 0.25 ? 1 + Math.sin(t * 18) * 0.12 : 1; g.save(); g.translate(x + 24, y + 6); g.scale(s, s); ring(g, 0, 0, gr.pat); g.restore(); }
    if (gr.kind !== 'normal') { g.fillStyle = gr.kind === 'critic' ? '#1E1E24' : '#E2B33C'; el(g, x - 26, y + 6, 13, 13); g.fill(); g.fillStyle = gr.kind === 'critic' ? '#fff' : '#3B2618'; g.font = `900 ${gr.kind === 'critic' ? 15 : 9}px ${FONT}`; g.textAlign = 'center'; g.fillText(gr.kind === 'critic' ? '評' : 'VIP', x - 26, y + 11); }
    if (gr.reply) {
      if (y - 38 >= topSafe) bubble(g, x, y - 6, gr.reply);
      else bubble(g, x, tb ? tb.y + tb.r * 0.8 + (ROOM.id === 'tall' ? 70 : 12) : lead.y + 12, gr.reply, true); // under the HUD: hang it below them
    }
    else if (gr.st === 'food') { g.fillStyle = 'rgba(255,244,226,.92)'; rr(g, x - 22, y - 10, 44, 22, 9); g.fill(); item(g, x - 7, y + 1, { k: 'bowl', noodles: 'ok', tops: [] }, 0.42); g.fillStyle = '#3B2618'; g.font = `900 12px ${FONT}`; g.textAlign = 'center'; g.fillText(`×${gr.leftN}`, x + 11, y + 6); }
    else if (gr.st !== 'queue' && (wants(v, gr as Group, me) || gr.st === 'ask' || gr.st === 'door')) { const s = 1 + Math.sin(t * 6) * 0.07; g.save(); g.translate(x, y - 2); g.scale(s, s); g.fillStyle = '#FFF4E2'; rr(g, -13, -13, 26, 24, 9); g.fill(); g.fillStyle = '#D8452F'; g.font = `900 18px ${FONT}`; g.textAlign = 'center'; g.fillText('！', 0, 6); g.restore(); }
  }
}
