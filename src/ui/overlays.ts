// the DOM bits over the canvas: tickets, order cards, new words
import { G } from '../game/G';
import { $, T, esc } from '../core/env';
import { C, K, meCook } from '../game/night-state';
import { ICON } from '../render/shapes';
import { LOOKS, WORDS, known, mean } from '../data/content';
import { SFX } from '../audio/sfx';
import { toS } from '../render/stage';

export let tixK = '',
  cardK = '';
export const wordRow = (w, small) =>
  `<div class="w"><img src="${ICON[w]}" alt=""><span><b>${WORDS[w].k}</b>${known(w) && !small ? '' : `<small>${WORDS[w].ro} · ${esc(mean(w))}</small>`}</span></div>`;
export function domTick() {
  if (!G.NIGHT || G.NIGHT.ph !== 'run') {
    $('#tix').innerHTML = '';
    $('#cards').innerHTML = '';
    tixK = '';
    cardK = '';
    return;
  }
  if (meCook()) {
    const k =
      K.tickets
        .map(
          t =>
            t.cid +
            ':' +
            (t.o ? t.o.join('+') : '?') +
            ':' +
            (t.done ? 1 : 0) +
            ':' +
            (t.ok === false ? 'x' : '') +
            ':' +
            (t.lv || 0) +
            (t.hurry ? 'h' : '') +
            (t.gone ? 'g' : ''),
        )
        .join('|') + G.LANG;
    if (k !== tixK) {
      tixK = k;
      $('#tix').innerHTML = K.tickets
        .map(
          t =>
            `<div class="tk${t.done ? ' done' : ''}${t.gone ? ' gone' : ''}${!t.done && t.lv ? ' lv' + t.lv : ''}">${t.hurry && !t.done ? '<span class="isogi">いそぎ</span>' : ''}${t.o ? t.o.map(w => `<img src="${ICON[w]}" alt=""><span>${WORDS[w].k}${known(w) ? '' : `<small>${WORDS[w].ro}</small>`}</span>`).join('') : `<span class="q">?</span><span><small>${T('order in: ask the counter', '有订单：问柜台')}</small>${esc(LOOKS[t.who] ? LOOKS[t.who].nm : '')}</span>`}${t.done ? `<span class="stamp">${t.gone ? '✕' : '◎'}</span>` : ''}</div>`,
        )
        .join('');
    }
    $('#cards').innerHTML = '';
    return;
  }
  $('#tix').innerHTML = '';
  const parts = [];
  C.seats.forEach(s => {
    const g = s.g;
    if (!g || (g.st !== 'order' && g.st !== 'refused')) return;
    const p = toS(s.x, 148);
    parts.push({
      k:
        g.id +
        ':' +
        g.st +
        ':' +
        (g.sent ? 1 : 0) +
        ':' +
        (g.reveal ? 1 : 0) +
        ':' +
        Math.round(p.x) +
        ':' +
        Math.round(p.y),
      html: `<div class="ord" style="left:${p.x}px;top:${p.y}px"><div class="ws">${g.o.map(w => (known(w) && !g.reveal ? `<div class="w"><img src="${ICON[w]}" alt=""><span><b>${WORDS[w].k}</b></span><button class="reveal" data-reveal="${s.i}">?</button></div>` : wordRow(w, true))).join('')}
      ${g.st === 'refused' ? `<div class="why">${esc(whyText(g.why))}</div>` : ''}</div>
      <button class="${g.sent ? 'sent' : ''}" data-send="${s.i}" aria-label="${T('Send to the kitchen', '发给厨房')}">${g.sent ? '✓' : T('Send ▶', '发送 ▶')}</button></div>`,
    });
  });
  const k = parts.map(p => p.k).join('|') + G.LANG;
  if (k !== cardK) {
    cardK = k;
    $('#cards').innerHTML = parts.map(p => p.html).join('');
  }
}
export function whyText(r) {
  if (!r) return '';
  if (r.why === 'noodles') return T('No noodles!', '没有面！');
  if (r.why === 'raw') return T('The noodles are still hard', '面还是硬的');
  if (r.why === 'broth') return T('Needs more broth', '汤太少了');
  const a = [];
  if (r.miss && r.miss.length) a.push(T('needs ', '少了 ') + r.miss.map(w => WORDS[w].k).join('・'));
  if (r.extra && r.extra.length) a.push(T("didn't order ", '没点 ') + r.extra.map(w => WORDS[w].k).join('・'));
  return a.join(' · ');
}
// a callout across the middle of the screen: the waves, closing time, and the combo
const BAN = {
  ready: ['よーい…', ['Ready…', '准备…'], 'mid'],
  go: ['いらっしゃいませ！', ['Open! Here they come', '开店！客人来了'], 'big'],
  warn: ['お客さんの大群が来る！', ['A huge wave of guests is coming!', '一大波客人要来了！'], 'big hot warn'],
  final: ['最後の波！', ['Final wave!', '最后一波！'], 'big hot warn'],
  last: [
    '終電の波！',
    ['Final wave: the last-train crowd, all in a hurry!', '最后一波：末班车的人，个个赶时间！'],
    'big hot warn',
  ],
  kanpeki: ['カンペキ！', ['Perfect noodles!', '面煮得完美！'], 'mid gold'],
  iine: ['いいね！', ['Nice!', '不错！'], 'small'],
  sugoi: ['すごい！ ×2', ['Amazing! Combo ×2', '厉害！连击 ×2'], 'mid'],
  saikou: ['さいこう！ ×3', ['The best! Combo ×3', '最棒！连击 ×3'], 'mid hot'],
  aa: ['あ〜…', ['Combo lost', '连击断了'], 'small sad'],
};
let banT: any = 0;
export function banner(k) {
  const b = BAN[k],
    box = $('#banner');
  if (!b || !box) return;
  box.className = 'banner ' + b[2];
  box.innerHTML = `<b>${b[0]}</b><small>${esc(T(b[1][0], b[1][1]))}</small>`;
  void box.offsetWidth; // restart the pop
  box.classList.add('on');
  clearTimeout(banT);
  banT = setTimeout(
    () => {
      box.className = 'banner';
    },
    k === 'iine' || k === 'aa' || k === 'kanpeki' ? 1100 : k === 'ready' ? 1500 : 2000,
  );
}
let nwT = 0; // the new-word card's hide timer
export function newWord(w) {
  const box = $('#nw');
  box.innerHTML = `<div class="newword"><div class="k">${T('NEW WORD', '新单词')}</div><img src="${ICON[w]}" alt=""><b>${WORDS[w].k}</b><small>${WORDS[w].ro} · ${esc(mean(w))}</small></div>`;
  SFX.open();
  clearTimeout(nwT);
  nwT = setTimeout(() => {
    box.innerHTML = '';
  }, 3600);
  if (K) K.shown[w] = 0;
}
export let toastT = 0;
export function toast(txt, kind?) {
  const el_ = $('#status');
  el_.hidden = false;
  el_.textContent = txt;
  el_.style.background = kind === 'bad' ? '#FFE1D8' : kind === 'ok' ? '#DFF8EE' : '';
  clearTimeout(toastT);
  toastT = setTimeout(() => {
    el_.hidden = true;
  }, 2200);
}
