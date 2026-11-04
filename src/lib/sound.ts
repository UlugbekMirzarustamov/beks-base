/**
 * Cozy background sound, made live with the Web Audio API — no sound files needed.
 *   rain = soft filtered "white noise"
 *   fire = deep rumble + random little crackles
 * Browsers only allow sound after you tap something, so this always starts from a button.
 */
let ctx: AudioContext | null = null;
let current: { stop: () => void } | null = null;

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

export function startAmbient(kind: 'rain' | 'fire'): void {
  stopAmbient();
  const ac = audio();
  if (!ac) return;

  const master = ac.createGain();
  master.gain.setValueAtTime(0, ac.currentTime);
  master.gain.linearRampToValueAtTime(kind === 'rain' ? 0.18 : 0.5, ac.currentTime + 1.5); // gentle fade-in
  master.connect(ac.destination);

  const bed = ac.createBufferSource();
  bed.buffer = noise(ac, 3, kind === 'rain' ? 'white' : 'brown');
  bed.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = kind === 'rain' ? 1300 : 450;
  bed.connect(filter).connect(master);
  bed.start();

  // Fire crackles: tiny bursts of high noise at random moments.
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (kind === 'fire') {
    const pop = noise(ac, 0.03, 'white');
    const crackle = () => {
      const src = ac.createBufferSource();
      src.buffer = pop;
      const hp = ac.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800 + Math.random() * 2000;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.05 + Math.random() * 0.15, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05);
      src.connect(hp).connect(g).connect(master);
      src.start();
      timer = setTimeout(crackle, 60 + Math.random() * 500);
    };
    crackle();
  }

  current = {
    stop() {
      clearTimeout(timer);
      master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.setValueAtTime(master.gain.value, ac.currentTime);
      master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.4); // fade-out
      setTimeout(() => {
        bed.stop();
        master.disconnect();
      }, 450);
    },
  };
}

export function stopAmbient(): void {
  current?.stop();
  current = null;
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
