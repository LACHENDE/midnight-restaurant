// しばBot: plays the other station when you practise
import { G } from './G';
import { C } from './night-state';
import { NIGHTS } from '../data/content';
import { cClear, cCollect, cRecv, cReturn, cSeat, cSend, cServe, cTake, cTea, cWipe, freeSeat, judge } from './counter';
import { cSay, doorWant } from './door';
import { rnd } from '../core/env';

export const BK = { q: [], busy: null };
export function botCookHear(m) {
  if (m.t === 'ticket') {
    if (!BK.q.some(x => x.cid === m.cid)) BK.q.push({ cid: m.cid, o: m.o.slice() });
  }
  if (m.t === 'back') {
    BK.q = BK.q.filter(j => j.cid !== m.cid);
    if (BK.busy && BK.busy.cid === m.cid) {
      BK.busy.left = Math.min(BK.busy.left, 3);
      BK.busy.o = m.o.slice();
    } else BK.q.unshift({ cid: m.cid, o: m.o.slice(), fix: true });
  }
}
export function botCook(dt) {
  if (!BK.busy && BK.q.length) {
    const j = BK.q.shift();
    BK.busy = { ...j, left: j.fix ? 3 : rnd(6.5, 8.5) };
  }
  if (BK.busy) {
    BK.busy.left -= dt;
    if (BK.busy.left <= 0) {
      const o = BK.busy.o;
      BK.busy = null;
      cRecv({ t: 'bowl', bowl: { id: ++G.BID, noodles: 'ready', broth: 0.9, tops: o.slice() } });
    }
  }
}
export const BC = { t: 1 };
export function botCounter(dt) {
  BC.t -= dt;
  if (BC.t > 0) return;
  BC.t = rnd(0.7, 1.2);
  if (NIGHTS[C.n - 1].door) {
    if (C.bye.length) {
      cSay('arigatou');
      return;
    }
    const w = doorWant();
    if (w && C.door.t > 0.6) {
      cSay(w);
      return;
    }
  } else {
    const fs = freeSeat();
    if (C.queue.length && fs >= 0) {
      cSeat(C.queue[0].id, fs);
      return;
    }
  }
  for (const s of C.seats) {
    const g = s.g;
    if (!g) continue;
    if (g.st === 'ask') {
      cTake(s.i);
      return;
    }
    if (g.st === 'order' && !g.sent && g.t > 1.2) {
      cSend(s.i);
      return;
    }
    if (s.bowl && s.bowl.refused && g.t > 1.2) {
      cReturn(s.i);
      return;
    }
  }
  for (const s of C.seats) {
    const g = s.g;
    if (g && ((g.st === 'order' && !g.tea && g.t > 2.5) || (g.st === 'spicy' && g.t > 1.5))) {
      s.cup = 0.95;
      cTea(s.i, 0.01);
      return;
    }
  }
  for (let p = 0; p < C.pass.length; p++) {
    const b = C.pass[p];
    const si = C.seats.findIndex(s => s.g && s.g.st === 'order' && !s.bowl && judge(b, s.g.o).ok);
    if (si >= 0) {
      cServe(p, si);
      return;
    }
    if (G.clock - b.at > 3) {
      const any = C.seats.findIndex(s => s.g && s.g.st === 'order' && !s.bowl);
      if (any >= 0) {
        cServe(p, any);
        return;
      }
    }
  }
  for (const s of C.seats) {
    if (s.coins) {
      cCollect(s.i);
      return;
    }
    if (s.bowl && s.bowl.empty) {
      cClear(s.i);
      return;
    }
    if (s.dirty) {
      cWipe(s.i, 1);
      return;
    }
  }
}
