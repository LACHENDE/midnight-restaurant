// the scenery, pre-drawn in layers
import { ART, VH, VW, artReady, srand } from './stage';
import { CL, KL } from '../data/layout';
import { T, TAU } from '../core/env';
import { drawLantern, drawNoren, el, glowSpr, lg, rr, shadow } from './shapes';
import { hasDecor } from '../data/content';

export function street(g, x0, y0, w, h, far) {
  // the rainy street seen past the stall: navy sky, lit windows, lanterns, hydrangeas, wet stones
  g.save();
  g.beginPath();
  g.rect(x0, y0, w, h);
  g.clip();
  g.fillStyle = lg(g, 0, y0, 0, y0 + h, [
    [0, '#121A33'],
    [0.7, '#24345F'],
    [1, '#2E416F'],
  ]);
  g.fillRect(x0, y0, w, h);
  let x = x0 - 20;
  while (x < x0 + w) {
    const bw = 70 + srand() * 80,
      bh = h * (0.45 + srand() * 0.4),
      by = y0 + h * 0.78 - bh;
    g.fillStyle = far ? '#1C2748' : '#18213E';
    g.fillRect(x, by, bw - 8, bh + h);
    g.fillStyle = '#0F1630';
    g.fillRect(x - 6, by - 6, bw + 4, 8);
    for (let wy = by + 12; wy < y0 + h * 0.72; wy += 18)
      for (let wx = x + 8; wx < x + bw - 18; wx += 16)
        if (srand() < 0.4) {
          g.fillStyle = srand() < 0.75 ? 'rgba(255,196,110,.75)' : 'rgba(255,230,170,.5)';
          rr(g, wx, wy, 8, 10, 2);
          g.fill();
        }
    x += bw;
  }
  for (let i = 0; i < 4; i++) {
    const lx = x0 + w * (0.15 + i * 0.24),
      ly = y0 + h * 0.38 + srand() * 20;
    g.drawImage(glowSpr('rgba(255,140,60,.55)'), lx - 40, ly - 40, 80, 80);
    g.fillStyle = '#FF9A44';
    el(g, lx, ly, 7, 9);
    g.fill();
  }
  const gy = y0 + h * 0.8;
  g.fillStyle = lg(g, 0, gy, 0, y0 + h, [
    [0, '#2A3A63'],
    [1, '#344A7C'],
  ]);
  g.fillRect(x0, gy, w, h);
  for (let i = 0; i < 18; i++) {
    g.fillStyle = `rgba(255,190,120,${(0.05 + srand() * 0.12).toFixed(2)})`;
    g.fillRect(x0 + srand() * w, gy + 4 + srand() * (h * 0.2), 18 + srand() * 50, 2);
  }
  for (let i = 0; i < 9; i++) {
    const hx = x0 + srand() * w,
      hy = gy - 4;
    for (let k = 0; k < 26; k++) {
      const a = srand() * TAU,
        d = srand() * 16;
      g.fillStyle = srand() < 0.5 ? '#6C8BE0' : srand() < 0.5 ? '#9C7BD8' : '#5FA0E6';
      el(g, hx + Math.cos(a) * d, hy + Math.sin(a) * d * 0.7, 3.4, 3);
      g.fill();
    }
    g.fillStyle = '#2F5A3A';
    el(g, hx, hy + 12, 16, 6);
    g.fill();
  }
  g.restore();
}
export function kitchenBG(g) {
  if (artReady('kitchen')) {
    g.drawImage(ART.kitchen, 0, 0, VW, VH);
    if (hasDecor('neko')) drawNeko(g, 492, 120, 0.8);
    g.fillStyle = '#FFF4E2';
    g.font = '900 14px "M PLUS Rounded 1c"';
    g.textAlign = 'center';
    g.fillText(T('PASS', '出餐口'), 906, 292);
    kitchenBits(g);
    g.textAlign = 'left';
    return;
  }
  g.fillStyle = lg(g, 0, 0, 0, 300, [
    [0, '#6E4026'],
    [1, '#4E2C1A'],
  ]);
  g.fillRect(0, 0, VW, 300);
  for (let x = 0; x < VW; x += 44) {
    g.fillStyle = `rgba(0,0,0,${(0.06 + srand() * 0.08).toFixed(2)})`;
    g.fillRect(x, 0, 2, 300);
    g.fillStyle = 'rgba(255,220,170,.05)';
    g.fillRect(x + 3, 0, 1, 300);
  }
  // the window onto the street
  rr(g, 736, 58, 246, 190, 10);
  g.fillStyle = '#2A1A10';
  g.fill();
  street(g, 746, 68, 226, 170, true);
  g.fillStyle = '#4A2C1A';
  g.fillRect(857, 68, 8, 170);
  g.fillRect(746, 150, 226, 6);
  // shelf with jars, the lucky cat if you've earned it
  g.fillStyle = '#5A3520';
  g.fillRect(220, 118, 300, 10);
  g.fillStyle = 'rgba(0,0,0,.25)';
  g.fillRect(220, 128, 300, 6);
  (
    [
      [250, '#C9A27A'],
      [290, '#7E9A5E'],
      [330, '#B85A3A'],
      [372, '#E2C58A'],
      [410, '#8A6A9E'],
    ] as [number, string][]
  ).forEach(([x, c]) => {
    rr(g, x - 14, 84, 28, 34, 6);
    g.fillStyle = c;
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)';
    g.fillRect(x - 9, 90, 4, 22);
    g.fillStyle = '#3A2A20';
    rr(g, x - 15, 80, 30, 7, 3);
    g.fill();
  });
  if (hasDecor('neko')) drawNeko(g, 478, 116, 0.8);
  drawNoren(g, 0, 46, 5);
  // the stove counter: stainless top, wooden front
  g.fillStyle = lg(g, 0, 250, 0, 300, [
    [0, '#C7CDD3'],
    [1, '#8E979F'],
  ]);
  g.fillRect(0, 250, VW, 50);
  g.fillStyle = lg(g, 0, 300, 0, VH, [
    [0, '#A0602E'],
    [0.08, '#8A4F26'],
    [1, '#5E3317'],
  ]);
  g.fillRect(0, 300, VW, VH - 300);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(40,18,6,${(0.05 + srand() * 0.1).toFixed(2)})`;
    g.lineWidth = 1;
    g.beginPath();
    const y = 306 + srand() * 150;
    g.moveTo(0, y);
    g.bezierCurveTo(300, y + srand() * 8 - 4, 700, y + srand() * 8 - 4, VW, y);
    g.stroke();
  }
  g.fillStyle = 'rgba(255,220,170,.28)';
  g.fillRect(0, 300, VW, 2);
  // the pass: a hatch through to the counter
  rr(g, 836, 248, 150, 124, 10);
  g.fillStyle = '#24140C';
  g.fill();
  g.drawImage(glowSpr('rgba(255,170,90,.35)'), 830, 230, 170, 170);
  g.fillStyle = '#B8332A';
  g.fillRect(842, 248, 138, 26);
  g.fillStyle = '#FFF4E2';
  g.font = '900 14px "M PLUS Rounded 1c"';
  g.textAlign = 'center';
  g.fillText(T('PASS', '出餐口'), 911, 267);
  g.fillStyle = lg(g, 0, 352, 0, 372, [
    [0, '#C68A52'],
    [1, '#94602F'],
  ]);
  rr(g, 840, 352, 142, 22, 6);
  g.fill();
  kitchenBits(g);
  // the basket rail
  g.fillStyle = '#8E979F';
  g.fillRect(100, 170, 110, 6);
  g.fillStyle = '#6E777F';
  g.fillRect(150, 170, 4, 22);
  g.textAlign = 'left';
}
export function kitchenBits(g) {
  // the scrap plate and the noodle box, on either scene
  g.textAlign = 'center';
  el(g, KL.scrap.x, KL.scrap.y + 4, 40, 12);
  g.fillStyle = 'rgba(0,0,0,.25)';
  g.fill();
  el(g, KL.scrap.x, KL.scrap.y, 38, 12);
  g.fillStyle = '#E8E1D6';
  g.fill();
  el(g, KL.scrap.x, KL.scrap.y, 28, 8);
  g.fillStyle = '#D6CDBF';
  g.fill();
  g.fillStyle = 'rgba(255,244,226,.7)';
  g.font = '800 11px "M PLUS Rounded 1c"';
  g.fillText(T('take off', '拿掉'), KL.scrap.x, KL.scrap.y + 26);
  // the noodle box
  if (!artReady('prop-box')) {
    rr(g, KL.box.x - 62, KL.box.y - 30, 124, 62, 8);
    g.fillStyle = '#7A4A28';
    g.fill();
    rr(g, KL.box.x - 56, KL.box.y - 24, 112, 46, 6);
    g.fillStyle = '#3A2214';
    g.fill();
  }
  g.fillStyle = '#FFF4E2';
  g.font = '900 12px "M PLUS Rounded 1c"';
  g.fillText('めん', KL.box.x, KL.box.y + 44);
}
export function drawNeko(g, x, y, s) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  shadow(g, 0, 0, 24, 6, 0.3);
  g.fillStyle = '#FFF8EE';
  rr(g, -22, -44, 44, 44, 16);
  g.fill();
  el(g, 0, -52, 22, 19);
  g.fill();
  g.beginPath();
  g.moveTo(-18, -62);
  g.lineTo(-14, -78);
  g.lineTo(-4, -66);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(18, -62);
  g.lineTo(14, -78);
  g.lineTo(4, -66);
  g.closePath();
  g.fill();
  g.fillStyle = '#222';
  el(g, -8, -54, 2.4, 2.8);
  g.fill();
  el(g, 8, -54, 2.4, 2.8);
  g.fill();
  g.fillStyle = '#D8342B';
  rr(g, -14, -36, 28, 6, 3);
  g.fill();
  g.fillStyle = '#F2C94C';
  el(g, 0, -28, 5, 5);
  g.fill();
  g.fillStyle = '#FFF8EE';
  rr(g, 18, -80, 10, 30, 5);
  g.fill();
  g.restore();
}
export function counterStreet(g) {
  street(g, -24, 0, VW + 48, 340, false);
}
export function counterBG(g) {
  if (artReady('counter')) {
    g.drawImage(ART.counter, 0, 0, VW, VH);
    if (hasDecor('lanterns')) for (let i = 0; i < 6; i++) drawLantern(g, 320 + i * 84, 96, 0.42, '');
    g.fillStyle = '#FFF4E2';
    g.font = '900 13px "M PLUS Rounded 1c"';
    g.textAlign = 'center';
    g.fillText(T('FROM THE KITCHEN', '厨房出餐'), 137, 226);
    g.textAlign = 'left';
    return;
  }
  // the stall: posts, the roof edge, the noren, a lantern each side
  g.fillStyle = lg(g, 0, 0, 0, 340, [
    [0, '#6A3A20'],
    [1, '#4A2814'],
  ]);
  g.fillRect(0, 0, 34, 340);
  g.fillRect(VW - 34, 0, 34, 340);
  g.fillStyle = 'rgba(255,220,170,.12)';
  g.fillRect(28, 0, 3, 340);
  g.fillRect(VW - 34, 0, 3, 340);
  g.fillStyle = '#3A2012';
  g.fillRect(0, 0, VW, 18);
  drawNoren(g, 14, 64, 7);
  // the hatch from the kitchen, on the left
  rr(g, 40, 214, 214, 118, 10);
  g.fillStyle = '#2A170D';
  g.fill();
  g.drawImage(glowSpr('rgba(255,170,90,.4)'), 30, 180, 240, 200);
  g.fillStyle = '#B8332A';
  g.fillRect(46, 214, 202, 22);
  g.fillStyle = '#FFF4E2';
  g.font = '900 13px "M PLUS Rounded 1c"';
  g.textAlign = 'center';
  g.fillText(T('FROM THE KITCHEN', '厨房出餐'), 147, 230);
  if (hasDecor('lanterns')) for (let i = 0; i < 6; i++) drawLantern(g, 320 + i * 84, 92, 0.42, '');
  g.textAlign = 'left';
}
export const COUNTER_EDGE = 330;
// the painted counter's far edge: the guests sit behind it
export function counterFront(g) {
  // the counter you serve on
  if (artReady('counter')) {
    g.save();
    g.beginPath();
    g.rect(0, COUNTER_EDGE, VW, VH - COUNTER_EDGE);
    g.clip();
    g.drawImage(ART.counter, 0, 0, VW, VH);
    g.restore();
    counterBits(g);
    return;
  }
  g.fillStyle = lg(g, 0, 330, 0, VH, [
    [0, '#C98448'],
    [0.06, '#A9672F'],
    [1, '#6E3B18'],
  ]);
  g.fillRect(0, 330, VW, VH - 330);
  g.fillStyle = 'rgba(255,230,190,.35)';
  g.fillRect(0, 330, VW, 3);
  for (let i = 0; i < 46; i++) {
    g.strokeStyle = `rgba(50,22,6,${(0.05 + srand() * 0.12).toFixed(2)})`;
    g.lineWidth = 1;
    g.beginPath();
    const y = 336 + srand() * 120;
    g.moveTo(0, y);
    g.bezierCurveTo(300, y + srand() * 8 - 4, 700, y + srand() * 8 - 4, VW, y);
    g.stroke();
  }
  // the tray under the hatch
  g.fillStyle = lg(g, 0, 330, 0, 350, [
    [0, '#D69A5E'],
    [1, '#A26830'],
  ]);
  rr(g, 44, 326, 206, 26, 8);
  g.fill();
  counterBits(g);
}
export function counterBits(g) {
  // the dish tub, the teapot's mat, the hydrangeas: on either counter
  rr(g, CL.tub.x - 44, CL.tub.y - 18, 88, 40, 10);
  g.fillStyle = '#4E6A78';
  g.fill();
  rr(g, CL.tub.x - 38, CL.tub.y - 14, 76, 22, 8);
  g.fillStyle = '#2E434E';
  g.fill();
  g.fillStyle = 'rgba(255,244,226,.8)';
  g.font = '800 11px "M PLUS Rounded 1c"';
  g.textAlign = 'center';
  g.fillText(T('dishes', '洗碗盆'), CL.tub.x, CL.tub.y + 38);
  el(g, CL.teapot.x, CL.teapot.y + 26, 40, 10);
  g.fillStyle = 'rgba(90,50,20,.55)';
  g.fill();
  if (hasDecor('ajisai')) {
    const x = CL.tub.x - 8,
      y = 262;
    rr(g, x - 20, y + 30, 40, 36, 8);
    g.fillStyle = '#8C5A3A';
    g.fill();
    for (let k = 0; k < 40; k++) {
      const a = srand() * TAU,
        d = srand() * 22;
      g.fillStyle = srand() < 0.5 ? '#6C8BE0' : '#9C7BD8';
      el(g, x + Math.cos(a) * d, y + 16 + Math.sin(a) * d * 0.7, 4, 3.4);
      g.fill();
    }
  }
  g.textAlign = 'left';
}
