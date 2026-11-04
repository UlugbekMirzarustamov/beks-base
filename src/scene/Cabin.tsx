/**
 * The Home screen's little pixel cabin, drawn on a tiny 160×96 canvas and
 * scaled up with crisp pixels.
 *
 * - The window shows the sky in Sheffield right now (UK time): sunrise, day,
 *   sunset and starry night, using rough real sunrise/sunset times per month.
 * - The fireplace and lantern flicker and glow (only if motion is allowed).
 * - Chest, Bookshelf and Crafting table are real links on top of the canvas,
 *   so they work with a keyboard and screen readers too.
 */
import { useEffect, useRef } from 'react';
import { UK_TZ, zonedParts } from '../lib/dates';
import { PixelIcon, type IconName } from '../ui/icons';

const W = 160;
const H = 96;

/** Rough sunrise / sunset in Sheffield, as UK clock hours, for Jan…Dec. */
const SUN_TIMES: [number, number][] = [
  [8.2, 16.2], [7.5, 17.1], [6.4, 18.0], [6.4, 19.9], [5.3, 20.8], [4.7, 21.5],
  [5.0, 21.4], [5.8, 20.5], [6.7, 19.3], [7.6, 18.1], [7.2, 16.3], [8.1, 15.8],
];

export type SkyPhase = 'night' | 'dawn' | 'day' | 'dusk';

export function skyAt(now: Date) {
  const p = zonedParts(now, UK_TZ);
  const hour = p.hour + p.minute / 60;
  const [sunrise, sunset] = SUN_TIMES[p.month - 1];
  let phase: SkyPhase = 'day';
  if (Math.abs(hour - sunrise) < 0.75) phase = 'dawn';
  else if (Math.abs(hour - sunset) < 0.75) phase = 'dusk';
  else if (hour < sunrise || hour > sunset) phase = 'night';
  return { phase, hour, sunrise, sunset };
}

const SKY: Record<SkyPhase, [string, string]> = {
  night: ['#0b1030', '#28336e'],
  dawn: ['#4a5aa0', '#f6a76a'],
  day: ['#4fa8ea', '#bfe6fb'],
  dusk: ['#3b3f8f', '#f08a5d'],
};
const HILLS: Record<SkyPhase, [string, string]> = {
  night: ['#1f3b2a', '#142619'],
  dawn: ['#4a7a3a', '#335a2a'],
  day: ['#6cbf45', '#3f7a26'],
  dusk: ['#4a7a3a', '#335a2a'],
};

/** Blend two #rrggbb colours. */
function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}

/** Repeatable "random" number 0–1 for a seed, so the scene looks the same every frame. */
const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

// Window position on the canvas
const WX = 58;
const WY = 12;
const WW = 44;
const WH = 32;

function draw(ctx: CanvasRenderingContext2D, now: Date, frame: number, rain: boolean, motion: boolean) {
  const r = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  const { phase, hour, sunrise, sunset } = skyAt(now);
  const flick = motion ? frame : 0;

  // ---------- Wall (oak planks) ----------
  r(0, 0, W, 72, '#a0703f');
  for (let y = 4; y < 72; y += 6) {
    r(0, y, W, 1, '#7d5530');
    r(0, y + 1, W, 1, '#ad7c48');
    for (let x = (y * 7) % 20; x < W; x += 20) r(x, y + 1, 1, 5, '#8a5f34');
  }
  r(0, 0, W, 4, '#5b3a1d'); // ceiling beam
  r(0, 3, W, 1, '#4a2f17');
  r(0, 0, 3, 72, '#6e4522'); // corner posts
  r(157, 0, 3, 72, '#6e4522');

  // ---------- Floor ----------
  r(0, 72, W, 24, '#7a4e2a');
  for (let y = 72; y < 96; y += 5) {
    r(0, y, W, 1, '#5e3b1f');
    for (let x = (y * 11) % 28; x < W; x += 28) r(x, y + 1, 1, 4, '#64401f');
  }
  r(0, 70, W, 2, '#4f3218'); // skirting board

  // ---------- Window: sky, sun/moon, hills ----------
  ctx.save();
  ctx.beginPath();
  ctx.rect(WX, WY, WW, WH);
  ctx.clip();
  const [skyTop, skyBottom] = SKY[phase];
  for (let i = 0; i < 8; i++) r(WX, WY + i * 4, WW, 4, mix(skyTop, skyBottom, i / 7));

  if (phase !== 'day') {
    for (let i = 0; i < 18; i++) {
      const twinkle = !motion || rand(i + Math.floor(frame / 6) * 31) > 0.15;
      if (twinkle) r(WX + Math.floor(rand(i) * WW), WY + Math.floor(rand(i + 50) * (WH - 12)), 1, 1, phase === 'night' ? '#fff8d0' : '#ffe9c4aa');
    }
  }
  // Sun by day, moon by night, moving along an arc.
  const isSun = hour >= sunrise && hour <= sunset;
  const nightLength = 24 - (sunset - sunrise);
  const progress = isSun ? (hour - sunrise) / (sunset - sunrise) : (((hour - sunset + 24) % 24) / nightLength);
  const bx = Math.round(WX + 2 + progress * (WW - 8));
  const by = Math.round(WY + 16 - Math.sin(progress * Math.PI) * 12);
  if (isSun) {
    r(bx - 1, by - 1, 6, 6, '#fff3b0');
    r(bx, by, 4, 4, '#ffd84a');
  } else {
    r(bx, by, 4, 4, '#f4f1de');
    r(bx + 2, by, 2, 2, mix(skyTop, skyBottom, 0.3)); // moon "bite"
  }
  // Clouds drifting by
  if (phase !== 'night') {
    for (let c = 0; c < 2; c++) {
      const cx = WX - 10 + ((c * 27 + flick * 0.15) % (WW + 14));
      const cy = WY + 5 + c * 7;
      const col = phase === 'day' ? '#ffffff' : '#f7c9b0';
      r(cx, cy + 1, 10, 2, col);
      r(cx + 2, cy, 5, 1, col);
    }
  }
  // Hills, a tree and a little house far away
  const [far, near] = HILLS[phase];
  for (let x = 0; x < WW; x++) {
    const hf = 7 + Math.round(Math.sin(x * 0.25) * 2 + Math.sin(x * 0.11) * 2);
    r(WX + x, WY + WH - hf, 1, hf, far);
    const hn = 3 + Math.round(Math.sin(x * 0.4 + 1) * 1.5);
    r(WX + x, WY + WH - hn, 1, hn, near);
  }
  r(WX + 32, WY + 20, 4, 3, phase === 'night' ? '#3a3040' : '#d9d0c0'); // house
  r(WX + 31, WY + 19, 6, 1, '#7a3b2e'); // roof
  r(WX + 33, WY + 21, 1, 1, phase === 'night' || phase === 'dusk' ? '#ffd27a' : '#6a7a8a'); // lit window at night
  r(WX + 9, WY + 19, 1, 4, '#4a2e15'); // tree trunk
  r(WX + 7, WY + 15, 5, 4, near);
  // Rain
  if (rain) {
    for (let i = 0; i < 16; i++) {
      const x = WX + Math.floor(rand(i * 7) * WW);
      const y = WY + ((Math.floor(rand(i * 3) * WH) + flick * 3) % WH);
      r(x, y, 1, 3, 'rgba(190,220,255,0.75)');
    }
  }
  ctx.restore();

  // Window frame + sill + plant
  r(56, 10, 48, 2, '#4a2e15');
  r(56, 44, 48, 2, '#4a2e15');
  r(56, 10, 2, 36, '#4a2e15');
  r(102, 10, 2, 36, '#4a2e15');
  r(79, 12, 2, 32, '#5b3a1d');
  r(58, 27, 44, 2, '#5b3a1d');
  r(54, 46, 52, 3, '#6e4522');
  r(54, 46, 52, 1, '#8a5a2e');
  r(92, 42, 6, 4, '#c0603a');
  r(91, 41, 8, 1, '#a04a2a');
  r(93, 37, 1, 4, '#3f7a26');
  r(95, 35, 1, 6, '#5fa83b');
  r(97, 38, 1, 3, '#3f7a26');
  r(94, 36, 1, 1, '#5fa83b');
  r(96, 37, 1, 1, '#5fa83b');

  // ---------- Bookshelf ----------
  r(8, 26, 26, 46, '#5b3a1d');
  r(10, 28, 22, 42, '#3a2312');
  const bookColors = ['#c0392b', '#2e86c1', '#27ae60', '#f1c40f', '#8e44ad', '#e67e22', '#ecf0f1', '#16a085'];
  [38, 50, 62, 70].forEach((bottom, shelf) => {
    if (bottom < 70) r(10, bottom, 22, 2, '#6e4522');
    const maxH = shelf === 3 ? 5 : 9;
    let x = 10;
    let seed = shelf * 100;
    while (x < 31) {
      const w = rand(seed) > 0.6 ? 3 : 2;
      const h = maxH - 2 + Math.floor(rand(seed + 1) * 3);
      if (x + w > 32) break;
      r(x, bottom - h, w, h, bookColors[Math.floor(rand(seed + 2) * bookColors.length)]);
      r(x, bottom - h + 2, w, 1, 'rgba(255,255,255,0.3)');
      x += w + (rand(seed + 3) > 0.85 ? 1 : 0);
      seed += 7;
    }
  });
  r(8, 70, 26, 2, '#4a2e15');

  // ---------- Chest ----------
  r(37, 57, 20, 20, '#3b2512'); // outline
  r(38, 58, 18, 6, '#8a5a2e'); // lid
  r(38, 58, 18, 1, '#b07a3e');
  r(38, 64, 18, 12, '#b07a3e'); // body
  r(38, 68, 18, 1, '#8a5a2e');
  r(38, 72, 18, 1, '#8a5a2e');
  r(38, 63, 18, 1, '#3a3a3a'); // metal band
  r(38, 58, 2, 18, '#4a4a4a');
  r(54, 58, 2, 18, '#4a4a4a');
  r(45, 62, 4, 5, '#e0b030'); // lock
  r(46, 64, 2, 2, '#3b2512');
  if (motion && frame % 40 < 3) r(42, 60, 1, 1, '#ffffff'); // glint

  // ---------- Crafting table ----------
  r(99, 55, 24, 24, '#3b2512');
  for (let i = 0; i < 3; i++) r(100 + i * 7, 56, 7, 6, i % 2 ? '#d8ab70' : '#b98a52');
  r(100, 62, 22, 16, '#9c6b3c');
  r(100, 62, 22, 1, '#5b3a1d');
  r(100, 62, 2, 16, '#6e4522');
  r(120, 62, 2, 16, '#6e4522');
  r(104, 66, 6, 3, '#b5b5b5'); // saw
  r(110, 66, 2, 3, '#6e4522');
  r(114, 65, 1, 6, '#6e4522'); // hammer
  r(112, 65, 5, 2, '#8c8c8c');

  // ---------- Fireplace (stone) ----------
  const stone = (x0: number, y0: number, w: number, h: number) => {
    r(x0, y0, w, h, '#8c8c8c');
    for (let y = y0; y < y0 + h; y += 4) {
      const off = ((y / 4) % 2) * 4;
      r(x0, y, w, 1, '#6b6b6b');
      for (let x = x0 + off - 8; x < x0 + w; x += 8) {
        const t = rand(x * 3 + y * 17);
        if (t > 0.7) r(Math.max(x0, x + 1), y + 1, Math.min(7, x0 + w - x - 1), 3, '#a3a3a3');
        else if (t < 0.2) r(Math.max(x0, x + 1), y + 1, Math.min(7, x0 + w - x - 1), 3, '#7a7a7a');
        if (x >= x0) r(x, y + 1, 1, 3, '#6b6b6b');
      }
    }
  };
  stone(130, 0, 22, 30); // chimney
  stone(124, 34, 34, 40);
  r(122, 30, 38, 4, '#5b3a1d'); // mantel
  r(122, 30, 38, 1, '#7e5426');
  r(130, 48, 22, 26, '#1a1110'); // opening
  r(131, 49, 20, 24, '#2a1712');
  r(122, 74, 38, 2, '#6b6b6b');
  // A little framed picture of home (blue domes, sandy walls) on the mantel
  r(136, 19, 12, 11, '#4a2e15');
  r(137, 20, 10, 9, '#8fd3ff');
  r(138, 22, 1, 6, '#e8cf96');
  r(145, 22, 1, 6, '#e8cf96');
  r(141, 22, 2, 1, '#2a8fd8');
  r(140, 23, 4, 3, '#2a8fd8');
  r(139, 26, 6, 3, '#e8cf96');
  r(141, 27, 2, 2, '#7a4e2a');
  r(126, 26, 2, 4, '#f3ead2'); // candle
  r(152, 26, 3, 4, '#5fa83b'); // tiny cactus
  r(151, 27, 1, 1, '#5fa83b');

  // ---------- Lantern (hanging) ----------
  r(47, 4, 1, 8, '#3a3a3a');
  r(45, 12, 5, 2, '#2b2b2b');
  r(45, 20, 5, 1, '#2b2b2b');

  // ---------- Rug + sleeping cat ----------
  r(60, 82, 40, 10, '#9e3b2f');
  r(60, 82, 40, 1, '#e0a040');
  r(60, 91, 40, 1, '#e0a040');
  r(60, 82, 1, 10, '#e0a040');
  r(99, 82, 1, 10, '#e0a040');
  for (let i = 0; i < 5; i++) r(64 + i * 8, 86, 3, 2, '#e0a040');
  const breathe = motion && frame % 24 < 12 ? 1 : 0;
  r(74, 85 - breathe, 10, 4 + breathe, '#5a5a66');
  r(82, 84, 4, 4, '#5a5a66');
  r(82, 83, 1, 1, '#5a5a66');
  r(85, 83, 1, 1, '#5a5a66');
  r(71, 87, 3, 1, '#5a5a66');
  r(77, 86, 1, 3, '#46464f');
  r(80, 86, 1, 3, '#46464f');
  r(84, 86, 1, 1, '#2b2b2b');

  // ---------- Light: darken the room at night, then add warm glows ----------
  const dark = phase === 'night' ? 0.55 : phase === 'day' ? 0 : 0.3;
  if (dark > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(10,12,35,${dark})`;
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.rect(WX, WY, WW, WH); // leave the window un-darkened
    ctx.fill('evenodd');
    ctx.restore();
  }
  const wobble = motion ? Math.sin(frame * 0.9) * 0.03 + rand(frame) * 0.03 : 0;
  const glow = (x: number, y: number, radius: number, alpha: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(255,160,70,${alpha})`);
    g.addColorStop(1, 'rgba(255,160,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  glow(141, 64, phase === 'day' ? 30 : 60, (phase === 'day' ? 0.12 : 0.32) + wobble);
  glow(47, 17, phase === 'day' ? 12 : 30, (phase === 'day' ? 0.1 : 0.25) + wobble);

  // ---------- Light sources (drawn last so they stay bright) ----------
  r(133, 71, 16, 3, '#6e4522'); // logs
  r(135, 69, 12, 2, '#5b3a1d');
  r(133, 71, 2, 3, '#c99a5f');
  r(147, 71, 2, 3, '#c99a5f');
  for (let x = 134; x < 148; x++) {
    const h = Math.max(2, Math.round(5 + rand(x * 13 + flick) * 8 - Math.abs(x - 141) * 0.7));
    r(x, 70 - h, 1, h, '#e8501a');
    r(x, 70 - Math.floor(h * 0.7), 1, Math.floor(h * 0.7), '#ffa53a');
    r(x, 70 - Math.floor(h * 0.35), 1, Math.floor(h * 0.35), '#ffe27a');
  }
  if (motion) {
    for (let i = 0; i < 3; i++) {
      const y = 66 - ((frame * 1.5 + i * 9) % 18);
      r(136 + i * 4 + (((frame + i) % 3) - 1), Math.round(y), 1, 1, '#ffb347');
    }
  }
  r(126, 24, 2, 2, motion && frame % 6 < 3 ? '#ffd27a' : '#ffb347'); // candle flame
  r(45, 14, 5, 6, motion && frame % 5 < 2 ? '#ffe39a' : '#ffc35a'); // lantern glass
  r(45, 14, 1, 6, '#2b2b2b');
  r(49, 14, 1, 6, '#2b2b2b');
}

interface Station {
  href: string;
  label: string;
  sub: string;
  icon: IconName;
  /** Position on the 160×96 scene */
  x: number;
  y: number;
  w: number;
  h: number;
}

const STATIONS: Station[] = [
  { href: '#/study', label: 'Study', sub: 'Bookshelf', icon: 'shelf', x: 6, y: 24, w: 30, h: 50 },
  { href: '#/money', label: 'Money', sub: 'Chest', icon: 'chest', x: 35, y: 55, w: 24, h: 24 },
  { href: '#/planner', label: 'Planner', sub: 'Crafting table', icon: 'table', x: 97, y: 53, w: 28, h: 28 },
];

export function Cabin({ rain }: { rain: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!motion) {
      // Still picture, refreshed once a minute so the sky keeps up with the time.
      draw(ctx, new Date(), 0, rain, false);
      const id = setInterval(() => draw(ctx, new Date(), 0, rain, false), 60_000);
      return () => clearInterval(id);
    }
    let frame = 0;
    let last = 0;
    let raf = 0;
    const loop = (t: number) => {
      if (t - last > 125) {
        // ~8 frames a second: enough for a pixel-art flicker, light on battery
        last = t;
        frame++;
        draw(ctx, new Date(), frame, rain, true);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rain]);

  const { phase } = skyAt(new Date());
  const words: Record<SkyPhase, string> = { night: 'a starry night', dawn: 'sunrise', day: 'daytime', dusk: 'sunset' };

  return (
    <div className="cabin">
      <canvas
        ref={ref}
        width={W}
        height={H}
        className="cabin__canvas"
        role="img"
        aria-label={`Your cosy cabin with a fire. Outside the window it is ${words[phase]} in Sheffield.`}
      />
      {STATIONS.map((s) => (
        <a
          key={s.href}
          href={s.href}
          className="station"
          style={{ left: `${(s.x / W) * 100}%`, top: `${(s.y / H) * 100}%`, width: `${(s.w / W) * 100}%`, height: `${(s.h / H) * 100}%` }}
          aria-label={`${s.sub}: open ${s.label}`}
        >
          <span className="station__sign">
            <PixelIcon name={s.icon} size={14} />
            {s.label}
          </span>
        </a>
      ))}
    </div>
  );
}
