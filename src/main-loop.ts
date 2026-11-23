// main loop
import { G } from './game/G';
import { LINK } from './net/link';
import { $, HUB, T, esc, store } from './core/env';
import { C, K, NET_, cReset, counterHere, kReset, kitchenHere, meCook, meCounter } from './game/night-state';
import { hudNow } from './game/rush';
import { CL, KL } from './data/layout';
import { DPR, KEN, OX, OY, S, VH, VW, ctx, cv, kenClip, toS, ART, HOOK3D } from './render/stage';
import { HINT, hintTick } from './game/teach';
import { MASTER, NIGHTS, LOOKS } from './data/content';
import { PHRASES, cSay, doorWant, matchPhrase, sayTick } from './game/door';
import { RD, lobbyUI, readyUI } from './ui/menus';
import { botCook, botCounter } from './game/bot';
import {
  cClear,
  cCollect,
  cReturn,
  cSeat,
  cSend,
  cServe,
  cTake,
  cTea,
  cWipe,
  counterTick,
  judge,
} from './game/counter';
import { domTick } from './ui/overlays';
import { drawCounter, drawHintArrow, drawKitchen } from './render/views';
import { drawParticles, stepParticles } from './render/particles';
import { holdTick } from './input/pointer';
import { joinRoom } from './ui/buttons';
import { kDump, kLift, kLower, kNest, kSlide, kTakeBack, kTop, kUntop, kitchenTick } from './game/kitchen';
import { onNet, setLink } from './net/online';
import { toCook, toCounter } from './net/messages';
import { drawGuest } from './render/shapes';

export let last = 0;
export function frame(now) {
  requestAnimationFrame(frame);
  let dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
  last = now;
  if (G.PAUSED) dt = 0;
  G.clock += dt;
  if (G.NIGHT && G.NIGHT.ph === 'run') {
    G.NIGHT.t += dt;
    if (kitchenHere()) kitchenTick(dt);
    if (counterHere()) counterTick(dt);
    holdTick(dt);
    if (G.MODE === 'bot') {
      if (G.ROLE === 'cook') botCounter(dt);
      else botCook(dt);
    }
  }
  stepParticles(dt);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const k3 = !!(HOOK3D.kitchen && G.NIGHT && K && C && meCook()),
    c3 = !!HOOK3D.counter && !k3;
  if (k3 || c3) ctx.clearRect(0, 0, cv.width, cv.height);
  else {
    HOOK3D.off?.();
    ctx.fillStyle = '#1A2340';
    ctx.fillRect(0, 0, cv.width, cv.height);
  }
  ctx.setTransform(S * DPR, 0, 0, S * DPR, OX * DPR, OY * DPR);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, VW, VH);
  ctx.clip();
  if (G.NIGHT && K && C) {
    if (meCook()) k3 ? HOOK3D.kitchen!(dt) : drawKitchen(dt);
    else c3 ? HOOK3D.counter!(dt) : drawCounter(dt);
    if (G.NIGHT.ph === 'run') drawHintArrow(ctx, HINT);
  } else {
    if (!C) cReset(1);
    if (!K) kReset();
    c3 ? HOOK3D.counter!(dt) : drawCounter(dt);
  }
  drawParticles(ctx);
  ctx.restore();
  hintTick();
  domTick();
  hudTick();
}
export function hudTick() {
  if (!G.NIGHT || !C) return;
  sayTick();
  const y = '¥' + C.earned.toLocaleString('ja-JP'),
    el_ = $('#yen');
  if (meCounter()) {
    if (el_.dataset.k !== y) {
      el_.dataset.k = y;
      el_.innerHTML = `<b>${y}</b>`;
    }
    el_.hidden = false;
  } else el_.hidden = true;
  const N = NIGHTS[(G.NIGHT.n || 1) - 1],
    tot = N.guests.length,
    k = meCounter() ? C.served + ':' + C.next + ':' + C.left : 'c',
    pr = $('#prog'),
    H = counterHere() ? hudNow() : K && K.hud,
    cb = $('#combo');
  // the combo, on both phones (nights with patience)
  const ck = !N.gentle && H && (H.x > 1 || H.k > 0) ? H.x + ':' + H.k + G.LANG : '';
  if (cb.dataset.k !== ck) {
    cb.dataset.k = ck;
    cb.hidden = !ck;
    if (ck)
      cb.innerHTML = `<b>×${H.x}</b>${T('combo', '连击')} ${H.k}<span class="pips">${[3, 6]
        .map(n => `<i class="${H.k >= n ? 'on' : ''}"></i>`)
        .join('')}</span>`;
    cb.className = 'chip' + (H && H.x >= 3 ? ' hot' : H && H.x >= 2 ? ' warm' : '');
  }
  // a rush night's clock, on both phones
  if (N.rush) {
    const rk = H ? H.s + ':' + H.w + ':' + H.o + G.LANG : '';
    if (pr.dataset.k !== rk) {
      pr.dataset.k = rk;
      const m = Math.floor(Math.max(0, H ? H.s : N.rush.secs) / 60),
        sec = String(Math.max(0, H ? H.s : N.rush.secs) % 60).padStart(2, '0');
      pr.innerHTML =
        H && H.o
          ? `閉店 · ${T('finish up', '收尾')}`
          : `${esc(T(N.name[0], N.name[1]))} · <b class="clock${H && H.s <= 10 ? ' low' : ''}">${m}:${sec}</b>${H && H.w ? `<span class="wave">${H.w === 2 ? '終電' : 'ラッシュ'}</span>` : ''}`;
    }
    pr.classList.toggle('side', meCook());
    pr.hidden = false;
    return;
  }
  pr.classList.remove('side');
  if (meCounter()) {
    if (pr.dataset.k !== k) {
      pr.dataset.k = k;
      pr.innerHTML = `${esc(T(N.name[0], N.name[1]))} · ${Array.from({ length: tot }, (_, i) => `<i class="${i < C.served + C.left ? 'on' : i < C.next ? 'now' : ''}"></i>`).join('')}`;
    }
    pr.hidden = false;
  } else pr.hidden = true;
}
export function applySafe() {
  if (!HUB) return;
  const s = HUB.safe(),
    r = document.documentElement.style;
  r.setProperty('--sl', s.l + 'px');
  r.setProperty('--sr', s.r + 'px');
  r.setProperty('--st', s.t + 'px');
  r.setProperty('--sb', s.b + 'px');
}
export function setLinkHub(up) {
  setLink(up);
}

// runs once at start, after every module has loaded (main.ts calls these in order)
export function init(): void {
  requestAnimationFrame(frame);
  $('#rot').textContent = T('Turn your phone sideways', '请把手机横过来') + ' · 横にしてね';
  if (HUB) {
    G.MODE = 'net';
    G.ROLE = HUB.role();
    NET_.ch = HUB.open(onNet, setLinkHub);
    applySafe();
    RD.n = store.get('night2', 0) ? 2 : 1;
    readyUI();
  } else {
    const inv = (location.hash.match(/join=([A-Za-z0-9]{4})/) || [])[1];
    if (inv) {
      history.replaceState(null, '', location.pathname);
      joinRoom(inv.toUpperCase());
    } else lobbyUI();
  }
  (window as any).__mr = {
    art: { drawGuest, LOOKS, KEN, ART }, // the drawing, for the look checks
    bots: { botCook, botCounter }, // both stations by bot, for the balance checks
    role: () => G.ROLE,
    mode: () => G.MODE,
    K: () => K,
    C: () => C,
    N: () => G.NIGHT,
    KL,
    CL,
    RD,
    HINT: () => HINT,
    scr: (x, y) => toS(x, y),
    link: () => LINK,
    seatX: () => (C ? C.seats.map(s => s.x) : []),
    act: {
      kNest,
      kLower,
      kLift,
      kTop,
      kUntop,
      kSlide,
      kDump,
      kTakeBack,
      cSeat,
      cTake,
      cSend,
      cServe,
      cReturn,
      cCollect,
      cClear,
      cWipe,
      cTea,
      cSay,
    },
    door: { want: () => doorWant(), match: matchPhrase, PHRASES },
    toCounter,
    toCook,
    judge,
    words: () => MASTER,
    bank: () => G.BANK,
    ken: {
      d: () => KEN.d,
      clip: g => kenClip(g),
      ready: () => !!KEN.d && Object.values(KEN.im).every(i => i.complete && i.naturalWidth),
    },
  };
}
