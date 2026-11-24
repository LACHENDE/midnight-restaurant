// しばBot: plays the other station when you practise
import { G } from './G';
import { C } from './night-state';
import { NIGHTS } from '../data/content';
import {
  cClear,
  cCollect,
  cRecv,
  cReturn,
  cSeat,
  cSend,
  cServe,
  cTake,
  cTea,
  cTell,
  cWipe,
  freeSeat,
  judge,
} from './counter';
import { hidden } from './tel';
import { cSay, doorWant } from './door';
import { rnd } from '../core/env';

export const BK = { q: [], busy: null };
export function botCookHear(m) {
  if (m.t === 'ticket') {
    if (!BK.q.some(x => x.cid === m.cid)) BK.q.push({ cid: m.cid, o: m.o.slice(), mod: m.mod || null });
  }
  if (m.t === 'gone') {
    BK.q = BK.q.filter(j => j.cid !== m.cid);
    if (BK.busy && BK.busy.cid === m.cid) BK.busy = null;
  }
  if (m.t === 'back') {
    BK.q = BK.q.filter(j => j.cid !== m.cid);
    if (BK.busy && BK.busy.cid === m.cid) {
      BK.busy.left = Math.min(BK.busy.left, 3);
      BK.busy.o = m.o.slice();
      BK.busy.mod = m.mod || null;
    } else BK.q.unshift({ cid: m.cid, o: m.o.slice(), mod: m.mod || null, fix: true });
  }
}
export function botCook(dt) {
  if (!BK.busy && BK.q.length) {
    const j = BK.q.shift(),
      left = j.fix ? 3 : rnd(6.5, 8.5);
    BK.busy = { ...j, left, dur: left };
  }
  if (BK.busy) {
    BK.busy.left -= dt;
    if (BK.busy.left <= 0) {
      const o = BK.busy.o,
        mod = BK.busy.mod,
        // かため: out early; やわらかめ: left in; otherwise the gold four times in ten
        nt = mod === 'katame' ? 4.6 : mod === 'yawa' ? 13 : Math.random() < 0.4 ? 6.4 : 8.6,
        noodles = nt < 5.5 ? 'ready' : nt < 7.5 ? 'perfect' : nt < 12 ? 'ready' : 'soft';
      BK.busy = null;
      cRecv({
        t: 'bowl',
        bowl: { id: ++G.BID, noodles, nt, broth: mod === 'oome' ? 1.02 : 0.9, tops: o.slice() },
      });
    }
  }
}
// where しばBot's hand went last (your window into the counter shows it)
export const BC = { t: 1, hx: 560, hy: 300, hat: -9 };
const at = (x, y) => {
  BC.hx = x;
  BC.hy = y;
  BC.hat = G.clock;
};
export function botCounter(dt) {
  BC.t -= dt;
  if (BC.t > 0) return;
  BC.t = rnd(0.7, 1.2);
  if (NIGHTS[C.n - 1].door) {
    if (C.bye.length) {
      at(860, 250);
      cSay('arigatou');
      return;
    }
    const w = doorWant();
    if (w && C.door.t > 0.6) {
      at(860, 250);
      cSay(w);
      return;
    }
  } else {
    const fs = freeSeat();
    if (C.queue.length && fs >= 0) {
      at(C.seats[fs].x, 300);
      cSeat(C.queue[0].id, fs);
      return;
    }
  }
  for (const s of C.seats) {
    const g = s.g;
    if (!g) continue;
    if (g.st === 'ask') {
      at(s.x, 210);
      cTake(s.i);
      return;
    }
    if (g.st === 'order' && !g.sent && g.t > 1.2) {
      at(s.x, 150);
      // a person is cooking: しばBot says the order out loud (伝言ラーメン), it doesn't write it on the ticket
      if (hidden()) cTell(s.i);
      else cSend(s.i);
      return;
    }
    if (s.bowl && s.bowl.refused && g.t > 1.2) {
      at(s.x, 362);
      cReturn(s.i);
      return;
    }
  }
  for (const s of C.seats) {
    const g = s.g;
    if (g && ((g.st === 'order' && !g.tea && g.t > 2.5) || (g.st === 'spicy' && g.t > 1.5))) {
      s.cup = 0.95;
      at(s.x + 70, 400);
      cTea(s.i, 0.01);
      return;
    }
  }
  for (let p = 0; p < C.pass.length; p++) {
    const b = C.pass[p];
    const si = C.seats.findIndex(s => s.g && s.g.st === 'order' && !s.bowl && judge(b, s.g.o, s.g.mod).ok);
    if (si >= 0) {
      at(C.seats[si].x, 362);
      cServe(p, si);
      return;
    }
    if (G.clock - b.at > 3) {
      const any = C.seats.findIndex(s => s.g && s.g.st === 'order' && !s.bowl);
      if (any >= 0) {
        at(C.seats[any].x, 362);
        cServe(p, any);
        return;
      }
    }
  }
  for (const s of C.seats) {
    if (s.coins) {
      at(s.x + 92, 390);
      cCollect(s.i);
      return;
    }
    if (s.bowl && s.bowl.empty) {
      at(s.x, 362);
      cClear(s.i);
      return;
    }
    if (s.dirty) {
      at(s.x, 392);
      cWipe(s.i, 1);
      return;
    }
  }
}
