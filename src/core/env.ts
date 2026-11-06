// environment: helpers, the hub, storage, language
import { G } from '../game/G';

export const $ = s => document.querySelector(s);
export const TAU = Math.PI * 2,
  rnd = (a, b) => a + Math.random() * (b - a),
  pick = a => a[Math.floor(Math.random() * a.length)],
  clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const esc = s =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// inside 夜ふかし (the hub page) the hub holds the connection, the seats and the language
export const HUB = (() => {
  try {
    const h = window.parent !== window && (window.parent as any).HUBAPI;
    return h && h.v ? h : null;
  } catch (e) {
    return null;
  }
})();
export const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem('mres_' + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem('mres_' + k, JSON.stringify(v));
    } catch (e) {}
  },
};
G.LANG = HUB
  ? HUB.lang
  : (() => {
      try {
        const v = JSON.parse(localStorage.getItem('yofu_lang'));
        if (v === 'zh' || v === 'en') return v;
      } catch (e) {}
      return /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
    })();
export const T = (en, zh) => (G.LANG === 'zh' ? zh : en);

// runs once at start, after every module has loaded (main.ts calls these in order)
export function init(): void {
  'use strict';
  document.documentElement.dataset.lang = G.LANG;
}
