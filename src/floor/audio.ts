// Sound: synthesized effects and a small lo-fi loop whose tempo climbs at rush hour. No files.
let AC: AudioContext | null = null, master: GainNode | null = null, noise: AudioBuffer | null = null, muted = false;
try { muted = localStorage.getItem('mfloor_mute') === '1'; } catch { /* private mode */ }
export const isMuted = () => muted;
export function setMuted(m: boolean) { muted = m; try { localStorage.setItem('mfloor_mute', m ? '1' : '0'); } catch { /* */ } if (master) master.gain.value = m ? 0 : 0.9; }
/** call from a tap: browsers only start sound after one */
export function wake() {
  try {
    if (!AC) { AC = new AudioContext(); master = AC.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(AC.destination);
      const n = AC.sampleRate, b = AC.createBuffer(1, n, n), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; noise = b; }
    if (AC.state === 'suspended') AC.resume();
  } catch { /* no audio */ }
}
function tone(f: number, dur: number, o: { type?: OscillatorType; v?: number; at?: number; f2?: number } = {}) {
  if (!AC || !master) return; const t = AC.currentTime + (o.at || 0), osc = AC.createOscillator(), g = AC.createGain();
  osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t); if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.v ?? 0.14, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master); osc.start(t); osc.stop(t + dur + 0.02);
}
function hiss(dur: number, f: number, v = 0.1, at = 0) {
  if (!AC || !master || !noise) return; const t = AC.currentTime + at, s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noise; fl.type = 'bandpass'; fl.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl).connect(g).connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur);
}
const SFX: Record<string, () => void> = {
  pick: () => tone(660, 0.07, { type: 'triangle', v: 0.1 }),
  drop: () => tone(440, 0.07, { type: 'triangle', v: 0.1 }),
  plop: () => { tone(300, 0.12, { f2: 120, v: 0.18 }); hiss(0.25, 1800, 0.05); },
  plate: () => { tone(520, 0.08, { type: 'triangle' }); tone(780, 0.1, { type: 'triangle', at: 0.06 }); },
  top: () => tone(990, 0.06, { type: 'square', v: 0.05 }),
  trash: () => hiss(0.2, 600, 0.12),
  wash: () => hiss(0.4, 2400, 0.08),
  ready: () => { tone(1320, 0.1); tone(1760, 0.14, { at: 0.08 }); },
  soft: () => tone(500, 0.12, { type: 'triangle', v: 0.08 }),
  burn: () => { tone(220, 0.25, { type: 'sawtooth', v: 0.08 }); tone(200, 0.3, { type: 'sawtooth', v: 0.08, at: 0.28 }); },
  good: () => { tone(880, 0.08); tone(1320, 0.12, { at: 0.07 }); },
  wrong: () => tone(180, 0.18, { type: 'square', v: 0.06 }),
  ticket: () => { hiss(0.08, 3000, 0.06); tone(700, 0.05, { type: 'square', v: 0.04, at: 0.05 }); },
  call: () => { tone(587, 0.1, { type: 'square', v: 0.06 }); tone(880, 0.14, { type: 'square', v: 0.06, at: 0.09 }); },
  seat: () => tone(523, 0.1, { type: 'triangle' }),
  coin: () => { tone(1568, 0.06, { type: 'square', v: 0.05 }); tone(2093, 0.12, { type: 'square', v: 0.05, at: 0.06 }); },
  combo: () => [0, 1, 2, 3].forEach(i => tone(523 * 2 ** (i / 4), 0.12, { type: 'triangle', at: i * 0.07 })),
  walkout: () => [0, 1, 2].forEach(i => tone(330 - i * 40, 0.25, { type: 'sawtooth', v: 0.07, at: i * 0.2 })),
  rush: () => { for (let i = 0; i < 4; i++) tone(i % 2 ? 660 : 880, 0.22, { type: 'square', v: 0.07, at: i * 0.24 }); },
  critic: () => { tone(392, 0.3, { type: 'sawtooth', v: 0.06 }); tone(370, 0.5, { type: 'sawtooth', v: 0.06, at: 0.3 }); },
  vip: () => [0, 4, 7, 12].forEach((s, i) => tone(523 * 2 ** (s / 12), 0.2, { type: 'triangle', at: i * 0.08 })),
  end: () => [0, 4, 7].forEach((s, i) => tone(392 * 2 ** (s / 12), 0.4, { type: 'triangle', at: i * 0.15 })),
  tick: () => tone(1200, 0.03, { type: 'square', v: 0.04 }),
};
export const sfx = (k: string) => { try { SFX[k]?.(); } catch { /* */ } };

// ---------- the loop: bass, a soft chord pluck and hats; faster at rush hour ----------
let timer = 0, next = 0, step = 0, bpm = 100;
const BASS = [110, 110, 146.8, 130.8], CHORD = [[220, 261.6, 329.6], [220, 261.6, 329.6], [293.7, 349.2, 440], [261.6, 329.6, 392]];
export function music(on: boolean, fast = false) {
  bpm = fast ? 132 : 100;
  if (!on) { clearInterval(timer); timer = 0; return; }
  if (timer || !AC) return;
  next = AC.currentTime + 0.05; step = 0;
  timer = window.setInterval(() => {
    if (!AC) return;
    while (next < AC.currentTime + 0.2) {
      const at = next - AC.currentTime, bar = Math.floor(step / 8) % 4, s = step % 8;
      if (s === 0 || s === 4) tone(BASS[bar], 0.22, { type: 'triangle', v: 0.09, at });
      if (s % 2 === 1) hiss(0.04, 7000, 0.025, at);
      if (s === 2 || s === 6) CHORD[bar].forEach(f => tone(f, 0.18, { type: 'sine', v: 0.025, at }));
      next += 60 / bpm / 2; step++;
    }
  }, 50);
}
