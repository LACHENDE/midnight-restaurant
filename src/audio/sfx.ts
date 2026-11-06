// sound: synthesized, no files

export let AC = null,
  MG = null,
  NOISE = null,
  RAIN = null,
  BOIL = null;
export function audio() {
  try {
    if (!AC) {
      AC = new (window.AudioContext || (window as any).webkitAudioContext)();
      MG = AC.createGain();
      MG.gain.value = 0.85;
      MG.connect(AC.destination);
      const n = AC.sampleRate * 2,
        b = AC.createBuffer(1, n, AC.sampleRate),
        d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      NOISE = b;
      loops();
    }
    if (AC.state === 'suspended') AC.resume();
  } catch (e) {}
}
export function nz(dur, o: any = {}) {
  if (!AC) return;
  try {
    const t = AC.currentTime + (o.at || 0),
      s = AC.createBufferSource(),
      f = AC.createBiquadFilter(),
      g = AC.createGain();
    s.buffer = NOISE;
    s.loop = true;
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    f.Q.value = o.q || 1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.g || 0.2, t + (o.a || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(MG);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
  } catch (e) {}
}
export function tn(fr, dur, o: any = {}) {
  if (!AC) return;
  try {
    const t = AC.currentTime + (o.at || 0),
      s = AC.createOscillator(),
      g = AC.createGain();
    s.type = o.type || 'sine';
    s.frequency.setValueAtTime(fr, t);
    if (o.f2) s.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.g || 0.1, t + (o.a || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(g);
    g.connect(MG);
    s.start(t);
    s.stop(t + dur + 0.05);
  } catch (e) {}
}
export function loops() {
  try {
    // rain on the awning, and the boiling pot (only the kitchen hears that one)
    const r = AC.createBufferSource(),
      hp = AC.createBiquadFilter(),
      lp = AC.createBiquadFilter(),
      rg = AC.createGain();
    r.buffer = NOISE;
    r.loop = true;
    hp.type = 'highpass';
    hp.frequency.value = 500;
    lp.type = 'lowpass';
    lp.frequency.value = 3000;
    rg.gain.value = 0.05;
    r.connect(hp);
    hp.connect(lp);
    lp.connect(rg);
    rg.connect(MG);
    r.start();
    RAIN = rg;
    const b = AC.createBufferSource(),
      bf = AC.createBiquadFilter(),
      bg = AC.createGain();
    b.buffer = NOISE;
    b.loop = true;
    bf.type = 'lowpass';
    bf.frequency.value = 260;
    bg.gain.value = 0.0001;
    b.connect(bf);
    bf.connect(bg);
    bg.connect(MG);
    b.start();
    BOIL = bg;
  } catch (e) {}
}
export const SFX = {
  plop() {
    tn(240, 0.16, { f2: 90, g: 0.2 });
    nz(0.1, { type: 'lowpass', f: 900, g: 0.12 });
  },
  splash() {
    nz(0.3, { type: 'highpass', f: 1500, g: 0.1 });
  },
  pour() {
    nz(0.3, { f: 1400, f2: 800, q: 1.4, g: 0.07, a: 0.04 });
  },
  land() {
    tn(520, 0.07, { type: 'triangle', g: 0.08 });
    nz(0.05, { type: 'lowpass', f: 800, g: 0.12 });
  },
  clink() {
    tn(2650, 0.25, { g: 0.05 });
    tn(3720, 0.18, { g: 0.03, at: 0.01 });
  },
  slide() {
    nz(0.35, { f: 700, f2: 1600, q: 0.7, g: 0.1, a: 0.04 });
    tn(2200, 0.2, { g: 0.03, at: 0.3 });
  },
  bell() {
    tn(1568, 0.8, { g: 0.07 });
    tn(2349, 0.6, { g: 0.035 });
  },
  coins() {
    [2600, 3150, 2900].forEach((f, i) => tn(f, 0.22, { g: 0.05, at: i * 0.06 }));
  },
  happy() {
    tn(660, 0.12, { type: 'triangle', g: 0.07 });
    tn(880, 0.16, { type: 'triangle', g: 0.07, at: 0.08 });
    tn(1320, 0.22, { type: 'triangle', g: 0.05, at: 0.16 });
  },
  hmm() {
    tn(300, 0.16, { type: 'triangle', g: 0.06, f2: 240 });
    tn(240, 0.2, { type: 'triangle', g: 0.05, at: 0.16, f2: 200 });
  },
  grab() {
    tn(440, 0.05, { type: 'triangle', g: 0.04 });
  },
  wipe() {
    nz(0.18, { f: 1300, q: 0.7, g: 0.06, a: 0.03 });
  },
  sparkle() {
    [1760, 2349, 2793].forEach((f, i) => tn(f, 0.3, { g: 0.03, at: i * 0.05 }));
  },
  tick() {
    tn(1100, 0.04, { type: 'square', g: 0.03 });
  },
  pop() {
    tn(880, 0.08, { g: 0.05 });
  },
  ding() {
    tn(1318, 0.5, { g: 0.06 });
    tn(1975, 0.4, { g: 0.03, at: 0.05 });
  },
  open() {
    [523, 659, 784].forEach((f, i) => tn(f, 0.5, { type: 'triangle', g: 0.06, at: i * 0.12 }));
  },
  close() {
    [784, 659, 523, 392].forEach((f, i) => tn(f, 0.7, { type: 'triangle', g: 0.06, at: i * 0.16 }));
  },
};
export const buzz = ms => {
  try {
    navigator.vibrate && navigator.vibrate(ms);
  } catch (e) {}
};
