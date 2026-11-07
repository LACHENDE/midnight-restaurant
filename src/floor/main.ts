// まよなか屋 · floor: a three-minute shift for two, top-down. One phone (the host) runs the shift; the partner's phone moves
// its own waiter, sends its button presses and lines, and draws the host's snapshots. In practice しばBot is the partner.
import './floor.css';
import { WORLD, SHIFT, PHRASES, ROOM, type RoomId } from './data';
import { W, reset, tick, act, say, call, snapshot, actionTarget, talkTarget, wants, starsFor, type Snap } from './sim';
import { slide, useRoom } from './world';
import { draw } from './draw';
import { STICK, bindInput, restStick } from './input';
import { hudTick, panel, lobbyCard, roomCard, waitCard, readyCard, resultsCard, choices, learned, T, $ } from './hud';
import { wake, sfx, music, isMuted, setMuted } from './audio';
import { botTick, botReset } from './bot';
import { LINK } from '../net/link';

LINK.setSpace('kotoba-mfloor-', 'mfloor_');
type Mode = '' | 'solo' | 'host' | 'guest';
let mode: Mode = '', screen: 'lobby' | 'room' | 'ready' | 'play' | 'over' = 'lobby', me = 0;
let meReady = false, themReady = false, paused = false, snap: Snap | null = null, lastEv = 0, overAt = 0, lastTick = -1;
const local = { x: 0, y: 0, face: 1, moving: false }; // the partner phone's own waiter (it moves it itself)

// ---------- canvas ----------
const cv = $('fcv') as HTMLCanvasElement, g = cv.getContext('2d')!;
let scale = 1, ox = 0, oy = 0, dpr = 1;
function resize() { dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); scale = Math.min(innerWidth / WORLD.w, innerHeight / WORLD.h); ox = (innerWidth - WORLD.w * scale) / 2; oy = (innerHeight - WORLD.h * scale) / 2; measureHud(); }
/** how far down the HUD reaches, in world units: a reply bubble that would go under it hangs below its guests instead */
let topSafe = -1e9;
function measureHud() { const h = document.getElementById('hud'); if (!h || h.hidden) return; const px = $('tl').getBoundingClientRect().top + (innerHeight > innerWidth ? 116 : 70); topSafe = (px - oy) / scale; }
addEventListener('resize', resize); resize();

// ---------- what this phone does when you press, say or call ----------
const view = (): Snap | null => (mode === 'guest' ? snap && { ...snap, P: snap.P.map((p, i) => (i === me ? { ...p, ...local } : p)) } : mode ? snapshot(0) : null);
function doAct() { wake(); if (screen !== 'play') return; if (mode === 'guest') { send({ t: 'act', ...here() }); sfx('pick'); } else act(0); }
function doSay(line: string) {
  wake(); if (screen !== 'play') return; learnedIfRight(line);
  if (mode === 'guest') send({ t: 'say', l: line, ...here() }); else say(0, line);
}
// a press or a line from the partner's phone carries where that waiter stands on its own screen, so it acts there even when
// the position updates lag a beat (a VPN)
const here = () => ({ x: Math.round(local.x), y: Math.round(local.y) });
function learnedIfRight(line: string) { const v = view(); const tg = v && talkTarget(v, me); if (tg && wants(v!, tg, me) === line) learned(line); }
function doCall(id: number) { if (mode === 'guest') send({ t: 'call', id }); else call(0, id); }
function doLine(i: number) { const b = document.querySelectorAll<HTMLElement>('#fan [data-say]')[i]; if (b) doSay(b.dataset.say!); }
const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
let mic: any = null;
function listen() {
  wake(); if (!SR || mic) return;
  const toHira = (s: string) => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/[\s、。！？!?.,・〜ー-]/g, '');
  try {
    const r = new SR(); r.lang = 'ja-JP'; r.maxAlternatives = 4; mic = r; $('fan').querySelector('.mic')?.classList.add('on');
    r.onresult = (e: any) => {
      const heard = [...e.results[0]].map((a: any) => toHira(a.transcript)), offered = [...document.querySelectorAll<HTMLElement>('#fan [data-say]')].map(b => b.dataset.say!);
      // only the lines on offer can match: a mumble never says the wrong one
      const hit = offered.find(id => heard.some(h => PHRASES[id].say.some(s => { const n = toHira(s); return h.includes(n) || (h.length >= 4 && n.includes(h)); })));
      if (hit) doSay(hit); else sfx('wrong');
    };
    r.onend = () => { mic = null; $('fan').querySelector('.mic')?.classList.remove('on'); };
    r.start();
  } catch { mic = null; }
}
bindInput(cv, { act: doAct, line: doLine, mic: listen, active: () => screen === 'play', tall: () => ROOM.id === 'tall' });
$('act').addEventListener('pointerdown', e => { e.preventDefault(); doAct(); });
$('fan').addEventListener('click', e => { const b = (e.target as Element).closest<HTMLElement>('button'); if (!b) return; if (b.dataset.mic) listen(); else if (b.dataset.say) doSay(b.dataset.say); });
$('rail').addEventListener('click', e => { const b = (e.target as Element).closest<HTMLElement>('[data-call]'); if (b) doCall(+b.dataset.call!); });
$('mute').addEventListener('click', () => { setMuted(!isMuted()); $('mute').classList.toggle('off', isMuted()); });
$('mute').classList.toggle('off', isMuted());

// ---------- the network ----------
const send = (d: any, rel = true) => LINK.send(d, rel);
LINK.open(
  (m: any) => {
    if (mode === 'host') {
      if (m.t === 'pos' && W.P[1]) { W.P[1].x = m.x; W.P[1].y = m.y; W.P[1].face = m.f; W.P[1].moving = m.m; }
      else if (m.t === 'act' && screen === 'play') { at(m); act(1); }
      else if (m.t === 'say' && screen === 'play') { at(m); say(1, m.l); }
      else if (m.t === 'call') call(1, m.id);
      else if (m.t === 'ready') { themReady = true; if (screen === 'ready') { readyCard('host', meReady, true, best()); maybeStart(); } }
    } else if (mode === 'guest') {
      if (m.t === 'snap') { if (!snap || screen !== 'play') { local.x = m.s.P[me].x; local.y = m.s.P[me].y; } snap = m.s; }
      else if (m.t === 'start') { useRoom(m.room === 'tall' ? 'tall' : 'wide'); resize(); snap = null; lastEv = 0; begin(); }
      else if (m.t === 'ready') { themReady = !!m.r; if (screen === 'ready') readyCard('guest', meReady, themReady, best()); }
      else if (m.t === 'toReady') toReady();
    }
  },
  (st: string) => {
    if (st === 'waiting' || st === 'code') roomCard(LINK.code, LINK.invite());
    else if (st === 'joining') waitCard(T(`Joining room ${LINK.code}…`, `正在加入房间 ${LINK.code}…`));
    else if (st === 'nohost') { lobby(); $('code').focus(); alertCard(T('No room with that code is open.', '没有这个房间码的房间。')); }
    else if (st === 'up' || st === 'hello') { $('net').hidden = true; paused = false; if (screen === 'room' || screen === 'lobby') toReady(); }
    else if (st === 'reset') { if (mode === 'host' && screen === 'play') send({ t: 'start', room: ROOM.id }); else if (screen !== 'play') toReady(); }
    else if (st === 'down') { if (screen === 'play') { paused = true; $('net').hidden = false; } }
    else if (st === 'bye') { lobby(); alertCard(T('Your partner left the room.', '搭档离开了房间。')); }
    else if (st === 'error') { lobby(); alertCard(T('Online play could not start here. Try Safari or Chrome (and the VPN in China).', '这里无法联机。试试 Safari 或 Chrome（在中国请开 VPN）。')); }
  },
);
const at = (m: any) => { if (W.P[1] && typeof m.x === 'number') { W.P[1].x = m.x; W.P[1].y = m.y; } };
const alertCard = (msg: string) => { const p = $('panel').querySelector('.card'); if (p) p.insertAdjacentHTML('afterbegin', `<p class="err">${msg}</p>`); };

// ---------- screens ----------
const bestKey = () => `mfloor_best_${mode === 'solo' ? 'solo' : 'duo'}`;
const best = () => { try { return +(localStorage.getItem(bestKey()) || 0); } catch { return 0; } };
function lobby() {
  if (LINK.side) LINK.leave(); mode = ''; screen = 'lobby'; music(false); $('hud').hidden = true; delete document.body.dataset.room;
  const s = LINK.saved(); lobbyCard(s && s.side === 'g' ? s.code : null);
}
function toReady() {
  screen = 'ready'; meReady = false; themReady = mode === 'solo'; $('hud').hidden = true; music(false); delete document.body.dataset.room;
  readyCard(mode as any, false, themReady, best());
  if (mode === 'host') send({ t: 'ready', r: false });
}
function maybeStart() {
  if (!meReady || !themReady) return;
  // the shop: the tall one when this phone is held upright, the wide one when it's sideways (the partner gets the same)
  const room: RoomId = innerHeight > innerWidth ? 'tall' : 'wide'; useRoom(room); resize();
  if (mode === 'solo') { reset([T('You', '你'), 'しばBot'], true); botReset(); }
  if (mode === 'host') { reset(['A', 'B'], false); send({ t: 'start', room }); }
  begin();
}
function begin() {
  screen = 'play'; me = mode === 'guest' ? 1 : 0; overAt = 0; lastEv = mode === 'guest' ? 0 : W.evN; lastTick = -1;
  panel(null); $('hud').hidden = false; document.body.dataset.room = ROOM.id; restStick(ROOM.id === 'tall'); measureHud(); wake(); music(true, false); sfx('rush');
  if (mode !== 'guest') { W.banner = 'open'; W.bannerT = 1.6; }
}
$('panel').addEventListener('click', e => {
  const a = (e.target as Element).closest<HTMLElement>('[data-a]')?.dataset.a; if (!a) return; wake();
  if (a === 'solo') { mode = 'solo'; toReady(); }
  else if (a === 'host') { mode = 'host'; screen = 'room'; LINK.host(); waitCard(T('Opening a room…', '正在开房间…')); }
  else if (a === 'join' || a === 'rejoin') {
    const code = a === 'rejoin' ? LINK.saved()?.code : ($('code') as HTMLInputElement).value.trim().toUpperCase();
    if (!code || code.length !== 4) { ($('code') as HTMLInputElement)?.focus(); return; }
    mode = 'guest'; screen = 'room'; LINK.join(code, a === 'rejoin'); waitCard(T(`Joining room ${code}…`, `正在加入房间 ${code}…`));
  }
  else if (a === 'copy') { const i = $('invite') as HTMLInputElement; i.select(); navigator.clipboard?.writeText(i.value).catch(() => {}); }
  else if (a === 'ready') { meReady = true; readyCard(mode as any, true, themReady, best()); if (mode === 'guest') send({ t: 'ready' }); else { if (mode === 'host') send({ t: 'ready', r: true }); maybeStart(); } }
  else if (a === 'again') { if (mode === 'host') send({ t: 'toReady' }); toReady(); }
  else if (a === 'lobby') lobby();
});
function finish(v: Snap) {
  screen = 'over'; music(false); $('hud').hidden = true; delete document.body.dataset.room;
  const s = starsFor(v.yen); try { if (s > best()) localStorage.setItem(bestKey(), String(s)); } catch { /* */ }
  resultsCard(v, best(), mode);
}

// ---------- the loop ----------
let last = 0, sendT = 0;
function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#1a2340'; g.fillRect(0, 0, innerWidth, innerHeight);
  if (screen !== 'play' && screen !== 'over') return;
  // move your own waiter
  const speed = 235 * dt, mover = mode === 'guest' ? local : W.P[0];
  if (screen === 'play' && !paused && mover) {
    slide(mover, STICK.x * speed, STICK.y * speed); mover.moving = Math.hypot(STICK.x, STICK.y) > 0.15; if (Math.abs(STICK.x) > 0.2) mover.face = STICK.x > 0 ? 1 : -1;
  }
  if (mode === 'guest') { sendT -= dt; if (sendT <= 0) { sendT = 0.066; send({ t: 'pos', x: Math.round(local.x), y: Math.round(local.y), f: local.face, m: local.moving }, false); } }
  else if (screen === 'play' && !paused) {
    if (mode === 'solo') botTick(dt);
    tick(dt);
    if (mode === 'host') { sendT -= dt; if (sendT <= 0) { sendT = 0.08; send({ t: 'snap', s: snapshot(1) }, false); } }
  }
  const v = view(); if (!v) return;
  // sounds for what happened since the last frame (on the partner's phone, from the snapshot)
  for (const e of v.ev) if (e.id > lastEv) { sfx(e.k); lastEv = e.id; if (e.k === 'rush') music(true, true); }
  const left = Math.ceil(SHIFT.len - v.t); if (left <= 10 && left !== lastTick && v.phase === 'play') { lastTick = left; sfx('tick'); }
  const target = screen === 'play' ? actionTarget(v, me) : null, tg = screen === 'play' ? talkTarget(v, me) : null;
  g.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
  draw(g, v, me, target, dt, now / 1000, mode === 'guest', topSafe);
  const want = tg && wants(v, tg, me);
  hudTick(v, me, target, want ? { want, seed: tg!.id * 7 + ['door', 'wait', 'ask', 'food', 'bye'].indexOf(tg!.st) + ['greet', 'count', 'seat'].indexOf(tg!.step) } : null, hintFor(v), mode === 'solo');
  if (v.phase === 'over' && screen === 'play') { overAt ||= now; if (now - overAt > 1600) finish(v); }
}
requestAnimationFrame(frame);
/** one short line on what to do next */
function hintFor(v: Snap): string {
  const p = v.P[me], h = p?.hold;
  if (!p) return '';
  if (v.groups.some(x => x.st === 'follow' && x.follow === me)) return T('Lead them to a free table that fits, then press the button', '带他们到够大的空桌，然后按按钮');
  if (h?.k === 'noodles') return T('Into a pot: ゆでる', '放进锅里：ゆでる');
  if (h?.k === 'bowl' && !h.noodles) return T('Take the bowl to a pot when its ring is green', '锅的圈变绿时把碗拿过去');
  if (h?.k === 'bowl' && !h.tops.length) return T('Add the topping from the ticket', '加订单上的配料');
  if (h?.k === 'bowl') return T('Put it on the pass, or serve it: お待たせしました', '放到出餐口，或直接上菜：お待たせしました');
  if (h?.k === 'dishes') return T('Dishes to the sink: あらう', '把碗盘拿到水槽：あらう');
  if (v.tickets.some(tk => tk.by === me && !tk.called)) return mode === 'solo' ? T('Tap 📣 on your ticket so しばBot can cook it', '点订单上的 📣，让 しばBot 去煮') : T('Tell your partner the order (or tap 📣)', '把订单告诉搭档（或点 📣）');
  if (v.groups.some(x => x.st === 'door')) return T('Guests at the door!', '门口有客人！');
  return '';
}

// ---------- start: an invite link joins straight away ----------
const inv = (location.hash.match(/join=([A-Z0-9]{4})/i) || [])[1];
if (inv) { history.replaceState(null, '', location.pathname); mode = 'guest'; screen = 'room'; LINK.join(inv.toUpperCase()); waitCard(T(`Joining room ${inv.toUpperCase()}…`, `正在加入房间 ${inv.toUpperCase()}…`)); }
else lobby();
(window as any).__floor = { W, view, room: () => ROOM.id, mode: () => mode, me: () => me, screen: () => screen, act: doAct, say: doSay, call: doCall, stick: (x: number, y: number) => { STICK.x = x; STICK.y = y; }, LINK, choices,
  // tests: put this phone's own waiter somewhere
  tp: (x: number, y: number) => { const m = mode === 'guest' ? local : W.P[0]; m.x = x; m.y = y; } };
