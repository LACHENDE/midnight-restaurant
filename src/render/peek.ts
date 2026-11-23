// the window into your partner's station. The cook watches the counter (guests, their patience, bowls landing,
// coins); the counter watches the kitchen through the hatch (noodles in the pot, bowls filling up). The partner's
// finger shows as a hand. No order words in it: you still have to talk.
import { G } from '../game/G';
import { C, K, NET_, meCook } from '../game/night-state';
import { KL } from '../data/layout';
import { LOOKS, prop } from '../data/content';
import { ART, artReady } from './stage';
import { VH, VW } from './dims';
import { drawBasket, drawBowl, drawCoins, drawGuest, drawLadle, el, rr } from './shapes';
import { hand } from './views';
import { PTR } from '../input/pointer';
import { BC, BK } from '../game/bot';
import { HUB, T, clamp } from '../core/env';

export const PEEK = { got: null, at: -9, sendT: 0, hx: 0, hy: 0, vis: false };
// where the window sits on each phone, and the part of the partner's stage it shows (x, y, w, h)
const WIN = {
  cook: { x: 14, y: 64, w: 236, h: 102, crop: [200, 96, 720, 310], label: ['カウンター', 'Counter', '柜台'] },
  counter: { x: 22, y: 124, w: 220, h: 102, crop: [200, 150, 560, 260], label: ['キッチン', 'Kitchen', '厨房'] },
};

// this phone's finger, while it's down or just moved
const handOf = () =>
  PTR.down || G.clock - PTR.at < 0.6 ? [Math.round(PTR.x), Math.round(PTR.y), PTR.down ? 1 : 0] : null;
// what each station shows the other
export function kitchenModel() {
  const b = K.basket;
  return {
    b: b.st,
    d: b.done,
    t: Math.round(b.t * 10) / 10,
    s: K.slots.map(w => (w ? { n: w.noodles, r: Math.round(w.broth * 100) / 100, o: w.tops.slice() } : null)),
    h: handOf(),
  };
}
export function counterModel() {
  return {
    s: C.seats.map(s => {
      const g = s.g,
        b = s.bowl;
      return {
        x: s.x,
        w: g ? g.who : null,
        st: g ? g.st : null,
        p: g ? Math.round(clamp(g.pat, 0, 1) * 100) / 100 : 1,
        u: g && g.hurry ? 1 : 0,
        sad: g && g.sad ? 1 : 0,
        b: b ? { n: b.noodles, o: b.tops, e: Math.round((b.eat || 0) * 100) / 100, m: b.empty ? 1 : 0 } : null,
        c: s.coins ? 1 : 0,
        d: s.dirty ? 1 : 0,
      };
    }),
    q: C.queue.length + ((C.pending && C.pending.length) || 0),
    h: handOf(),
  };
}
// in practice the kitchen is しばBot's: its bowl's progress, played out step by step
function botKitchen() {
  const j = BK.busy,
    empty = () => ({ n: null, r: 0, o: [] }),
    P = KL.pot,
    S = KL.slots[0];
  if (!j) return { b: 'hook', d: 'raw', t: 0, s: [empty(), empty()], h: null };
  const f = 1 - j.left / (j.dur || 7);
  if (f < 0.12) return { b: 'full', d: 'raw', t: 0, s: [empty(), empty()], h: [KL.hook.x + 140, KL.hook.y, 1] };
  if (f < 0.55) {
    const t = ((f - 0.12) / 0.43) * 6.6;
    return {
      b: 'pot',
      d: t < 3.5 ? 'raw' : t < 5.5 ? 'ready' : 'perfect',
      t,
      s: [empty(), empty()],
      h: f < 0.22 ? [P.x + 20, P.y - 40, 1] : null,
    };
  }
  if (f < 0.7)
    return {
      b: 'hook',
      d: 'raw',
      t: 0,
      s: [{ n: 'ready', r: ((f - 0.55) / 0.15) * 0.9, o: [] }, empty()],
      h: [S.x + 30, S.y - 70, 1],
    };
  if (f < 0.95) {
    const x = ((f - 0.7) / 0.25) * j.o.length,
      k = Math.min(j.o.length, Math.floor(x)),
      tr = KL.trays[j.o[Math.min(k, j.o.length - 1)]] || S,
      atTray = x % 1 < 0.5;
    return {
      b: 'hook',
      d: 'raw',
      t: 0,
      s: [{ n: 'ready', r: 0.9, o: j.o.slice(0, k) }, empty()],
      h: atTray ? [tr.x, tr.y - 20, 1] : [S.x, S.y - 20, 1],
    };
  }
  return { b: 'hook', d: 'raw', t: 0, s: [null, empty()], h: [KL.pass.x, KL.pass.y, 1] };
}
function model() {
  if (G.MODE === 'bot') {
    if (!meCook()) return botKitchen();
    const m = counterModel();
    m.h = G.clock - BC.hat < 1.4 ? [BC.hx, BC.hy, 1] : null;
    return m;
  }
  return PEEK.got && G.clock - PEEK.at < 3 ? PEEK.got : null;
}
// online: each phone sends its own station a few times a second (not resent if lost: the next one is fresher)
export function peekTick(dt) {
  if (G.MODE !== 'net' || !G.NIGHT || G.NIGHT.ph !== 'run' || !K || !C) return;
  PEEK.sendT -= dt;
  if (PEEK.sendT > 0) return;
  PEEK.sendT = HUB ? 0.25 : 0.125;
  const ch = NET_.ch;
  if (ch) ch.send({ t: 'peek', m: meCook() ? kitchenModel() : counterModel() }, false);
}
export function peekRecv(m) {
  PEEK.got = m.m;
  PEEK.at = G.clock;
}
export function peekReset() {
  PEEK.got = null;
  PEEK.at = -9;
  PEEK.vis = false;
}

// the noodle dial, as the cook sees it
function dial(g, x, y, t) {
  rr(g, x - 90, y - 12, 180, 24, 12);
  g.fillStyle = '#FFF4E2';
  g.fill();
  (
    [
      [0, 3.5, '#C9CFD4'],
      [3.5, 12, '#5ED3B0'],
      [5.5, 7.5, '#FFC93C'],
      [12, 16, '#F0B04E'],
      [16, 18, '#E06A4E'],
    ] as [number, number, string][]
  ).forEach(([a, c, col]) => {
    g.fillStyle = col;
    rr(g, x - 78 + (a / 18) * 156, y - 5, ((c - a) / 18) * 156, 10, 4);
    g.fill();
  });
  const px = x - 78 + (Math.min(t, 18) / 18) * 156;
  g.fillStyle = '#3B2618';
  g.beginPath();
  g.moveTo(px - 9, y - 18);
  g.lineTo(px + 9, y - 18);
  g.lineTo(px, y - 5);
  g.closePath();
  g.fill();
}
function miniKitchen(g, m) {
  if (artReady('kitchen')) g.drawImage(ART.kitchen, 0, 0, VW, VH);
  else {
    g.fillStyle = '#5E3A24';
    g.fillRect(0, 0, VW, VH);
  }
  const P = KL.pot;
  if (!prop(g, 'pot', P.x, P.y)) {
    el(g, P.x, P.y, 112, 34);
    g.fillStyle = '#C9D1D8';
    g.fill();
  }
  if (m.b === 'pot') {
    g.save();
    g.beginPath();
    g.rect(P.x - 112, P.y - 80, 224, 80);
    g.clip();
    drawBasket(g, P.x - 10, P.y + 6 + Math.sin(G.clock * 3) * 1.5, true, m.d, true);
    g.restore();
    dial(g, P.x, 186, m.t);
  }
  prop(g, 'broth', KL.broth.x, KL.broth.y);
  drawLadle(g, KL.ladle.x - 30, KL.ladle.y + 10);
  m.s.forEach((w, i) => {
    if (w) drawBowl(g, KL.slots[i].x, KL.slots[i].y, 1, { noodles: w.n, broth: w.r, tops: w.o, pop: 0 });
  });
}
function miniCounter(g, m) {
  if (artReady('counter')) g.drawImage(ART.counter, 0, 0, VW, VH);
  else {
    g.fillStyle = '#1D2744';
    g.fillRect(0, 0, VW, VH);
  }
  for (const s of m.s) {
    if (!s.w || s.st === 'walk') continue;
    const mood =
      s.st === 'eat' || s.st === 'spicy' || s.st === 'pay'
        ? 'eat'
        : s.st === 'leave'
          ? s.sad
            ? 'hmm'
            : 'happy'
          : s.st === 'refused'
            ? 'hmm'
            : s.st === 'ask'
              ? 'ask'
              : '';
    drawGuest(g, LOOKS[s.w], s.x, 318, 1, mood, { t: G.clock });
    if (s.st === 'ask' || s.st === 'order' || s.st === 'refused') {
      g.strokeStyle = s.p > 0.5 ? '#5ED3B0' : s.p > 0.25 ? '#F0B04E' : '#E06A4E';
      g.lineWidth = 12;
      g.beginPath();
      g.arc(s.x, 226, 92, -Math.PI / 2, -Math.PI / 2 + s.p * Math.PI * 2);
      g.stroke();
    }
    if (s.u && s.st !== 'leave') {
      el(g, s.x - 96, 150, 22, 22);
      g.fillStyle = '#D8452F';
      g.fill();
      g.lineWidth = 6;
      g.strokeStyle = '#1B1418';
      g.stroke();
    }
  }
  // the front of the counter, over the guests
  if (artReady('counter')) {
    const im = ART.counter,
      sy = (im.naturalHeight * 330) / VH;
    g.drawImage(im, 0, sy, im.naturalWidth, im.naturalHeight - sy, 0, 330, VW, VH - 330);
  }
  for (const s of m.s) {
    if (s.b) drawBowl(g, s.x, 362, 0.9, { noodles: s.b.n, broth: 0.9, tops: s.b.o, pop: 0 }, s.b.e);
    if (s.c) drawCoins(g, s.x + 92, 390, 500);
    if (s.d) {
      g.globalAlpha = 0.5;
      el(g, s.x, 392, 60, 14);
      g.fillStyle = '#7A4A2A';
      g.fill();
      g.globalAlpha = 1;
    }
  }
}
export function drawPeek(g, dt) {
  if (!G.NIGHT || G.NIGHT.ph !== 'run' || !K || !C) return;
  const W = meCook() ? WIN.cook : WIN.counter,
    m = model(),
    [cx, cy, cw] = W.crop,
    k = W.w / cw;
  g.save();
  // the frame
  rr(g, W.x - 3, W.y - 3, W.w + 6, W.h + 6, 12);
  g.fillStyle = '#1B1418';
  g.fill();
  rr(g, W.x, W.y, W.w, W.h, 9);
  g.save();
  g.clip();
  g.fillStyle = '#2A2238';
  g.fillRect(W.x, W.y, W.w, W.h);
  if (m) {
    g.save();
    g.translate(W.x, W.y);
    g.scale(k, k);
    g.translate(-cx, -cy);
    if (meCook()) miniCounter(g, m);
    else miniKitchen(g, m);
    g.restore();
    // guests still out in the rain
    if (m.q) {
      rr(g, W.x + W.w - 46, W.y + 6, 40, 18, 9);
      g.fillStyle = 'rgba(27,20,24,.8)';
      g.fill();
      g.fillStyle = '#FFF4E2';
      g.font = '900 11px "M PLUS Rounded 1c"';
      g.textAlign = 'center';
      g.fillText('☂ ' + m.q, W.x + W.w - 26, W.y + 19);
    }
    // the partner's hand
    if (m.h) {
      const tx = clamp(W.x + (m.h[0] - cx) * k, W.x + 2, W.x + W.w - 16),
        ty = clamp(W.y + (m.h[1] - cy) * k, W.y + 4, W.y + W.h - 16);
      if (!PEEK.vis) {
        PEEK.hx = tx;
        PEEK.hy = ty;
      }
      PEEK.vis = true;
      PEEK.hx += (tx - PEEK.hx) * Math.min(1, dt * 12);
      PEEK.hy += (ty - PEEK.hy) * Math.min(1, dt * 12);
      g.save();
      g.translate(PEEK.hx, PEEK.hy);
      g.scale(0.62, 0.62);
      hand(g, 0, 0, !!m.h[2]);
      g.restore();
    } else PEEK.vis = false;
  } else {
    g.fillStyle = 'rgba(255,244,226,.75)';
    g.font = '900 12px "M PLUS Rounded 1c"';
    g.textAlign = 'center';
    g.fillText(T('waiting for your partner…', '等搭档…'), W.x + W.w / 2, W.y + W.h / 2 + 4);
  }
  g.restore();
  // the label: whose station, and a red dot while it's live
  const live = !!m,
    txt = W.label[0];
  g.font = '900 11px "M PLUS Rounded 1c"';
  const tw = g.measureText(txt).width + (live ? 26 : 16);
  rr(g, W.x + 6, W.y + 6, tw, 18, 9);
  g.fillStyle = 'rgba(255,244,226,.92)';
  g.fill();
  g.textAlign = 'left';
  g.fillStyle = '#3B2618';
  g.fillText(txt, W.x + (live ? 24 : 14), W.y + 19);
  if (live) {
    el(g, W.x + 16, W.y + 15, 3.5, 3.5);
    g.fillStyle = (G.clock * 1.5) % 1 < 0.6 ? '#E0402F' : '#F28A7E';
    g.fill();
  }
  g.restore();
}
