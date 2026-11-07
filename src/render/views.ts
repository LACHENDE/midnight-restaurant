// drawing the two views
import { G } from '../game/G';
import { C, K, isEmpty, trayOpen } from '../game/night-state';
import { CL, KL } from '../data/layout';
import { KSP, LAYER, LIFT, VH, VW, artReady, ctx, kenClip, kenLeave, kenLen, kenOn, mkLayer } from './stage';
import { LOOKS, NIGHTS, WORDS, known, prop } from '../data/content';
import { PTR } from '../input/pointer';
import { T, TAU, clamp, rnd } from '../core/env';
import {
  TOP_DRAW,
  TOP_SPR,
  drawBasket,
  drawBowl,
  drawCoins,
  drawCup,
  drawEgg,
  drawGuest,
  drawLadle,
  drawLantern,
  drawNaruto,
  drawNegi,
  drawPotBody,
  drawTeapot,
  el,
  glowSpr,
  lg,
  rg,
  rr,
} from './shapes';
import { counterBG, counterFront, counterStreet, kitchenBG } from './scenery';
import { doorGroup } from '../game/door';
import { drawRain, drips, steamAt } from './particles';
import { freeSeat, judge } from '../game/counter';

export const PTRS = new Map();
export const dragOf = kind => {
  for (const it of PTRS.values()) if (it.kind === kind) return it;
  return null;
};
export function drawKitchen(dt) {
  const g = ctx;
  if (!LAYER.k) LAYER.k = mkLayer(kitchenBG);
  g.drawImage(LAYER.k, 0, 0, VW, VH);
  if (artReady('kitchen')) drawRain(g, 718, 54, 258, 190, dt);
  else {
    drawRain(g, 746, 68, 226, 170, dt);
    drawLantern(g, 64, 92, 0.9, '');
  }
  const drags = [...PTRS.values()],
    dk = k => drags.find(d => d.kind === k),
    b = K.basket;
  // the stock pot of boiling water
  const P = KL.pot;
  g.drawImage(glowSpr('rgba(255,110,40,.5)'), P.x - 150, P.y + 20, 300, 110);
  if (!prop(g, 'pot', P.x, P.y)) {
    drawPotBody(g, P.x, P.y, 112, 64, '#5E6770', '#C9D1D8');
    el(g, P.x, P.y, 112, 34);
    g.fillStyle = '#C9D1D8';
    g.fill();
    el(g, P.x, P.y + 2, 102, 28);
    g.fillStyle = rg(g, P.x, P.y, 10, 110, [
      [0, '#E9F4F6'],
      [1, '#8FB0B8'],
    ]);
    g.fill();
  }
  for (let i = 0; i < 14; i++) {
    const ph = (G.clock * 1.8 + i * 0.37) % 1,
      bx = P.x + Math.cos(i * 2.39) * 86 * (((i * 0.13) % 1) + 0.15),
      by = P.y + 2 + Math.sin(i * 2.39) * 22 * ((i * 0.29) % 1);
    g.strokeStyle = `rgba(255,255,255,${((1 - ph) * 0.7).toFixed(2)})`;
    g.lineWidth = 1.3;
    el(g, bx, by, 2 + ph * 5, 1 + ph * 2.2);
    g.stroke();
  }
  if (Math.random() < dt * 4) steamAt(P.x + rnd(-60, 60), P.y - 6, 1);
  if (b.st === 'pot' && !dk('basket')) {
    const sway = Math.sin(G.clock * 3) * 1.5;
    g.save();
    g.beginPath();
    g.rect(P.x - 112, P.y - 80, 224, 80);
    g.clip();
    drawBasket(g, P.x - 10, P.y + 6 + sway, true, b.done, true);
    g.restore();
    g.fillStyle = `rgba(242,198,78,${b.done === 'raw' ? 0.25 : 0.45})`;
    el(g, P.x - 10, P.y + 6, 26, 8);
    g.fill();
  }
  // the doneness dial above the pot: a wide green window
  if (b.st === 'pot' || (dk('basket') && dk('basket').from === 'pot')) {
    const D = KL.dial,
      t = Math.min(b.t, 18);
    rr(g, D.x - 90, D.y - 12, 180, 24, 12);
    g.fillStyle = '#FFF4E2';
    g.fill();
    const seg: [number, number, string][] = [
      [0, 3.5, '#C9CFD4'],
      [3.5, 12, '#5ED3B0'],
      [12, 16, '#F0B04E'],
      [16, 18, '#E06A4E'],
    ];
    seg.forEach(([a, c, col]) => {
      g.fillStyle = col;
      rr(g, D.x - 78 + (a / 18) * 156, D.y - 5, ((c - a) / 18) * 156, 10, 4);
      g.fill();
    });
    const px = D.x - 78 + (t / 18) * 156;
    g.fillStyle = '#3B2618';
    g.beginPath();
    g.moveTo(px - 7, D.y - 16);
    g.lineTo(px + 7, D.y - 16);
    g.lineTo(px, D.y - 5);
    g.closePath();
    g.fill();
    g.fillStyle = '#3B2618';
    g.font = '900 11px "M PLUS Rounded 1c"';
    g.textAlign = 'center';
    g.fillText(
      { raw: T('not yet', '还没好'), ready: T('ready!', '好了！'), soft: T('soft', '软了'), soggy: T('soggy', '烂了') }[
        b.done
      ],
      D.x,
      D.y + 28,
    );
  }
  // the basket on its hook
  if (b.st !== 'pot' && !dk('basket')) drawBasket(g, KL.hook.x, KL.hook.y, b.st === 'full', b.done, false);
  // the broth pot and its ladle
  const B = KL.broth;
  if (!prop(g, 'broth', B.x, B.y)) {
    drawPotBody(g, B.x, B.y, 62, 40, '#5E6770', '#C9D1D8');
    el(g, B.x, B.y, 62, 19);
    g.fillStyle = '#C9D1D8';
    g.fill();
    el(g, B.x, B.y + 1.5, 56, 15);
    g.fillStyle = rg(g, B.x - 10, B.y - 2, 2, 60, [
      [0, '#E4A453'],
      [1, '#9A5622'],
    ]);
    g.fill();
  }
  if (Math.random() < dt * 2.5) steamAt(B.x + rnd(-30, 30), B.y - 8, 1);
  if (!dk('ladle')) drawLadle(g, KL.ladle.x - 30, KL.ladle.y + 10);
  // noodle nests in the box
  if (!prop(g, 'box', KL.box.x, KL.box.y))
    for (let i = 0; i < 3; i++) {
      const nx = KL.box.x - 34 + i * 34,
        ny = KL.box.y - 4;
      el(g, nx, ny, 15, 10);
      g.fillStyle = '#E8C25A';
      g.fill();
      g.strokeStyle = '#F6DE8E';
      g.lineWidth = 1.4;
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.ellipse(nx, ny, 11 - k * 3, 7 - k * 2, k, 0, TAU);
        g.stroke();
      }
    }
  // the topping trays, each with its word
  for (const w of Object.keys(KL.trays)) {
    const t = KL.trays[w],
      open = trayOpen(w);
    const ptray = prop(g, 'tray', t.x, t.y - 4);
    if (!ptray) {
      rr(g, t.x - 58, t.y - 28, 116, 48, 10);
      g.fillStyle = lg(g, 0, t.y - 28, 0, t.y + 20, [
        [0, '#D9DFE4'],
        [1, '#9EA7AF'],
      ]);
      g.fill();
      rr(g, t.x - 52, t.y - 23, 104, 38, 8);
      g.fillStyle = '#B8C0C7';
      g.fill();
    }
    if (open && artReady('prop-' + TOP_SPR[w])) {
      TOP_DRAW[w](g, t.x - 20, t.y - 6, 1.15);
      TOP_DRAW[w](g, t.x + 20, t.y - 2, 1.15);
    } else if (open) {
      if (w === 'tamago') {
        drawEgg(g, t.x - 26, t.y - 6, 1, -0.2);
        drawEgg(g, t.x, t.y - 2, 1, 0.1);
        drawEgg(g, t.x + 26, t.y - 6, 1, 0.3);
      } else if (w === 'negi') {
        drawNegi(g, t.x - 16, t.y - 6, 1.1, 2);
        drawNegi(g, t.x + 14, t.y - 3, 1.1, 9);
      } else {
        drawNaruto(g, t.x - 22, t.y - 4, 1, 0.2);
        drawNaruto(g, t.x + 4, t.y - 4, 1, -0.3);
        drawNaruto(g, t.x + 28, t.y - 2, 0.9, 0.4);
      }
    } else {
      g.fillStyle = 'rgba(60,40,30,.55)';
      rr(g, t.x - 52, t.y - 23, 104, 38, 8);
      g.fill();
    }
    // the label card: kana always, romaji until you know it
    rr(g, t.x - 40, t.y + 14, 80, open ? (known(w) ? 22 : 32) : 22, 7);
    g.fillStyle = open ? '#FFF4E2' : 'rgba(255,244,226,.35)';
    g.fill();
    g.fillStyle = '#3B2618';
    g.font = '900 15px "M PLUS Rounded 1c"';
    g.textAlign = 'center';
    g.fillText(open ? WORDS[w].k : '…', t.x, t.y + 31);
    if (open && !known(w)) {
      g.font = '800 10px "M PLUS Rounded 1c"';
      g.fillStyle = '#8A6E57';
      g.fillText(WORDS[w].ro, t.x, t.y + 43);
    }
    if (open && K.trays[w] && !K.shown[w]) {
      g.fillStyle = '#5ED3B0';
      rr(g, t.x + 28, t.y - 38, 34, 16, 8);
      g.fill();
      g.fillStyle = '#0E3B2E';
      g.font = '900 10px "M PLUS Rounded 1c"';
      g.fillText('NEW', t.x + 45, t.y - 26);
    }
  }
  // the bowls on the board
  const bd = dk('bowl');
  K.slots.forEach((bw, i) => {
    const s = KL.slots[i];
    el(g, s.x, s.y + 42, 52, 12);
    g.fillStyle = 'rgba(0,0,0,.22)';
    g.fill();
    if (!bw || (bd && bd.i === i)) return;
    const want =
      (dk('basket') && dk('basket').from === 'pot' && !bw.noodles) ||
      dk('ladle') ||
      (dk('top') && !bw.tops.includes(dk('top').w)) ||
      (dk('back') && isEmpty(bw));
    if (want) {
      g.strokeStyle = 'rgba(94,211,176,.95)';
      g.lineWidth = 3;
      g.setLineDash([7, 6]);
      el(g, s.x, s.y + 4, 70, 28);
      g.stroke();
      g.setLineDash([]);
    }
    drawBowl(g, s.x, s.y, 1 + bw.pop * 0.06, bw);
    if (bw.broth > 0.3 && Math.random() < dt * 1.5) steamAt(s.x + rnd(-20, 20), s.y - 6, 1);
    if (bw.why) {
      g.fillStyle = '#D8452F';
      rr(g, s.x - 34, s.y - 46, 68, 18, 9);
      g.fill();
      g.fillStyle = '#FFF4E2';
      g.font = '900 10px "M PLUS Rounded 1c"';
      g.textAlign = 'center';
      g.fillText(T('sent back', '被退回'), s.x, s.y - 33);
    }
  });
  // returned bowls waiting on the pass, and bowls sliding out
  K.back.forEach((r, j) => {
    if (bd && bd.back === j) return;
    const x = KL.pass.x - 30 + j * 60,
      y = KL.pass.y + 8;
    drawBowl(g, x, y, 0.72, r);
    g.fillStyle = '#D8452F';
    rr(g, x - 30, y - 36, 60, 16, 8);
    g.fill();
    g.fillStyle = '#FFF4E2';
    g.font = '900 9.5px "M PLUS Rounded 1c"';
    g.textAlign = 'center';
    g.fillText(T('sent back', '被退回'), x, y - 25);
  });
  for (const s of K.slid) {
    const k = s.t / 0.45,
      x = s.x + (KL.pass.x + 120 - s.x) * k * k,
      y = s.y + (KL.pass.y + 8 - s.y) * k;
    g.globalAlpha = 1 - k * k;
    drawBowl(g, x, y, 1 - 0.25 * k, s.bowl);
    g.globalAlpha = 1;
  }
  if (bd) {
    g.strokeStyle = 'rgba(94,211,176,.95)';
    g.lineWidth = 3;
    g.setLineDash([8, 6]);
    if (artReady('kitchen')) rr(g, 820, 300, 174, 104, 10);
    else rr(g, 840, 250, 146, 124, 10);
    g.stroke();
    g.setLineDash([]);
  }
  drawHeld(g);
}
export function drawHeld(g) {
  for (const it of PTRS.values()) {
    const x = it.x,
      y = it.y - LIFT;
    if (it.kind === 'nest' && prop(g, 'nest', x, y)) {
    } else if (it.kind === 'nest') {
      el(g, x, y, 16, 11);
      g.fillStyle = '#E8C25A';
      g.fill();
      g.strokeStyle = '#F6DE8E';
      g.lineWidth = 1.4;
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.ellipse(x, y, 12 - k * 3, 8 - k * 2, k, 0, TAU);
        g.stroke();
      }
    } else if (it.kind === 'basket') {
      drawBasket(g, x, y, K.basket.st !== 'hook', K.basket.done, false);
      if (it.from === 'pot' && Math.random() < 0.35) drips(x, y + 44);
    } else if (it.kind === 'ladle') {
      const over = it.over != null;
      drawLadle(g, x, y);
      if (over) {
        const s = KL.slots[it.over];
        g.strokeStyle = 'rgba(176,106,46,.85)';
        g.lineWidth = 5;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x - 14, y + 4);
        g.quadraticCurveTo(x - 18, (y + s.y) / 2, s.x, s.y);
        g.stroke();
      }
    } else if (it.kind === 'top' || it.kind === 'untop') {
      TOP_DRAW[it.w](g, x, y, 1.35);
    } else if (it.kind === 'bowl') {
      const bw = K.slots[it.i];
      if (bw) drawBowl(g, x, y, 1.02, bw);
    } else if (it.kind === 'back') {
      const r = K.back[it.back];
      if (r) drawBowl(g, x, y, 0.9, r);
    } else if (it.kind === 'guest') {
      const q = C.queue.find(q => q.id === it.id);
      if (q) drawGuest(g, LOOKS[q.who], x, y + 40, 0.62, '', {});
    } else if (it.kind === 'teapot') {
      drawTeapot(g, x, y, it.over != null ? -0.7 : -0.1);
      if (it.over != null) {
        const s = C.seats[it.over];
        g.strokeStyle = 'rgba(170,184,110,.85)';
        g.lineWidth = 4;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x + 40, y - 10);
        g.quadraticCurveTo(s.x - 70, y, cupX(s), CUPY - 12);
        g.stroke();
      }
    } else if (it.kind === 'pbowl') {
      const b = C.pass.find(b => b.id === it.id);
      if (b) drawBowl(g, x, y, 0.95, b);
    } else if (it.kind === 'refused') {
      const s = C.seats[it.si];
      if (s.bowl) drawBowl(g, x, y, 0.9, s.bowl);
    } else if (it.kind === 'dish') {
      const s = C.seats[it.si];
      if (s.bowl) drawBowl(g, x, y, 0.85, s.bowl, 1);
    } else if (it.kind === 'cloth') {
      g.save();
      g.translate(x, y);
      g.rotate(Math.sin(G.clock * 20) * 0.1);
      rr(g, -26, -14, 52, 28, 6);
      g.fillStyle = '#FDFBF6';
      g.fill();
      g.fillStyle = '#3E6EA8';
      g.fillRect(-26, 4, 52, 4);
      g.restore();
    }
  }
}
export const CUPY = 392,
  cupX = s => s.x - 96;
export const painted = () => artReady('guest-haru');
// painted guests are taller: their labels, umbrellas and rings sit higher
export function drawCounter(dt) {
  const g = ctx;
  if (!LAYER.cb) LAYER.cb = mkLayer(counterBG);
  if (!LAYER.cf) LAYER.cf = mkLayer(counterFront);
  const art = artReady('counter'),
    px = art ? 0 : (PTR.x - VW / 2) * -0.02;
  if (art) {
    g.drawImage(LAYER.cb, 0, 0, VW, VH);
    drawRain(g, 236, 84, 700, 240, dt);
  } else {
    if (!LAYER.cs) LAYER.cs = mkLayer(counterStreet);
    g.drawImage(LAYER.cs, px, 0, VW, VH);
    drawRain(g, 34, 18, VW - 68, 312, dt);
    g.drawImage(LAYER.cb, 0, 0, VW, VH);
    drawLantern(g, 74, 118, 0.82, '');
    drawLantern(g, VW - 74, 118, 0.82, '');
  }
  // the vertical shop sign outside, like the one across the street
  if (art) {
    g.fillStyle = '#FFF4E2';
    g.font = '900 17px "M PLUS Rounded 1c"';
    g.textAlign = 'center';
    ['ラ', 'ー', 'メ', 'ン'].forEach((c, i) => g.fillText(c, 291, 156 + i * 24));
  } else {
    g.fillStyle = '#C8332A';
    rr(g, 286 + px, 128, 26, 92, 4);
    g.fill();
    g.fillStyle = '#FFF4E2';
    g.font = '900 14px "M PLUS Rounded 1c"';
    g.textAlign = 'center';
    ['ラ', 'ー', 'メ', 'ン'].forEach((c, i) => g.fillText(c, 299 + px, 148 + i * 20));
  }
  const drags = [...PTRS.values()],
    dk = k => drags.find(d => d.kind === k);
  // guests waiting out in the rain, under umbrellas
  C.queue.forEach(q => {
    const dg = dk('guest');
    if (dg && dg.id === q.id) return;
    const bob = Math.sin(G.clock * 2 + q.id) * 1.2;
    const D = C.door,
      inDoor = D && q.grp === D.grp,
      qm = inDoor && D.conf > 0 ? 'hmm' : inDoor && D.happy > 0 ? 'happy' : '';
    drawGuest(g, LOOKS[q.who], q.x, 286 + bob, 0.5, qm, {
      clip: { id: qm === 'hmm' ? 'confused' : 'idle', t: G.clock + q.id, loop: true },
    });
    g.fillStyle = ['#E36A5A', '#6C8BE0', '#F2C94C', '#7FBF8F'][q.id % 4];
    g.beginPath();
    g.ellipse(q.x, 286 - (painted() ? 104 : 84) + bob, 40, 16, 0, Math.PI, TAU);
    g.fill();
    g.strokeStyle = '#3A2A20';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(q.x, 286 - (painted() ? 104 : 84) + bob);
    g.lineTo(q.x, 286 - 40 + bob);
    g.stroke();
    const pulse = (G.clock * 1.4) % 1;
    g.strokeStyle = `rgba(94,211,176,${(0.9 * (1 - pulse)).toFixed(2)})`;
    g.lineWidth = 3;
    el(g, q.x, 240, 30 + pulse * 14, 42 + pulse * 14);
    g.stroke();
  });
  // the group's leader answers how many they are
  // the group's reply to 何名様ですか shows inside the talking bubble (door.ts sayTick)
  // seats: the guests sit behind the counter
  C.seats.forEach(s => {
    const gg = s.g;
    if (!gg) {
      if (dk('guest') && freeSeat() === s.i) {
        g.strokeStyle = 'rgba(94,211,176,.95)';
        g.lineWidth = 3;
        g.setLineDash([8, 6]);
        rr(g, s.x - 62, 150, 124, 170, 24);
        g.stroke();
        g.setLineDash([]);
      }
      return;
    }
    const ken = kenOn(gg);
    let x = s.x,
      y = 318,
      sc = 1,
      a = 1;
    if (gg.st === 'walk') {
      const k = Math.min(1, gg.t / (ken ? kenLen('arrive') : 0.6));
      x = gg.from + (s.x - gg.from) * k;
      y = 286 + (318 - 286) * k - (ken ? 0 : Math.sin(k * Math.PI) * 30);
      sc = 0.5 + 0.5 * k;
    }
    if (gg.st === 'leave' && ken) {
      const walk = gg.t - kenLen(gg.sad ? 'furious' : 'bye') / KSP,
        end = kenLeave(gg);
      if (walk > 0) x = s.x + walk * 170;
      a = clamp((end - gg.t) / 0.5, 0, 1);
    } else if (gg.st === 'leave') {
      a = Math.max(0, 1 - gg.t / 1.4);
      y = 318 + gg.t * 10;
    }
    const pd = dk('pbowl'),
      pb = pd && C.pass.find(b => b.id === pd.id);
    gg.hover = !!(pb && gg.st === 'order' && Math.abs(pd.x - s.x) < 110 && pd.y > 150 && !judge(pb, gg.o).ok);
    const mood =
      gg.st === 'eat'
        ? 'eat'
        : gg.st === 'leave'
          ? gg.sad
            ? 'hmm'
            : 'happy'
          : gg.st === 'refused'
            ? 'hmm'
            : gg.happyT > 0
              ? 'happy'
              : gg.st === 'ask'
                ? 'ask'
                : '';
    g.globalAlpha = a;
    drawGuest(g, LOOKS[gg.who], x, y, sc, mood, {
      t: G.clock,
      bob: gg.st === 'eat' && !ken ? Math.sin(G.clock * 8) * 1.5 : 0,
      clip: ken ? kenClip(gg) : null,
    });
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(255,244,226,.85)';
    g.font = '900 12px "M PLUS Rounded 1c"';
    g.textAlign = painted() ? 'right' : 'left';
    if (gg.st !== 'walk') g.fillText(LOOKS[gg.who].nm, s.x + (painted() ? -84 : 50), y - (painted() ? 150 : 146));
    g.textAlign = 'center';
    if (gg.st === 'ask') {
      const p = 1 + Math.sin(G.clock * 6) * 0.06;
      g.save();
      g.translate(s.x + (painted() ? 96 : 58), painted() ? 140 : 148);
      g.scale(p, p);
      rr(g, -22, -18, 44, 32, 12);
      g.fillStyle = '#FFF4E2';
      g.fill();
      g.fillStyle = '#D8452F';
      g.font = '900 22px "M PLUS Rounded 1c"';
      g.fillText('！', 0, 7);
      g.restore();
    }
    if (gg.st === 'leave' && !gg.sad) {
      bubble(
        g,
        s.x,
        118,
        C.last === gg.who && C.next >= NIGHTS[C.n - 1].guests.length ? 'ごちそうさまでした！' : 'ごちそうさま！',
      );
    }
    if (gg.st === 'order' || gg.st === 'refused')
      if (!NIGHTS[C.n - 1].gentle) {
        const p = clamp(gg.pat, 0, 1);
        g.strokeStyle = p > 0.5 ? 'rgba(94,211,176,.9)' : p > 0.25 ? 'rgba(240,176,78,.95)' : 'rgba(224,106,78,1)';
        g.lineWidth = 4;
        g.beginPath();
        g.arc(s.x, painted() ? 226 : 196, painted() ? 84 : 58, -Math.PI / 2, -Math.PI / 2 + p * TAU);
        g.stroke();
      }
  });
  g.drawImage(LAYER.cf, 0, 0, VW, VH);
  // the pass from the kitchen
  C.pass.forEach((b, j) => {
    const d = dk('pbowl');
    if (d && d.id === b.id) return;
    const P = CL.pass[j % 2];
    drawBowl(g, P.x, P.y + (j > 1 ? -14 : 0), 0.78, b);
    if (b.broth > 0.3 && Math.random() < dt * 1.5) steamAt(P.x, P.y - 8, 1);
  });
  // cups, bowls, coins, the dirty spot
  C.seats.forEach(s => {
    const gg = s.g;
    if (gg && gg.st !== 'walk') drawCup(g, cupX(s), CUPY, s.cup);
    if (dk('teapot') && gg && gg.st !== 'walk' && gg.st !== 'leave') {
      g.strokeStyle = 'rgba(94,211,176,.9)';
      g.lineWidth = 3;
      g.setLineDash([6, 5]);
      el(g, cupX(s), CUPY, 30, 24);
      g.stroke();
      g.setLineDash([]);
    }
    if (dk('pbowl') && gg && (gg.st === 'order' || gg.st === 'refused') && !s.bowl) {
      g.strokeStyle = 'rgba(94,211,176,.95)';
      g.lineWidth = 3;
      g.setLineDash([8, 6]);
      el(g, s.x, 372, 74, 28);
      g.stroke();
      g.setLineDash([]);
    }
    if (s.dirty) {
      g.globalAlpha = Math.min(1, s.dirty);
      g.fillStyle = 'rgba(150,96,40,.55)';
      el(g, s.x, 390, 46, 10);
      g.fill();
      el(g, s.x + 30, 396, 14, 5);
      g.fill();
      g.globalAlpha = 1;
      const ph = (G.clock * 1.2) % 1;
      g.strokeStyle = `rgba(94,211,176,${(0.8 * (1 - ph)).toFixed(2)})`;
      g.lineWidth = 3;
      g.setLineDash([7, 7]);
      g.lineDashOffset = -ph * 28;
      g.beginPath();
      g.moveTo(s.x - 64, 410);
      g.lineTo(s.x + 64, 410);
      g.stroke();
      g.setLineDash([]);
    }
    const dd = dk('refused'),
      di = dk('dish');
    const inHands = kenOn(gg) && gg.st === 'eat' && kenClip(gg).id === 'eat'; // Ken holds his bowl while he eats
    if (s.bowl && !inHands && !(dd && dd.si === s.i) && !(di && di.si === s.i)) {
      drawBowl(g, s.x, 362, 0.9, s.bowl, s.bowl.eat || 0);
      if (s.bowl.refused) {
        g.fillStyle = '#D8452F';
        rr(g, s.x - 40, 404, 80, 18, 9);
        g.fill();
        g.fillStyle = '#FFF4E2';
        g.font = '900 10px "M PLUS Rounded 1c"';
        g.textAlign = 'center';
        g.fillText(T('send it back', '退回厨房'), s.x, 417);
      }
    }
    if (s.coins) drawCoins(g, s.x + 92, 390, s.coins);
  });
  if (dk('refused') || dk('dish')) {
    g.strokeStyle = 'rgba(94,211,176,.95)';
    g.lineWidth = 3;
    g.setLineDash([8, 6]);
    if (dk('refused')) rr(g, 40, 214, 214, 140, 10);
    else rr(g, CL.tub.x - 50, CL.tub.y - 24, 100, 52, 12);
    g.stroke();
    g.setLineDash([]);
  }
  if (!dk('teapot')) drawTeapot(g, CL.teapot.x, CL.teapot.y, 0);
  if (!dk('cloth')) {
    g.save();
    g.translate(CL.cloth.x, CL.cloth.y);
    rr(g, -28, -12, 56, 24, 6);
    g.fillStyle = '#FDFBF6';
    g.fill();
    g.fillStyle = '#3E6EA8';
    g.fillRect(-28, 3, 56, 4);
    g.restore();
  }
  drawHeld(g);
}
export function bubble(g, x, y, txt) {
  g.font = '900 15px "M PLUS Rounded 1c"';
  const w = g.measureText(txt).width + 26;
  rr(g, x - w / 2, y - 34, w, 32, 12);
  g.fillStyle = '#FFF4E2';
  g.fill();
  g.beginPath();
  g.moveTo(x - 7, y - 2);
  g.lineTo(x, y + 8);
  g.lineTo(x + 7, y - 2);
  g.closePath();
  g.fill();
  g.fillStyle = '#3B2618';
  g.textAlign = 'center';
  g.fillText(txt, x, y - 12);
}
// the teaching layer: a mint arrow from what to pick up to where it goes, and a hand that shows the move
export function drawHintArrow(g, h) {
  if (!h) return;
  const ph = (G.clock * 0.9) % 1;
  if (h.from) {
    const f = h.from,
      t = h.to || h.from;
    g.strokeStyle = 'rgba(94,211,176,.9)';
    g.lineWidth = 4;
    g.setLineDash([10, 8]);
    g.lineDashOffset = -G.clock * 30;
    g.beginPath();
    g.moveTo(f.x, f.y);
    g.quadraticCurveTo((f.x + t.x) / 2, Math.min(f.y, t.y) - 60, t.x, t.y);
    g.stroke();
    g.setLineDash([]);
    const k = ph < 0.8 ? ph / 0.8 : 1,
      x = (1 - k) * (1 - k) * f.x + (2 * (1 - k) * k * (f.x + t.x)) / 2 + k * k * t.x,
      y = (1 - k) * (1 - k) * f.y + 2 * (1 - k) * k * (Math.min(f.y, t.y) - 60) + k * k * t.y;
    hand(g, x, y, ph > 0.85);
    const pr = (G.clock * 1.5) % 1;
    g.strokeStyle = `rgba(94,211,176,${(1 - pr).toFixed(2)})`;
    g.lineWidth = 3;
    el(g, f.x, f.y, 24 + pr * 18, 24 + pr * 18);
    g.stroke();
  } else if (h.at) {
    const pr = (G.clock * 1.5) % 1;
    g.strokeStyle = `rgba(94,211,176,${(1 - pr).toFixed(2)})`;
    g.lineWidth = 3;
    el(g, h.at.x, h.at.y, 26 + pr * 20, 26 + pr * 20);
    g.stroke();
    if (h.tap) hand(g, h.at.x + 8, h.at.y + 10, ph > 0.5);
  }
}
export function hand(g, x, y, press) {
  g.save();
  g.translate(x + 6, y + 8);
  g.scale(press ? 0.92 : 1, press ? 0.92 : 1);
  g.fillStyle = '#FFF4E2';
  g.strokeStyle = '#3B2618';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(0, -16);
  g.quadraticCurveTo(0, -22, 5, -22);
  g.quadraticCurveTo(10, -22, 10, -16);
  g.lineTo(10, -6);
  g.lineTo(20, -4);
  g.quadraticCurveTo(26, -2, 24, 6);
  g.lineTo(20, 20);
  g.lineTo(4, 20);
  g.lineTo(-6, 8);
  g.quadraticCurveTo(-8, 2, -2, 2);
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
}
