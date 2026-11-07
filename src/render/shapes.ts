// drawing: soft toy shapes
import { G } from '../game/G';
import { ART, KEN, KEN_MOOD, KEN_TUNE, VW, artReady, kenFrame } from './stage';
import { FACE, FACE_ASK, WORDS, prop } from '../data/content';
import { TAU, clamp } from '../core/env';

export function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
export function el(g, x, y, rx, ry) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
}
export function lg(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}
export function rg(g, x, y, r0, r1, stops) {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}
export function shadow(g, x, y, rx, ry, a = 0.28) {
  g.fillStyle = `rgba(40,18,8,${a})`;
  el(g, x, y, rx, ry);
  g.fill();
}
export const SPR: Record<string, HTMLCanvasElement> = {};
export function sprite(name, w, h, draw) {
  if (SPR[name]) return SPR[name];
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  return (SPR[name] = c);
}
export const glowSpr = col =>
  sprite('g' + col, 128, 128, g => {
    g.fillStyle = rg(g, 64, 64, 0, 64, [
      [0, col],
      [1, 'rgba(0,0,0,0)'],
    ]);
    g.fillRect(0, 0, 128, 128);
  });
export const steamSpr = () =>
  sprite('steam', 96, 96, g => {
    g.fillStyle = rg(g, 48, 48, 0, 48, [
      [0, 'rgba(255,255,255,.55)'],
      [1, 'rgba(255,255,255,0)'],
    ]);
    g.fillRect(0, 0, 96, 96);
  });
// the three toppings
export function drawEgg(g, x, y, s, rot) {
  g.save();
  g.translate(x, y);
  g.rotate(rot || 0);
  g.scale(s, s);
  el(g, 0, 0, 15, 11);
  g.fillStyle = rg(g, -4, -4, 2, 16, [
    [0, '#FFFDF6'],
    [1, '#EAD9BE'],
  ]);
  g.fill();
  g.strokeStyle = 'rgba(176,112,52,.55)';
  g.lineWidth = 2.2;
  g.stroke();
  el(g, 1.5, 0.5, 8.5, 7);
  g.fillStyle = rg(g, 0, -1, 1, 9, [
    [0, '#FFC23A'],
    [0.6, '#F28A1E'],
    [1, '#D9621A'],
  ]);
  g.fill();
  el(g, -1.5, -2, 3, 2);
  g.fillStyle = 'rgba(255,255,255,.6)';
  g.fill();
  g.restore();
}
export function drawNegi(g, x, y, s, seedN) {
  let sd = seedN || 3;
  const r = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 7; i++) {
    const a = r() * TAU,
      d = r() * 11 * s,
      cx = x + Math.cos(a) * d,
      cy = y + Math.sin(a) * d * 0.6;
    el(g, cx, cy, 3.6 * s, 3 * s);
    g.fillStyle = i % 3 ? '#6BB547' : '#9AD16A';
    g.fill();
    el(g, cx, cy, 1.6 * s, 1.3 * s);
    g.fillStyle = '#DDF2C2';
    g.fill();
  }
}
export function drawNaruto(g, x, y, s, rot) {
  g.save();
  g.translate(x, y);
  g.rotate(rot || 0);
  g.scale(s, s);
  g.beginPath();
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * TAU,
      r = 13 + Math.sin(a * 12) * 1.1;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.82);
  }
  g.closePath();
  g.fillStyle = rg(g, -3, -3, 1, 14, [
    [0, '#FFFFFF'],
    [1, '#EDE3DA'],
  ]);
  g.fill();
  g.strokeStyle = '#F08AB0';
  g.lineWidth = 2.6;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * TAU * 1.7,
      r = 1 + i * 0.24;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.82);
  }
  g.stroke();
  g.restore();
}
export const TOP_CODE = {
  tamago: (g, x, y, s) => {
    drawEgg(g, x - 7 * s, y, s * 0.95, -0.15);
    drawEgg(g, x + 9 * s, y + 3 * s, s * 0.95, 0.2);
  },
  negi: (g, x, y, s) => drawNegi(g, x, y, s, 5),
  naruto: (g, x, y, s) => {
    drawNaruto(g, x - 5 * s, y, s * 0.9, 0.2);
    drawNaruto(g, x + 8 * s, y + 4 * s, s * 0.9, -0.3);
  },
};
// where each topping sits in a bowl (fractions of the bowl's radii), so it can be picked off again
export const TOP_SPR = { tamago: 'egg', negi: 'negi', naruto: 'naruto' };
export const TOP_DRAW = {};
export const TOP_POS = { tamago: [-0.42, 0.08], negi: [0, -0.28], naruto: [0.42, 0.12] };
export const DONE_COL = { raw: '#F3E9CF', ready: '#F2C64E', soft: '#EED99A', soggy: '#EFE6C2' };
export function noodleLines(g, x, y, rx, ry, s, n, col, lw) {
  g.strokeStyle = 'rgba(120,80,20,.3)';
  g.lineWidth = lw + 1.4 * s;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const yy = y - ry * 0.45 + i * ry * 0.16;
      g.beginPath();
      for (let k = 0; k <= 12; k++) {
        const xx = x - rx * 0.7 + k * rx * 0.117,
          w = Math.sin(k * 1.3 + i * 2.1) * 2.3 * s;
        k ? g.lineTo(xx, yy + w) : g.moveTo(xx, yy + w);
      }
      g.stroke();
    }
    g.strokeStyle = col;
    g.lineWidth = lw;
  }
}
// a bowl from the counter: white, with the red stripes; b = {noodles, broth, tops}; eaten 0..1
export function drawBowl(g, x, y, s, b, eaten = 0) {
  const rx = 58 * s,
    ry = 19 * s,
    h = 46 * s;
  if (artReady('prop-bowl')) {
    shadow(g, x, y + h - 1 * s, rx * 0.82, ry * 0.5, 0.32);
    prop(g, 'bowl', x, y, s);
    if (!b) return;
    // the painted full bowl fades in as broth (and noodles) go in, and out as it's eaten
    const lv = clamp(Math.max(b.broth || 0, b.noodles ? 0.5 : 0), 0, 1) * (1 - eaten);
    if (lv > 0.02) {
      g.save();
      g.globalAlpha *= lv;
      prop(g, 'bowl-full', x, y, s);
      g.restore();
    }
    if (eaten < 0.6)
      for (const t of b.tops || []) {
        const p = TOP_POS[t];
        TOP_DRAW[t](g, x + p[0] * rx, y + p[1] * ry, s * 0.8);
      }
    return;
  }
  shadow(g, x, y + h - 1 * s, rx * 0.82, ry * 0.5, 0.32);
  g.save();
  g.beginPath();
  g.moveTo(x - rx, y);
  g.bezierCurveTo(x - rx * 0.95, y + h * 0.75, x - rx * 0.45, y + h, x, y + h);
  g.bezierCurveTo(x + rx * 0.45, y + h, x + rx * 0.95, y + h * 0.75, x + rx, y);
  g.closePath();
  g.clip();
  g.fillStyle = lg(g, x - rx, 0, x + rx, 0, [
    [0, '#E2D6C6'],
    [0.38, '#FFFCF6'],
    [1, '#D3C6B4'],
  ]);
  g.fillRect(x - rx, y - 2, rx * 2, h + 4);
  g.fillStyle = '#D2402F';
  for (let i = -6; i <= 6; i++) {
    const u = i / 6.6,
      cx = x + Math.sin(u * 1.4) * rx;
    el(g, cx, y + h * 0.62, rx * 0.045 * (1 - Math.abs(u) * 0.55), h * 0.5);
    g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,.35)';
  el(g, x - rx * 0.45, y + h * 0.35, rx * 0.12, h * 0.3);
  g.fill();
  g.restore();
  el(g, x, y, rx, ry);
  g.fillStyle = '#FFF9F0';
  g.fill();
  el(g, x, y + 1.5 * s, rx * 0.9, ry * 0.8);
  g.fillStyle = '#EADFCF';
  g.fill();
  if (!b) return;
  const lv = clamp(b.broth || 0, 0, 1.1) * (1 - eaten * 0.85);
  g.save();
  el(g, x, y + 1.5 * s, rx * 0.9, ry * 0.8);
  g.clip();
  if (lv > 0.02) {
    const sc = 0.55 + 0.45 * Math.min(1, lv),
      sy = y + (1 - Math.min(1, lv)) * ry * 0.55;
    g.fillStyle = rg(g, x - rx * 0.2, sy - 2 * s, 2, rx, [
      [0, '#E4A453'],
      [1, '#9A5622'],
    ]);
    el(g, x, sy + 1.5 * s, rx * 0.9 * sc, ry * 0.8 * sc);
    g.fill();
    g.fillStyle = 'rgba(255,236,190,.4)';
    [
      [-0.5, -0.2],
      [-0.2, 0.3],
      [0.3, -0.35],
      [0.55, 0.15],
      [0.05, -0.05],
    ].forEach(([fx, fy]) => {
      el(g, x + fx * rx * 0.75 * sc, sy + fy * ry * 0.6 * sc, 2.4 * s, 1.3 * s);
      g.fill();
    });
  }
  const n = Math.round(7 * (1 - eaten));
  if (b.noodles && n > 0)
    noodleLines(
      g,
      x,
      y,
      rx,
      ry,
      s,
      n,
      DONE_COL[b.noodles] || DONE_COL.ready,
      (b.noodles === 'soggy' ? 3.6 : b.noodles === 'soft' ? 3 : 2.4) * s,
    );
  g.restore();
  if (eaten < 0.6)
    for (const t of b.tops || []) {
      const p = TOP_POS[t];
      TOP_DRAW[t](g, x + p[0] * rx, y + p[1] * ry, s);
    }
}
export const bowlTopAt = (x, y, s, t) => {
  const p = TOP_POS[t];
  return { x: x + p[0] * 58 * s, y: y + p[1] * 19 * s };
};
export function drawBasket(g, x, y, full, done, dip) {
  // a noodle basket with its wooden handle; dip: drawn sunk into the pot (only the rim shows)
  if (prop(g, full ? 'basket-full' : 'basket', x, y)) return;
  g.lineCap = 'round';
  g.strokeStyle = '#7A5236';
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(x + 18, y - 8);
  g.lineTo(x + 48, y - 62);
  g.stroke();
  g.strokeStyle = '#A27750';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x + 20, y - 12);
  g.lineTo(x + 46, y - 58);
  g.stroke();
  g.strokeStyle = '#B8C0C8';
  g.lineWidth = 2.6;
  g.beginPath();
  g.moveTo(x + 12, y - 2);
  g.lineTo(x + 22, y - 14);
  g.stroke();
  if (!dip) {
    g.beginPath();
    g.moveTo(x - 27, y);
    g.lineTo(x - 15, y + 40);
    g.lineTo(x + 15, y + 40);
    g.lineTo(x + 27, y);
    g.closePath();
    g.fillStyle = 'rgba(60,66,74,.75)';
    g.fill();
    g.strokeStyle = 'rgba(210,218,226,.55)';
    g.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      g.beginPath();
      g.moveTo(x + i * 9, y);
      g.lineTo(x + i * 4.5, y + 40);
      g.stroke();
    }
    for (let k = 1; k < 4; k++) {
      const yy = y + k * 10,
        w = 27 - k * 3;
      g.beginPath();
      g.moveTo(x - w, yy);
      g.lineTo(x + w, yy);
      g.stroke();
    }
    if (full) {
      g.save();
      g.beginPath();
      g.moveTo(x - 25, y + 1);
      g.lineTo(x - 14, y + 38);
      g.lineTo(x + 14, y + 38);
      g.lineTo(x + 25, y + 1);
      g.closePath();
      g.clip();
      g.strokeStyle = DONE_COL[done || 'raw'];
      g.lineWidth = 2.6;
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        for (let k = 0; k <= 8; k++) {
          const xx = x - 24 + k * 6,
            yy = y + 6 + i * 5 + Math.sin(k * 1.7 + i) * 2;
          k ? g.lineTo(xx, yy) : g.moveTo(xx, yy);
        }
        g.stroke();
      }
      g.restore();
    }
  }
  el(g, x, y, 28, 9);
  g.fillStyle = full ? DONE_COL[done || 'raw'] : 'rgba(40,46,52,.85)';
  g.fill();
  g.strokeStyle = '#D9E0E6';
  g.lineWidth = 2.4;
  g.stroke();
}
export function drawLadle(g, x, y) {
  if (prop(g, 'ladle', x, y)) return;
  g.lineCap = 'round';
  g.strokeStyle = '#9AA3AD';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(x + 12, y - 4);
  g.lineTo(x + 46, y - 56);
  g.stroke();
  g.strokeStyle = '#5E4030';
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(x + 40, y - 46);
  g.lineTo(x + 52, y - 66);
  g.stroke();
  el(g, x, y, 18, 10);
  g.fillStyle = lg(g, x - 18, 0, x + 18, 0, [
    [0, '#8A939C'],
    [0.5, '#DCE3E9'],
    [1, '#7E8790'],
  ]);
  g.fill();
  el(g, x, y - 1, 14, 6.5);
  g.fillStyle = '#B06A2E';
  g.fill();
}
export function drawPotBody(g, x, y, rx, h, c1, c2) {
  g.beginPath();
  g.moveTo(x - rx, y);
  g.lineTo(x - rx + 4, y + h);
  g.quadraticCurveTo(x, y + h + 16, x + rx - 4, y + h);
  g.lineTo(x + rx, y);
  g.closePath();
  g.fillStyle = lg(g, x - rx, 0, x + rx, 0, [
    [0, c1],
    [0.35, c2],
    [0.6, '#9AA3AC'],
    [1, c1],
  ]);
  g.fill();
}
export function drawTeapot(g, x, y, tilt) {
  g.save();
  g.translate(x, y);
  g.rotate(tilt || 0);
  shadow(g, 0, 24, 30, 7, 0.25);
  g.beginPath();
  g.moveTo(26, 0);
  g.quadraticCurveTo(46, -6, 52, -22);
  g.lineTo(44, -20);
  g.quadraticCurveTo(38, -8, 24, -6);
  g.fillStyle = '#E9E3D8';
  g.fill();
  el(g, 0, 0, 30, 26);
  g.fillStyle = rg(g, -8, -10, 2, 34, [
    [0, '#FFFFFF'],
    [1, '#D9D2C6'],
  ]);
  g.fill();
  g.strokeStyle = '#3E6EA8';
  g.lineWidth = 2.4;
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    for (let i = 0; i <= 10; i++) {
      const xx = -24 + i * 4.8,
        yy = 4 + k * 7 + Math.sin(i * 1.4) * 2;
      i ? g.lineTo(xx, yy) : g.moveTo(xx, yy);
    }
    g.stroke();
  }
  el(g, 0, -24, 13, 5);
  g.fillStyle = '#D9D2C6';
  g.fill();
  el(g, 0, -28, 5, 4);
  g.fillStyle = '#3E6EA8';
  g.fill();
  g.strokeStyle = '#7A5236';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(0, -14, 24, Math.PI * 1.15, Math.PI * 1.85);
  g.stroke();
  g.restore();
}
export function drawCup(g, x, y, lvl) {
  shadow(g, x, y + 16, 15, 4, 0.22);
  g.beginPath();
  g.moveTo(x - 14, y - 12);
  g.lineTo(x - 11, y + 14);
  g.quadraticCurveTo(x, y + 18, x + 11, y + 14);
  g.lineTo(x + 14, y - 12);
  g.closePath();
  g.fillStyle = lg(g, x - 14, 0, x + 14, 0, [
    [0, '#E6DED1'],
    [0.4, '#FFFCF4'],
    [1, '#D8CFC1'],
  ]);
  g.fill();
  g.strokeStyle = '#3E6EA8';
  g.lineWidth = 1.8;
  g.beginPath();
  for (let i = 0; i <= 6; i++) {
    const xx = x - 12 + i * 4,
      yy = y + 4 + Math.sin(i * 1.5) * 1.6;
    i ? g.lineTo(xx, yy) : g.moveTo(xx, yy);
  }
  g.stroke();
  el(g, x, y - 12, 14, 4.5);
  g.fillStyle = '#F4EEE4';
  g.fill();
  if (lvl > 0.05) {
    el(g, x, y - 11, 12 * Math.min(1, 0.6 + 0.4 * lvl), 3.6);
    g.fillStyle = lvl > 1.05 ? '#9DB06A' : '#A9B86E';
    g.fill();
  }
}
export function drawCoins(g, x, y, v) {
  for (let i = 0; i < 3; i++) {
    el(g, x + (i - 1) * 7, y - i * 4, 13, 5);
    g.fillStyle = i === 2 ? '#F2C94C' : '#C9A23A';
    g.fill();
    g.strokeStyle = '#8A6A1F';
    g.lineWidth = 1;
    g.stroke();
  }
  g.fillStyle = '#FFF3C8';
  g.font = '900 12px "M PLUS Rounded 1c"';
  g.textAlign = 'center';
  g.fillText('¥' + v, x, y - 18);
}
export function drawLantern(g, x, y, s, txt) {
  g.drawImage(glowSpr('rgba(255,150,60,.5)'), x - 80 * s, y - 70 * s, 160 * s, 150 * s);
  g.fillStyle = '#2A1A12';
  rr(g, x - 12 * s, y - 34 * s, 24 * s, 7 * s, 2 * s);
  g.fill();
  rr(g, x - 12 * s, y + 27 * s, 24 * s, 7 * s, 2 * s);
  g.fill();
  el(g, x, y, 25 * s, 30 * s);
  g.fillStyle = rg(g, x - 6 * s, y - 8 * s, 2, 32 * s, [
    [0, '#FFE3A2'],
    [0.5, '#FF9A3D'],
    [1, '#D2582A'],
  ]);
  g.fill();
  g.strokeStyle = 'rgba(150,60,20,.35)';
  g.lineWidth = 1.4 * s;
  for (let k = -2; k <= 2; k++) {
    const yy = y + k * 10 * s,
      half = 25 * s * Math.sqrt(Math.max(0, 1 - ((k * 10) / 30) ** 2));
    g.beginPath();
    g.moveTo(x - half, yy);
    g.lineTo(x + half, yy);
    g.stroke();
  }
  if (txt) {
    g.fillStyle = 'rgba(90,20,10,.8)';
    g.font = `900 ${15 * s}px "M PLUS Rounded 1c"`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(txt, x, y + 1);
    g.textBaseline = 'alphabetic';
  }
}
export function drawNoren(g, y0, h, panels) {
  const w = VW / panels;
  for (let i = 0; i < panels; i++) {
    const x = i * w + 2;
    g.fillStyle = lg(g, 0, y0, 0, y0 + h, [
      [0, '#B8332A'],
      [1, '#9C2722'],
    ]);
    rr(g, x, y0 - 8, w - 4, h + 8, 6);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.07)';
    g.fillRect(x + 4, y0, 4, h - 6);
  }
  // the stall's mark on the middle panel: a bowl with steam
  const cx = VW / 2 + (panels % 2 ? 0 : w / 2) - (panels % 2 ? 0 : w / 2),
    cy = y0 + h * 0.5;
  g.strokeStyle = 'rgba(255,244,226,.9)';
  g.lineWidth = 3;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx - 16, cy);
  g.quadraticCurveTo(cx, cy + 18, cx + 16, cy);
  g.closePath();
  g.stroke();
  for (let k = -1; k <= 1; k++) {
    g.beginPath();
    g.moveTo(cx + k * 7, cy - 6);
    g.quadraticCurveTo(cx + k * 7 + 4, cy - 11, cx + k * 7, cy - 16);
    g.stroke();
  }
}
// a guest: chunky toy figure, dot eyes, blush; mood '', 'happy', 'eat', 'hmm', 'ask'
// Ken's still picture and clips draw a little bigger than the other guests (the beanie); KEN_SIZE brings him in line
export let KEN_SIZE = 1;
export function drawGuest(g, L, x, y, s, mood, o: any = {}) {
  if (L.id === 'ken') s *= KEN_SIZE;
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  const bob = o.bob || 0;
  g.translate(0, bob);
  shadow(g, 0, 6, 46, 9, 0.18);
  if (o.clip && L.id === 'ken' && KEN.d) {
    const c = KEN.d.clips[o.clip.id],
      im = c && KEN.im[c.file];
    if (im && im.complete && im.naturalWidth) {
      // the export is the still picture × refScale on one canvas: one scale for every clip, and its anchor (his jacket
      // bottom) sits where the still picture's jacket bottom does
      const D = KEN.d,
        sb = D.stillBottom,
        f = kenFrame(c, o.clip.t, o.clip.loop),
        k = (GUEST_H / sb.h / D.refScale) * (KEN_TUNE.size[o.clip.id] || 1),
        P = KEN_TUNE.pos[o.clip.id] || [0, 0],
        ay = 26 - GUEST_H + (sb.b * GUEST_H) / sb.h + P[1],
        [cx0, cy0, cx1, cy1] = c.crop,
        x0 = (cx0 - D.anchor[0]) * k + P[0],
        y0 = ay + (cy0 - D.anchor[1]) * k;
      g.drawImage(im, (f % c.cols) * c.fw, Math.floor(f / c.cols) * c.fh, c.fw, c.fh, x0, y0, (cx1 - cx0) * k, (cy1 - cy0) * k);
      const F = c.faces[f]; // [x, top under the bangs, tilt] in export pixels
      if (F) {
        const fw = FACE_W; // the same face size as every other guest
        g.translate((F[0] - D.anchor[0]) * k + P[0], ay + (F[1] - D.anchor[1]) * k + fw * 0.25);
        g.rotate(F[2] || 0); // turned with his head's tilt (from the beanie brim)
        g.scale(fw / 74, fw / 74);
        face(g, KEN_MOOD[o.clip.id] || (mood === 'happy' ? 'happy' : ''), { t: o.t, seed: 2 });
      }
      g.restore();
      return;
    }
  }
  if (artReady('guest-' + L.id)) {
    const ask = mood === 'ask' && artReady('ask-' + L.id),
      im = ART[(ask ? 'ask-' : 'guest-') + L.id],
      F = (ask ? FACE_ASK : FACE)[L.id],
      H = GUEST_H,
      W = (H * im.naturalWidth) / im.naturalHeight,
      top = 26 - H;
    g.drawImage(im, -W / 2, top, W, H);
    const fw = FACE_W; // one face size for everyone (the pictures' own face widths differ a little)
    g.translate(-W / 2 + F.x * W, top + F.t * H + fw * 0.25);
    g.scale(fw / 74, fw / 74);
    face(g, mood, { t: o.t, seed: L.id.length * 0.61 });
    g.restore();
    return;
  }
  // body and arms
  g.fillStyle = lg(g, 0, -70, 0, 10, [
    [0, L.coat],
    [1, shade(L.coat, -0.25)],
  ]);
  rr(g, -42, -70, 84, 90, 26);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.12)';
  rr(g, -34, -64, 20, 60, 10);
  g.fill();
  if (mood === 'ask') {
    g.fillStyle = L.coat;
    rr(g, 26, -118, 18, 56, 9);
    g.fill();
    g.fillStyle = L.skin;
    el(g, 35, -122, 10, 10);
    g.fill();
  }
  // head
  g.fillStyle = rg(g, -12, -128, 6, 52, [
    [0, lighten(L.skin, 0.12)],
    [1, shade(L.skin, -0.12)],
  ]);
  el(g, 0, -112, 46, 42);
  g.fill();
  hair(g, L);
  g.translate(0, -106);
  face(g, mood, { t: o.t, seed: L.id.length * 0.61 });
  g.restore();
}
export const GUEST_H = 212;
// every guest's drawn face (eyes, cheeks, mouth) is this wide on the stage at scale 1: the size of most guests' painted faces
export const FACE_W = 71;
// a painted guest's height on the stage at scale 1
// Ken's face width on the stage in his still picture: his clips are scaled to match it
export const KEN_FACE = () =>
  FACE.ken.w *
  GUEST_H *
  (artReady('guest-ken') ? ART['guest-ken'].naturalWidth / ART['guest-ken'].naturalHeight : 0.914);
// the face, drawn around the point between the eyes (units: a face 74 wide), in the owner's target style:
// tall solid dark eyes, soft round cheeks, a small smile, and a wide open laugh when happy; blinks every few seconds
export function face(g, mood, o) {
  const ex = 19,
    blink = ((o.t || G.clock) + (o.seed || 0)) % 3.7 < 0.12,
    ink = '#2A1810';
  for (const sx of [-1, 1]) {
    g.fillStyle = rg(g, sx * 30, 13, 0, 12, [
      [0, 'rgba(255,120,120,.55)'],
      [1, 'rgba(255,120,120,0)'],
    ]);
    el(g, sx * 30, 13, 12, 8);
    g.fill();
  }
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = ink;
  if (mood === 'happy' || mood === 'eat') {
    g.lineWidth = 3.6;
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.arc(sx * ex, 3, 6.5, Math.PI * 1.12, Math.PI * 1.88);
      g.stroke();
    }
  } else if (blink) {
    g.lineWidth = 3.2;
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.moveTo(sx * ex - 5, 1);
      g.quadraticCurveTo(sx * ex, 4, sx * ex + 5, 1);
      g.stroke();
    }
  } else
    for (const sx of [-1, 1]) {
      const x = sx * ex;
      g.fillStyle = ink;
      el(g, x, 0, 6.2, 8.4);
      g.fill();
    }
  if (mood === 'hmm') {
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(-23, -14);
    g.lineTo(-12, -11);
    g.moveTo(23, -14);
    g.lineTo(12, -11);
    g.stroke();
  }
  // the mouth
  if (mood === 'happy') {
    g.beginPath();
    g.moveTo(-9, 13);
    g.quadraticCurveTo(0, 14.5, 9, 13);
    g.quadraticCurveTo(8, 26, 0, 26);
    g.quadraticCurveTo(-8, 26, -9, 13);
    g.closePath();
    g.fillStyle = '#7A2418';
    g.fill();
    g.save();
    g.clip();
    g.fillStyle = '#F07C7C';
    el(g, 0, 25, 6, 4.5);
    g.fill();
    g.restore();
    g.lineWidth = 1.6;
    g.stroke();
  } else if (mood === 'eat') {
    const k = Math.abs(Math.sin((o.t || 0) * 14)) * 3;
    el(g, 0, 17, 4.5, 2.6 + k);
    g.fillStyle = '#7A2418';
    g.fill();
  } else if (mood === 'hmm') {
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(-6, 18);
    g.quadraticCurveTo(-2, 15, 0, 17);
    g.quadraticCurveTo(2, 19, 6, 16);
    g.stroke();
  } else {
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(-5, 15);
    g.quadraticCurveTo(-2.5, 18.5, 0, 15.5);
    g.quadraticCurveTo(2.5, 18.5, 5, 15);
    g.stroke();
  }
}
export function hair(g, L) {
  g.fillStyle = L.hair;
  const dark = shade(L.hair, -0.3);
  if (L.style === 'cap') {
    g.fillStyle = '#3E4A78';
    g.beginPath();
    g.ellipse(0, -130, 44, 30, 0, Math.PI, TAU);
    g.fill();
    g.fillStyle = '#2E3860';
    rr(g, -46, -134, 92, 10, 5);
    g.fill();
    g.fillStyle = '#4E5A8A';
    el(g, 0, -158, 6, 4);
    g.fill();
    g.fillStyle = L.hair;
    g.beginPath();
    g.moveTo(-40, -124);
    g.lineTo(-30, -112);
    g.lineTo(-24, -124);
    g.lineTo(-14, -114);
    g.lineTo(-8, -124);
    g.closePath();
    g.fill();
    return;
  }
  // faceted hair: a cap of flat polygons in two tones (the toy look)
  g.beginPath();
  g.moveTo(-47, -108);
  g.lineTo(-44, -136);
  g.lineTo(-24, -156);
  g.lineTo(6, -160);
  g.lineTo(32, -150);
  g.lineTo(46, -128);
  g.lineTo(47, -108);
  g.lineTo(34, -122);
  g.lineTo(18, -112);
  g.lineTo(10, -126);
  g.lineTo(-6, -114);
  g.lineTo(-16, -126);
  g.lineTo(-30, -112);
  g.closePath();
  g.fill();
  g.fillStyle = dark;
  g.beginPath();
  g.moveTo(6, -160);
  g.lineTo(32, -150);
  g.lineTo(46, -128);
  g.lineTo(30, -136);
  g.lineTo(14, -146);
  g.closePath();
  g.fill();
  if (L.style === 'pony') {
    g.fillStyle = L.hair;
    el(g, 0, -166, 16, 13);
    g.fill();
    g.fillStyle = '#D8342B';
    g.beginPath();
    g.moveTo(-14, -160);
    g.lineTo(-28, -170);
    g.lineTo(-26, -152);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(14, -160);
    g.lineTo(28, -170);
    g.lineTo(26, -152);
    g.closePath();
    g.fill();
    el(g, 0, -160, 6, 5);
    g.fill();
  }
  if (L.style === 'bob') {
    g.fillStyle = L.hair;
    rr(g, -50, -122, 14, 40, 7);
    g.fill();
    rr(g, 36, -122, 14, 40, 7);
    g.fill();
  }
  if (L.style === 'long') {
    g.fillStyle = L.hair;
    rr(g, -50, -122, 14, 70, 7);
    g.fill();
    rr(g, 36, -122, 14, 70, 7);
    g.fill();
  }
  if (L.style === 'spiky') {
    g.fillStyle = L.hair;
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(i * 16 - 9, -150);
      g.lineTo(i * 16, -172 + Math.abs(i) * 4);
      g.lineTo(i * 16 + 9, -150);
      g.closePath();
      g.fill();
    }
  }
}
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16,
    gg = (n >> 8) & 255,
    b = n & 255;
  const f = v => Math.round(clamp(v * (1 + k), 0, 255));
  return `rgb(${f(r)},${f(gg)},${f(b)})`;
}
export function lighten(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16,
    gg = (n >> 8) & 255,
    b = n & 255;
  const f = v => Math.round(v + (255 - v) * k);
  return `rgb(${f(r)},${f(gg)},${f(b)})`;
}
// small pictures of the toppings for the cards and tickets
export const ICON = {};
export function makeIcons() {
  for (const w of Object.keys(WORDS)) {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const g = c.getContext('2d');
    g.translate(48, 52);
    TOP_DRAW[w](g, 0, 0, artReady('prop-' + TOP_SPR[w]) ? 1.8 : 2.1);
    ICON[w] = c.toDataURL();
  }
}

// runs once at start, after every module has loaded (main.ts calls these in order)
export function init(): void {
  for (const w in TOP_CODE)
    TOP_DRAW[w] = (g, x, y, s) => {
      if (!prop(g, TOP_SPR[w], x, y, s)) TOP_CODE[w](g, x, y, s);
    };
  makeIcons();
}
