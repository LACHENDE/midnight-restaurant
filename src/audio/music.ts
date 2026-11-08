// the song: 「まよなかの雨」 (Midnight Rain), a lo-fi city-pop loop, synthesized live (no files)
// Each night has its own key and chord progression. Menus get a calm, muffled version; play gets the full groove;
// when it gets busy the tempo climbs and a shaker joins. Stingers (a good bowl, a new word, opening, closing)
// are in the song's key and land on the beat.
import { AC, MG, NOISE, SFX } from './sfx';
import { store } from '../core/env';

type Hit = [number, number, number]; // [16th step, midi note, length in 16ths]
type Bar = { b: number; c: number[]; b2?: number; c2?: number[] }; // bass, chord voicing, optional second half
type Song = { bpm: number; bars: Bar[]; mel: Hit[][]; pent: number[] };

// 1 · First night (D major): Gmaj9, F#m7, Em9, A7sus4 to A7 (IV, iii, ii, V)
// 2 · A busier night (F major): Bbmaj7, A7b13, Dm9, Cm7 to F7 (the classic city-pop turn)
// 3 · At the door (Eb major): Abmaj7, Bb9, Gm7, Cm9 (the J-pop "royal road", IV V iii vi)
const SONGS: Song[] = [
  {
    bpm: 80,
    pent: [62, 64, 66, 69, 71],
    bars: [
      { b: 43, c: [59, 62, 66, 69] },
      { b: 42, c: [57, 61, 64, 66] },
      { b: 40, c: [55, 59, 62, 66] },
      { b: 45, c: [55, 62, 64, 69], b2: 45, c2: [55, 61, 64, 67] },
    ],
    mel: [
      [
        [0, 78, 3],
        [3, 76, 3],
        [6, 74, 4],
        [12, 76, 2],
        [14, 78, 2],
      ],
      [
        [0, 81, 6],
        [8, 78, 2],
        [10, 76, 2],
        [12, 73, 4],
      ],
      [
        [0, 74, 3],
        [3, 76, 3],
        [6, 78, 6],
        [12, 79, 2],
        [14, 78, 2],
      ],
      [
        [0, 76, 8],
        [10, 73, 2],
        [12, 76, 4],
      ],
      [
        [0, 78, 3],
        [3, 76, 3],
        [6, 74, 4],
        [12, 76, 2],
        [14, 78, 2],
      ],
      [
        [0, 81, 3],
        [3, 83, 3],
        [6, 81, 4],
        [12, 78, 4],
      ],
      [
        [0, 79, 2],
        [2, 78, 2],
        [4, 76, 4],
        [8, 74, 6],
      ],
      [
        [0, 76, 4],
        [4, 73, 4],
        [8, 74, 8],
      ],
    ],
  },
  {
    bpm: 88,
    pent: [65, 67, 69, 72, 74],
    bars: [
      { b: 46, c: [58, 62, 65, 69] },
      { b: 45, c: [55, 61, 65, 69] },
      { b: 50, c: [57, 60, 64, 65] },
      { b: 48, c: [58, 63, 67, 70], b2: 41, c2: [57, 63, 65, 69] },
    ],
    mel: [
      [
        [0, 74, 2],
        [2, 77, 2],
        [4, 81, 4],
        [10, 79, 2],
        [12, 77, 4],
      ],
      [
        [0, 76, 6],
        [6, 73, 2],
        [8, 76, 2],
        [10, 77, 2],
        [12, 76, 4],
      ],
      [
        [0, 74, 3],
        [3, 77, 3],
        [6, 81, 3],
        [9, 79, 3],
        [12, 77, 4],
      ],
      [
        [0, 79, 4],
        [4, 75, 4],
        [8, 77, 8],
      ],
      [
        [0, 81, 2],
        [2, 84, 4],
        [8, 82, 2],
        [10, 81, 2],
        [12, 79, 4],
      ],
      [
        [0, 76, 4],
        [4, 77, 2],
        [6, 79, 2],
        [8, 76, 8],
      ],
      [
        [0, 77, 2],
        [2, 74, 2],
        [4, 72, 4],
        [8, 74, 4],
        [12, 77, 4],
      ],
      [
        [0, 79, 3],
        [3, 77, 3],
        [6, 75, 2],
        [8, 77, 8],
      ],
    ],
  },
  {
    bpm: 84,
    pent: [63, 65, 67, 70, 72],
    bars: [
      { b: 44, c: [55, 60, 63, 67] },
      { b: 46, c: [56, 60, 62, 65] },
      { b: 43, c: [58, 62, 65, 70] },
      { b: 48, c: [58, 62, 63, 67] },
    ],
    mel: [
      [
        [0, 79, 3],
        [3, 77, 3],
        [6, 75, 4],
        [12, 77, 2],
        [14, 79, 2],
      ],
      [
        [0, 82, 6],
        [8, 79, 2],
        [10, 77, 2],
        [12, 74, 4],
      ],
      [
        [0, 74, 2],
        [2, 77, 2],
        [4, 79, 4],
        [8, 82, 4],
        [12, 79, 4],
      ],
      [
        [0, 79, 8],
        [8, 75, 4],
        [12, 77, 4],
      ],
      [
        [0, 79, 3],
        [3, 82, 3],
        [6, 84, 6],
        [12, 82, 4],
      ],
      [
        [0, 80, 4],
        [4, 79, 4],
        [8, 77, 8],
      ],
      [
        [0, 77, 2],
        [2, 79, 2],
        [4, 82, 4],
        [8, 79, 4],
        [12, 77, 4],
      ],
      [
        [0, 75, 6],
        [6, 74, 2],
        [8, 75, 8],
      ],
    ],
  },
];

export type Mood = 'off' | 'calm' | 'play' | 'rush';
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
let bus: GainNode | null = null,
  tone: BiquadFilterNode | null = null,
  echo: GainNode | null = null,
  timer = 0,
  next = 0,
  step = 0,
  bpm = 80,
  song = 0,
  mood: Mood = 'off',
  muted = !!store.get('musicOff', false),
  seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const musicMuted = () => muted;
const LEVEL = { off: 0, calm: 0.5, play: 0.62, rush: 0.68 };

function build() {
  if (bus || !AC) return;
  bus = AC.createGain();
  bus.gain.value = 0;
  tone = AC.createBiquadFilter(); // the "through the wall" filter: closed on menus, open at play
  tone.type = 'lowpass';
  tone.frequency.value = 900;
  tone.Q.value = 0.4;
  bus.connect(tone);
  tone.connect(MG);
  // a soft echo for the melody and the keys
  const d = AC.createDelay(1),
    fb = AC.createGain(),
    lp = AC.createBiquadFilter();
  echo = AC.createGain();
  echo.gain.value = 0.22;
  d.delayTime.value = (60 / 80) * 0.75;
  fb.gain.value = 0.32;
  lp.type = 'lowpass';
  lp.frequency.value = 1800;
  echo.connect(d);
  d.connect(lp);
  lp.connect(fb);
  fb.connect(d);
  lp.connect(bus);
}
function env(t: number, peak: number, a: number, dur: number) {
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  return g;
}
function osc(type: OscillatorType, f: number, t: number, dur: number, g: GainNode, detune = 0) {
  const o = AC.createOscillator();
  o.type = type;
  o.frequency.value = f;
  o.detune.value = detune;
  o.connect(g);
  o.start(t);
  o.stop(t + dur + 0.05);
  return o;
}
// an electric piano: a warm body plus a quieter bell tine an octave up that fades first
function keys(m: number, t: number, dur: number, v: number, wet = true) {
  const g = env(t, v, 0.012, dur),
    tine = env(t, v * 0.35, 0.004, Math.min(dur, 0.5));
  osc('sine', hz(m), t, dur, g);
  osc('triangle', hz(m), t, dur, g, 6);
  osc('sine', hz(m + 12), t, dur, tine, -4);
  g.connect(bus);
  tine.connect(bus);
  if (wet) g.connect(echo);
}
function bass(m: number, t: number, dur: number, v: number) {
  const g = env(t, v, 0.01, dur),
    f = AC.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(700, t);
  f.frequency.exponentialRampToValueAtTime(220, t + dur);
  osc('triangle', hz(m), t, dur, g);
  osc('sine', hz(m - 12), t, dur, g);
  g.connect(f);
  f.connect(bus);
}
// the lead: a breathy flute-ish voice with a slow vibrato
function lead(m: number, t: number, dur: number, v: number, box = false) {
  const g = env(t, v, box ? 0.004 : 0.04, dur + (box ? 0.4 : 0.1)),
    o = osc(box ? 'sine' : 'triangle', hz(m), t, dur + 0.4, g);
  if (!box) {
    const lfo = AC.createOscillator(),
      lg = AC.createGain();
    lfo.frequency.value = 5;
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(6, t + Math.min(0.4, dur));
    lfo.connect(lg);
    lg.connect(o.detune);
    lfo.start(t);
    lfo.stop(t + dur + 0.5);
  }
  g.connect(bus);
  g.connect(echo);
}
function noise(t: number, dur: number, type: BiquadFilterType, f: number, v: number) {
  const s = AC.createBufferSource(),
    fl = AC.createBiquadFilter(),
    g = env(t, v, 0.002, dur);
  s.buffer = NOISE;
  fl.type = type;
  fl.frequency.value = f;
  s.connect(fl);
  fl.connect(g);
  g.connect(bus);
  s.start(t, Math.random() * 1.5);
  s.stop(t + dur + 0.05);
}
function kick(t: number, v: number) {
  const g = env(t, v, 0.003, 0.32),
    o = osc('sine', 120, t, 0.32, g);
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
  g.connect(bus);
}
function snare(t: number, v: number) {
  noise(t, 0.16, 'bandpass', 1900, v);
  const g = env(t, v * 0.5, 0.002, 0.08);
  osc('triangle', 190, t, 0.08, g);
  g.connect(bus);
}

// one 16th note of the song
function play(t: number, s: number) {
  const S = SONGS[song],
    s16 = s % 16,
    barN = Math.floor(s / 16),
    bar = S.bars[barN % 4],
    half = s16 >= 8 && bar.c2,
    chord = half ? bar.c2! : bar.c,
    root = half ? bar.b2! : bar.b,
    sec = Math.floor(barN / 8) % 2, // 0: the tune, 1: a looser second half (the keys take a little solo)
    st = 60 / bpm / 4,
    calm = mood === 'calm',
    rush = mood === 'rush';
  // drums: lazy and behind the beat; none on menus
  if (!calm) {
    if (s16 === 0 || s16 === 10 || (rush && s16 === 7)) kick(t, 0.32);
    if (s16 === 4 || s16 === 12) snare(t, 0.09);
    if (s16 % 2 === 0) noise(t, s16 === 14 ? 0.18 : 0.035, 'highpass', 7500, s16 % 4 ? 0.022 : 0.03);
    if (rush && s16 % 2 === 1) noise(t, 0.03, 'highpass', 9000, 0.012);
    // vinyl crackle, very quiet
    if (rnd() < 0.18) noise(t, 0.008, 'highpass', 3000, 0.02);
  }
  // bass: root, a pickup, and a chromatic walk into the next chord
  const nxt = S.bars[(barN + 1) % 4].b;
  if (calm) {
    if (s16 === 0 || (half && s16 === 8)) bass(root, t, st * 14, 0.14);
  } else {
    if (s16 === 0 || (bar.c2 && s16 === 8)) bass(root, t, st * 5, 0.2);
    else if (s16 === 6 && !bar.c2) bass(root + 12, t, st * 1.5, 0.12);
    else if (s16 === 10 && !bar.c2) bass(root + 7, t, st * 3, 0.15);
    else if (s16 === 14) bass(nxt + (nxt > root ? -1 : 1), t, st * 2, 0.15);
  }
  // keys: a long chord on the one, a pushed stab before the next bar
  if (s16 === 0 || (bar.c2 && s16 === 8)) {
    const roll = calm ? 0.03 : 0.012;
    chord.forEach((m, i) => keys(m, t + i * roll, st * (calm ? 15 : 7), calm ? 0.032 : 0.028));
  } else if (!calm && !bar.c2 && s16 === 11) chord.forEach(m => keys(m, t, st * 2.5, 0.02, false));
  // the tune
  if (sec === 0) {
    for (const [at, m, len] of S.mel[barN % 8])
      if (at === s16) {
        if (calm)
          lead(m + 12, t, st * len * 0.6, 0.022, true); // a music box on menus
        else lead(m, t, st * len * 0.92, 0.05);
      }
  } else if (!calm && s16 % 2 === 0 && rnd() < (s16 % 4 ? 0.22 : 0.4)) {
    // a little improvised fill on the keys, from the night's pentatonic scale
    keys(S.pent[Math.floor(rnd() * 5)] + 12 * (rnd() < 0.5 ? 1 : 0), t, st * 2, 0.026);
  } else if (calm && s16 === 8 && rnd() < 0.5) {
    lead(S.pent[Math.floor(rnd() * 5)] + 24, t, st * 2, 0.018, true);
  }
}
function schedule() {
  if (!AC || !bus) return;
  const now = AC.currentTime;
  if (next < now - 0.1) next = now + 0.05; // the tab slept: pick up again instead of rushing to catch up
  while (next < now + 0.18) {
    const swing = step % 2 ? (60 / bpm / 4) * 0.28 : 0; // lo-fi swing on the off 16ths
    try {
      play(next + swing, step);
    } catch (e) {}
    next += 60 / bpm / 4;
    step++;
  }
}

/** which night's song, and how busy it feels; cheap to call every frame */
export function setMusic(m: Mood, night = song + 1) {
  if (!AC) return;
  build();
  const n = Math.max(0, Math.min(SONGS.length - 1, night - 1));
  if (n !== song) {
    song = n;
    step = 0; // a new night starts its song from the top
  }
  const target = SONGS[song].bpm + (m === 'calm' ? -10 : m === 'rush' ? 14 : 0);
  if (m === mood && bpm === target) return;
  const was = mood;
  mood = m;
  const t = AC.currentTime;
  bus.gain.cancelScheduledValues(t);
  bus.gain.setTargetAtTime(muted ? 0 : LEVEL[m], t, 0.6);
  tone.frequency.cancelScheduledValues(t);
  tone.frequency.setTargetAtTime(m === 'calm' ? 1000 : m === 'rush' ? 9000 : 6000, t, 0.8);
  // ease the tempo instead of jumping
  const ease = () => {
    if (Math.abs(bpm - target) < 0.6) bpm = target;
    else {
      bpm += (target - bpm) * 0.15;
      setTimeout(ease, 120);
    }
  };
  ease();
  if (m === 'off') {
    clearInterval(timer);
    timer = 0;
  } else if (!timer) {
    if (was === 'off') {
      next = AC.currentTime + 0.1;
      step = 0;
    }
    timer = window.setInterval(schedule, 25);
  }
}
export function toggleMusic() {
  muted = !muted;
  store.set('musicOff', muted);
  if (bus && AC) bus.gain.setTargetAtTime(muted ? 0 : LEVEL[mood], AC.currentTime, 0.2);
  return muted;
}

// stingers: in the song's key, on the next 8th; without the music on, the old sound effect plays
const FALLBACK = { open: 'open', close: 'close', word: 'open', good: 'happy', oops: 'hmm' };
export function cue(k: keyof typeof FALLBACK) {
  if (!AC || !bus || mood === 'off' || muted) return SFX[FALLBACK[k]]?.();
  const S = SONGS[song],
    st = 60 / bpm / 4,
    now = AC.currentTime,
    at = Math.max(now + 0.01, step % 2 ? next + st : next), // the next 8th note the scheduler hasn't played yet
    P = S.pent,
    bar = S.bars[Math.floor(step / 16) % 4];
  try {
    if (k === 'good') bar.c.slice(1).forEach((m, i) => lead(m + 12, at + i * st, st * 2, 0.03, true));
    else if (k === 'word') [0, 1, 2, 3, 4].forEach(i => lead(P[i] + 12, at + i * st * 0.75, st * 1.5, 0.028, true));
    else if (k === 'oops') [P[2] + 12, P[1] + 12].forEach((m, i) => lead(m, at + i * st * 2, st * 2, 0.025, true));
    else if (k === 'open')
      [0, 2, 4, 5, 7].forEach((i, j) => lead(P[i % 5] + 12 * (i >= 5 ? 1 : 0) + 12, at + j * st, st * 3, 0.03, true));
    else if (k === 'close') {
      // a soft plagal ending: IV maj7 then I maj9, rolled
      const I = P[0],
        IV = [I + 5, I + 9, I + 12, I + 16],
        Imaj = [I, I + 4, I + 7, I + 11, I + 14];
      IV.forEach((m, i) => keys(m, at + i * 0.04, 1.2, 0.035));
      Imaj.forEach((m, i) => keys(m, at + 0.9 + i * 0.05, 2.6, 0.035));
      lead(I + 24, at + 0.9, 1.6, 0.03, true);
    }
  } catch (e) {}
}
