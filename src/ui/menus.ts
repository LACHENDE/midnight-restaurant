// menus
import { G } from '../game/G';
import { LINK } from '../net/link';
import { $, HUB, T, esc, store } from '../core/env';
import { rushPlan } from '../game/rush';
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
  <button class="role" data-a="${p}cook"><b>${ICONSVG.pot}${T('Cook', '厨师')}</b><small>${T("Noodles into the basket, the basket into the pot, lift them when the dial is green, pour the broth, add the toppings the counter tells you (you can't see the orders!), slide the bowl to the pass.", '把面放进漏勺、放进锅里，表盘变绿就捞起来，倒汤，加柜台告诉你的配料（你看不到订单！），把碗滑到出餐口。')}</small></button>
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
    T(
      "Add what your partner says: you can't see the orders (the trays are labelled in kana)",
      '加搭档说的配料：你看不到订单（托盘上写着假名）',
    ),
    T('Slide the bowl to the pass', '把碗滑到出餐口'),
  ],
  counter: [
    T('Drag a guest in from the rain to a seat', '把客人从雨里拖到座位上'),
    T('Tap them when they raise a hand: their order appears', '客人举手时点一下：会显示他点的菜'),
    T(
      "Say the order to the cook: they can't see it, and it fades (tap もう一度 if you forget)",
      '把订单说给厨师听：厨师看不到，订单也会消失（忘了就点もう一度）',
    ),
    T('Pour tea while they wait, then serve the bowl from the pass', '等的时候倒茶，然后从出餐口端碗上桌'),
    T('Collect the coins, clear the bowl, wipe the counter', '收硬币，收碗，擦台面'),
  ],
};
// the steps for tonight: the first night the cook reads the ticket; practising at the counter, Send tells しばBot
const stepsFor = (role, N) =>
  STEPS[role].map((x, i) => {
    if (role === 'cook' && i === 3 && N.open)
      return T('Add the toppings on the ticket (and listen to your partner)', '加单子上的配料（也听搭档说）');
    if (role === 'counter' && i === 2)
      return N.open
        ? T(
            'Say the order out loud to the cook (tonight their ticket shows it too)',
            '把订单大声说给厨师听（今晚厨师的单子上也有）',
          )
        : G.MODE === 'bot'
          ? T(
              'Say the order, then tap Send so しばBot knows. It fades: もう一度 brings it back',
              '说出订单，再点发送让 しばBot 知道。订单会消失：点もう一度再看',
            )
          : x;
    return x;
  });
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
    <div class="row"><a class="btn mint" href="./floor.html" style="text-decoration:none">${T('New: run the floor (top-down)', '新：俯视店面')}</a></div>
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
  const best = N.rush ? store.get('best' + N.n, 0) : 0,
    plan = N.rush ? rushPlan(N.n) : null,
    size = plan
      ? `${plan.total} ${T('guests', '位客人')} · ${plan.flags.length} ${T('big waves', '大波')}${best ? ` · ${T('record', '纪录')} ¥${best.toLocaleString('ja-JP')}` : ''}`
      : `${N.guests.length} ${T('guests', '位客人')}`,
    // night 1 is for learning the stall: the cook sees the orders. From night 2 the counter has to say them (伝言ラーメン)
    lead = N.open
      ? cook
        ? T(
            `Tonight the orders show on your tickets, so you can learn the kitchen. From the next night they stay blank and ${p} has to tell you.`,
            `今晚订单会显示在你的单子上，先熟悉厨房。从下一晚开始单子是空白的，要靠 ${p} 告诉你。`,
          )
        : T(
            `Tonight ${p} can see the orders too, so just learn the counter. Say them out loud anyway: from the next night that's the only way.`,
            `今晚 ${p} 也能看到订单，先熟悉柜台。还是要大声说出来：从下一晚开始只能靠你说。`,
          )
      : cook
        ? G.MODE === 'bot'
          ? T(
              'しばBot runs the counter and says each order out loud. Your tickets stay blank: listen (🔊 says one again).',
              'しばBot 管柜台，会把每份订单说出来。你的单子是空白的：仔细听（点 🔊 再听一遍）。',
            )
          : T(
              `Your tickets stay blank: ${p} hears the orders, so ask what goes in each bowl.`,
              `你的单子是空白的：${p} 听客人点单，问 TA 每碗要加什么。`,
            )
        : T(
            `${p} can't see the orders. Say each one out loud before it fades.`,
            `${p} 看不到订单。订单消失之前，大声说出来。`,
          ),
    // the first night without the orders on the cook's tickets gets a callout
    fresh =
      !N.open && N.n === 2
        ? `<div class="new"><b>${T('New tonight', '今晚的新规则')}</b> 伝言ラーメン · ${T("the cook can't see the orders. Counter, say them; cook, ask! Two guests will also ask for かため (firm noodles).", '厨师看不到订单。柜台负责说，厨师负责问！还有两位客人会要かため（面硬一点）。')}</div>`
        : '';
  ui(`<div class="kicker">${T('Tonight', '今晚')} · ${esc(T(N.name[0], N.name[1]))} · ${size}</div><h2>${cook ? T('You cook', '你煮面') : T('You run the counter', '你管柜台')}</h2>
    ${fresh || `<p class="lead">${lead}</p>`}
    <ol class="steps two">${(N.door && !cook ? STEPS_DOOR() : stepsFor(G.ROLE, N)).map(s => `<li>${esc(s)}</li>`).join('')}</ol>
    ${N.rush ? `<p class="note"><b>${T('Rush night:', '高峰之夜：')}</b> ${T('big waves come with a warning (お客さんの大群が来る！); right bowls in a row build a combo; いそぎ guests pay double.', '大波来之前会提醒（お客さんの大群が来る！）；连续做对叠连击；いそぎ的客人奖金翻倍。')}</p>` : ''}
    ${
      canPick
        ? `<div class="row nights">${NIGHTS.filter(n => n.n === 1 || store.get('night2', 0))
            .map(
              n =>
                `<button class="btn ${RD.n === n.n ? 'mint' : 'ghost'}" data-night="${n.n}">${esc(T(n.name[0], n.name[1]))}</button>`,
            )
            .join('')}</div>`
        : ''
    }
    <div class="row rbar"><button class="btn" data-a="ready"${RD.me ? ' disabled' : ''}>${RD.me ? T('Ready ✓', '已准备 ✓') : T('Ready', '准备好了')}</button><span class="note" style="margin:0">${G.MODE === 'bot' ? '' : RD.them ? T(`${p} is ready`, `${p} 已准备`) : T(`Waiting for ${p}…`, `等待 ${p}…`)}</span></div>`);
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
