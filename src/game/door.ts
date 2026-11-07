// 接客 at the door: say the right line at the right moment
import { G } from './G';
import { $, T, store } from '../core/env';
import { C, meCounter } from './night-state';
import { NIGHTS } from '../data/content';
import { SFX, audio } from '../audio/sfx';
import { cSeat, seated } from './counter';
import { noteAct } from './teach';
import { sparkle } from '../render/particles';
import { toast } from '../ui/overlays';
import { toS } from '../render/stage';

// the lines (kana or kanji as staff write them, the reading for kanji, romaji, meaning) and what the microphone may hear for each
export const PHRASES = {
  irasshai: {
    k: 'いらっしゃいませ',
    ro: 'irasshaimase',
    m: ['Welcome!', '欢迎光临！'],
    say: ['いらっしゃいませ', 'いらっしゃい'],
  },
  nanmei: {
    k: '何名様ですか',
    r: 'なんめいさまですか',
    ro: 'nanmei-sama desu ka',
    m: ['How many are you?', '请问几位？'],
    say: ['なんめいさまですか', '何名様ですか', '何名さまですか', '何名様', 'なんめいさま', '何名ですか', 'なんめい'],
  },
  douzo: {
    k: 'こちらへどうぞ',
    ro: 'kochira e dōzo',
    m: ['This way, please.', '这边请。'],
    say: ['こちらへどうぞ', 'こちらにどうぞ', 'こちらへ', 'どうぞ'],
  },
  shoushou: {
    k: '少々お待ちください',
    r: 'しょうしょうおまちください',
    ro: 'shōshō omachi kudasai',
    m: ['One moment, please.', '请稍等。'],
    say: [
      'しょうしょうおまちください',
      '少々お待ちください',
      '少々お待ち下さい',
      'おまちください',
      'お待ちください',
      'お待ち下さい',
    ],
  },
  arigatou: {
    k: 'ありがとうございました',
    ro: 'arigatō gozaimashita',
    m: ['Thank you very much!', '谢谢光临！'],
    say: ['ありがとうございました', 'ありがとうございます', 'ありがとう'],
  },
};
export const PH_ORDER = ['irasshai', 'nanmei', 'douzo', 'shoushou', 'arigatou'];
export const COUNT = ['', 'ひとりです', 'ふたりです', 'さんにんです', 'よにんです'];
export let PMASTER = store.get('phrases', {});
export const pknown = ph => (PMASTER[ph] || 0) >= 3;
export const doorGroup = () => (C && C.door ? C.queue.filter(q => q.grp === C.door.grp) : []);
export const freeSeats = () => C.seats.filter(s => !seated(s) && !s.bowl && !s.coins && !s.dirty).map(s => s.i);
export function doorTick(dt) {
  if (!NIGHTS[C.n - 1].door) return;
  if (!C.door && C.queue.length) C.door = { grp: C.queue[0].grp, step: 'greet', t: 0, conf: 0, happy: 0, ans: '' };
  const D = C.door;
  if (D) {
    D.t += dt;
    D.conf = Math.max(0, D.conf - dt);
    D.happy = Math.max(0, D.happy - dt);
  }
  for (const b of C.bye) b.t += dt;
  C.bye = C.bye.filter(b => b.t < 7);
}
// the line the moment needs (null: nothing to say yet)
export function doorWant() {
  const D = C && C.door;
  if (!D) return null;
  if (D.step === 'greet') return 'irasshai';
  if (D.step === 'count') return 'nanmei';
  const fit = freeSeats().length >= doorGroup().length;
  if (D.step === 'seat') return fit ? 'douzo' : 'shoushou';
  if (D.step === 'wait') return fit ? 'douzo' : null;
  return null;
}
// a group that has all gone out happy gets its goodbye moment
export function groupOut(g, s) {
  if (!g.grp || !NIGHTS[C.n - 1].door) return;
  C.leftG[g.grp] = (C.leftG[g.grp] || 0) + 1;
  if (C.leftG[g.grp] >= (g.gsz || 1)) C.bye.push({ grp: g.grp, n: g.gsz || 1, x: s.x, t: 0 });
}
// the counter says a line (tapped now; spoken into the microphone later)
export function cSay(ph) {
  if (!C || !NIGHTS[C.n - 1].door || !PHRASES[ph]) return false;
  if (ph === 'arigatou' && C.bye.length) {
    const b = C.bye.shift(),
      tip = 30 * b.n;
    C.earned += tip;
    C.sk.ok++;
    good(ph);
    SFX.coins();
    sparkle(b.x, 170, 10);
    toast(T(`They'll come again! +¥${tip}`, `他们还会再来！+¥${tip}`), 'ok');
    return true;
  }
  const want = doorWant(),
    D = C.door;
  if (!D || ph !== want) {
    C.sk.bad++;
    if (D) D.conf = 1.6;
    SFX.hmm();
    noteAct();
    toast(
      !D
        ? T('Nobody is at the door right now.', '现在门口没有人。')
        : D.step === 'wait' && ph === 'douzo'
          ? T('No room yet: wait until enough seats are free.', '还没有位子：等空出足够的座位。')
          : T('Hm? They look confused. Try another line.', '嗯？客人一脸疑惑。换一句试试。'),
      'bad',
    );
    return false;
  }
  C.sk.ok++;
  good(ph);
  D.happy = 1.2;
  SFX.ding();
  if (ph === 'irasshai') {
    D.step = 'count';
    D.t = 0;
  } else if (ph === 'nanmei') {
    D.step = 'seat';
    D.t = 0;
    D.ans = COUNT[doorGroup().length] || '';
  } else if (ph === 'shoushou') {
    D.step = 'wait';
    D.t = 0;
  } else if (ph === 'douzo') seatGroup();
  return true;
}
export function good(ph) {
  PMASTER[ph] = (PMASTER[ph] || 0) + 1;
  store.set('phrases', PMASTER);
  noteAct();
}
export function seatGroup() {
  const grp = doorGroup(),
    free = freeSeats();
  let pick = null; // side by side where they can, else wherever is free
  for (let i = 0; i + grp.length <= C.seats.length && !pick; i++) {
    const run = grp.map((_, k) => i + k);
    if (run.every(k => free.includes(k))) pick = run;
  }
  if (!pick) pick = free.slice(0, grp.length);
  grp.forEach((q, k) => cSeat(q.id, pick[k]));
  C.door = null;
}
// what the microphone heard → the line it most likely is
export const toHira = t =>
  t
    .replace(/[\u30A1-\u30F6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s、。！？!?.,・〜ー-]/g, '');
export function matchPhrase(alts) {
  for (const a of alts) {
    const h = toHira(a || '');
    if (!h) continue;
    for (const ph of PH_ORDER)
      for (const v of PHRASES[ph].say) {
        const n = toHira(v);
        if (h.includes(n) || (h.length >= 4 && n.includes(h))) return ph;
      }
  }
  return null;
}
export const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
export let MIC = null;
export function micListen() {
  if (!SR || MIC) return;
  try {
    const r = new SR();
    r.lang = 'ja-JP';
    r.interimResults = false;
    r.maxAlternatives = 4;
    MIC = r;
    audio();
    r.onresult = e => {
      const alts = [...e.results[0]].map(a => a.transcript),
        ph = matchPhrase(alts);
      if (ph) cSay(ph);
      else
        toast(T(`Heard 「${alts[0] || '…'}」: not one of the lines`, `听到「${alts[0] || '…'}」：不是这几句`), 'bad');
    };
    r.onerror = e => {
      if (e.error !== 'no-speech' && e.error !== 'aborted')
        toast(
          T(
            `The microphone isn't working here (${e.error}). Tap the line instead.`,
            `这里麦克风不能用（${e.error}）。改成点句子。`,
          ),
          'bad',
        );
    };
    r.onend = () => {
      MIC = null;
      const b = $('#say .mic');
      if (b) b.classList.remove('on');
    };
    r.start();
    const b = $('#say .mic');
    if (b) b.classList.add('on');
  } catch (e) {
    MIC = null;
  }
}
// talking happens on the guest: a speech bubble over whoever needs you (the group at the door, or a group leaving), with the
// microphone and three lines to choose from (the right one and two others, in an order that stays put while the bubble is open)
const choicesFor = (want: string, seed: number): string[] => {
  const others = PH_ORDER.filter(p => p !== want),
    a = others[seed % others.length],
    b = others[(seed + 2) % others.length],
    three = [want, a, b];
  return three.map((_, i) => three[(i + seed) % 3]);
};
export let sayK = '';
export function sayTick() {
  const el_ = $('#say'),
    N = G.NIGHT && C && NIGHTS[C.n - 1];
  let target: { x: number; y: number; want: string; seed: number } | null = null;
  if (N && N.door && meCounter() && G.NIGHT.ph === 'run') {
    if (C.bye.length) target = { x: C.bye[0].x, y: 150, want: 'arigatou', seed: C.bye[0].grp };
    else if (C.door) {
      const w = doorWant(), grp = doorGroup();
      if (w && grp.length) target = { x: Math.min(grp[0].x, 860), y: 170, want: w, seed: C.door.grp * 7 + ['greet', 'count', 'seat', 'wait'].indexOf(C.door.step) };
    }
  }
  if (el_.hidden === !!target) el_.hidden = !target;
  if (!target) { sayK = ''; return; }
  // keep the bubble inside the screen; the tail still points at the guest
  const p = toS(target.x, target.y), st = el_.style, half = el_.offsetWidth / 2, pad = 10,
    cx = Math.max(half + pad, Math.min(innerWidth - half - pad, p.x)),
    l = Math.round(cx) + 'px', t = Math.round(Math.max(p.y, el_.offsetHeight + 16)) + 'px', tail = Math.round(p.x - cx) + 'px';
  if (st.left !== l) st.left = l;
  if (st.top !== t) st.top = t;
  if (st.getPropertyValue('--tail') !== tail) st.setProperty('--tail', tail);
  const lines = choicesFor(target.want, target.seed),
    ans = target.want !== 'arigatou' && C.door ? C.door.ans : '',
    k = G.LANG + ':' + ans + ':' + lines.join(',') + ':' + lines.map(p => (pknown(p) ? 1 : 0)).join('');
  if (k !== sayK) {
    sayK = k;
    el_.innerHTML =
      (SR ? `<button type="button" class="mic" data-mic="1" aria-label="${T('Say it', '说出来')}">🎤<small>${T('tap & say', '点一下说')}</small></button>` : '') +
      // the guest's reply (「ふたりです」) sits at the top of the bubble
      `<div class="col">${ans ? `<div class="ans">「${ans}」</div>` : ''}<div class="lines">${lines
        .map(ph => {
          const P = PHRASES[ph];
          return `<button type="button" data-say="${ph}">${P.k}${pknown(ph) ? '' : `<small>${P.ro}</small>`}</button>`;
        })
        .join('')}</div></div>`;
    el_.classList.remove('pop');
    void el_.offsetWidth;
    el_.classList.add('pop');
  }
}
export const doorHint = w =>
  ({
    irasshai: T(
      'Guests at the door: greet them. いらっしゃいませ (Welcome!)',
      '门口来客人了：打招呼。いらっしゃいませ（欢迎光临）',
    ),
    nanmei: T('Ask how many they are: 何名様ですか', '问几位：何名様ですか（なんめいさまですか）'),
    douzo: T("There's room: show them in. こちらへどうぞ", '有位子：请他们进来。こちらへどうぞ'),
    shoushou: T('Not enough seats: ask them to wait. 少々お待ちください', '位子不够：请他们稍等。少々お待ちください'),
  })[w];
