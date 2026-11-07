// Talking: when you stand next to someone who needs a line, a bubble over them offers the microphone and three lines
import { PHRASES, LINE_IDS } from './data';

const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const toHira = (t: string) => t.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/[\s、。！？!?.,・〜ー-]/g, '');
/** what the microphone heard → the line it most likely is */
export function matchLine(alts: string[]): string | null {
  for (const a of alts) { const h = toHira(a || ''); if (!h) continue; for (const id of LINE_IDS) for (const v of PHRASES[id].say) { const n = toHira(v); if (h.includes(n) || (h.length >= 4 && n.includes(h))) return id; } }
  return null;
}
let mastery: Record<string, number> = {};
try { mastery = JSON.parse(localStorage.getItem('mres_floor_lines') || '{}'); } catch { mastery = {}; }
export const known = (id: string) => (mastery[id] || 0) >= 3;
export function learned(id: string) { mastery[id] = (mastery[id] || 0) + 1; try { localStorage.setItem('mres_floor_lines', JSON.stringify(mastery)); } catch { /* private mode */ } }

/** three lines: the one that fits and two others, in an order that stays put while the bubble is open */
export function choices(want: string, seed: number): string[] {
  const others = LINE_IDS.filter(p => p !== want), a = others[seed % others.length], b = others[(seed * 3 + 2) % others.length];
  const three = [want, a, b === a ? others[(seed + 1) % others.length] : b];
  return three.map((_, i) => three[(i + seed) % 3]);
}

const el = document.getElementById('say')!;
let key = '';
/** show (or hide) the bubble over the screen point (x, y); onSay gets the chosen line */
export function showBubble(at: { x: number; y: number } | null, want: string | null, seed: number, T: (en: string, zh: string) => string) {
  if (!at || !want) { if (!el.hidden) el.hidden = true; key = ''; return; }
  el.hidden = false;
  const lines = choices(want, seed), k = lines.join(',') + lines.map(l => (known(l) ? 1 : 0)).join('');
  if (k !== key) {
    key = k;
    el.innerHTML = (SR ? `<button type="button" class="mic" data-mic="1" aria-label="${T('Say it', '说出来')}">🎤<small>${T('tap & say', '点一下说')}</small></button>` : '') +
      `<div class="lines">${lines.map(id => `<button type="button" data-say="${id}">${PHRASES[id].k}${known(id) ? '' : `<small>${PHRASES[id].ro}</small>`}</button>`).join('')}</div>`;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }
  const half = el.offsetWidth / 2, cx = Math.max(half + 8, Math.min(innerWidth - half - 8, at.x)), top = Math.max(at.y, el.offsetHeight + 12);
  el.style.left = `${Math.round(cx)}px`; el.style.top = `${Math.round(top)}px`; el.style.setProperty('--tail', `${Math.round(at.x - cx)}px`);
}

let mic: any = null;
/** listen once in Japanese; onLine gets the matched line, onMiss what was heard */
export function listen(onLine: (id: string) => void, onMiss: (heard: string) => void) {
  if (!SR || mic) return;
  try {
    const r = new SR(); r.lang = 'ja-JP'; r.interimResults = false; r.maxAlternatives = 4; mic = r;
    r.onresult = (e: any) => { const alts = [...e.results[0]].map((a: any) => a.transcript), id = matchLine(alts); if (id) onLine(id); else onMiss(alts[0] || '…'); };
    r.onend = () => { mic = null; el.querySelector('.mic')?.classList.remove('on'); };
    r.start(); el.querySelector('.mic')?.classList.add('on');
  } catch { mic = null; }
}
