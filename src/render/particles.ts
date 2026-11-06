// particles
import { VW } from './dims';
import { el, steamSpr } from './shapes';
import { rnd } from '../core/env';

export const PT = [];
export const steamAt = (x, y, n) => {
  for (let i = 0; i < n; i++)
    PT.push({
      k: 'steam',
      x: x + rnd(-14, 14),
      y,
      vx: rnd(-8, 8),
      vy: rnd(-40, -22),
      g: 0,
      life: 0,
      max: rnd(1, 1.6),
      size: rnd(26, 44),
    });
};
export const splash = (x, y) => {
  for (let i = 0; i < 10; i++)
    PT.push({
      k: 'drop',
      x,
      y,
      vx: rnd(-120, 120),
      vy: rnd(-200, -80),
      g: 700,
      life: 0,
      max: 0.5,
      c: 'rgba(210,235,245,.85)',
      size: rnd(1.5, 3),
    });
  steamAt(x, y - 6, 4);
};
export const drips = (x, y) => {
  for (let i = 0; i < 6; i++)
    PT.push({
      k: 'drop',
      x: x + rnd(-14, 14),
      y,
      vx: rnd(-20, 20),
      vy: rnd(0, 60),
      g: 500,
      life: 0,
      max: 0.4,
      c: 'rgba(210,235,245,.8)',
      size: 2,
    });
};
export const sparkle = (x, y, n) => {
  for (let i = 0; i < n; i++)
    PT.push({
      k: 'spark',
      x: x + rnd(-10, 10),
      y: y + rnd(-6, 6),
      vx: rnd(-60, 60),
      vy: rnd(-90, -30),
      g: 120,
      life: 0,
      max: rnd(0.4, 0.7),
      size: rnd(2, 3.5),
    });
};
export const heart = (x, y) =>
  PT.push({ k: 'heart', x, y, vx: rnd(-10, 10), vy: -34, g: 0, life: 0, max: 1.3, size: 1 });
export function stepParticles(dt) {
  for (const p of PT) {
    p.life += dt;
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (let i = PT.length - 1; i >= 0; i--) if (PT[i].life > PT[i].max) PT.splice(i, 1);
  if (PT.length > 300) PT.splice(0, PT.length - 300);
}
export function drawParticles(g) {
  for (const p of PT) {
    const a = 1 - p.life / p.max;
    if (p.k === 'steam') {
      g.globalAlpha = a * 0.5;
      const s = p.size * (1 + p.life * 1.5);
      g.drawImage(steamSpr(), p.x - s / 2, p.y - s / 2, s, s);
    } else if (p.k === 'drop') {
      g.globalAlpha = a;
      g.fillStyle = p.c;
      el(g, p.x, p.y, p.size, p.size);
      g.fill();
    } else if (p.k === 'spark') {
      g.globalAlpha = a;
      g.fillStyle = '#FFF6C8';
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.life * 6);
      g.fillRect(-p.size, -0.8, p.size * 2, 1.6);
      g.fillRect(-0.8, -p.size, 1.6, p.size * 2);
      g.restore();
    } else if (p.k === 'heart') {
      g.globalAlpha = Math.min(1, a * 1.5);
      g.fillStyle = '#FF7A9A';
      g.save();
      g.translate(p.x, p.y);
      g.scale(1.2, 1.2);
      g.beginPath();
      g.moveTo(0, 4);
      g.bezierCurveTo(-9, -3, -5, -10, 0, -5);
      g.bezierCurveTo(5, -10, 9, -3, 0, 4);
      g.fill();
      g.restore();
    }
  }
  g.globalAlpha = 1;
}
export const DROPS = Array.from({ length: 120 }, () => ({
  x: Math.random() * VW,
  y: Math.random() * 340,
  v: rnd(420, 640),
  l: rnd(9, 16),
  far: Math.random() < 0.5,
}));
export function drawRain(g, x0, y0, w, h, dt) {
  g.save();
  g.beginPath();
  g.rect(x0, y0, w, h);
  g.clip();
  g.lineWidth = 1;
  for (const d of DROPS) {
    d.y += d.v * dt * (d.far ? 0.7 : 1);
    d.x -= d.v * dt * 0.1;
    if (d.y > 340) {
      d.y = -10;
      d.x = Math.random() * (VW + 60);
    }
  }
  g.strokeStyle = 'rgba(170,195,255,.22)';
  g.beginPath();
  for (const d of DROPS)
    if (d.far) {
      const x = x0 + (d.x / VW) * w,
        y = y0 + (d.y / 340) * h;
      g.moveTo(x, y);
      g.lineTo(x + d.l * 0.1, y - d.l * 0.7);
    }
  g.stroke();
  g.strokeStyle = 'rgba(200,215,255,.32)';
  g.beginPath();
  for (const d of DROPS)
    if (!d.far) {
      const x = x0 + (d.x / VW) * w,
        y = y0 + (d.y / 340) * h;
      g.moveTo(x, y);
      g.lineTo(x + d.l * 0.12, y - d.l);
    }
  g.stroke();
  g.restore();
}
