// the DOM bits over the canvas: tickets, order cards, new words
import { G } from '../game/G';
import { $, T, esc } from '../core/env';
import { C, K, meCook } from '../game/night-state';
import { ICON } from '../render/shapes';
import { LOOKS, MODS, WORDS, known, mean, modMean } from '../data/content';
import { cardUp, hidden } from '../game/tel';
import { SFX } from '../audio/sfx';
import { toS } from '../render/stage';

export let tixK = '',
  cardK = '';
export const wordRow = (w, small) =>
  `<div class="w"><img src="${ICON[w]}" alt=""><span><b>${WORDS[w].k}</b>${known(w) && !small ? '' : `<small>${WORDS[w].ro} · ${esc(mean(w))}</small>`}</span></div>`;
// how they want it (かため…): a bowl mark instead of a picture
const BOWL_MARK =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 11h20a10 9 0 0 1-20 0z" fill="#3B2618"/><rect x="8" y="19" width="8" height="2.5" rx="1" fill="#3B2618"/></svg>';
export const modRow = m =>
  `<div class="w mod"><i>${BOWL_MARK}</i><span><b>${MODS[m].k}</b>${known(m) ? '' : `<small>${MODS[m].ro} · ${esc(modMean(m))}</small>`}</span></div>`;
export function domTick() {
  if (!G.NIGHT || G.NIGHT.ph !== 'run') {
    $('#tix').innerHTML = '';
    $('#cards').innerHTML = '';
    $('#tell').innerHTML = '';
    tixK = '';
    cardK = '';
    return;
  }
  if (meCook()) {
    const hid = hidden(),
      k =
        (hid ? 'H' : '') +
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
              (t.gone ? 'g' : '') +
              (t.say ? 's' : '') +
              (t.mod || ''),
          )
          .join('|') +
        G.LANG;
    if (k !== tixK) {
      tixK = k;
      $('#tix').innerHTML = K.tickets
        .map(
          t =>
            `<div class="tk${t.done ? ' done' : ''}${t.gone ? ' gone' : ''}${!t.done && t.lv ? ' lv' + t.lv : ''}">${t.hurry && !t.done ? '<span class="isogi">いそぎ</span>' : ''}${t.o && !hid ? t.o.map(w => `<img src="${ICON[w]}" alt=""><span>${WORDS[w].k}${known(w) ? '' : `<small>${WORDS[w].ro}</small>`}</span>`).join('') + (t.mod ? `<span class="tmod">${MODS[t.mod].k}</span>` : '') : `<span class="q">?</span><span><small>${tkHint(t, hid)}</small>${esc(LOOKS[t.who] ? LOOKS[t.who].nm : '')}</span>${hid && t.say && !t.done ? `<button class="hear" data-hear="${t.cid}" aria-label="${T('Hear it again', '再听一遍')}">🔊</button>` : ''}`}${t.done ? `<span class="stamp">${t.gone ? '✕' : '◎'}</span>` : ''}</div>`,
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
    const p = toS(s.x, 148),
      up = cardUp(g),
      // しばBot can't hear you: Send tells it. A person cooking can't see the order at all: you have to say it.
      send =
        G.MODE === 'bot'
          ? `<button class="${g.sent ? 'sent' : ''}" data-send="${s.i}" aria-label="${T('Send to the kitchen', '发给厨房')}">${g.sent ? '✓' : T('Send ▶', '发送 ▶')}</button>`
          : '',
      why = g.st === 'refused' ? `<div class="why">${esc(whyText(g.why))}</div>` : '';
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
        (up ? 1 : 0) +
        ':' +
        Math.round(p.x) +
        ':' +
        Math.round(p.y),
      html: up
        ? `<div class="ord" style="left:${p.x}px;top:${p.y}px"><div class="ws">${g.o.map(w => (known(w) && !g.reveal ? `<div class="w"><img src="${ICON[w]}" alt=""><span><b>${WORDS[w].k}</b></span><button class="reveal" data-reveal="${s.i}">?</button></div>` : wordRow(w, true))).join('')}${g.mod ? modRow(g.mod) : ''}
      ${why}</div>${send}</div>`
        : `<div class="ord shut" style="left:${p.x}px;top:${p.y}px"><div class="ws"><span class="q">？</span>${why}</div><button class="again" data-again="${s.i}">もう一度<small>${T('say it again', '再说一遍')}</small></button>${send}</div>`,
    });
  });
  const k = parts.map(p => p.k).join('|') + G.LANG;
  if (k !== cardK) {
    cardK = k;
    $('#cards').innerHTML = parts.map(p => p.html).join('');
  }
}
function tkHint(t, hid) {
  if (!hid) return T('order in: ask the counter', '有订单：问柜台');
  if (t.say) return T('tap 🔊 to hear it again', '点 🔊 再听一遍');
  return G.MODE === 'net' ? T('listen to the counter', '听柜台说') : T('listen…', '听…');
}
export function whyText(r) {
  if (!r) return '';
  if (r.why === 'katame') return T('Too soft: they wanted かため', '太软了：要かため（硬一点）');
  if (r.why === 'yawa') return T('Too hard: they wanted やわらかめ', '太硬了：要やわらかめ（软一点）');
  if (r.why === 'oome') return T('Not enough broth: they wanted スープおおめ', '汤不够：要スープおおめ（多加汤）');
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
let nwT: any = 0; // the new-word card's hide timer
/** a new way of asking for it (かため…): what it means, and for the cook, what to do */
export function newMod(m) {
  const box = $('#nw'),
    M = MODS[m];
  if (!box || !M) return;
  box.innerHTML = `<div class="newword mod"><div class="k">${T('NEW: HOW THEY WANT IT', '新：客人的要求')}</div><b>${M.k}</b><small>${M.ro} · ${esc(modMean(m))}</small><p>${esc(meCook() ? T(M.how[0], M.how[1]) : T("Say it to the cook too: they can't see the order", '也要告诉厨师：厨师看不到订单'))}</p></div>`;
  SFX.open();
  clearTimeout(nwT);
  nwT = setTimeout(() => {
    box.innerHTML = '';
  }, 5200);
}
// what しばBot (at the counter) just said to a cook practising alone, for a few seconds
let tellT: any = 0;
export function tellBubble(who, line) {
  const box = $('#tell');
  if (!box) return;
  box.innerHTML = `<div class="tell"><small>${esc(LOOKS[who] ? LOOKS[who].nm : '')} · しばBot</small><b>${esc(line)}</b></div>`;
  clearTimeout(tellT);
  tellT = setTimeout(() => {
    box.innerHTML = '';
  }, 4200);
}
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
