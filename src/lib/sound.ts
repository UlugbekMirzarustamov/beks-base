/**
 * Cozy background sound, made live with the Web Audio API — no sound files needed.
 * Four channels you can mix, each with its own volume: rain, fire, wind and the
 * lo-fi cabin radio (a slow, soft piano beat that is composed live, so it never repeats exactly).
 * Browsers only allow sound after you tap something, so it starts from a tap.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null; // very old browser: just stay silent
  }
}

/** A buffer of random noise. Brown noise is deeper (good for fire), white is hissy (good for rain). */
function noise(ac: AudioContext, seconds: number, kind: 'white' | 'brown'): AudioBuffer {
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * seconds), ac.sampleRate);
  const ch = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < ch.length; i++) {
    const white = Math.random() * 2 - 1;
    if (kind === 'white') ch[i] = white;
    else {
      last = (last + 0.02 * white) / 1.02;
      ch[i] = last * 3.5;
    }
  }
  return buffer;
}

export type Channel = 'rain' | 'fire' | 'wind' | 'lofi';

/** Loudest volume of each channel (they sound balanced at the same mixer level). */
const MAX_GAIN: Record<Channel, number> = { rain: 0.28, fire: 0.75, wind: 0.45, lofi: 0.6 };
/** Mixer levels go from 0 (off) to 8 (loudest). */
export const MAX_LEVEL = 8;

interface Running {
  gain: GainNode;
  stop: () => void;
}
const running: Partial<Record<Channel, Running>> = {};

const midiHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/**
 * The lo-fi radio: 72 beats a minute, four warm jazzy chords (Fmaj7 → Em7 → Dm7 → Cmaj7),
 * a lazy melody that picks notes at random from a soft scale, a gentle kick and hat,
 * and vinyl crackle. Notes are scheduled a little ahead so the timing stays smooth.
 */
function buildLofi(ac: AudioContext, out: GainNode): () => void {
  const warm = ac.createBiquadFilter(); // everything goes through a soft "old radio" filter
  warm.type = 'lowpass';
  warm.frequency.value = 2400;
  warm.connect(out);

  const CHORDS = [
    [53, 57, 60, 64],
    [52, 55, 59, 62],
    [50, 53, 57, 60],
    [48, 52, 55, 59],
  ];
  const BASS = [41, 40, 38, 36];
  const MELODY = [69, 72, 74, 76, 79, 81]; // A C D E G A — always sounds calm over these chords
  const beat = 60 / 72;
  const eighth = beat / 2;

  /** A soft electric-piano note (two sine waves, one a little out of tune, fading slowly). */
  const keys = (n: number, t: number, len: number, vol: number) => {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    g.connect(warm);
    for (const detune of [-4, 5]) {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = midiHz(n);
      o.detune.value = detune;
      o.connect(g);
      o.start(t);
      o.stop(t + len + 0.05);
    }
  };
  const kick = (t: number) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(warm);
    o.start(t);
    o.stop(t + 0.32);
  };
  const hatNoise = noise(ac, 0.05, 'white');
  const hat = (t: number, vol: number) => {
    const src = ac.createBufferSource();
    src.buffer = hatNoise;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6500;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(hp).connect(g).connect(out);
    src.start(t);
  };

  // Vinyl: a very quiet hiss bed + random little pops.
  const vinyl = ac.createBufferSource();
  vinyl.buffer = noise(ac, 2, 'white');
  vinyl.loop = true;
  const vinylF = ac.createBiquadFilter();
  vinylF.type = 'bandpass';
  vinylF.frequency.value = 3000;
  const vinylG = ac.createGain();
  vinylG.gain.value = 0.012;
  vinyl.connect(vinylF).connect(vinylG).connect(out);
  vinyl.start();

  let step = 0; // eighth notes since the start
  let next = ac.currentTime + 0.1;
  let lastNote = 2;
  const schedule = () => {
    while (next < ac.currentTime + 0.4) {
      const inBar = step % 8;
      const bar = Math.floor(step / 8) % CHORDS.length;
      const swing = step % 2 ? eighth * 0.16 : 0; // lazy, swung off-beats
      const t = next + swing;
      if (inBar === 0) {
        CHORDS[bar].forEach((n, i) => keys(n, t + i * 0.018, beat * 3.6, 0.045)); // a slightly rolled chord
        keys(BASS[bar], t, beat * 1.8, 0.09);
        kick(t);
      }
      if (inBar === 5) {
        CHORDS[bar].slice(1).forEach((n) => keys(n, t, beat * 1.4, 0.025));
        kick(t);
      }
      if (inBar === 4) keys(BASS[bar] + 7, t, beat * 1.5, 0.06);
      if (inBar === 2 || inBar === 6) hat(t, 0.05); // brushed "snare"
      else hat(t, 0.015);
      // Melody: wanders up and down the scale, resting about half the time.
      if (Math.random() < (inBar % 2 ? 0.25 : 0.45)) {
        lastNote = Math.max(0, Math.min(MELODY.length - 1, lastNote + Math.round((Math.random() - 0.5) * 3)));
        keys(MELODY[lastNote], t, beat * 1.2, 0.03);
      }
      if (Math.random() < 0.18) hat(t + Math.random() * eighth, 0.01); // vinyl pop
      next += eighth;
      step++;
    }
  };
  schedule();
  const timer = setInterval(schedule, 100);
  return () => {
    clearInterval(timer);
    vinyl.stop();
  };
}

/** Build one channel's sound, feeding into `out`. Returns a function that stops it. */
function build(ac: AudioContext, kind: Channel, out: GainNode): () => void {
  if (kind === 'lofi') return buildLofi(ac, out);
  const bed = ac.createBufferSource();
  bed.buffer = noise(ac, 3, kind === 'rain' ? 'white' : 'brown');
  bed.loop = true;
  const filter = ac.createBiquadFilter();
  const stops: (() => void)[] = [() => bed.stop()];

  if (kind === 'rain') {
    // rain = soft, hissy noise
    filter.type = 'lowpass';
    filter.frequency.value = 1300;
    bed.connect(filter).connect(out);
  } else if (kind === 'fire') {
    // fire = deep rumble + random little crackles
    filter.type = 'lowpass';
    filter.frequency.value = 450;
    bed.connect(filter).connect(out);
    const pop = noise(ac, 0.03, 'white');
    let timer: ReturnType<typeof setTimeout>;
    const crackle = () => {
      const src = ac.createBufferSource();
      src.buffer = pop;
      const hp = ac.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800 + Math.random() * 2000;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.05 + Math.random() * 0.15, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05);
      src.connect(hp).connect(g).connect(out);
      src.start();
      timer = setTimeout(crackle, 60 + Math.random() * 500);
    };
    crackle();
    stops.push(() => clearTimeout(timer));
  } else {
    // wind = deep noise through a moving filter, slowly swelling and fading ("whoosh")
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 0.8;
    const swell = ac.createGain();
    swell.gain.value = 0.6;
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoDepth = ac.createGain();
    lfoDepth.gain.value = 0.4;
    lfo.connect(lfoDepth).connect(swell.gain);
    const sweep = ac.createOscillator();
    sweep.frequency.value = 0.07;
    const sweepDepth = ac.createGain();
    sweepDepth.gain.value = 250;
    sweep.connect(sweepDepth).connect(filter.frequency);
    bed.connect(filter).connect(swell).connect(out);
    lfo.start();
    sweep.start();
    stops.push(() => lfo.stop(), () => sweep.stop());
  }
  bed.start();
  return () => stops.forEach((s) => s());
}

/**
 * Set one channel's volume (0 = off … 8 = loudest), fading smoothly.
 * Must first be called from a tap/click (browser rule for sound).
 */
export function setChannel(kind: Channel, level: number): void {
  const ac = audio();
  if (!ac) return;
  const target = level <= 0 ? 0 : MAX_GAIN[kind] * Math.pow(level / MAX_LEVEL, 1.6);
  let ch = running[kind];
  if (!ch && target === 0) return;
  if (!ch) {
    const gain = ac.createGain();
    gain.gain.value = 0;
    gain.connect(ac.destination);
    const stopSound = build(ac, kind, gain);
    ch = running[kind] = { gain, stop: stopSound };
  }
  const now = ac.currentTime;
  ch.gain.gain.cancelScheduledValues(now);
  ch.gain.gain.setValueAtTime(ch.gain.gain.value, now);
  ch.gain.gain.linearRampToValueAtTime(target, now + (target === 0 ? 0.4 : 0.8));
  if (target === 0) {
    const old = ch;
    delete running[kind];
    setTimeout(() => {
      old.stop();
      old.gain.disconnect();
    }, 450);
  }
}

/** Apply all mixer levels at once. */
export function applyMixer(levels: Record<Channel, number>): void {
  (Object.keys(levels) as Channel[]).forEach((k) => setChannel(k, levels[k]));
}

/** Little 3-note "ding" for when a Pomodoro finishes. */
export function playChime(): void {
  const ac = audio();
  if (!ac) return;
  [523, 659, 784].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    const t = ac.currentTime + i * 0.16;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.32);
  });
}

/* ===========================================================================
 * Little sound effects — soft, quiet and short, all made in code.
 * Turned on/off with Settings → "Little sounds".
 * ======================================================================== */
export type Sfx = 'tick' | 'pop' | 'coin' | 'chime' | 'levelup' | 'bell' | 'twinkle' | 'purr' | 'kettle' | 'bead';

let sfxOn = true;
export const setSfxEnabled = (on: boolean) => {
  sfxOn = on;
};

/** One soft note: a pitch that fades out. */
function note(ac: AudioContext, freq: number, start: number, length: number, volume: number, type: OscillatorType = 'sine', glideTo?: number) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + length);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(g).connect(ac.destination);
  osc.start(start);
  osc.stop(start + length + 0.05);
}

/** A short burst of filtered noise (for clicks, purrs, steam). */
function hiss(ac: AudioContext, start: number, length: number, volume: number, filterType: BiquadFilterType, freq: number, wobbleHz = 0) {
  const src = ac.createBufferSource();
  src.buffer = noise(ac, length + 0.1, filterType === 'lowpass' ? 'brown' : 'white');
  const f = ac.createBiquadFilter();
  f.type = filterType;
  f.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + length);
  let out: AudioNode = g;
  if (wobbleHz) {
    // a purr is a rumble that pulses ~25 times a second
    const am = ac.createGain();
    am.gain.value = 0.5;
    const lfo = ac.createOscillator();
    lfo.frequency.value = wobbleHz;
    const depth = ac.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(am.gain);
    g.connect(am);
    out = am;
    lfo.start(start);
    lfo.stop(start + length + 0.1);
  }
  src.connect(f).connect(g);
  out.connect(ac.destination);
  src.start(start);
  src.stop(start + length + 0.1);
}

export function sfx(name: Sfx): void {
  if (!sfxOn) return;
  const ac = audio();
  if (!ac || ac.state !== 'running') return; // never start sound without a tap first
  const t = ac.currentTime + 0.01;
  switch (name) {
    case 'tick': // soft UI tap
      note(ac, 1400, t, 0.03, 0.025);
      break;
    case 'pop': // something added
      note(ac, 320, t, 0.09, 0.07, 'sine', 900);
      break;
    case 'coin': // money into the jar
      note(ac, 988, t, 0.08, 0.04, 'triangle');
      note(ac, 1319, t + 0.07, 0.25, 0.04, 'triangle');
      break;
    case 'chime': // XP
      note(ac, 880, t, 0.3, 0.035, 'triangle');
      note(ac, 1320, t + 0.05, 0.3, 0.02, 'sine');
      break;
    case 'levelup':
      [523, 659, 784, 1047].forEach((f, i) => note(ac, f, t + i * 0.11, 0.25, 0.04, 'triangle'));
      break;
    case 'bell': // a lantern lit / tasbih round done — warm and long
      note(ac, 523, t, 1.8, 0.06);
      note(ac, 1046, t, 1.2, 0.025);
      note(ac, 1569, t, 0.8, 0.012);
      break;
    case 'twinkle': // a star lit
      [1568, 2093, 2637, 3136].forEach((f, i) => note(ac, f, t + i * 0.07, 0.35, 0.02));
      break;
    case 'purr':
      hiss(ac, t, 1.3, 0.35, 'lowpass', 180, 24);
      break;
    case 'kettle': // break time: a gentle rising whistle with a little steam
      note(ac, 1500, t, 0.9, 0.015, 'sine', 2300);
      hiss(ac, t, 0.9, 0.03, 'bandpass', 3000);
      break;
    case 'bead': // a wooden tasbih bead
      hiss(ac, t, 0.03, 0.08, 'highpass', 2500);
      note(ac, 820, t, 0.05, 0.03, 'triangle');
      break;
  }
}

/** A tiny phone vibration — only after you've tapped the page (browsers block it otherwise). */
export function buzz(pattern: number | number[]): void {
  if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(pattern);
}
