// 伝言ラーメン (Telephone Ramen): the cook never sees the order. The guest says it once, to the counter, and the counter
// has to say it to the cook — so the two of you have to talk. ?easy=1 turns it off (the cook's tickets show the order).
import { G } from './G';
import { MODS, NIGHTS, WORDS } from '../data/content';

export const EASY = typeof location !== 'undefined' && /[?&]easy=1/.test(location.search);
/** the first night is for learning the stall: the cook sees every order on the ticket */
export const openNight = () => {
  const N = G.NIGHT && NIGHTS[G.NIGHT.n - 1];
  return !!(N && N.open);
};
/** the order goes straight onto the cook's ticket when the counter takes it */
export const autoSend = () => EASY || openNight();
/** the cook's tickets stay blank: a person cooks, and somebody else (a person, or しばBot) hears the orders */
export const hidden = () => !autoSend() && (G.MODE === 'net' || (G.MODE === 'bot' && G.ROLE === 'cook'));
/** the counter's order card fades once the guest has said it (not for the very first, fully taught guest) */
export const fades = g => !autoSend() && G.ROLE === 'counter' && !!g && g.teach < 2;
/** how long the guest's words stay up: a little longer for a longer order */
export const sayFor = g => 3.2 + 0.7 * ((g.o ? g.o.length : 1) + (g.mod ? 1 : 0)) + (g.intro ? 3 : 0);
export const cardUp = g => !fades(g) || G.clock - (g.saidAt || 0) < sayFor(g);
export const AGAIN = 0.12; // the patience it costs to ask a guest to say it again (もう一度)

/** the order as the guest says it: 「ねぎと なると、めんは かためで、おねがいします！」 */
export function orderLine(o: string[], mod?: string | null) {
  const tops = o.map(w => WORDS[w].k).join('と '),
    m = mod && MODS[mod] ? MODS[mod].say : '';
  return [tops, m].filter(Boolean).join('、') + '、おねがいします！';
}
/** the order as the counter's card writes it: ねぎ・なると · かため */
export const orderText = (o: string[], mod?: string | null) =>
  o.map(w => WORDS[w].k).join('・') + (mod && MODS[mod] ? ' · ' + MODS[mod].k : '');
/** what a guest says when the bowl is wrong (しばBot passes it on to a cook practising alone) */
export function whyLine(r): string {
  if (!r) return 'ちがいます…';
  if (r.why === 'noodles') return 'めんが ないです！';
  if (r.why === 'raw') return 'めんが かたすぎます！';
  if (r.why === 'broth') return 'スープが すくないです！';
  if (r.why === 'katame') return 'めんが やわらかいです。かためで おねがいします！';
  if (r.why === 'yawa') return 'めんが かたいです。やわらかめで おねがいします！';
  if (r.why === 'oome') return 'スープ おおめで おねがいします！';
  const a: string[] = [];
  if (r.miss && r.miss.length) a.push(r.miss.map(w => WORDS[w].k).join('と ') + 'が ないです');
  if (r.extra && r.extra.length) a.push(r.extra.map(w => WORDS[w].k).join('と ') + 'は いりません');
  return (a.join('。') || 'ちがいます') + '！';
}

// しばBot's voice: the browser's own Japanese speech, when the phone has one
let voice: SpeechSynthesisVoice | null = null;
const synth = () => (typeof window !== 'undefined' && window.speechSynthesis) || null;
function pickVoice() {
  const S = synth();
  if (!S) return;
  const vs = S.getVoices();
  voice = vs.find(v => /^ja/i.test(v.lang)) || null;
}
if (synth()) {
  pickVoice();
  try {
    synth().addEventListener('voiceschanged', pickVoice);
  } catch (e) {}
}
/** true if the phone could say it out loud */
export function speakJa(text: string): boolean {
  const S = synth();
  if (!S || typeof SpeechSynthesisUtterance === 'undefined') return false;
  try {
    if (!voice) pickVoice();
    S.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    if (voice) u.voice = voice;
    u.rate = 0.92;
    u.pitch = 1.08;
    S.speak(u);
    return true;
  } catch (e) {
    return false;
  }
}
/** iPhones only speak after a tap: say nothing, quietly, on the first one */
let unlocked = false;
export function unlockVoice() {
  const S = synth();
  if (unlocked || !S || typeof SpeechSynthesisUtterance === 'undefined') return;
  unlocked = true;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    S.speak(u);
  } catch (e) {}
}
