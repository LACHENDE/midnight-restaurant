// the night: start, close
import { G } from './G';
import { $, HUB, T, esc, store } from '../core/env';
import { BC, BK } from './bot';
import { C, cReset, kReset, meCook } from './night-state';
import { DECOR, LOOKS, MASTER, MODS, NIGHTS, WORDS, mean, modMean } from '../data/content';
import { orderText } from './tel';
import { ICON } from '../render/shapes';
import { ICONSVG, hideUI, ui } from '../ui/menus';
import { LAYER } from '../render/stage';
import { PT } from '../render/particles';
import { PTRS } from '../render/views';
import { SFX } from '../audio/sfx';
import { netSend } from '../net/online';
import { rushPlan, rushReset } from './rush';
import { peekReset } from '../render/peek';

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
  rushReset();
  peekReset();
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
      rush: !!N.rush,
      missed: C.missed,
      streak: C.bestStreak,
      mods: C.mods,
      log: C.log,
      again: C.again,
    };
  if (N.rush) sum.total = rushPlan(C.n).total;
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
  for (const m in sum.mods || {}) {
    MASTER[m] = (MASTER[m] || 0) + sum.mods[m];
  }
  store.set('mastery', MASTER);
  const before = G.BANK;
  G.BANK += sum.earned;
  store.set('bank', G.BANK);
  const newDec = DECOR.filter(d => before < d.at && G.BANK >= d.at);
  for (const k in LAYER) LAYER[k] = null;
  if (sum.n === 1 && sum.served >= 1) store.set('night2', 1);
  const R = NIGHTS[sum.n - 1].rush,
    best = store.get('best' + sum.n, 0),
    record = !!R && sum.earned > best;
  if (record) store.set('best' + sum.n, sum.earned);
  const stars = R
    ? R.stars.filter(y => sum.earned >= y).length
    : sum.served === sum.total
      ? sum.q > 0.95
        ? 3
        : 2
      : sum.served > 0
        ? 1
        : 0;
  $('#hud').hidden = true;
  $('#cards').innerHTML = '';
  $('#tix').innerHTML = '';
  $('#say').hidden = true;
  if (HUB) HUB.result({ score: sum.earned, stars, win: sum.served === sum.total });
  const words = Object.keys(sum.words),
    mods = Object.keys(sum.mods || {});
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
    ${record ? `<p class="record">${T('New record!', '新纪录！')} 新記録！</p>` : ''}
    <div class="stats"><span>${T('Bowls served', '上了几碗')}<b>${sum.served}/${sum.total}</b></span>${R ? `<span>${T('Best combo', '最长连击')}<b>${sum.streak || 0}</b></span><span>${T('Record', '纪录')}<b>¥${Math.max(best, sum.earned).toLocaleString('ja-JP')}</b></span>` : ''}<span>${T('Tonight', '今晚收入')}<b>¥${sum.earned.toLocaleString('ja-JP')}</b></span><span>${T('Stall savings', '小摊存款')}<b>¥${G.BANK.toLocaleString('ja-JP')}</b></span>${sum.sk ? `<span>接客<b>${sum.sk.ok}/${sum.sk.ok + sum.sk.bad}</b></span>` : ''}</div>
    ${telCard(sum)}
    ${words.length ? `<p class="note" style="margin-bottom:0">${T('Words you used tonight', '今晚用到的单词')}</p><div class="words">${words.map(w => `<span><img src="${ICON[w]}" alt="">${WORDS[w].k}<small>${WORDS[w].ro} · ${esc(mean(w))} ×${sum.words[w]}</small></span>`).join('')}${mods.map(m => `<span>${MODS[m].k}<small>${MODS[m].ro} · ${esc(modMean(m))} ×${sum.mods[m]}</small></span>`).join('')}</div>` : ''}
    ${newDec.length ? `<p class="note" style="color:#2C8F72;font-weight:900">${T('New for the stall:', '小摊添了新东西：')} ${newDec.map(d => esc(T(d.nm[0], d.nm[1]))).join(' · ')}</p>` : ''}
    ${sum.n === 1 && nxt && !HUB ? `<p class="new">${T("Next night: two seats, a new word (なると), and the cook can't see the orders anymore. Counter, say them out loud!", '下一晚：两个座位，新单词（なると），而且厨师再也看不到订单了。柜台要大声说出来！')}</p>` : ''}
    <div class="row">${btns}</div>`);
}

// 伝言ゲーム: what each guest asked for, and what reached them — the wrong ones first (the bit you screenshot)
function telCard(sum) {
  const L = sum.log || [];
  if (!L.length) return '';
  const bad = L.filter(e => !e.ok),
    good = L.length - bad.length,
    how = e => {
      const b = e.b,
        a: string[] = [];
      if (e.mod === 'katame' || e.mod === 'yawa' || e.why === 'raw' || e.why === 'noodles')
        a.push(
          !b.noodles
            ? T('no noodles', '没有面')
            : b.noodles === 'raw'
              ? T('hard noodles', '面是硬的')
              : b.nt < 5.5
                ? 'かため'
                : b.nt < 12
                  ? T('normal noodles', '普通的面')
                  : 'やわらかめ',
        );
      if (e.mod === 'oome' || e.why === 'broth' || e.why === 'oome')
        a.push(
          b.broth >= 0.98
            ? 'スープおおめ'
            : b.broth < 0.5
              ? T('hardly any broth', '几乎没汤')
              : T('normal broth', '普通的汤'),
        );
      return a.length ? ' · ' + a.join(' · ') : '';
    },
    made = e =>
      e.gone
        ? T('nothing: they left', '什么都没有：走了')
        : (e.b.tops.length ? e.b.tops.map(w => WORDS[w].k).join('・') : T('no toppings', '没加配料')) + how(e),
    rows = bad
      .slice(0, 6)
      .map(
        e =>
          `<div class="tr"><b>${esc(LOOKS[e.who] ? LOOKS[e.who].nm : '')}</b><span>${esc(orderText(e.o, e.mod))}</span><i>→</i><span class="got">${esc(made(e))}</span><em>✗</em></div>`,
      )
      .join('');
  return `<div class="tel"><p class="note">伝言ゲーム · ${T('what they asked for → what reached them', '客人点的 → 端上去的')}</p>${rows}<p class="ok">◎ ${good} ${T(good === 1 ? 'bowl just right' : 'bowls just right', '碗刚刚好')}${bad.length ? '' : ' · 完璧！'}${sum.again ? ` · もう一度 ×${sum.again}` : ''}</p></div>`;
}
