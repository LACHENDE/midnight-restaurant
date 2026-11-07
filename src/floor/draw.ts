// Drawing the floor from above: wood floor, tables and chairs, the door, the bench, the kitchen pass, the guests and you
import { S, wants, type Group } from './sim';
import { WORLD, TABLES, chairsOf, DOOR, BENCH, PASS, FACE, WHO, type Who } from './data';

const IMG: Partial<Record<string, HTMLImageElement>> = {};
for (const w of WHO) for (const k of ['guest', 'ask']) { const im = new Image(); im.src = `art/${k}-${w}.webp`; IMG[`${k}-${w}`] = im; }
for (const p of ['bowl-full', 'egg', 'negi', 'naruto']) { const im = new Image(); im.src = `art/prop-${p}.webp`; IMG[p] = im; }
const ready = (k: string) => { const im = IMG[k]; return !!(im && im.complete && im.naturalWidth); };

const TAU = Math.PI * 2;
const el = (g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) => { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); };
const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); };

/** the dot-eye face (same look as the side view), drawn around the point between the eyes; a face is 74 units wide */
export function face(g: CanvasRenderingContext2D, mood: '' | 'happy' | 'hmm' | 'eat', t: number, seed: number) {
  const ex = 19, ink = '#2A1810', blink = (t + seed) % 3.7 < 0.12;
  for (const sx of [-1, 1]) { const gr = g.createRadialGradient(sx * 30, 13, 0, sx * 30, 13, 12); gr.addColorStop(0, 'rgba(255,120,120,.55)'); gr.addColorStop(1, 'rgba(255,120,120,0)'); g.fillStyle = gr; el(g, sx * 30, 13, 12, 8); g.fill(); }
  g.lineCap = 'round'; g.strokeStyle = ink;
  if (mood === 'happy' || mood === 'eat') { g.lineWidth = 3.6; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * ex, 3, 6.5, Math.PI * 1.12, Math.PI * 1.88); g.stroke(); } }
  else if (blink) { g.lineWidth = 3.2; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * ex - 5, 1); g.quadraticCurveTo(sx * ex, 4, sx * ex + 5, 1); g.stroke(); } }
  else for (const sx of [-1, 1]) { g.fillStyle = ink; el(g, sx * ex, 0, 6.2, 8.4); g.fill(); }
  if (mood === 'hmm') { g.lineWidth = 2.6; g.beginPath(); g.moveTo(-23, -14); g.lineTo(-12, -11); g.moveTo(23, -14); g.lineTo(12, -11); g.stroke(); }
  g.lineWidth = 2.4; g.beginPath();
  if (mood === 'happy') { g.moveTo(-9, 13); g.quadraticCurveTo(0, 14.5, 9, 13); g.quadraticCurveTo(8, 26, 0, 26); g.quadraticCurveTo(-8, 26, -9, 13); g.closePath(); g.fillStyle = '#7A2418'; g.fill(); }
  else if (mood === 'eat') { el(g, 0, 17, 4.5, 2.6 + Math.abs(Math.sin(t * 14)) * 3); g.fillStyle = '#7A2418'; g.fill(); }
  else if (mood === 'hmm') { g.moveTo(-6, 18); g.quadraticCurveTo(-2, 15, 0, 17); g.quadraticCurveTo(2, 19, 6, 16); g.stroke(); }
  else { g.moveTo(-5, 15); g.quadraticCurveTo(-2.5, 18.5, 0, 15.5); g.quadraticCurveTo(2.5, 18.5, 5, 15); g.stroke(); }
}

const GH = 92; // a figure's height on the floor
/** a guest: their painted picture standing (or sitting) on the floor, face drawn on top */
function guest(g: CanvasRenderingContext2D, who: Who, x: number, y: number, mood: '' | 'happy' | 'hmm' | 'eat', ask: boolean, bob: number, seed: number) {
  g.fillStyle = 'rgba(30,14,6,.28)'; el(g, x, y, 24, 8); g.fill();
  const key = `${ask && ready(`ask-${who}`) ? 'ask' : 'guest'}-${who}`;
  if (!ready(key)) { g.fillStyle = '#C8463A'; el(g, x, y - 30, 20, 26); g.fill(); return; }
  const im = IMG[key]!, H = GH, W = (H * im.naturalWidth) / im.naturalHeight, x0 = x - W / 2, y0 = y - H + 4 + bob;
  g.drawImage(im, x0, y0, W, H);
  const F = FACE[who], fw = (71 / 212) * H, u = fw / 74;
  g.save(); g.translate(x0 + F.x * W, y0 + F.t * H + fw * 0.25); g.scale(u, u); face(g, mood, S.t, seed); g.restore();
}
/** you: a waiter in a navy apron, from above-front like the guests */
function waiter(g: CanvasRenderingContext2D, x: number, y: number, moving: boolean) {
  const bob = moving ? Math.abs(Math.sin(S.t * 12)) * 3 : 0;
  g.fillStyle = 'rgba(30,14,6,.3)'; el(g, x, y, 24, 8); g.fill();
  g.save(); g.translate(x, y - bob);
  g.fillStyle = '#F4EFE6'; rr(g, -22, -46, 44, 44, 16); g.fill(); // white shirt
  g.fillStyle = '#23305C'; rr(g, -18, -34, 36, 34, 10); g.fill(); // navy apron
  g.fillStyle = '#F6CBA4'; el(g, 0, -64, 25, 23); g.fill(); // head
  g.fillStyle = '#2B2420'; g.beginPath(); g.ellipse(0, -72, 26, 18, 0, Math.PI, TAU); g.fill(); // hair
  g.fillStyle = '#C8463A'; rr(g, -26, -84, 52, 9, 4); g.fill(); // red hachimaki
  g.translate(0, -58); g.scale(0.5, 0.5); face(g, '', S.t, 1.3);
  g.restore();
}
function bowl(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  if (ready('bowl-full')) { const im = IMG['bowl-full']!, w = 46 * s, h = (w * im.naturalHeight) / im.naturalWidth; g.drawImage(im, x - w / 2, y - h / 2, w, h); }
  else { g.fillStyle = '#fff'; el(g, x, y, 20 * s, 12 * s); g.fill(); g.fillStyle = '#E4A453'; el(g, x, y - 2 * s, 16 * s, 8 * s); g.fill(); }
}
function bubble(g: CanvasRenderingContext2D, x: number, y: number, txt: string) {
  g.font = '900 17px "M PLUS Rounded 1c", system-ui'; const w = g.measureText(txt).width + 26;
  g.fillStyle = '#FFF4E2'; rr(g, x - w / 2, y - 34, w, 32, 12); g.fill(); g.beginPath(); g.moveTo(x - 7, y - 2); g.lineTo(x, y + 8); g.lineTo(x + 7, y - 2); g.fill();
  g.fillStyle = '#3B2618'; g.textAlign = 'center'; g.fillText(txt, x, y - 12);
}

let floorLayer: HTMLCanvasElement | null = null;
function floor(): HTMLCanvasElement {
  if (floorLayer) return floorLayer;
  const c = document.createElement('canvas'); c.width = WORLD.w; c.height = WORLD.h; const g = c.getContext('2d')!;
  // warm wooden planks
  g.fillStyle = '#8C5732'; g.fillRect(0, 0, WORLD.w, WORLD.h);
  for (let y = 0, r = 0; y < WORLD.h; y += 40, r++) for (let x = r % 2 ? -110 : 0, k = 0; x < WORLD.w; x += 220, k++) {
    g.fillStyle = (r * 7 + k * 3) % 4 === 0 ? 'rgba(255,220,170,.06)' : (r + k) % 3 === 0 ? 'rgba(40,18,6,.07)' : 'rgba(0,0,0,0)'; g.fillRect(x, y, 220, 40);
    g.fillStyle = 'rgba(40,18,6,.16)'; g.fillRect(x, y, 1.5, 40); }
  g.fillStyle = 'rgba(40,18,6,.14)'; for (let y = 40; y < WORLD.h; y += 40) g.fillRect(0, y - 1, WORLD.w, 1.5);
  // the back wall with noren and lanterns
  g.fillStyle = '#4A2814'; g.fillRect(0, 0, WORLD.w, 30); g.fillStyle = '#B8332A'; for (let x = 20; x < 860; x += 70) { rr(g, x, 8, 60, 26, 4); g.fill(); }
  // the kitchen behind the pass
  g.fillStyle = '#C9CFD4'; g.fillRect(880, 0, 120, WORLD.h); g.fillStyle = '#8E979F'; g.fillRect(880, 0, 6, WORLD.h);
  g.fillStyle = '#6E4026'; rr(g, 848, PASS.y - 70, 40, 140, 8); g.fill(); g.fillStyle = '#B8332A'; g.fillRect(852, PASS.y - 66, 32, 12);
  g.fillStyle = '#5E6770'; el(g, 945, 120, 34, 30); g.fill(); g.fillStyle = '#E9F4F6'; el(g, 945, 118, 28, 24); g.fill();
  g.fillStyle = '#5E6770'; el(g, 945, 440, 28, 26); g.fill(); g.fillStyle = '#B06A2E'; el(g, 945, 438, 23, 20); g.fill();
  // the door and its mat
  g.fillStyle = '#3A2012'; g.fillRect(DOOR.x - 70, WORLD.h - 10, 160, 10); g.fillStyle = '#5E7B4C'; rr(g, DOOR.x - 55, WORLD.h - 52, 130, 40, 8); g.fill();
  g.fillStyle = '#FFF4E2'; g.font = '900 13px "M PLUS Rounded 1c", system-ui'; g.textAlign = 'center'; g.fillText('いりぐち', DOOR.x + 10, WORLD.h - 26);
  // the waiting bench
  g.fillStyle = '#6E4026'; rr(g, BENCH.x - 34, BENCH.y - 80, 22, 160, 6); g.fill();
  // tables and chairs
  for (const t of TABLES) {
    for (const ch of chairsOf(t)) { g.fillStyle = '#5A3520'; el(g, t.x + ch.x, t.y + ch.y + 4, 16, 14); g.fill(); g.fillStyle = '#7A4A28'; el(g, t.x + ch.x, t.y + ch.y, 15, 12); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.25)'; el(g, t.x + 4, t.y + 8, t.r, t.r * 0.8); g.fill();
    const gr = g.createRadialGradient(t.x - t.r * 0.3, t.y - t.r * 0.3, 4, t.x, t.y, t.r); gr.addColorStop(0, '#D9A066'); gr.addColorStop(1, '#A26830');
    g.fillStyle = gr; el(g, t.x, t.y, t.r, t.r * 0.8); g.fill();
    g.fillStyle = 'rgba(59,38,24,.55)'; g.font = '900 12px "M PLUS Rounded 1c", system-ui'; g.fillText(`${t.seats}席`, t.x, t.y + 4);
  }
  return (floorLayer = c);
}

export function draw(g: CanvasRenderingContext2D, hoverTable: string | null) {
  g.drawImage(floor(), 0, 0);
  // tables you could seat the following group at glow; the taken ones don't
  const follow = S.groups.find(x => x.st === 'follow');
  if (follow) for (const t of TABLES) { const ok = t.seats >= follow.size && !S.groups.some(x => x.table === t && x.st !== 'gone'); g.strokeStyle = ok ? 'rgba(94,211,176,.95)' : 'rgba(224,106,78,.6)'; g.lineWidth = hoverTable === t.id ? 5 : 3; g.setLineDash([8, 6]); el(g, t.x, t.y, t.r + 12, t.r * 0.8 + 12); g.stroke(); g.setLineDash([]); }
  // bowls on the pass, the kitchen cooking
  S.ready.forEach((b, i) => bowl(g, PASS.x + 2, PASS.y - 40 + i * 30, 0.8));
  if (S.cooking.length) { g.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 3; i++) { el(g, 945 + Math.sin(S.t * 2 + i) * 8, 90 - ((S.t * 30 + i * 20) % 50), 10, 8); g.fill(); } }
  // しばBot the cook
  g.fillStyle = '#E39A4E'; el(g, 945, 280, 28, 25); g.fill(); g.beginPath(); g.moveTo(925, 266); g.lineTo(930, 244); g.lineTo(942, 260); g.moveTo(965, 266); g.lineTo(960, 244); g.lineTo(948, 260); g.fill();
  g.fillStyle = '#FFF4E2'; el(g, 945, 290, 15, 10); g.fill(); g.fillStyle = '#2A1810'; el(g, 936, 276, 3, 4); g.fill(); el(g, 954, 276, 3, 4); g.fill();
  // everyone, back to front
  type D = { y: number; f: () => void };
  const list: D[] = [];
  for (const gr of S.groups) {
    if (gr.st === 'gone' && gr.guests.every(q => q.w.idle)) continue;
    gr.guests.forEach((q, i) => list.push({ y: q.w.y, f: () => {
      const mood = gr.mood || (gr.st === 'eat' ? 'eat' : gr.st === 'bye' || gr.st === 'gone' ? 'happy' : '');
      guest(g, q.who, q.w.x, q.w.y, mood, gr.st === 'ask' && i === 0, q.w.moving ? -Math.abs(Math.sin(S.t * 10 + i)) * 3 : 0, gr.id + i);
      if (gr.st === 'eat' && q.eaten < 1) bowl(g, q.w.x, q.w.y - 10, 0.75);
    } }));
  }
  list.push({ y: S.player.y, f: () => { waiter(g, S.player.x, S.player.y, S.player.moving); S.carry.forEach((_, i) => bowl(g, S.player.x + (i ? 22 : -22), S.player.y - 52, 0.7)); if (S.tickets.length) { g.fillStyle = '#FFF4E2'; rr(g, S.player.x + 18, S.player.y - 100, 22, 26, 3); g.fill(); g.fillStyle = '#C8463A'; g.font = '900 11px system-ui'; g.fillText(`${S.tickets.length}`, S.player.x + 29, S.player.y - 82); } } });
  list.sort((a, b) => a.y - b.y).forEach(d => d.f());
  // who needs you: a ！ (or their reply) over the group
  for (const gr of S.groups) {
    const p = gr.table ? { x: gr.table.x, y: gr.table.y - gr.table.r - 30 } : { x: gr.guests[0].w.x, y: gr.guests[0].w.y - GH - 6 };
    if (gr.reply) bubble(g, p.x, p.y, gr.reply);
    else if (wants(gr) && gr.st !== 'wait') { const s = 1 + Math.sin(S.t * 6) * 0.06; g.save(); g.translate(p.x, p.y - 14); g.scale(s, s); g.fillStyle = '#FFF4E2'; rr(g, -15, -15, 30, 28, 10); g.fill(); g.fillStyle = '#D8452F'; g.font = '900 20px system-ui'; g.textAlign = 'center'; g.fillText('！', 0, 7); g.restore(); }
  }
  // floating +¥ and ？
  for (const f of S.floats) { g.globalAlpha = 1 - f.t / 1.4; g.fillStyle = f.good ? '#FFE07A' : '#FF8A6B'; g.font = '900 20px "M PLUS Rounded 1c", system-ui'; g.textAlign = 'center'; g.fillText(f.txt, f.x, f.y - f.t * 30); g.globalAlpha = 1; }
}
export type { Group };
