// the night: start, close
import { G } from './G';
import { $, HUB, T, esc, store } from '../core/env';
import { BC, BK } from './bot';
import { C, cReset, kReset, meCook } from './night-state';
import { DECOR, MASTER, NIGHTS, WORDS, mean } from '../data/content';
import { ICON } from '../render/shapes';
import { ICONSVG, hideUI, ui } from '../ui/menus';
import { LAYER } from '../render/stage';
import { PT } from '../render/particles';
import { PTRS } from '../render/views';
import { SFX } from '../audio/sfx';
import { netSend } from '../net/online';

export function startNight(n) {
  G.NIGHT = { n, ph: 'run', t: 0 };
  kReset();
  cReset(n);
  PT.length = 0;
  PTRS.clear();
  BK.q = [];
  BK.busy = null;
  BC.t = 1.2;
  G.lastAct = G.clock;
  G.hintK = '';
  hideUI();
  $('#hud').hidden = false;
  $('#langBtn').hidden = true;
  SFX.open();
  $('#role').innerHTML = meCook() ? `${ICONSVG.pot}${T('COOK', '厨师')}` : `${ICONSVG.bowl}${T('COUNTER', '柜台')}`;
}
export function closeNight() {
  // the counter decides the night is over and tells the kitchen what it earned
  const N = NIGHTS[C.n - 1],
    sum = {
      n: C.n,
      served: C.served,
      total: N.guests.length,
      left: C.left,
      earned: C.earned,
      words: C.words,
      q: C.served ? C.quality / C.served : 0,
      sk: N.door ? C.sk : null,
    };
  if (G.MODE === 'net') netSend({ t: 'close', sum });
  showClose(sum);
}
export function showClose(sum) {
  if (!G.NIGHT || G.NIGHT.ph === 'close') return;
  G.NIGHT.ph = 'close';
  PTRS.clear();
  SFX.close();
  for (const w in sum.words) {
    MASTER[w] = (MASTER[w] || 0) + sum.words[w];
  }
  store.set('mastery', MASTER);
  const before = G.BANK;
  G.BANK += sum.earned;
  store.set('bank', G.BANK);
  const newDec = DECOR.filter(d => before < d.at && G.BANK >= d.at);
  for (const k in LAYER) LAYER[k] = null;
  if (sum.n === 1 && sum.served >= 1) store.set('night2', 1);
  const stars = sum.served === sum.total ? (sum.q > 0.95 ? 3 : 2) : sum.served > 0 ? 1 : 0;
  $('#hud').hidden = true;
  $('#cards').innerHTML = '';
  $('#tix').innerHTML = '';
  $('#say').hidden = true;
  if (HUB) HUB.result({ score: sum.earned, stars, win: sum.served === sum.total });
  const words = Object.keys(sum.words);
  const N = NIGHTS[sum.n - 1],
    nxt = sum.n < NIGHTS.length && store.get('night2', 0);
  let btns;
  if (HUB)
    btns = `<button class="btn" data-a="hnext">${T('Next game', '下一个游戏')}: ${esc(HUB.nextName())} →</button><button class="btn mint" data-a="hagain">${T('Another night', '再开一晚')}</button><button class="btn ghost" data-a="hswap">⇄ ${T('Swap roles', '换角色')}</button><button class="btn ghost" data-a="hmenu">${T('Menu', '菜单')}</button>`;
  else if (G.MODE === 'net')
    btns = `${nxt ? `<button class="btn" data-a="nnext">${T('Next night', '下一晚')} →</button>` : ''}<button class="btn mint" data-a="nagain">${T('Play this night again', '再玩这一晚')}</button><button class="btn ghost" data-a="nswap">⇄ ${T('Swap roles', '换角色')}</button><button class="btn ghost" data-a="leave">${T('Leave', '离开')}</button>`;
  else
    btns = `${nxt ? `<button class="btn" data-a="bnext">${T('Next night', '下一晚')} →</button>` : ''}<button class="btn mint" data-a="bagain">${T('Again', '再来')}</button><button class="btn ghost" data-a="bswap">⇄ ${T('Try the other role', '换个角色')}</button><button class="btn ghost" data-a="lobby">${T('Lobby', '大厅')}</button>`;
  ui(`<div class="kicker">閉店 · ${T('Closing time', '打烊')}</div><h2>${T('We made these bowls together.', '这些面是我们一起做的。')}</h2>
    <div class="stars">${'★'.repeat(stars)}<span class="off">${'★'.repeat(3 - stars)}</span></div>
    <div class="stats"><span>${T('Bowls served', '上了几碗')}<b>${sum.served}/${sum.total}</b></span><span>${T('Tonight', '今晚收入')}<b>¥${sum.earned.toLocaleString('ja-JP')}</b></span><span>${T('Stall savings', '小摊存款')}<b>¥${G.BANK.toLocaleString('ja-JP')}</b></span>${sum.sk ? `<span>接客<b>${sum.sk.ok}/${sum.sk.ok + sum.sk.bad}</b></span>` : ''}</div>
    ${words.length ? `<p class="note" style="margin-bottom:0">${T('Words you used tonight', '今晚用到的单词')}</p><div class="words">${words.map(w => `<span><img src="${ICON[w]}" alt="">${WORDS[w].k}<small>${WORDS[w].ro} · ${esc(mean(w))} ×${sum.words[w]}</small></span>`).join('')}</div>` : ''}
    ${newDec.length ? `<p class="note" style="color:#2C8F72;font-weight:900">${T('New for the stall:', '小摊添了新东西：')} ${newDec.map(d => esc(T(d.nm[0], d.nm[1]))).join(' · ')}</p>` : ''}
    ${sum.n === 1 && nxt && !HUB ? `<p class="note">${T('Next night: two seats, two-topping orders, and a new word: なると.', '下一晚：两个座位，两种配料的订单，还有新单词：なると。')}</p>` : ''}
    <div class="row">${btns}</div>`);
}
