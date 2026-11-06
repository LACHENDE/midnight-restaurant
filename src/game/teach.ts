// teaching: what to do next, and when to say so
import { G } from './G';
import { $, T } from '../core/env';
import { C, K, isEmpty, meCook } from './night-state';
import { CL, KL } from '../data/layout';
import { CUPY, cupX, painted } from '../render/views';
import { LOOKS, NIGHTS, WORDS } from '../data/content';
import { SFX } from '../audio/sfx';
import { bowlTopAt } from '../render/shapes';
import { doorGroup, doorHint, doorWant } from './door';
import { freeSeat } from './counter';

G.lastAct = 0;
export const noteAct = () => {
  G.lastAct = G.clock;
};
export function curTeach() {
  if (meCook()) return K && K.cur ? K.cur.teach : 2;
  const s = C && C.seats.find(s => s.g && s.g.st !== 'leave');
  return s ? s.g.teach : C && C.queue[0] ? C.queue[0].teach : 2;
}
/** what the teaching layer shows: a line of text, and an arrow from → to, or a spot to tap */
export interface Hint {
  t: string;
  at?: { x: number; y: number };
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  tap?: boolean;
  now?: boolean;
}
export function hintCook(): Hint | null {
  const tk = K.tickets.find(t => !t.done);
  if (K.back.length) {
    const i = K.slots.findIndex(b => b && isEmpty(b));
    if (i >= 0)
      return {
        t: T('A bowl came back. Drag it onto the board to fix it', '有一碗被退回来了。把它拖回案板上改好'),
        from: { x: KL.pass.x - 30, y: KL.pass.y + 8 },
        to: KL.slots[i],
      };
  }
  if (!tk)
    return K.tickets.length
      ? null
      : { t: T('Open for the night. Waiting for the first order…', '开店了。等第一份订单…') };
  const i = K.slots.findIndex(b => b && !isEmpty(b)),
    si = i >= 0 ? i : 0,
    bw = K.slots[si] || K.slots[1 - si],
    s = KL.slots[si];
  if (!bw) return null;
  if (bw.why && bw.why !== 'tops' && bw.why !== 'broth' && bw.noodles)
    return {
      t: T('Start this bowl again: drag it to the plate to empty it', '这碗重做：拖到盘子里倒掉'),
      from: s,
      to: KL.scrap,
    };
  if (!bw.noodles) {
    const b = K.basket;
    if (b.st === 'hook') return { t: T('Drag the noodles into the basket', '把面拖进漏勺'), from: KL.box, to: KL.hook };
    if (b.st === 'full')
      return {
        t: T('Lower the basket into the boiling water', '把漏勺放进滚水里'),
        from: { x: KL.hook.x, y: KL.hook.y + 16 },
        to: KL.pot,
      };
    if (b.done === 'raw')
      return { t: T('Watch the noodles: wait for the green part of the dial', '看着面：等表盘走到绿色'), at: KL.dial };
    return {
      t: T('Lift the basket and tip the noodles into the bowl', '把漏勺提起来，把面倒进碗里'),
      from: { x: KL.pot.x - 10, y: KL.pot.y },
      to: s,
    };
  }
  if (bw.broth < 0.7)
    return {
      t: T('Hold the ladle over the bowl to pour the broth', '把汤勺按在碗上倒汤'),
      from: { x: KL.ladle.x - 30, y: KL.ladle.y + 10 },
      to: s,
    };
  if (!tk.o)
    return {
      t: T('Which topping? Ask the counter what they ordered', '加什么？问柜台客人点了什么'),
      at: { x: 900, y: 100 },
    };
  const miss = tk.o.find(w => !bw.tops.includes(w));
  if (miss)
    return {
      t: T(`Add ${WORDS[miss].k} (${WORDS[miss].ro})`, `加${WORDS[miss].k}（${WORDS[miss].ro}）`),
      from: KL.trays[miss],
      to: s,
    };
  const extra = bw.tops.find(w => !tk.o.includes(w));
  if (extra)
    return {
      t: T("Take off what they didn't order", '把没点的配料拿掉'),
      from: bowlTopAt(s.x, s.y, 1, extra),
      to: KL.scrap,
    };
  return { t: T('Slide the bowl to the pass', '把碗滑到出餐口'), from: { x: s.x, y: s.y + 24 }, to: KL.pass };
}
export function hintCounter(): Hint | null {
  const fs = freeSeat(),
    seat = C.seats;
  if (NIGHTS[C.n - 1].door) {
    if (C.bye.length)
      return {
        t: T("They're leaving: see them off. ありがとうございました", '客人要走了：送客。ありがとうございました'),
        at: { x: C.bye[0].x, y: 160 },
      };
    const w = doorWant(),
      G = doorGroup();
    if (w) return { t: doorHint(w), at: { x: G[0].x, y: 200 } };
  }
  for (const s of seat) {
    const g = s.g;
    if (!g) continue;
    if (g.st === 'spicy')
      return {
        t: T(`Too spicy! Pour ${LOOKS[g.who].nm} some tea`, `太辣了！给${LOOKS[g.who].nm}倒杯茶`),
        from: CL.teapot,
        to: { x: cupX(s), y: CUPY - 10 },
        now: true,
      }; // new to everyone: shown at once
    if (s.bowl && s.bowl.refused)
      return {
        t: T('Wrong bowl: drag it back to the kitchen', '碗不对：拖回厨房'),
        from: { x: s.x, y: 362 },
        to: { x: 147, y: 280 },
      };
    if (g.st === 'ask')
      return {
        t: T(`${LOOKS[g.who].nm} is ready to order. Tap them`, `${LOOKS[g.who].nm} 要点单了。点一下`),
        at: { x: s.x + (painted() ? 96 : 58), y: painted() ? 140 : 148 },
        tap: true,
      };
  }
  for (let j = 0; j < C.pass.length; j++) {
    const b = C.pass[j],
      s = seat.find(s => s.g && s.g.st === 'order' && !s.bowl);
    if (s)
      return {
        t: T('Serve it: drag the bowl to the guest', '上菜：把碗拖给客人'),
        from: CL.pass[j % 2],
        to: { x: s.x, y: 360 },
      };
  }
  for (const s of seat) {
    const g = s.g;
    if (!g) continue;
    if (g.st === 'order' && !g.sent)
      return {
        t: T(
          `Say 「${g.o.map(w => WORDS[w].k).join('・')}」 to the cook (or tap Send ▶)`,
          `对厨师说「${g.o.map(w => WORDS[w].k).join('・')}」（或点发送 ▶）`,
        ),
        at: { x: s.x, y: 120 },
      };
    if (g.st === 'order' && !g.tea)
      return {
        t: T('While they wait: hold the teapot over their cup', '等的时候：把茶壶按在杯子上倒茶'),
        from: CL.teapot,
        to: { x: cupX(s), y: CUPY - 10 },
      };
  }
  for (const s of seat) {
    if (s.coins) return { t: T('Tap the coins', '点硬币收钱'), at: { x: s.x + 92, y: 384 }, tap: true };
    if (s.bowl && s.bowl.empty)
      return { t: T('Clear the bowl into the dishes', '把空碗收进洗碗盆'), from: { x: s.x, y: 362 }, to: CL.tub };
    if (s.dirty)
      return {
        t: T('Rub the counter clean with the cloth', '用抹布把台面擦干净'),
        from: CL.cloth,
        to: { x: s.x, y: 392 },
      };
  }
  if (C.queue.length && fs >= 0 && !NIGHTS[C.n - 1].door)
    return {
      t: T("Someone's waiting in the rain: drag them to the seat", '有人在雨里等：把他拖到座位上'),
      from: { x: C.queue[0].x, y: 240 },
      to: { x: C.seats[fs].x, y: 240 },
    };
  return null;
}
export let HINT = null;
G.hintK = '';
export function hintTick() {
  if (!G.NIGHT || G.NIGHT.ph !== 'run') {
    HINT = null;
  } else {
    const h = meCook() ? hintCook() : hintCounter(),
      teach = curTeach(),
      idle = G.clock - G.lastAct;
    HINT = h && (h.now || teach >= 2 || (teach === 1 && idle > 6) || idle > 14 || (!h.from && !h.at)) ? h : null;
  }
  const el_ = $('#hint'),
    k = HINT ? HINT.t : '';
  if (k !== G.hintK) {
    G.hintK = k;
    el_.hidden = !HINT;
    if (HINT) {
      el_.textContent = HINT.t;
      el_.classList.remove('pop');
      void el_.offsetWidth;
      el_.classList.add('pop');
      SFX.pop();
    }
  }
}
