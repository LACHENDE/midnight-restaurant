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
          t => t.cid + ':' + (t.o ? t.o.join('+') : '?') + ':' + (t.done ? 1 : 0) + ':' + (t.ok === false ? 'x' : ''),
        )
        .join('|') + G.LANG;
    if (k !== tixK) {
      tixK = k;
      $('#tix').innerHTML = K.tickets
        .map(
          t =>
            `<div class="tk${t.done ? ' done' : ''}">${t.o ? t.o.map(w => `<img src="${ICON[w]}" alt=""><span>${WORDS[w].k}${known(w) ? '' : `<small>${WORDS[w].ro}</small>`}</span>`).join('') : `<span class="q">?</span><span><small>${T('order in: ask the counter', '有订单：问柜台')}</small>${esc(LOOKS[t.who] ? LOOKS[t.who].nm : '')}</span>`}${t.done ? '<span class="stamp">◎</span>' : ''}</div>`,
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
