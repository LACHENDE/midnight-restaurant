// まよなか屋 · floor: a top-down shift. Walk the floor, greet groups at the door, seat them, take orders, serve, see them off.
import './floor.css';
import { WORLD, TABLES, PHRASES } from './data';
import { S, tick, reset, say, talkTarget, wants, spotOf, trySeat, hintText, float } from './sim';
import { draw } from './draw';
import { showBubble, listen, learned } from './talk';
import { nearestFree } from './path';

const LANG = (() => { try { const v = JSON.parse(localStorage.getItem('yofu_lang') || 'null'); if (v === 'zh' || v === 'en') return v; } catch { /* none */ } return /^zh/i.test(navigator.language) ? 'zh' : 'en'; })();
const T = (en: string, zh: string) => (LANG === 'zh' ? zh : en);
const $ = (id: string) => document.getElementById(id)!;
const cv = $('fcv') as HTMLCanvasElement, g = cv.getContext('2d')!;
let scale = 1, ox = 0, oy = 0, dpr = 1, running = false;
function resize() {
  dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
  scale = Math.min(innerWidth / WORLD.w, innerHeight / WORLD.h); ox = (innerWidth - WORLD.w * scale) / 2; oy = (innerHeight - WORLD.h * scale) / 2;
}
addEventListener('resize', resize); resize();
const toWorld = (e: PointerEvent) => ({ x: (e.clientX - ox) / scale, y: (e.clientY - oy) / scale });
const toScreen = (x: number, y: number) => ({ x: x * scale + ox, y: y * scale + oy });

// ---------- sound: a few synthesized blips ----------
let AC: AudioContext | null = null;
const blip = (f: number, d = 0.12, type: OscillatorType = 'sine', v = 0.15) => { try { AC ??= new AudioContext(); const t = AC.currentTime, o = AC.createOscillator(), gn = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(gn).connect(AC.destination); o.start(t); o.stop(t + d); } catch { /* no audio */ } };
const sfxGood = () => { blip(880); setTimeout(() => blip(1320), 70); }, sfxBad = () => blip(220, 0.18, 'square', 0.08);

// ---------- input: tap the floor to walk there; tap a table to lead a group to it ----------
let hoverTable: string | null = null;
cv.addEventListener('pointerdown', e => {
  if (!running) return; AC?.resume();
  const p = toWorld(e), t = TABLES.find(t => Math.hypot(p.x - t.x, (p.y - t.y) / 0.8) < t.r + 14);
  if (t && S.groups.some(x => x.st === 'follow')) { hoverTable = t.id; S.player.goTo(nearestFree({ x: t.x, y: t.y + t.r + 30 })); pendingTable = t.id; return; }
  pendingTable = null; S.player.goTo(nearestFree(p));
});
let pendingTable: string | null = null;

// ---------- talking ----------
function doSay(line: string) {
  const target = talkTarget(); const ok = say(line, target);
  if (ok) { learned(line); sfxGood(); } else sfxBad();
}
$('say').addEventListener('click', e => {
  const b = (e.target as Element).closest<HTMLElement>('button'); if (!b) return; AC?.resume();
  if (b.dataset.mic) listen(id => doSay(id), heard => { const p = S.player; float(p.x, p.y - 110, `「${heard}」?`, false); sfxBad(); });
  else if (b.dataset.say) doSay(b.dataset.say);
});

// ---------- the loop ----------
let last = 0;
function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
  if (running) {
    tick(dt);
    if (pendingTable && S.player.idle) { const r = trySeat(TABLES.find(t => t.id === pendingTable)!); pendingTable = null; hoverTable = null;
      if (r === 'small') { float(S.player.x, S.player.y - 110, T('Too small', '桌子太小'), false); sfxBad(); }
      else if (r === 'taken') { float(S.player.x, S.player.y - 110, T('Taken', '有人了'), false); sfxBad(); }
      else if (r === 'ok') sfxGood(); }
    if (S.done) finish();
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#1a2340'; g.fillRect(0, 0, innerWidth, innerHeight);
  g.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy); draw(g, hoverTable);
  // the bubble over whoever you're next to
  const tg = running ? talkTarget() : null;
  if (tg) { const p = spotOf(tg), top = tg.table ? p.y - tg.table.r - 46 : p.y - 104; showBubble(toScreen(p.x, top), wants(tg), tg.id * 7 + ['door', 'wait', 'ask', 'ordered', 'bye'].indexOf(tg.st) + (tg.st === 'door' ? ['greet', 'count', 'seat'].indexOf(tg.step) : 0), T); }
  else showBubble(null, null, 0, T);
  const yen = `¥${S.yen.toLocaleString('ja-JP')}`; if ($('fyen').textContent !== yen) $('fyen').textContent = yen;
  const h = running ? hintText(T) : ''; const hint = $('fhint'); if (hint.textContent !== h) hint.textContent = h; if (hint.hidden === !!h) hint.hidden = !h;
}
requestAnimationFrame(frame);

// ---------- start and end ----------
const panel = $('fpanel');
function intro() {
  panel.hidden = false;
  panel.innerHTML = `<div class="card"><h1>まよなか屋 · ${T('the floor', '店面')}</h1>
    <p>${T('A top-down shift. Tap the floor to walk. When you stand next to someone who needs you, a bubble lets you say the line (or tap it).', '俯视视角的一班。点地板走路。站到需要你的客人旁边，气泡里可以说出（或点）那句话。')}</p>
    <ol><li>${PHRASES.irasshai.k} · ${PHRASES.nanmei.k} ${T('at the door', '在门口')}</li>
    <li>${PHRASES.douzo.k} ${T('then walk them to a table that fits and tap it (or', '再带到够大的桌子并点它（或')} ${PHRASES.shoushou.k}${T(' if none is free)', '，如果没空位）')}</li>
    <li>${PHRASES.gochuumon.k} ${T('at the table → take the order to the kitchen pass', '在桌边 → 把订单送到出餐口')}</li>
    <li>${PHRASES.omatase.k} ${T('when you bring the bowls', '端面时')} · ${PHRASES.arigatou.k} ${T('at the door as they leave', '客人离开时在门口')}</li></ol>
    <button type="button" id="go">${T('Open the doors', '开门营业')}</button></div>`;
  $('go').onclick = () => { panel.hidden = true; reset(); running = true; AC ??= new AudioContext(); };
}
function finish() {
  running = false; panel.hidden = false;
  panel.innerHTML = `<div class="card"><h1>${T('Closing time', '打烊了')}</h1>
    <p>${T('Tonight', '今晚')}: <b>¥${S.yen.toLocaleString('ja-JP')}</b> · 接客 <b>${S.ok}/${S.ok + S.bad}</b></p>
    <button type="button" id="again">${T('Another shift', '再来一班')}</button></div>`;
  $('again').onclick = () => { panel.hidden = true; reset(); running = true; };
}
intro();
(window as any).__floor = { S, say: doSay, talkTarget, wants, trySeat, start: () => $('go').click() };
