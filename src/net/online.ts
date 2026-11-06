// online: the hub's channel inside 夜ふかし, our own link otherwise
import { G } from '../game/G';
import { LINK } from './link';
import { $, T } from '../core/env';
import { NET_, meCook, meCounter } from '../game/night-state';
import { PTRS } from '../render/views';
import { RD, lobbyUI, readyUI, roomUI } from '../ui/menus';
import { cRecv } from '../game/counter';
import { kRecv } from '../game/kitchen';
import { showClose, startNight } from '../game/flow';

export function netSend(m) {
  const ch = NET_.ch;
  if (ch) ch.send(m, true);
}
export function onNet(m) {
  if (!m) return;
  if (m.t === 'role') {
    if (LINK.side === 'g') {
      G.ROLE = m.role === 'cook' ? 'counter' : 'cook';
      RD.me = false;
      RD.them = false;
      RD.n = m.n || 1;
      readyUI();
    }
    return;
  }
  if (m.t === 'ready') {
    RD.them = true;
    if (m.n) RD.n = m.n;
    if (!G.NIGHT || G.NIGHT.ph !== 'run') readyUI();
    maybeGo();
    return;
  }
  if (m.t === 'night') {
    RD.n = m.n;
    if (!G.NIGHT || G.NIGHT.ph !== 'run') readyUI();
    return;
  }
  if (m.t === 'go') {
    RD.n = m.n;
    startNight(m.n);
    return;
  }
  if (m.t === 'close') {
    if (meCook()) showClose(m.sum);
    return;
  }
  if (m.t === 'swap') {
    G.ROLE = G.ROLE === 'cook' ? 'counter' : 'cook';
    toReady();
    return;
  }
  if (m.t === 'again') {
    RD.n = m.n;
    toReady();
    return;
  }
  if (!G.NIGHT || G.NIGHT.ph !== 'run') return;
  if (meCook()) kRecv(m);
  else cRecv(m);
}
// the counter starts the night once both are ready
export function maybeGo() {
  if (meCounter() && RD.me && RD.them && (!G.NIGHT || G.NIGHT.ph !== 'run')) {
    netSend({ t: 'go', n: RD.n });
    startNight(RD.n);
  }
}
export function toReady() {
  G.NIGHT = null;
  RD.me = false;
  RD.them = G.MODE === 'bot';
  $('#hud').hidden = true;
  readyUI();
}
export function setLink(up) {
  G.PAUSED = !up;
  if (!up) PTRS.clear();
}
export let ovT = 0;
export function linkState(st) {
  const ov = $('#ov');
  if (st === 'waiting' || st === 'opening') {
    if (!LINK.everUp) roomUI(st === 'opening' ? 'opening' : 'room');
    return;
  }
  if (st === 'joining' || st === 'nohost') {
    if (!LINK.everUp) roomUI(st);
    return;
  }
  if (st === 'code') {
    roomUI('room');
    return;
  }
  if (st === 'error') {
    lobbyUI(
      T(
        'Online play could not start here. Check the connection (or the VPN) and try Safari or Chrome.',
        '这里无法联机。检查网络（或 VPN），试试 Safari 或 Chrome。',
      ),
    );
    return;
  }
  if (st === 'bye') {
    lobbyUI(T('Your partner left the room.', '搭档离开了房间。'));
    return;
  }
  if (st === 'hello' || st === 'reset') {
    G.MODE = 'net'; // a fresh partner page: start from the ready card again
    if (st === 'reset' || !G.NIGHT || G.NIGHT.ph !== 'run') {
      if (LINK.side === 'h') netSend({ t: 'role', role: G.ROLE, n: RD.n });
      if (LINK.side === 'h') toReady();
    }
  }
  if (st === 'down') {
    if (G.NIGHT && G.NIGHT.ph === 'run') {
      setLink(false);
      ov.hidden = false;
      ov.innerHTML = `<div><div><span class="spin"></span>${T('Connection lost. Finding your partner…', '连接中断，正在重新连接…')}</div><p class="note" style="color:#F6E6CC">${T('The game is paused and carries on by itself.', '游戏已暂停，连上后会自动继续。')}</p></div>`;
    }
    return;
  }
  if (st === 'up') {
    if (!ov.hidden) {
      let n = 3;
      ov.innerHTML = `<div class="n">${n}</div>`;
      const tick = () => {
        n--;
        if (n <= 0) {
          ov.hidden = true;
          setLink(true);
          return;
        }
        ov.innerHTML = `<div class="n">${n}</div>`;
        ovT = setTimeout(tick, 650);
      };
      clearTimeout(ovT);
      ovT = setTimeout(tick, 650);
    } else setLink(true);
  }
}
