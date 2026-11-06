// buttons
import { G } from '../game/G';
import { LINK } from '../net/link';
import { $, HUB, T, store } from '../core/env';
import { LAYER } from '../render/stage';
import { NET_, meCounter } from '../game/night-state';
import { NIGHTS } from '../data/content';
import { RD, ROLE_CARDS, lobbyUI, readyUI, roomUI, ui } from './menus';
import { audio } from '../audio/sfx';
import { linkState, maybeGo, netSend, onNet, toReady } from '../net/online';
import { startNight } from '../game/flow';
import { toast } from './overlays';

export function joinRoom(code) {
  G.MODE = 'net';
  LINK.open(onNet, linkState);
  NET_.ch = LINK;
  LINK.join(code);
  roomUI('joining');
}
export function toastUI(t) {
  toast(t);
  $('#status').hidden = false;
}

// runs once at start, after every module has loaded (main.ts calls these in order)
export function init(): void {
  document.addEventListener('click', async e => {
    const b = (e.target as Element).closest('button');
    if (!b) return;
    const a = b.dataset.a;
    audio();
    if (b.id === 'langBtn') {
      G.LANG = G.LANG === 'zh' ? 'en' : 'zh';
      try {
        localStorage.setItem('yofu_lang', JSON.stringify(G.LANG));
      } catch (x) {}
      document.documentElement.dataset.lang = G.LANG;
      for (const k in LAYER) LAYER[k] = null;
      lobbyUI();
      return;
    }
    if (b.dataset.night) {
      RD.n = +b.dataset.night;
      if (G.MODE === 'net') netSend({ t: 'night', n: RD.n });
      readyUI();
      return;
    }
    if (!a) return;
    if (a === 'practice')
      return ui(
        `<div class="kicker">${T('Practice with しばBot', '和 しばBot 练习')}</div><h2>${T('Pick your role', '选角色')}</h2><p class="lead">${T("しばBot takes the other one. As the counter, tap Send so しばBot knows the order (it can't hear you).", 'しばBot 做另一个角色。你当柜台时，要点"发送"让 しばBot 知道订单（它听不到你说话）。')}</p>${ROLE_CARDS('p')}<div class="row"><button class="btn ghost" data-a="lobby">${T('Back', '返回')}</button></div>`,
      );
    if (a === 'pcook' || a === 'pcounter') {
      G.MODE = 'bot';
      G.ROLE = a === 'pcook' ? 'cook' : 'counter';
      RD.n = store.get('night2', 0) || NIGHTS[RD.n - 1].door ? RD.n : 1;
      RD.me = false;
      RD.them = true;
      readyUI();
      return;
    }
    if (a === 'create')
      return ui(
        `<div class="kicker">${T('Open a room', '开房间')}</div><h2>${T('Which role do you take first?', '你先当哪个角色？')}</h2>${ROLE_CARDS('h')}<div class="row"><button class="btn ghost" data-a="lobby">${T('Back', '返回')}</button></div>`,
      );
    if (a === 'hcook' || a === 'hcounter') {
      G.ROLE = a === 'hcook' ? 'cook' : 'counter';
      G.MODE = 'net';
      RD.n = 1;
      LINK.open(onNet, linkState);
      NET_.ch = LINK;
      LINK.host();
      roomUI('opening');
      return;
    }
    if (a === 'join') {
      const code = ($('#codeIn').value || '').trim().toUpperCase();
      if (!/^[A-Z0-9]{4}$/.test(code)) return lobbyUI(T('Type the 4-character room code.', '请输入 4 位房间码。'));
      joinRoom(code);
      return;
    }
    if (a === 'rejoin') {
      const s = LINK.saved();
      if (!s) return lobbyUI();
      G.MODE = 'net';
      LINK.open(onNet, linkState);
      NET_.ch = LINK;
      if (s.side === 'h') {
        G.ROLE = store.get('hostRole', 'cook');
        LINK.host(s.code, true);
        roomUI('opening');
      } else {
        LINK.join(s.code, true);
        roomUI('joining');
      }
      return;
    }
    if (a === 'share') {
      const url = LINK.invite();
      try {
        if (navigator.share) {
          await navigator.share({
            title: 'まよなか屋',
            text: T(`Cook ramen with me · room ${LINK.code}`, `一起开拉面摊 · 房间 ${LINK.code}`),
            url,
          });
          return;
        }
      } catch (x) {
        if (x && x.name === 'AbortError') return;
      }
    }
    if (a === 'share' || a === 'copy') {
      try {
        await navigator.clipboard.writeText(LINK.invite());
        toastUI(T('Link copied', '已复制链接'));
      } catch (x) {
        toastUI(T('Select the link and copy it', '请选中链接复制'));
      }
      return;
    }
    if (a === 'leave') {
      LINK.leave(false);
      lobbyUI();
      return;
    }
    if (a === 'lobby') {
      lobbyUI();
      return;
    }
    if (a === 'ready') {
      if (RD.me) return;
      RD.me = true;
      if (G.MODE === 'bot') {
        startNight(RD.n);
        return;
      }
      netSend({ t: 'ready', n: meCounter() ? RD.n : 0 });
      readyUI();
      maybeGo();
      return;
    }
    if (a === 'bagain') {
      toReady();
      return;
    }
    if (a === 'bnext') {
      RD.n = Math.min(NIGHTS.length, (G.NIGHT ? G.NIGHT.n : 1) + 1);
      toReady();
      return;
    }
    if (a === 'bswap') {
      G.ROLE = G.ROLE === 'cook' ? 'counter' : 'cook';
      toReady();
      return;
    }
    if (a === 'nagain') {
      netSend({ t: 'again', n: G.NIGHT ? G.NIGHT.n : 1 });
      RD.n = G.NIGHT ? G.NIGHT.n : 1;
      toReady();
      return;
    }
    if (a === 'nnext') {
      const n = Math.min(NIGHTS.length, (G.NIGHT ? G.NIGHT.n : 1) + 1);
      netSend({ t: 'again', n });
      RD.n = n;
      toReady();
      return;
    }
    if (a === 'nswap') {
      netSend({ t: 'swap' });
      G.ROLE = G.ROLE === 'cook' ? 'counter' : 'cook';
      toReady();
      return;
    }
    if (a === 'hnext') return HUB.next();
    if (a === 'hagain') return HUB.again();
    if (a === 'hswap') return HUB.swapAgain();
    if (a === 'hmenu') return HUB.menu();
  });
  // the host remembers its role, so a reload can rejoin as the same one
  setInterval(() => {
    if (G.MODE === 'net' && LINK.side === 'h' && G.ROLE) store.set('hostRole', G.ROLE);
  }, 2000);
}
