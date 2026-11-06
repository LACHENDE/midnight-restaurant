// menus
import { G } from '../game/G';
import { LINK } from '../net/link';
import { $, HUB, T, esc, store } from '../core/env';
import { NIGHTS } from '../data/content';
import { meCook, meCounter } from '../game/night-state';

export const ICONSVG = {
  pot: '<svg viewBox="0 0 24 24"><path d="M3 10h18v3a7 7 0 0 1-7 7h-4a7 7 0 0 1-7-7z" fill="#3B2618"/><rect x="2" y="8" width="20" height="3" rx="1.5" fill="#3B2618"/><path d="M8 6c0-2 2-2 2-4M12 6c0-2 2-2 2-4" stroke="#3B2618" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
  bowl: '<svg viewBox="0 0 24 24"><path d="M2 11h20a10 9 0 0 1-20 0z" fill="#3B2618"/><rect x="8" y="19" width="8" height="2.5" rx="1" fill="#3B2618"/></svg>',
};
export const ui = html => {
  $('#panel').innerHTML = html;
  $('#ui').hidden = false;
};
export const hideUI = () => {
  $('#ui').hidden = true;
};
export const ROLE_CARDS = p => `<div class="roles">
  <button class="role" data-a="${p}cook"><b>${ICONSVG.pot}${T('Cook', '厨师')}</b><small>${T('Noodles into the basket, the basket into the pot, lift them when the dial is green, pour the broth, add the toppings the counter tells you, slide the bowl to the pass.', '把面放进漏勺、放进锅里，表盘变绿就捞起来，倒汤，加柜台告诉你的配料，把碗滑到出餐口。')}</small></button>
  <button class="role" data-a="${p}counter"><b>${ICONSVG.bowl}${T('Counter', '柜台')}</b><small>${T('Invite guests in from the rain, hear their order and say it to the cook, pour them tea, serve the right bowl, then clear and wipe.', '把客人从雨里请进来，听他们点单并告诉厨师，给他们倒茶，端上对的碗，再收拾擦干净。')}</small></button></div>`;
export const STEPS_DOOR = () => [
  T('A group arrives at the door: greet them (いらっしゃいませ)', '一群客人到门口：打招呼（いらっしゃいませ）'),
  T('Ask how many (何名様ですか) and listen to the answer', '问几位（何名様ですか），听他们回答'),
  T(
    'Room for them? Show them in (こちらへどうぞ). Not enough seats? Ask them to wait (少々お待ちください)',
    '有位子？请进（こちらへどうぞ）。位子不够？请稍等（少々お待ちください）',
  ),
  T('Take orders, serve and clear as usual', '照常点单、上菜、收拾'),
  T('When the group leaves: ありがとうございました', '客人离开时：ありがとうございました'),
];
export const STEPS = {
  cook: [
    T('Drag noodles into the basket, then the basket into the boiling pot', '把面拖进漏勺，再把漏勺放进滚水锅'),
    T('Lift it when the dial is green, and tip the noodles into a bowl', '表盘变绿就提起来，把面倒进碗里'),
    T('Hold the ladle over the bowl to pour the broth', '把汤勺按在碗上倒汤'),
    T('Add the topping your partner names (the trays are labelled in kana)', '加搭档说的配料（托盘上写着假名）'),
    T('Slide the bowl to the pass', '把碗滑到出餐口'),
  ],
  counter: [
    T('Drag a guest in from the rain to a seat', '把客人从雨里拖到座位上'),
    T('Tap them when they raise a hand: their order appears', '客人举手时点一下：会显示他点的菜'),
    T('Say the word to the cook (or tap Send)', '把单词说给厨师听（或点"发送"）'),
    T('Pour tea while they wait, then serve the bowl from the pass', '等的时候倒茶，然后从出餐口端碗上桌'),
    T('Collect the coins, clear the bowl, wipe the counter', '收硬币，收碗，擦台面'),
  ],
};
export const langBtn = () => {
  const b = $('#langBtn');
  b.hidden = !!HUB;
  b.innerHTML = G.LANG === 'zh' ? '<em>EN</em> · <b>中文</b>' : '<b>EN</b> · <em>中文</em>';
};
export function lobbyUI(msg?) {
  G.MODE = '';
  G.NIGHT = null;
  $('#hud').hidden = true;
  langBtn();
  const s = LINK.saved();
  ui(`<div class="kicker">${T('2 players · co-op · learn a little Japanese', '双人 · 合作 · 学一点日语')}</div><h1>まよなか屋<small>Midnight Restaurant</small></h1>
    <p class="lead">${T('A tiny ramen stall on a rainy night. One of you cooks, one of you runs the counter. Guests order in Japanese: say the word to each other, and make the bowl together.', '雨夜里的小拉面摊。一人煮面，一人管柜台。客人用日语点单：把单词说给对方听，一起做出这碗面。')}</p>
    ${msg ? `<p class="err">${esc(msg)}</p>` : ''}
    ${s ? `<div class="row"><button class="btn" data-a="rejoin">${T(`Rejoin room ${esc(s.code)}`, `回到房间 ${esc(s.code)}`)}</button></div>` : ''}
    <div class="row"><button class="btn${s ? ' mint' : ''}" data-a="create">${T('Play together: open a room', '一起玩：开房间')}</button><input class="codein" id="codeIn" maxlength="4" placeholder="CODE" autocomplete="off" aria-label="${T('Room code', '房间码')}"><button class="btn ghost" data-a="join">${T('Join', '加入')}</button></div>
    <div class="row"><button class="btn ghost" data-a="practice">${T('Practice alone with しばBot', '和 しばBot 单人练习')}</button></div>
    <p class="note">${T('Online co-op: two phones, anywhere (a room code or an invite link). Practice: you take one role, しばBot the other.', '联机合作：两部手机，在哪都行（房间码或邀请链接）。练习：你一个角色，しばBot 另一个。')}</p>`);
}
// a ready card before each night: who does what, and a Ready button (that tap also wakes the sound up on iPhone)
export const RD = { me: false, them: false, n: 1 };
export function readyUI() {
  const N = NIGHTS[RD.n - 1],
    p = esc(partnerName()),
    cook = meCook(),
    canPick = G.MODE === 'bot' || meCounter();
  $('#langBtn').hidden = true;
  ui(`<div class="kicker">${T('Tonight', '今晚')} · ${esc(T(N.name[0], N.name[1]))} · ${N.guests.length} ${T('guests', '位客人')}</div><h2>${cook ? T('You cook', '你煮面') : T('You run the counter', '你管柜台')}</h2>
    <p class="lead">${cook ? T(`${p} runs the counter and hears the orders. Ask them what to put in each bowl.`, `${p} 管柜台、听客人点单。问 TA 每碗要加什么。`) : T(`${p} cooks. Say each order out loud so they know what to make.`, `${p} 煮面。把每份订单大声说出来，让 TA 知道做什么。`)}</p>
    <ol class="steps">${(N.door && !cook ? STEPS_DOOR() : STEPS[G.ROLE]).map(s => `<li>${esc(s)}</li>`).join('')}</ol>
    ${
      canPick
        ? `<div class="row">${NIGHTS.filter(n => n.n === 1 || n.door || store.get('night2', 0))
            .map(
              n =>
                `<button class="btn ${RD.n === n.n ? 'mint' : 'ghost'}" data-night="${n.n}">${esc(T(n.name[0], n.name[1]))}</button>`,
            )
            .join('')}</div>`
        : ''
    }
    <div class="row"><button class="btn" data-a="ready"${RD.me ? ' disabled' : ''}>${RD.me ? T('Ready ✓', '已准备 ✓') : T('Ready', '准备好了')}</button><span class="note" style="margin:0">${G.MODE === 'bot' ? '' : RD.them ? T(`${p} is ready`, `${p} 已准备`) : T(`Waiting for ${p}…`, `等待 ${p}…`)}</span></div>`);
}
export function partnerName() {
  return G.MODE === 'bot' ? 'しばBot' : HUB ? HUB.names().partner : T('your partner', '搭档');
}
export function roomUI(state) {
  const c = LINK.code;
  $('#langBtn').hidden = true;
  if (state === 'opening')
    return ui(
      `<div class="kicker">${T('Your room', '你的房间')}</div><h2><span class="spin"></span>${T('Opening a room…', '正在开房间…')}</h2><div class="row"><button class="btn ghost" data-a="leave">${T('Cancel', '取消')}</button></div>`,
    );
  if (state === 'joining' || state === 'nohost')
    return ui(
      `<div class="kicker">${T('Joining', '加入中')}</div><div class="code">${esc(c)}</div><h2><span class="spin"></span>${state === 'nohost' ? T('Waiting for the room to open…', '等待房间开启…') : T('Connecting…', '连接中…')}</h2>${state === 'nohost' ? `<p class="note">${T("Your partner's page isn't open yet (or the code is wrong). Keep this open; it joins as soon as the room is there.", '搭档的页面还没打开（或房间码不对）。保持此页面，房间一出现就会自动加入。')}</p>` : ''}<div class="row"><button class="btn ghost" data-a="leave">${T('Cancel', '取消')}</button></div>`,
    );
  ui(`<div class="kicker">${T('Your room', '你的房间')} · ${G.ROLE === 'cook' ? T('you cook', '你煮面') : T('you run the counter', '你管柜台')}</div><div class="code">${esc(c)}</div>
    <p class="lead">${T("Send your partner this link. When it opens on their phone, you're both in.", '把这个链接发给搭档。对方在手机上打开就进来了。')}</p><div class="link" id="linkTxt">${esc(LINK.invite())}</div>
    <div class="row"><button class="btn" data-a="share">${T('Send the link', '发送链接')}</button><button class="btn mint" data-a="copy">${T('Copy', '复制')}</button><button class="btn ghost" data-a="leave">${T('Cancel', '取消')}</button></div>
    <p class="note"><span class="spin"></span>${T('Waiting for your partner…', '等待搭档…')} ${T("Tip: open it in Safari or Chrome; some chat apps' built-in browsers block the connection.", '提示：用 Safari 或 Chrome 打开；有些聊天软件的内置浏览器会阻止连接。')}</p>`);
}
