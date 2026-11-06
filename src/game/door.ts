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
// the strip of lines: shown when there's something to say (a group at the door, or one leaving)
export let sayK = '';
export function sayTick() {
  const el_ = $('#say'),
    N = G.NIGHT && C && NIGHTS[C.n - 1];
  const on = !!(N && N.door && meCounter() && G.NIGHT.ph === 'run' && (C.door || C.bye.length));
  if (el_.hidden === on) el_.hidden = !on;
  if (!on) return;
  const k = G.LANG + ':' + PH_ORDER.map(p => (pknown(p) ? 1 : 0)).join('') + (SR ? 'm' : '');
  if (k !== sayK) {
    sayK = k;
    el_.innerHTML =
      PH_ORDER.map(ph => {
        const P = PHRASES[ph];
        return `<button type="button" data-say="${ph}">${P.k}${pknown(ph) ? '' : `<small>${P.ro}</small>`}</button>`;
      }).join('') +
      (SR ? `<button type="button" class="mic" data-mic="1" aria-label="${T('Say it', '说出来')}">🎤</button>` : '');
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
