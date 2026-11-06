// net/link.ts: one PeerJS data connection between two phones, used when Midnight Restaurant runs on its own page.
// (Inside 夜ふかし the hub page holds the connection instead and the game talks to (window.parent as any).HUBAPI.)
// The host registers kotoba-mres-<code>-h on the free PeerJS cloud server; the guest dials it, and dials again whenever the link drops.
// Reliable messages are numbered (q = 1, 2, 3…) and kept until the partner's heartbeat acknowledges them, so nothing is lost across a reconnect.
import { Peer } from 'peerjs';

const PFX = 'kotoba-mres-';
const now = () => performance.now();
const LS = {
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
  del(k) {
    try {
      localStorage.removeItem('mres_' + k);
    } catch (e) {}
  },
};
const L = {
  peer: null,
  conn: null,
  up: false,
  everUp: false,
  lastRx: 0,
  tx: 0,
  rx: 0,
  outQ: [],
  inst: Math.random().toString(36).slice(2, 10),
  pinst: null,
  code: '',
  side: '',
  dialing: false,
  dialT: 0,
  reconT: 0,
  opened: false,
  rejoin: false,
  tries: 0,
  onMsg: null,
  onState: null,
  mute: 0,
  buf: [],
};
const hostId = c => PFX + c.toLowerCase() + '-h';
const newCode = () =>
  Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
function emit(st, x?) {
  try {
    L.onState && L.onState(st, x);
  } catch (e) {
    setTimeout(() => {
      throw e;
    });
  }
}
function lraw(m) {
  if (L.conn && L.conn.open) {
    try {
      L.conn.send(m);
    } catch (e) {}
  }
}
function lsend(m, rel) {
  if (rel) {
    m.q = ++L.tx;
    L.outQ.push(m);
    if (L.outQ.length > 600) L.outQ.shift();
  }
  lraw(m);
}
function deliver(d) {
  if (L.onMsg) {
    try {
      L.onMsg(d);
    } catch (e) {
      setTimeout(() => {
        throw e;
      });
    }
  } else {
    L.buf.push(d);
    if (L.buf.length > 200) L.buf.shift();
  }
}
function onRaw(m) {
  if (!m || typeof m !== 'object' || now() < L.mute) return;
  L.lastRx = now();
  if (m.t === 'hi') {
    onHi(m);
    return;
  }
  if (!L.up && L.pinst) linkUp();
  if (m.t === 'hb') {
    while (L.outQ.length && L.outQ[0].q <= m.a) L.outQ.shift();
    return;
  }
  if (m.q != null) {
    if (m.q <= L.rx) return;
    if (m.q > L.rx + 1) {
      lraw({ t: 'rs' });
      return;
    }
    L.rx = m.q;
  }
  if (m.t === 'rs') {
    L.outQ.forEach(lraw);
    return;
  }
  if (m.t === 'bye') {
    emit('bye');
    leave(true);
    return;
  }
  if (m.t === 'g') deliver(m.d);
}
function onHi(m) {
  const fresh = !!L.pinst && L.pinst !== m.inst;
  L.pinst = m.inst;
  // the partner's page reloaded: number from 1 again, drop what was meant for the old page, and let the game start over
  if (fresh) {
    L.rx = 0;
    L.tx = 0;
    L.outQ = [];
  }
  linkUp();
  L.outQ.forEach(lraw);
  emit(fresh ? 'reset' : 'hello');
}
function linkUp() {
  if (L.up) return;
  L.up = true;
  L.everUp = true;
  LS.set('sess', { code: L.code, side: L.side, at: Date.now() });
  emit('up');
}
function linkDown() {
  if (!L.up) return;
  L.up = false;
  emit('down');
}
function adopt(c) {
  if (L.conn && L.conn !== c) {
    try {
      L.conn.close();
    } catch (e) {}
  }
  L.conn = c;
  L.dialing = false;
  L.lastRx = now();
  c.on('data', d => {
    if (L.conn === c) onRaw(d);
  });
  c.on('close', () => {
    if (L.conn === c) {
      L.conn = null;
      linkDown();
    }
  });
  c.on('error', () => {});
  lraw({ t: 'hi', inst: L.inst, v: 1 });
}
function newPeer() {
  const host = L.side === 'h';
  try {
    L.peer && L.peer.destroy();
  } catch (e) {}
  const P = new Peer(host ? hostId(L.code) : undefined, { debug: 0 });
  L.peer = P;
  L.opened = false;
  P.on('open', () => {
    if (L.peer !== P) return;
    L.opened = true;
    L.tries = 0;
    emit(host ? 'waiting' : 'joining');
    if (!host) dial();
  });
  P.on('connection', c => {
    if (!host || L.peer !== P) return;
    c.on('open', () => adopt(c));
  });
  P.on('error', e => {
    if (L.peer !== P) return;
    const t = e && e.type;
    if (t === 'peer-unavailable') {
      L.dialing = false;
      if (!L.everUp) emit('nohost');
      return;
    }
    if (t === 'unavailable-id') {
      if (host && !L.everUp && !L.rejoin) {
        L.code = newCode();
        emit('code', L.code);
      }
      setTimeout(
        () => {
          if (L.peer === P) newPeer();
        },
        L.rejoin ? 2500 : 200,
      );
      return;
    }
    if (t === 'browser-incompatible') {
      emit('error', 'browser');
      return;
    }
    // a lost signalling server is not fatal (the heartbeat reconnects); only a destroyed peer is rebuilt
    L.tries++;
    setTimeout(
      () => {
        if (L.peer === P && (P.destroyed || !L.opened)) newPeer();
      },
      Math.min(8000, 1500 * L.tries),
    );
  });
}
function dial() {
  const P = L.peer;
  if (!P || P.destroyed) {
    newPeer();
    return;
  }
  if (!L.opened || P.disconnected) return;
  if (now() - L.dialT < (L.dialing ? 7000 : 2500)) return;
  L.dialing = true;
  L.dialT = now();
  if (L.conn) {
    try {
      L.conn.close();
    } catch (e) {}
    L.conn = null;
  }
  const c = P.connect(hostId(L.code), { reliable: true });
  c.on('open', () => adopt(c));
  c.on('error', () => {
    L.dialing = false;
  });
}
setInterval(() => {
  if (!L.peer) return;
  const t = now();
  if (L.conn && L.conn.open) lraw({ t: 'hb', a: L.rx });
  const quiet = t - L.lastRx;
  if (L.up && quiet > 3500) linkDown();
  if (L.side === 'g' && L.opened && !L.up && (!L.conn || !L.conn.open || quiet > 7000)) dial();
  if (L.peer.disconnected && !L.peer.destroyed && t - L.reconT > 3000) {
    L.reconT = t;
    try {
      L.peer.reconnect();
    } catch (e) {}
  }
  if (L.up && Date.now() - ((LS.get('sess', {}) || {}).at || 0) > 30000)
    LS.set('sess', { code: L.code, side: L.side, at: Date.now() });
}, 700);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !L.peer) return;
  if (L.peer.disconnected && !L.peer.destroyed) {
    try {
      L.peer.reconnect();
    } catch (e) {}
  }
  if (L.side === 'g' && !L.up) dial();
});
function start(side, code, rejoin) {
  L.side = side;
  L.code = code || newCode();
  L.rejoin = !!rejoin;
  L.everUp = false;
  L.up = false;
  L.pinst = null;
  L.tx = 0;
  L.rx = 0;
  L.outQ = [];
  newPeer();
  return L.code;
}
function leave(quiet) {
  if (!quiet && L.up) lraw({ t: 'bye' });
  const P = L.peer;
  setTimeout(() => {
    try {
      P && P.destroy();
    } catch (e) {}
  }, 400);
  L.peer = null;
  L.conn = null;
  L.up = false;
  L.everUp = false;
  L.side = '';
  L.code = '';
  L.pinst = null;
  LS.del('sess');
}
export const LINK: any = {
  host: (code, rejoin) => start('h', code, rejoin),
  join: (code, rejoin) => start('g', code.toUpperCase(), rejoin),
  leave,
  // the game's end: its message handler and a state listener ('waiting','joining','nohost','up','down','hello','reset','bye','error')
  open(onMsg, onState) {
    L.onMsg = onMsg;
    L.onState = onState;
    const b = L.buf;
    L.buf = [];
    b.forEach(deliver);
  },
  send: (d, rel) => lsend({ t: 'g', d }, rel !== false),
  get code() {
    return L.code;
  },
  get side() {
    return L.side;
  },
  get up() {
    return L.up;
  },
  get everUp() {
    return L.everUp;
  },
  invite: () => location.origin + location.pathname.replace(/index\.html$/, '') + '#join=' + L.code,
  saved: () => {
    const s = LS.get('sess', null);
    return s && Date.now() - s.at < 12 * 3600e3 ? s : null;
  },
  __drop: () => {
    try {
      L.conn && L.conn.close();
    } catch (e) {}
  },
  __mute: ms => {
    L.mute = now() + ms;
  },
  __L: L,
};
// the tests reach it here too
(window as any).LINK = LINK;
