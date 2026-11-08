// What sits over the canvas: the clock, stars, money, combo and walkouts; the ticket rail; the action button and the
// three lines to say; banners; and the lobby, ready and results cards.
import { PHRASES, LINE_IDS, DISHES, SHIFT, ACTION_LABEL, TABLE_JP, type Dish } from './data';
import { comboMult, starsFor, type Snap, type Act, type Ticket } from './sim';
import { RUN, NIGHT, ABIL, UPS, kit, VOICE } from './nights';

export const LANG: 'en' | 'zh' = (() => { try { const v = JSON.parse(localStorage.getItem('yofu_lang') || 'null'); if (v === 'zh' || v === 'en') return v; } catch { /* none */ } return /^zh/i.test(navigator.language) ? 'zh' : 'en'; })();
export const T = (en: string, zh: string) => (LANG === 'zh' ? zh : en);
export const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const memo: Record<string, string> = {};
const html = (id: string, h: string) => { if (memo[id] !== h) { memo[id] = h; $(id).innerHTML = h; } };
const text = (id: string, s: string) => { const e = $(id); if (e.textContent !== s) e.textContent = s; };

// lines you've said right three times lose their romaji
let mastery: Record<string, number> = {};
try { mastery = JSON.parse(localStorage.getItem('mfloor_lines') || '{}'); } catch { mastery = {}; }
export const known = (id: string) => (mastery[id] || 0) >= 3;
export function learned(id: string) { mastery[id] = (mastery[id] || 0) + 1; try { localStorage.setItem('mfloor_lines', JSON.stringify(mastery)); } catch { /* */ } }
/** three lines: the one that fits and two others, in an order that stays put while you're talking to that group */
export function choices(want: string, seed: number): string[] {
  const others = LINE_IDS.filter(p => p !== want), a = others[seed % others.length];
  let b = others[(seed * 3 + 2) % others.length]; if (b === a) b = others[(seed + 1) % others.length];
  const three = [want, a, b]; return three.map((_, i) => three[(i + seed) % 3]);
}
const dishes = (items: Dish[][]) => {
  const n: Record<string, number> = {}; for (const b of items) { const k = b.map(d => DISHES[d].k).join('＋'); n[k] = (n[k] || 0) + 1; }
  return Object.entries(n).map(([k, c]) => `${k}${c > 1 ? `×${c}` : ''}`).join('　');
};
function ticketHtml(tk: Ticket, me: number, solo: boolean) {
  const mine = tk.by === me, items = tk.items ? dishes(tk.items) : '？？？';
  const callBtn = mine && !tk.called ? `<button type="button" data-call="${tk.id}" aria-label="${T('Call the order to the kitchen', '把订单喊给厨房')}">📣</button>` : tk.called ? '<i>📣</i>' : '';
  return `<div class="tk${tk.kind !== 'normal' ? ' ' + tk.kind : ''}${tk.items ? '' : ' hid'}"><b>${tk.table}</b><span>${items}<small>${TABLE_JP[tk.table]}${solo && mine && !tk.called ? ' · ' + T('call it for しばBot', '喊给しばBot') : ''}</small></span>${callBtn}</div>`;
}
const BANNER: Record<string, () => string> = {
  rush: () => `ラッシュアワー！<small>${T('Rush hour: guests come faster', '高峰时段：客人来得更快')}</small>`,
  critic: () => `評論家が来た！<small>${T('A food critic: a perfect bowl, fast, pays ×3', '美食评论家：又快又好，收入×3')}</small>`,
  vip: () => `VIP来店！<small>${T('A VIP: big tip if they leave happy', 'VIP：满意离开有大额小费')}</small>`,
  close: () => `閉店！<small>${T('Closing time', '打烊了')}</small>`,
  open: () => `第${RUN.night}夜　開店！<small>${T(`Night ${RUN.night}: doors open`, `第 ${RUN.night} 夜：开门营业`)}</small>`,
};

export function hudTick(v: Snap, me: number, act: Act | null, talk: { want: string; seed: number } | null, hint: string, solo: boolean) {
  const left = Math.max(0, Math.ceil(SHIFT.len - v.t)), clock = $('clock');
  text('clock', `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`); clock.classList.toggle('hot', v.rush || left <= 30);
  const top = SHIFT.stars[2]; $('starfill').style.width = `${Math.min(100, (v.yen / top) * 100)}%`;
  const lit = starsFor(v.yen); [...$('stars').querySelectorAll('span')].forEach((s, i) => s.classList.toggle('on', i < lit));
  text('yen', `¥${v.yen.toLocaleString('ja-JP')}`);
  html('combo', v.combo >= 2 ? `COMBO <b>×${comboMult(v.combo).toFixed(1)}</b>` : '');
  html('walks', Array.from({ length: SHIFT.maxWalkouts }, (_, i) => `<i class="${i < v.walkouts ? 'x' : ''}"></i>`).join(''));
  html('rail', v.tickets.map(tk => ticketHtml(tk, me, solo)).join(''));
  // the action button names what it will do, in Japanese with the meaning under it
  const btn = $('act');
  if (act) {
    const L = ACTION_LABEL[act.key] || ['…', '', ''];
    const jp = act.key === 'top' ? `${DISHES[act.sid as Dish].k}を${L[0]}` : act.key === 'seat' ? `${act.table}番へ${L[0]}` : L[0];
    html('act', `<b>${jp}</b><small>${LANG === 'zh' ? L[2] : L[1]}</small>`); btn.classList.remove('off');
  } else { html('act', `<b>　</b><small></small>`); btn.classList.add('off'); }
  // the three lines (and the microphone) when you're next to someone who needs one
  const fan = $('fan');
  if (talk) {
    const lines = choices(talk.want, talk.seed), SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    html('fan', (SR ? `<button type="button" class="mic" data-mic="1" aria-label="${T('Say it', '说出来')}">🎤</button>` : '') +
      lines.map((id, i) => `<button type="button" data-say="${id}"><kbd>${i + 1}</kbd>${PHRASES[id].k}${known(id) ? '' : `<small>${PHRASES[id].ro}</small>`}</button>`).join(''));
    if (fan.hidden) fan.hidden = false;
  } else if (!fan.hidden) { fan.hidden = true; memo.fan = ''; }
  text('hint', hint); $('hint').hidden = !hint;
  const b = $('banner'); if (v.bannerT > 0 && BANNER[v.banner]) { html('banner', BANNER[v.banner]()); b.hidden = false; } else b.hidden = true;
}

// ---------- the line abilities ----------
let abilKey = '';
/** the ability buttons next to the action button: icon, the line in kana, a cooldown ring; 🎤 says it for the stronger one */
export function abilTick(v: Snap, me: number, mic: boolean, on: boolean) {
  const box = $('abil'), ids = on ? kit(me, RUN.ups) : [], key = ids.join() + mic;
  if (key !== abilKey) {
    abilKey = key;
    box.innerHTML = ids.map((id, i) => `<span class="abw"><button type="button" class="ab" data-ab="${id}" aria-label="${PHRASES[ABIL[id].line].k}"><i>${ABIL[id].icon}</i><b>${ABIL[id].short}</b><kbd>${'QRF'[i]}</kbd><em></em></button>${mic ? `<button type="button" class="vmic" data-vab="${id}" aria-label="${T('Say it for a stronger one', '说出来更强')}">🎤</button>` : ''}</span>`).join('');
  }
  const P = v.P[me]; if (!P) return;
  box.querySelectorAll<HTMLElement>('.ab').forEach(b => {
    const id = b.dataset.ab as keyof typeof ABIL, left = P.cd?.[id] || 0, full = ABIL[id].cd * (1 - 0.2 * (RUN.ups.cool || 0));
    b.style.setProperty('--cd', String(Math.min(1, left / full)));
    b.classList.toggle('cool', left > 0); const em = b.querySelector('em')!, t = left > 0 ? String(Math.ceil(left)) : ''; if (em.textContent !== t) em.textContent = t;
  });
}

// ---------- cards ----------
export function panel(h: string | null) { const p = $('panel'); if (h === null) { p.hidden = true; return; } p.innerHTML = `<div class="card">${h}</div>`; p.hidden = false; }
const HOWTO = () => `<ol class="how">
  <li>${T('Left thumb: move. Right thumb: the action button (pick up, put down, cook, seat).', '左手：移动。右手：动作键（拿、放、煮、带位）。')}</li>
  <li>${T('Next to a guest, three lines appear: say the right one (🎤) or tap it.', '走到客人旁边会出现三句话：说出（🎤）或点对的那句。')}</li>
  <li>${T('Noodles → pot (wait for green) → bowl → topping → the pass → serve.', '面 → 锅（等变绿）→ 碗 → 配料 → 出餐口 → 上菜。')}</li>
  <li>${T('Only the one who took an order sees it: shout it to your partner, or tap 📣.', '只有点单的人能看到订单：喊给搭档，或点 📣。')}</li>
  <li>${T(`Your line abilities sit by the action button: tap one, or 🎤 say the line for a stronger one (×${VOICE}).`, `台词技能在动作键旁：点一下使用，或 🎤 说出台词更强（×${VOICE}）。`)}</li></ol>`;
export function lobbyCard(saved: string | null) {
  panel(`<div class="kicker">${T('2 players · co-op · 接客 Japanese', '双人合作 · 学接客日语')}</div><h1>まよなか屋<small>${T('the floor', '店面')}</small></h1>
    <p>${T('Run a ramen shop together for three minutes: greet guests in Japanese, seat them, cook, serve, and keep everyone happy through rush hour.', '一起经营拉面店三分钟：用日语接待、带位、煮面、上菜，撑过高峰时段。')}</p>${HOWTO()}
    ${saved ? `<div class="row"><button type="button" class="btn" data-a="rejoin">${T(`Rejoin room ${esc(saved)}`, `回到房间 ${esc(saved)}`)}</button></div>` : ''}
    <div class="row"><button type="button" class="btn${saved ? ' ghost' : ''}" data-a="host">${T('Play together: open a room', '一起玩：开房间')}</button>
      <input id="code" maxlength="4" placeholder="CODE" autocomplete="off" aria-label="${T('Room code', '房间码')}"><button type="button" class="btn ghost" data-a="join">${T('Join', '加入')}</button></div>
    <div class="row"><button type="button" class="btn mint" data-a="solo">${T('Practise with しばBot (it cooks)', '和 しばBot 练习（它煮面）')}</button><a class="btn ghost" href="./">${T('← Midnight Restaurant', '← 午夜拉面摊')}</a></div>`);
}
export function roomCard(code: string, invite: string) {
  panel(`<div class="kicker">${T('Room', '房间')}</div><h1 class="code">${esc(code)}</h1><p>${T('Send this link to your partner (or tell them the code):', '把链接发给搭档（或告诉对方房间码）：')}</p>
    <div class="row"><input id="invite" readonly value="${esc(invite)}" aria-label="${T('Invite link', '邀请链接')}"><button type="button" class="btn ghost" data-a="copy">${T('Copy', '复制')}</button></div>
    <p class="note"><span class="spin"></span>${T('Waiting for your partner…', '等待搭档加入…')}</p><div class="row"><button type="button" class="btn ghost" data-a="lobby">${T('Back', '返回')}</button></div>`);
}
export const waitCard = (msg: string) => panel(`<p class="note"><span class="spin"></span>${esc(msg)}</p><div class="row"><button type="button" class="btn ghost" data-a="lobby">${T('Back', '返回')}</button></div>`);
const kitHtml = (pi: number) => `<div class="kit">${kit(pi, RUN.ups).map(id => `<div><b>${ABIL[id].icon} ${PHRASES[ABIL[id].line].k}</b><small>${T(ABIL[id].en, ABIL[id].zh)}</small></div>`).join('')}</div>`;
const upsHtml = () => { const u = Object.entries(RUN.ups).filter(([, n]) => n > 0); return u.length ? `<p class="note">${u.map(([k, n]) => `${UPS[k].icon}${n > 1 ? '×' + n : ''}`).join(' ')}</p>` : ''; };
const nightNews = () => {
  const n = RUN.night, news: string[] = [];
  if (n === 1) news.push(T('Tonight: たまご and ねぎ, small groups.', '今晚：たまご 和 ねぎ，小桌客人。'));
  if (n === 2) news.push(T('New: なると, groups of 3, and a food critic.', '新：なると、三人桌，还有美食评论家。'));
  if (n === 3) news.push(T('New: groups of 4 and a VIP.', '新：四人桌和 VIP。'));
  if (n >= 4) news.push(T('Now some guests want two toppings.', '现在有客人要两种配料。'));
  if (n > 1) news.push(T('Guests come faster and wait less.', '客人来得更快，耐心更少。'));
  return news.join(' ');
};
export function readyCard(mode: 'solo' | 'host' | 'guest', me: boolean, them: boolean, best: number) {
  const partner = mode === 'solo' ? T('しばBot runs the kitchen. Call your orders to it with 📣.', 'しばBot 负责厨房。用 📣 把订单喊给它。') : them ? T('Your partner is ready.', '搭档已准备好。') : T('Waiting for your partner to be ready…', '等待搭档准备…');
  const mins = `${Math.floor(SHIFT.len / 60)}:${String(SHIFT.len % 60).padStart(2, '0')}`;
  panel(`<div class="kicker">第${RUN.night}夜 · ${T(`Night ${RUN.night}`, `第 ${RUN.night} 夜`)} · ${mins}</div><h2>${mode === 'guest' ? T('You wear the green apron', '你穿绿色围裙') : T('You wear the navy apron', '你穿深蓝色围裙')}</h2>
    <p>${nightNews()}</p>${kitHtml(mode === 'guest' ? 1 : 0)}${upsHtml()}${RUN.night === 1 ? HOWTO() : ''}
    <p class="note">${partner}${best ? ` · ${T('Best: night', '最好：第')} ${best}${T('', ' 夜')}` : ''}</p>
    <div class="row"><button type="button" class="btn mint" data-a="ready"${me ? ' disabled' : ''}>${me ? T('Ready ✓', '已准备 ✓') : T('Ready', '准备好了')}</button><button type="button" class="btn ghost" data-a="lobby">${T('Leave', '离开')}</button></div>`);
}
export function resultsCard(v: Snap, best: number, mode: string, night: number, cleared: boolean, offers: string[]) {
  const stars = starsFor(v.yen), early = v.walkouts >= SHIFT.maxWalkouts;
  const next = !cleared ? '' : offers.length
    ? `<h2>${T('Pick an upgrade for night', '选一个升级，进入第')} ${night + 1}${T('', ' 夜')}</h2><div class="ups">${offers.map(k => `<button type="button" class="btn up" data-a="up:${k}"><i>${UPS[k].icon}</i>${T(UPS[k].en, UPS[k].zh)}</button>`).join('')}</div>`
    : `<p class="note"><span class="spin"></span>${T('Your partner is picking the next upgrade…', '搭档正在选下一个升级…')}</p>`;
  panel(`<div class="kicker">${cleared ? T(`Night ${night} cleared!`, `第 ${night} 夜过关！`) : early ? T(`Closed early on night ${night}: three walkouts`, `第 ${night} 夜三组客人走掉，提前关门`) : T(`Night ${night}: not enough for a star`, `第 ${night} 夜：没拿到星`)}</div>
    <div class="bigstars">${'★'.repeat(stars)}<span>${'★'.repeat(3 - stars)}</span></div>
    <div class="stats"><span>${T('Takings', '收入')}<b>¥${v.yen.toLocaleString('ja-JP')}</b></span><span>${T('Bowls served', '上了几碗')}<b>${v.served}</b></span>
      <span>${T('Best combo', '最高连击')}<b>${v.bestCombo}</b></span><span>${T('Walkouts', '走掉')}<b>${v.walkouts}</b></span><span>接客<b>${v.ok}/${v.ok + v.bad}</b></span></div>
    <p class="note">${T('Stars at', '星级')} ¥${SHIFT.stars.map(s => s.toLocaleString('ja-JP')).join(' · ¥')}${best ? ` · ${T('Best: night', '最好：第')} ${best}${T('', ' 夜')}` : ''}</p>
    ${next}
    <div class="row">${cleared ? '' : `<button type="button" class="btn mint" data-a="again">${T('New run from night 1', '从第 1 夜重新开始')}</button>`}<button type="button" class="btn ghost" data-a="lobby">${T('Lobby', '大厅')}</button></div>`);
}
