/**
 * Cozy background sound, made live with the Web Audio API — no sound files needed.
 * Three channels you can mix, each with its own volume: rain, fire and wind.
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

export type Channel = 'rain' | 'fire' | 'wind';

/** Loudest volume of each channel (they sound balanced at the same mixer level). */
const MAX_GAIN: Record<Channel, number> = { rain: 0.28, fire: 0.75, wind: 0.45 };
/** Mixer levels go from 0 (off) to 8 (loudest). */
export const MAX_LEVEL = 8;

interface Running {
  gain: GainNode;
  stop: () => void;
}
const running: Partial<Record<Channel, Running>> = {};

/** Build one channel's sound, feeding into `out`. Returns a function that stops it. */
function build(ac: AudioContext, kind: Channel, out: GainNode): () => void {
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
