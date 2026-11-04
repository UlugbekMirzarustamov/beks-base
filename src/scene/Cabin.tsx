/**
 * The Home screen's little pixel cabin, drawn on a tiny canvas (96 pixels tall)
 * and scaled up with crisp pixels.
 *
 * - The room is always as WIDE as the screen: the canvas width is worked out from
 *   the space available, so nothing is stretched and there are no empty bands.
 *   Left things (bookshelf, chest) stay left, the window/rug/telescope stay in
 *   the middle, the crafting table and fireplace stay right — and wider screens
 *   get extra decorations in the gaps (a wall hanging, a plant, a wall clock).
 * - The window shows the sky in Sheffield right now (UK time): sunrise, day,
 *   sunset and starry night, using rough real sunrise/sunset times per month.
 * - The fireplace and lantern flicker and glow (only if motion is allowed).
 * - The fire, rain and clouds follow the sound mixer (louder = bigger/more/faster).
 * - Chest, Bookshelf, Telescope, Prayer mat and Crafting table are real links on top of the
 *   canvas, so they work with a keyboard and screen readers too.
 */
import { useEffect, useRef, useState } from 'react';
import { UK_TZ, zonedParts } from '../lib/dates';
import { BEK_POSE, plantStage, unlockedIds, type BekPose, type Season, type SimbaMood } from '../lib/cabin';
import type { ShopSlot } from '../lib/shop';
import type { Avatar, Mixer } from '../lib/types';
import type { WeatherKind } from '../lib/weather';
import { PixelIcon, type IconName } from '../ui/icons';

const H = 96;
const BASE_W = 160; // narrowest room (phone)
const MAX_W = 420;

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
  return { phase, hour, minute: p.minute, sunrise, sunset };
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

/**
 * Where things go in a room W pixels wide. Everything was designed for a
 * 160-wide room; `C` shifts middle things and `R` shifts right-side things.
 */
function layout(W: number) {
  const C = Math.round(W / 2) - 80;
  const R = W - BASE_W;
  return {
    C,
    R,
    win: { x: 58 + C, y: 12, w: 44, h: 32 }, // the glass part of the window
    telescopeX: 64 + C,
    tableX: 99 + R,
    fireX: 124 + R,
  };
}

/** Everything the cabin needs to know to draw itself. */
export interface CabinScene {
  mix: Mixer;
  level: number;
  prayerStreak: number;
  studyStreak: number;
  simba: SimbaMood;
  season: Season;
  /** Real weather right now (null = unknown/offline → just the time-of-day sky). */
  weather: WeatherKind | null;
  avatar: Avatar;
  /** Cabin-shop items on display, by spot. */
  decor: Partial<Record<ShopSlot, string>>;
}

/* ---------------------------------------------------------------------------
 * Cabin-shop decorations. Each draws with its top-left at (x, y).
 * ------------------------------------------------------------------------- */
/** Size of each item (used for the shop previews). */
export const DECOR_SIZE: Record<string, [number, number]> = {
  samarkand: [17, 14],
  bukhara: [16, 13],
  suzani: [14, 14],
  samovar: [9, 10],
  plov: [12, 5],
  gilam: [30, 7],
  curtains: [22, 16],
  globe: [8, 9],
  yarn: [5, 4],
  fonar: [20, 9],
};

/** One curtain panel in atlas-silk zigzag stripes. */
function curtain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const cols = ['#c0392b', '#e0b030', '#2a6fa8', '#f3ead2', '#7a4fa3'];
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      ctx.fillStyle = cols[(Math.floor(yy / 2) + Math.abs(xx - Math.floor(w / 2))) % cols.length];
      ctx.fillRect(x + xx, y + yy, 1, 1);
    }
  }
}

export function drawDecor(ctx: CanvasRenderingContext2D, id: string, x: number, y: number) {
  const r = (xx: number, yy: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + xx, y + yy, w, h);
  };
  switch (id) {
    case 'samarkand': // Registan: three blue-domed buildings on sand
      r(0, 0, 17, 14, '#4a2e15');
      r(1, 1, 15, 12, '#8fd3ff');
      r(1, 9, 15, 4, '#e8cf96');
      r(2, 5, 4, 5, '#d8b878');
      r(7, 4, 4, 6, '#d8b878');
      r(12, 5, 3, 5, '#d8b878');
      r(3, 3, 2, 2, '#2a8fd8');
      r(8, 2, 2, 2, '#2a8fd8');
      r(12, 3, 2, 2, '#2a8fd8');
      r(3, 7, 2, 3, '#2a6fa8');
      r(8, 6, 2, 4, '#2a6fa8');
      r(12, 7, 2, 3, '#2a6fa8');
      break;
    case 'bukhara': // Kalyan minaret at sunset
      r(0, 0, 16, 13, '#4a2e15');
      r(1, 1, 14, 6, '#4a5aa0');
      r(1, 6, 14, 5, '#f6a76a');
      r(1, 11, 14, 1, '#e8cf96');
      r(7, 2, 2, 9, '#d8b878');
      r(6, 2, 4, 1, '#c9a46a');
      r(11, 7, 3, 2, '#2a8fd8');
      r(10, 9, 5, 2, '#c9a46a');
      break;
    case 'suzani':
      r(0, 0, 14, 14, '#e0a040');
      r(1, 1, 12, 12, '#b8322a');
      for (const [dx, dy] of [[2, 2], [8, 2], [5, 5], [2, 8], [8, 8]]) {
        r(dx, dy, 4, 4, '#2a6fa8');
        r(dx + 1, dy + 1, 2, 2, '#f3e3bd');
      }
      break;
    case 'samovar':
      r(3, 0, 3, 2, '#2a6fa8'); // little choynak on top
      r(4, 0, 1, 1, '#f3ead2');
      r(1, 2, 7, 6, '#c9a04a');
      r(1, 4, 7, 1, '#e0c060');
      r(0, 3, 1, 3, '#8a6420');
      r(8, 3, 1, 3, '#8a6420');
      r(4, 6, 1, 1, '#3a3a3a'); // tap
      r(2, 8, 5, 2, '#8a6420');
      break;
    case 'plov':
      r(0, 3, 12, 2, '#2a6fa8');
      r(1, 3, 10, 1, '#f3ead2');
      r(2, 1, 8, 2, '#e8b24a');
      r(3, 0, 6, 1, '#e8b24a');
      r(4, 1, 1, 1, '#e06a2a');
      r(7, 2, 1, 1, '#e06a2a');
      r(5, 0, 2, 1, '#7a3b1e');
      break;
    case 'gilam':
      r(0, 0, 30, 7, '#8a2a22');
      r(0, 0, 30, 1, '#e0b030');
      r(0, 6, 30, 1, '#e0b030');
      for (let i = 0; i < 4; i++) {
        r(3 + i * 7, 2, 3, 3, '#1d3a6a');
        r(4 + i * 7, 3, 1, 1, '#f3e3bd');
      }
      break;
    case 'curtains': // shop preview: two panels with a little window between
      r(4, 0, 14, 14, '#4fa8ea');
      curtain(ctx, x, y, 5, 16);
      curtain(ctx, x + 17, y, 5, 16);
      break;
    case 'globe':
      r(1, 0, 6, 6, '#2a8fd8');
      r(2, 1, 2, 2, '#5fa83b');
      r(4, 3, 2, 2, '#5fa83b');
      r(0, 2, 1, 2, '#8a6420');
      r(4, 6, 1, 2, '#5a3a1d');
      r(2, 8, 5, 1, '#5a3a1d');
      break;
    case 'yarn':
      r(0, 0, 4, 4, '#d63a8a');
      r(1, 1, 2, 1, '#f27ab8');
      r(4, 3, 1, 1, '#d63a8a'); // loose thread
      break;
    case 'fonar': // two coloured-glass lanterns
      for (const [dx, col] of [[0, '#e05a3a'], [14, '#3aa0e0']] as [number, string][]) {
        r(dx + 2, 0, 1, 3, '#3a3a3a');
        r(dx, 3, 5, 1, '#3a3a3a');
        r(dx, 4, 5, 4, col);
        r(dx + 1, 5, 3, 2, '#ffe9b0');
        r(dx, 8, 5, 1, '#3a3a3a');
      }
      break;
  }
}

/* ---------------------------------------------------------------------------
 * Bek: an original blocky pixel character (8×17) who hangs out with Simba.
 * Letters: h hair · d doppi · w doppi pattern · s/a skin · e eyes · m mouth
 *          t shirt · T shirt shade · p trousers · P trouser shade · b boots
 *          K book · C cup of tea
 * ------------------------------------------------------------------------- */
const BEK_HEAD_HAIR = ['.hhhhhh.', '.hhhhhh.'];
const BEK_HEAD_DOPPI = ['.dddddd.', '.dwddwd.'];
const BEK_FACE = ['.hssssh.', '.sesses.', '.ssssss.', '.ssmmss.'];
const BEK_BODY: Record<BekPose, string[]> = {
  stand: ['tttttttt', 'tTttttTt', 'tTttttTt', 'tTttttTt', 'tTttttTt', 'aTttttTa'],
  book: ['tttttttt', 'tTttttTt', 'tTttttTt', '.TaKKaT.', '.tKKKKt.', '.tttttt.'],
  pray: ['tttttttt', 'tTttttTt', 'tTaaaaTt', '.tttttt.', '.tttttt.', '.tttttt.'],
  think: ['.ttttttt', '.TttttTt', '.TttttTt', '.TttttTt', '.TttttTt', '.TttttTa'],
  tea: ['tttttttt', 'tTttttTt', 'tTttttTt', 'tTttttTt', 'tTttttTt', 'aTttttTC'],
};
const BEK_LEGS = ['..pppp..', '..pppp..', '..pPPp..', '..pPPp..', '..bbbb..'];
export const BEK_W = 8;
export const BEK_H = 17;

/**
 * Draw Bek with his top-left corner at (x, y). `scale` 2 = each of his pixels is 2×2
 * (how big he is in the cabin); `shade` 0–1 darkens him a little at night so he fits the room.
 */
export function drawBek(ctx: CanvasRenderingContext2D, x: number, y: number, pose: BekPose, look: Avatar, blink = false, scale = 1, shade = 0) {
  const base: Record<string, string> = {
    h: look.hair,
    d: '#1c1c1c',
    w: '#f3ead2',
    s: look.skin,
    a: look.skin,
    e: blink ? look.skin : '#2b1d0e',
    m: mix(look.skin, '#7a2a1a', 0.5),
    t: look.shirt,
    T: mix(look.shirt, '#000000', 0.28),
    p: look.pants,
    P: mix(look.pants, '#000000', 0.3),
    b: '#3b2512',
    K: '#c0392b',
    C: '#f3ead2',
  };
  const tint = (c: string) => (shade > 0 && c.startsWith('#') ? mix(c, '#0a0c23', shade) : c);
  const px = (xx: number, yy: number, c: string) => {
    ctx.fillStyle = tint(c);
    ctx.fillRect(x + xx * scale, y + yy * scale, scale, scale);
  };
  const rows = [...(look.doppi ? BEK_HEAD_DOPPI : BEK_HEAD_HAIR), ...BEK_FACE, ...BEK_BODY[pose], ...BEK_LEGS];
  rows.forEach((row, yy) => [...row].forEach((ch, xx) => ch !== '.' && px(xx, yy, base[ch])));
  if (pose === 'think') {
    // left hand scratching his head
    px(-1, 3, look.skin);
    px(-1, 4, look.skin);
    px(-1, 5, look.shirt);
    px(-1, 6, look.shirt);
  }
}

/** Bek is drawn at 2× in the cabin so he's easy to see. */
const BEK_SCALE = 2;

/**
 * Where Bek stands (top-left, scene pixels, already at 2× size).
 * Prayer time → on the prayer mat. Otherwise beside the tall plant ("the tree")
 * between the window and the crafting table when the room is wide enough,
 * or in front of the bookshelf on narrow (phone) screens.
 */
function bekSpot(W: number, mood: SimbaMood): { x: number; y: number } {
  const { C, win, tableX } = layout(W);
  const h = BEK_H * BEK_SCALE;
  if (mood === 'prayer') return { x: 70 + C, y: 91 - h };
  const rightGap = tableX - 3 - (win.x + 48);
  if (rightGap >= 16) {
    // The plant is drawn here: stand just to its right, tucking in front of its leaves if space is tight.
    const plantX = win.x + 48 + Math.round((rightGap - 10) / 2);
    return { x: Math.max(plantX - 2, Math.min(plantX + 10, tableX - 2 - BEK_W * BEK_SCALE)), y: 87 - h };
  }
  // Narrow (phone) rooms have no tree and the middle is busy with signs: stand in front of the bookshelf.
  return { x: 4, y: 90 - h };
}

/** Simba's spot in scene pixels for each mood (used to draw him and to place his tap area). */
function simbaSpot(W: number, mood: SimbaMood): { x: number; y: number; sitting: boolean } {
  const { C, fireX } = layout(W);
  switch (mood) {
    case 'study':
      return { x: 12, y: 72, sitting: true }; // by the bookshelf, next to the book stack
    case 'prayer':
      return { x: 88 + C, y: 74, sitting: true }; // on the prayer mat by the arch, next to Bek
    case 'worried':
      return { x: 43, y: 47, sitting: true }; // on top of the chest
    case 'cosy':
      return { x: fireX + 3, y: 79, sitting: false }; // curled up by the fire
    default:
      return { x: 104 + C, y: 83, sitting: false }; // asleep next to the mat
  }
}

/** Simba sitting up, 9×10. c = ginger fur, d = stripes, e = eyes, p = pink nose, t = tail. */
const SIMBA_SIT = ['.c....c..', '.cc..cc..', '.cccccc..', '.ceccec..', '.ccppcc..', '..cccc...', '.cdccdc..', '.cccccc.t', '.cccccc.t', '.cc..cttt'];

function draw(ctx: CanvasRenderingContext2D, W: number, now: Date, frame: number, scene: CabinScene, motion: boolean) {
  const levels = scene.mix;
  const has = unlockedIds(scene.level);
  const { season, weather } = scene;
  const wet = weather === 'rain' || weather === 'storm';
  const overcast = weather === 'cloudy' || weather === 'fog' || weather === 'snow' || wet;
  const r = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  const { C, R, win, telescopeX: tx, tableX: cx, fireX: fx } = layout(W);
  const { phase, hour, minute, sunrise, sunset } = skyAt(now);
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
  r(W - 3, 0, 3, 72, '#6e4522');

  // ---------- Floor ----------
  r(0, 72, W, 24, '#7a4e2a');
  for (let y = 72; y < 96; y += 5) {
    r(0, y, W, 1, '#5e3b1f');
    for (let x = (y * 11) % 28; x < W; x += 28) r(x, y + 1, 1, 4, '#64401f');
  }
  r(0, 70, W, 2, '#4f3218'); // skirting board
  const decor = scene.decor;
  if (decor.floor) drawDecor(ctx, decor.floor, 3, 88);

  // ---------- Window: sky, sun/moon, hills ----------
  const { x: WX, y: WY, w: WW, h: WH } = win;
  ctx.save();
  ctx.beginPath();
  ctx.rect(WX, WY, WW, WH);
  ctx.clip();
  // Grey the sky when it's actually cloudy/raining in Sheffield.
  const grey = phase === 'night' ? '#1b1e28' : '#8f98a3';
  const greyAmount = { cloudy: 0.45, fog: 0.5, snow: 0.4, rain: 0.55, storm: 0.7, partly: 0.12, clear: 0 }[weather ?? 'clear'];
  const skyTop = mix(SKY[phase][0], grey, greyAmount);
  const skyBottom = mix(SKY[phase][1], grey, greyAmount);
  for (let i = 0; i < 8; i++) r(WX, WY + i * 4, WW, 4, mix(skyTop, skyBottom, i / 7));
  if (phase !== 'day' && !overcast) {
    for (let i = 0; i < 18; i++) {
      const twinkle = !motion || rand(i + Math.floor(frame / 6) * 31) > 0.15;
      if (twinkle) r(WX + Math.floor(rand(i) * WW), WY + Math.floor(rand(i + 50) * (WH - 12)), 1, 1, phase === 'night' ? '#fff8d0' : '#ffe9c4aa');
    }
  }
  const isSun = hour >= sunrise && hour <= sunset;
  const nightLength = 24 - (sunset - sunrise);
  const progress = isSun ? (hour - sunrise) / (sunset - sunrise) : ((hour - sunset + 24) % 24) / nightLength;
  const bx = Math.round(WX + 2 + progress * (WW - 8));
  const by = Math.round(WY + 16 - Math.sin(progress * Math.PI) * 12);
  if (greyAmount < 0.5) {
    if (isSun) {
      r(bx - 1, by - 1, 6, 6, '#fff3b0');
      r(bx, by, 4, 4, '#ffd84a');
    } else {
      r(bx, by, 4, 4, '#f4f1de');
      r(bx + 2, by, 2, 2, mix(skyTop, skyBottom, 0.3)); // moon "bite"
    }
  }
  // Clouds: more and greyer when the real weather is cloudy or wet; they race when the wind is up.
  const cloudCount = overcast ? 5 : weather === 'partly' ? 3 : phase === 'night' ? 0 : 2;
  const cloudColour = wet ? (phase === 'night' ? '#2c3040' : '#9aa1ab') : overcast ? (phase === 'night' ? '#343a4c' : '#d5d9de') : phase === 'day' ? '#ffffff' : '#f7c9b0';
  for (let c = 0; c < cloudCount; c++) {
    const cloudX = WX - 10 + ((c * 19 + flick * (0.15 + levels.wind * 0.35)) % (WW + 14)); // wind = faster clouds
    const cloudY = WY + 3 + ((c * 5) % 14);
    r(cloudX, cloudY + 1, 10, 2, cloudColour);
    r(cloudX + 2, cloudY, 5, 1, cloudColour);
  }
  // Hills, coloured by season
  const [far0, near0] = HILLS[phase];
  const far = season === 'autumn' ? mix(far0, '#8a6a2a', 0.35) : far0;
  const near = season === 'autumn' ? mix(near0, '#7a5a20', 0.3) : near0;
  for (let x = 0; x < WW; x++) {
    const hf = 7 + Math.round(Math.sin(x * 0.25) * 2 + Math.sin(x * 0.11) * 2);
    r(WX + x, WY + WH - hf, 1, hf, far);
    if (season === 'winter' || weather === 'snow') r(WX + x, WY + WH - hf, 1, 1, '#eef4fb'); // snow caps
    const hn = 3 + Math.round(Math.sin(x * 0.4 + 1) * 1.5);
    r(WX + x, WY + WH - hn, 1, hn, near);
  }
  r(WX + 32, WY + 20, 4, 3, phase === 'night' ? '#3a3040' : '#d9d0c0'); // house
  r(WX + 31, WY + 19, 6, 1, '#7a3b2e');
  r(WX + 33, WY + 21, 1, 1, phase === 'night' || phase === 'dusk' ? '#ffd27a' : '#6a7a8a');
  // The tree changes with the seasons: orange in autumn, white in winter, blossom in spring.
  const treeColours = { autumn: ['#d9822b', '#b5541f'], winter: ['#e8eef5', '#c9d3de'], spring: ['#f2a6c8', '#7cc35a'], summer: [near, near] }[season];
  r(WX + 9, WY + 19, 1, 4, '#4a2e15');
  r(WX + 7, WY + 15, 5, 4, treeColours[0]);
  r(WX + 8, WY + 17, 2, 1, treeColours[1]);
  r(WX + 10, WY + 15, 1, 1, treeColours[1]);
  // Falling things: autumn leaves, spring petals, snow
  const fallers = season === 'autumn' ? ['#d9822b', '#b5541f', '#e8c21a', '#a03a1a'] : season === 'spring' ? ['#f2a6c8', '#ffd6e6'] : [];
  fallers.forEach((col, i) => {
    for (let k = 0; k < 2; k++) {
      const n = i * 2 + k;
      const fx0 = WX + ((Math.floor(rand(n + 3) * WW) + Math.round(flick * 0.4 * (n % 2 ? 1 : -0.6))) % WW + WW) % WW;
      const fy0 = WY + ((Math.floor(rand(n + 11) * WH) + Math.round(flick * (0.5 + (n % 3) * 0.2))) % WH);
      r(fx0, fy0, n % 3 === 0 ? 2 : 1, 1, col);
    }
  });
  if (weather === 'snow') {
    for (let i = 0; i < 22; i++) r(WX + Math.floor(rand(i * 5) * WW), WY + ((Math.floor(rand(i * 9) * WH) + Math.round(flick * 0.6)) % WH), 1, 1, '#ffffff');
  }
  // Rain: from the real weather, or from the rain sound in the mixer (whichever is more)
  const drops = Math.max(levels.rain * 4, weather === 'storm' ? 26 : weather === 'rain' ? 14 : 0);
  for (let i = 0; i < drops; i++) {
    const x = WX + Math.floor(rand(i * 7) * WW);
    const y = WY + ((Math.floor(rand(i * 3) * WH) + flick * 3) % WH);
    r(x, y, 1, 3, 'rgba(190,220,255,0.75)');
  }
  if (weather === 'fog') {
    r(WX, WY, WW, WH, 'rgba(205,210,216,0.45)');
    for (let y = WY + 4; y < WY + WH; y += 6) r(WX, y, WW, 2, 'rgba(225,228,232,0.35)');
  }
  if (weather === 'storm' && motion && frame % 53 === 0) r(WX, WY, WW, WH, 'rgba(255,255,255,0.65)'); // lightning
  ctx.restore();

  // Window frame + sill + plant
  r(WX - 2, 10, 48, 2, '#4a2e15');
  r(WX - 2, 44, 48, 2, '#4a2e15');
  r(WX - 2, 10, 2, 36, '#4a2e15');
  r(WX + 44, 10, 2, 36, '#4a2e15');
  r(WX + 21, 12, 2, 32, '#5b3a1d');
  r(WX, 27, 44, 2, '#5b3a1d');
  r(WX - 4, 46, 52, 3, '#6e4522');
  r(WX - 4, 46, 52, 1, '#8a5a2e');
  if (season === 'autumn') {
    r(WX - 2, 45, 2, 1, '#d9822b'); // a few leaves blown onto the sill
    r(WX + 4, 45, 2, 1, '#b5541f');
    r(WX + 30, 45, 1, 1, '#e8c21a');
  }
  // Tulips (lola) in a pot: they grow with your prayer streak and bloom red at 7+ days.
  const stage = plantStage(scene.prayerStreak);
  const sway = motion && levels.wind > 0 && frame % Math.max(3, 12 - levels.wind) < 2 ? 1 : 0; // leaves wobble in the wind
  r(92 + C, 42, 6, 4, '#c0603a');
  r(91 + C, 41, 8, 1, '#a04a2a');
  const stem = [2, 4, 6, 7, 8][stage];
  r(94 + C, 41 - stem, 1, stem, '#3f7a26');
  r(96 + C + sway, 41 - stem + 1, 1, stem - 1, '#5fa83b');
  r(93 + C, 39, 1, 2, '#5fa83b'); // leaves
  r(97 + C, 38, 1, 3, '#3f7a26');
  if (stage >= 3) {
    r(93 + C, 41 - stem - 2, 3, 2, '#d63a2f'); // tulip
    r(93 + C, 41 - stem - 3, 1, 1, '#d63a2f');
    r(95 + C, 41 - stem - 3, 1, 1, '#d63a2f');
  }
  if (stage >= 4) {
    r(95 + C + sway, 41 - stem - 1, 3, 2, '#e8473c'); // second tulip
    r(95 + C + sway, 41 - stem - 2, 1, 1, '#e8473c');
    r(97 + C + sway, 41 - stem - 2, 1, 1, '#e8473c');
  }

  // ---------- Extra decorations for wider rooms ----------
  // A suzani-style wall hanging (red cloth, golden border, blue & cream flowers) between lantern and window.
  const leftGap = WX - 4 - 58;
  if (leftGap >= 26) {
    const hx = 58 + Math.round((leftGap - 20) / 2);
    r(hx - 1, 12, 22, 1, '#5b3a1d'); // rod
    r(hx, 13, 20, 26, '#e0a040');
    r(hx + 1, 14, 18, 24, '#b8322a');
    for (const [dx, dy] of [[4, 4], [12, 4], [8, 12], [4, 19], [12, 19]]) {
      r(hx + dx, 14 + dy, 4, 4, '#2a6fa8');
      r(hx + dx + 1, 14 + dy + 1, 2, 2, '#f3e3bd');
    }
    for (let i = 0; i < 5; i++) r(hx + 2 + i * 4, 39, 1, 2, '#e0a040'); // tassels
  }
  // Between the window and the crafting table: a floor plant and a wall clock showing UK time.
  const rightGap = cx - 3 - (WX + 48);
  if (rightGap >= 16) {
    const px = WX + 48 + Math.round((rightGap - 10) / 2);
    r(px + 2, 70, 7, 6, '#c0603a'); // pot
    r(px + 1, 69, 9, 1, '#a04a2a');
    r(px + 5, 52, 1, 17, '#3f7a26');
    for (let i = 0; i < 5; i++) {
      r(px + (i % 2 ? 6 : 1), 54 + i * 3, 4, 1, '#5fa83b');
      r(px + (i % 2 ? 6 : 2), 53 + i * 3, 2, 1, '#8ad35e');
    }
    if (rightGap >= 30) {
      const ccx = px + 5;
      const ccy = 24;
      r(ccx - 5, ccy - 6, 11, 13, '#4a2e15');
      r(ccx - 4, ccy - 5, 9, 11, '#f3ead2');
      r(ccx, ccy - 5, 1, 1, '#4a2e15'); // 12 o'clock mark
      r(ccx, ccy + 5, 1, 1, '#4a2e15'); // 6
      // Hands: real UK time, snapped to pixels
      const hourAngle = (((hour % 12) + minute / 60) / 12) * Math.PI * 2;
      const minAngle = (minute / 60) * Math.PI * 2;
      for (let i = 1; i <= 2; i++) r(ccx + Math.round(Math.sin(hourAngle) * i), ccy - Math.round(Math.cos(hourAngle) * i), 1, 1, '#2b1d0e');
      for (let i = 1; i <= 4; i++) r(ccx + Math.round(Math.sin(minAngle) * i), ccy - Math.round(Math.cos(minAngle) * i), 1, 1, '#c0392b');
      r(ccx, ccy, 1, 1, '#2b1d0e');
    }
  }

  // ---------- Cabin-shop items on the walls, window and ceiling ----------
  if (decor.wallA) drawDecor(ctx, decor.wallA, 38, 29);
  if (decor.wallB) drawDecor(ctx, decor.wallB, cx + 4, 31);
  if (decor.window === 'curtains') {
    curtain(ctx, WX - 7, 8, 5, 38);
    curtain(ctx, WX + 46, 8, 5, 38);
  }
  if (decor.ceiling) drawDecor(ctx, decor.ceiling, WX + 9, 4);

  // ---------- Unlocked: hanging plant (Lv 4) and fairy lights (Lv 6) ----------
  if (has.has('hangingPlant')) {
    const hx = WX + 52;
    r(hx + 3, 4, 1, 8, '#6e4522');
    r(hx, 12, 7, 4, '#c0603a');
    r(hx - 1, 12, 9, 1, '#a04a2a');
    r(hx - 1, 16, 1, 5, '#3f7a26');
    r(hx + 2, 16, 1, 8 + (motion && levels.wind > 0 && frame % 10 < 3 ? 1 : 0), '#5fa83b');
    r(hx + 5, 16, 1, 6, '#3f7a26');
    r(hx + 7, 15, 1, 4, '#5fa83b');
    r(hx + 1, 19, 1, 1, '#8ad35e');
    r(hx + 4, 21, 1, 1, '#8ad35e');
  }
  if (has.has('lights')) r(3, 5, W - 6, 1, '#3a2a1a'); // wire (bulbs are drawn later so they glow)

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
  if (has.has('lamp')) {
    r(13, 24, 6, 2, '#3a3a3a'); // reading lamp (Lv 3) — shade is lit later
    r(15, 19, 2, 5, '#3a3a3a');
  }
  // A pile of books on the floor that grows with your study streak (up to 6).
  const pile = Math.min(6, scene.studyStreak);
  for (let i = 0; i < pile; i++) r(23 + (i % 2), 81 - i * 2, 9, 2, ['#c0392b', '#2e86c1', '#27ae60', '#8e44ad', '#e67e22', '#16a085'][i]);
  if (decor.shelf) drawDecor(ctx, decor.shelf, 23, 17);
  if (decor.toy) drawDecor(ctx, decor.toy, 30, 85);

  // ---------- Chest ----------
  r(37, 57, 20, 20, '#3b2512');
  r(38, 58, 18, 6, '#8a5a2e');
  r(38, 58, 18, 1, '#b07a3e');
  r(38, 64, 18, 12, '#b07a3e');
  r(38, 68, 18, 1, '#8a5a2e');
  r(38, 72, 18, 1, '#8a5a2e');
  r(38, 63, 18, 1, '#3a3a3a');
  r(38, 58, 2, 18, '#4a4a4a');
  r(54, 58, 2, 18, '#4a4a4a');
  r(45, 62, 4, 5, '#e0b030');
  r(46, 64, 2, 2, '#3b2512');
  if (motion && frame % 40 < 3) r(42, 60, 1, 1, '#ffffff');

  // ---------- Crafting table ----------
  r(cx, 55, 24, 24, '#3b2512');
  for (let i = 0; i < 3; i++) r(cx + 1 + i * 7, 56, 7, 6, i % 2 ? '#d8ab70' : '#b98a52');
  r(cx + 1, 62, 22, 16, '#9c6b3c');
  r(cx + 1, 62, 22, 1, '#5b3a1d');
  r(cx + 1, 62, 2, 16, '#6e4522');
  r(cx + 21, 62, 2, 16, '#6e4522');
  r(cx + 5, 66, 6, 3, '#b5b5b5'); // saw
  r(cx + 11, 66, 2, 3, '#6e4522');
  r(cx + 15, 65, 1, 6, '#6e4522'); // hammer
  r(cx + 13, 65, 5, 2, '#8c8c8c');

  // Choynak (blue & white teapot) and a piyola (bowl cup) on the chest lid — unless Simba is sitting there.
  const teaX = 39;
  const showTea = has.has('teapot') && scene.simba !== 'worried';
  if (showTea) {
    r(teaX + 1, 53, 6, 4, '#2a6fa8');
    r(teaX + 2, 52, 4, 1, '#2a6fa8');
    r(teaX + 3, 51, 2, 1, '#f3ead2');
    r(teaX + 7, 54, 2, 1, '#2a6fa8');
    r(teaX + 9, 53, 1, 1, '#2a6fa8');
    r(teaX, 54, 1, 2, '#1d4f7a');
    r(teaX + 2, 54, 1, 1, '#f3ead2');
    r(teaX + 5, 55, 1, 1, '#f3ead2');
    r(teaX + 12, 55, 5, 2, '#f3ead2');
    r(teaX + 13, 56, 3, 1, '#2a6fa8');
  }
  if (season === 'autumn') {
    // A little basket of pomegranates (anor) and a quince — autumn at home
    const bk = fx - 8;
    r(bk, 82, 7, 4, '#9c6b3c');
    r(bk, 83, 7, 1, '#7a5230');
    r(bk + 1, 80, 2, 2, '#b8322a');
    r(bk + 3, 79, 2, 3, '#c0392b');
    r(bk + 5, 80, 2, 2, '#e8c21a');
    r(bk + 3, 78, 1, 1, '#7a1f1a');
  }

  if (decor.table === 'samovar') drawDecor(ctx, 'samovar', cx + 8, 45);
  if (decor.table === 'plov') drawDecor(ctx, 'plov', cx + 6, 50);

  // ---------- Fireplace (stone) ----------
  const stone = (x0: number, y0: number, w: number, h: number) => {
    r(x0, y0, w, h, '#8c8c8c');
    for (let y = y0; y < y0 + h; y += 4) {
      const off = ((y / 4) % 2) * 4;
      r(x0, y, w, 1, '#6b6b6b');
      for (let x = x0 + off - 8; x < x0 + w; x += 8) {
        const t = rand((x - R) * 3 + y * 17);
        if (t > 0.7) r(Math.max(x0, x + 1), y + 1, Math.min(7, x0 + w - x - 1), 3, '#a3a3a3');
        else if (t < 0.2) r(Math.max(x0, x + 1), y + 1, Math.min(7, x0 + w - x - 1), 3, '#7a7a7a');
        if (x >= x0) r(x, y + 1, 1, 3, '#6b6b6b');
      }
    }
  };
  stone(fx + 6, 0, 22, 30); // chimney
  stone(fx, 34, 34, 40);
  r(fx - 2, 30, 38, 4, '#5b3a1d'); // mantel
  r(fx - 2, 30, 38, 1, '#7e5426');
  r(fx + 6, 48, 22, 26, '#1a1110'); // opening
  r(fx + 7, 49, 20, 24, '#2a1712');
  r(fx - 2, 74, 38, 2, '#6b6b6b');
  // A little framed picture of home (blue domes, sandy walls) on the mantel
  r(fx + 12, 19, 12, 11, '#4a2e15');
  r(fx + 13, 20, 10, 9, '#8fd3ff');
  r(fx + 14, 22, 1, 6, '#e8cf96');
  r(fx + 21, 22, 1, 6, '#e8cf96');
  r(fx + 17, 22, 2, 1, '#2a8fd8');
  r(fx + 16, 23, 4, 3, '#2a8fd8');
  r(fx + 15, 26, 6, 3, '#e8cf96');
  r(fx + 17, 27, 2, 2, '#7a4e2a');
  r(fx + 2, 26, 2, 4, '#f3ead2'); // candle
  r(fx + 28, 26, 3, 4, '#5fa83b'); // tiny cactus
  if (has.has('trophy')) {
    r(fx + 6, 24, 5, 3, '#e8c21a');
    r(fx + 5, 24, 1, 2, '#e8c21a');
    r(fx + 11, 24, 1, 2, '#e8c21a');
    r(fx + 7, 27, 3, 1, '#c9a00f');
    r(fx + 6, 28, 5, 2, '#8a6420');
  }
  r(fx + 27, 27, 1, 1, '#5fa83b');

  // ---------- Lantern (hanging) ----------
  r(47, 4, 1, 8, '#3a3a3a');
  r(45, 12, 5, 2, '#2b2b2b');
  r(45, 20, 5, 1, '#2b2b2b');

  // ---------- Prayer mat (the Pray station): green with a golden border and an arch (mihrab) ----------
  const m = 60 + C;
  r(m, 82, 40, 10, '#2f6b3a');
  r(m, 82, 40, 1, '#e0b030');
  r(m, 91, 40, 1, '#e0b030');
  r(m, 82, 1, 10, '#e0b030');
  r(m + 39, 82, 1, 10, '#e0b030');
  r(m + 30, 85, 6, 5, '#9e3b2f'); // arch
  r(m + 31, 84, 4, 1, '#9e3b2f');
  r(m + 32, 86, 2, 4, '#1f4a28');
  for (let i = 0; i < 3; i++) r(m + 6 + i * 7, 86, 3, 2, '#e0b030'); // pattern
  for (let y = 83; y < 91; y += 2) {
    r(m - 1, y, 1, 1, '#e0b030'); // tassels
    r(m + 40, y, 1, 1, '#e0b030');
  }

  // ---------- Ko'rpacha cushion by the fire (Lv 5) ----------
  if (has.has('cushion')) {
    ['#b8322a', '#e0b030', '#2a6fa8', '#e0b030', '#b8322a', '#2f6b3a', '#b8322a'].forEach((col, i) => r(fx + 1 + i * 2, 80, 2, 4, col));
    r(fx + 1, 84, 14, 1, '#6e4522');
  }

  // ---------- Simba, the ginger cat ----------
  const spot = simbaSpot(W, scene.simba);
  const fur = { c: '#d98a3a', d: '#a85f22', e: phase === 'night' ? '#7ed957' : '#2b1d0e', p: '#f2a6a0', t: '#d98a3a' } as Record<string, string>;
  if (scene.simba === 'sleep' && has.has('basket')) {
    r(spot.x - 3, 86, 17, 4, '#b07a3e'); // his basket (Lv 10)
    r(spot.x - 3, 87, 17, 1, '#8a5a2e');
  }
  if (spot.sitting) {
    SIMBA_SIT.forEach((row, yy) => [...row].forEach((ch, xx) => ch !== '.' && r(spot.x + xx, spot.y + yy, 1, 1, fur[ch])));
    if (scene.simba === 'worried') r(spot.x + 7, spot.y + 2, 1, 2, '#9fdcff'); // a little sweat drop
    if (scene.simba === 'prayer' && motion && frame % 30 < 15) r(spot.x + 2, spot.y + 2, 1, 1, fur.c); // a slow blink
  } else {
    const breathe = motion && frame % 24 < 12 ? 1 : 0;
    const k = spot.x;
    r(k, spot.y + 2 - breathe, 10, 4 + breathe, fur.c); // curled body
    r(k + 8, spot.y + 1, 4, 4, fur.c); // head
    r(k + 8, spot.y, 1, 1, fur.c);
    r(k + 11, spot.y, 1, 1, fur.c);
    r(k - 3, spot.y + 4, 3, 1, fur.c); // tail
    r(k + 3, spot.y + 3, 1, 3, fur.d);
    r(k + 6, spot.y + 3, 1, 3, fur.d);
    r(k + 10, spot.y + 3, 1, 1, '#2b1d0e'); // closed eye
    r(k + 11, spot.y + 4, 1, 1, fur.p);
    if (motion) {
      // little floating "z"s
      const zy = spot.y - 3 - ((frame >> 2) % 6);
      r(k + 12, zy, 3, 1, '#f3ead2');
      r(k + 13, zy + 1, 1, 1, '#f3ead2');
      r(k + 12, zy + 2, 3, 1, '#f3ead2');
    }
  }

  // ---------- Telescope (the Reflect station), pointing at the window ----------
  for (let i = 0; i <= 12; i++) {
    r(tx + 7 - Math.round(i * 0.45), 67 + i, 1, 1, '#4a2e15'); // left leg
    r(tx + 7 + Math.round(i * 0.45), 67 + i, 1, 1, '#4a2e15'); // right leg
  }
  r(tx + 7, 67, 1, 11, '#5b3a1d'); // middle leg
  r(tx + 5, 64, 4, 3, '#3a3a3a'); // mount
  for (let i = 0; i <= 11; i++) r(tx + i, 64 - i, 3, 3, i % 4 === 0 ? '#8a6420' : '#c9a04a'); // brass tube
  r(tx - 2, 65, 3, 2, '#2b2b2b'); // eyepiece
  r(tx + 12, 51, 3, 3, '#3a3a3a'); // lens rim
  r(tx + 13, 52, 1, 1, phase === 'night' ? '#fff3b0' : '#9fdcff'); // lens glint

  // ---------- Light: darken the room at night, then add warm glows ----------
  const dark = phase === 'night' ? 0.55 : phase === 'day' ? 0 : 0.3;
  if (dark > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(10,12,35,${dark})`;
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.rect(WX, WY, WW, WH);
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
  glow(fx + 17, 64, phase === 'day' ? 30 : 60, (phase === 'day' ? 0.12 : 0.32) + wobble);
  glow(47, 17, phase === 'day' ? 12 : 30, (phase === 'day' ? 0.1 : 0.25) + wobble);
  if (has.has('lamp') && phase !== 'day') glow(16, 18, 26, 0.22 + wobble);
  if (decor.ceiling === 'fonar' && phase !== 'day') {
    glow(WX + 11, 10, 14, 0.25 + wobble);
    glow(WX + 25, 10, 14, 0.25 + wobble);
  }

  // ---------- Light sources (drawn last so they stay bright) ----------
  r(fx + 9, 71, 16, 3, '#6e4522'); // logs
  r(fx + 11, 69, 12, 2, '#5b3a1d');
  r(fx + 9, 71, 2, 3, '#c99a5f');
  r(fx + 23, 71, 2, 3, '#c99a5f');
  const fireSize = 0.75 + levels.fire * 0.12; // louder fire = bigger flames
  for (let x = fx + 10; x < fx + 24; x++) {
    const h = Math.min(21, Math.max(2, Math.round((5 + rand((x - R) * 13 + flick) * 8 - Math.abs(x - (fx + 17)) * 0.7) * fireSize)));
    r(x, 70 - h, 1, h, '#e8501a');
    r(x, 70 - Math.floor(h * 0.7), 1, Math.floor(h * 0.7), '#ffa53a');
    r(x, 70 - Math.floor(h * 0.35), 1, Math.floor(h * 0.35), '#ffe27a');
  }
  if (motion) {
    for (let i = 0; i < 3; i++) {
      const y = 66 - ((frame * 1.5 + i * 9) % 18);
      r(fx + 12 + i * 4 + (((frame + i) % 3) - 1), Math.round(y), 1, 1, '#ffb347');
    }
  }
  r(fx + 2, 24, 2, 2, motion && frame % 6 < 3 ? '#ffd27a' : '#ffb347'); // candle flame
  r(45, 14, 5, 6, motion && frame % 5 < 2 ? '#ffe39a' : '#ffc35a'); // lantern glass
  // ---------- Bek (drawn last so nothing — not even the fire — covers him) ----------
  const bek = bekSpot(W, scene.simba);
  const pose = BEK_POSE[scene.simba];
  drawBek(ctx, bek.x, bek.y, pose, scene.avatar, motion && frame % 40 === 0, BEK_SCALE, dark * 0.45);
  if (pose === 'tea' && motion) r(bek.x + 15, bek.y + 18 - ((frame >> 1) % 6), 1, 1, 'rgba(255,255,255,0.6)'); // steam from his tea
  if (has.has('lamp')) {
    r(12, 15, 8, 4, phase === 'day' ? '#e0a040' : '#ffcf6a'); // lamp shade
    r(13, 14, 6, 1, '#c98a30');
  }
  if (has.has('lights')) {
    const bulbs = ['#ffd27a', '#ff8c6a', '#9fdcff', '#b8f28a'];
    for (let x = 6, i = 0; x < W - 6; x += 6, i++) {
      const dim = motion && (frame + i * 3) % 16 < 2;
      r(x, 6, 1, 1, dim ? '#6b5a3a' : bulbs[i % 4]);
    }
  }
  if (showTea && motion) {
    // steam from the choynak
    const sy = 49 - ((frame >> 1) % 6);
    r(teaX + 4 + ((frame >> 2) % 2), sy, 1, 1, 'rgba(255,255,255,0.55)');
  }
  r(45, 14, 1, 6, '#2b2b2b');
  r(49, 14, 1, 6, '#2b2b2b');
}

interface Station {
  href: string;
  label: string;
  sub: string;
  icon: IconName;
  /** Position on the scene, in scene pixels */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Sign above (default) or below the object — the chest's sign goes below so signs never overlap on phones. */
  sign?: 'top' | 'bottom';
}

function stations(W: number): Station[] {
  const { telescopeX, tableX } = layout(W);
  return [
    { href: '#/study', label: 'Study', sub: 'Bookshelf', icon: 'shelf', x: 6, y: 24, w: 30, h: 50 },
    { href: '#/money', label: 'Money', sub: 'Chest', icon: 'chest', x: 35, y: 55, w: 24, h: 24, sign: 'bottom' },
    { href: '#/reflect', label: 'Reflect', sub: 'Telescope', icon: 'telescope', x: telescopeX - 3, y: 49, w: 21, h: 32 },
    { href: '#/prayer', label: 'Pray', sub: 'Prayer mat', icon: 'mat', x: telescopeX - 6, y: 81, w: 42, h: 12 },
    { href: '#/planner', label: 'Planner', sub: 'Crafting table', icon: 'table', x: tableX - 2, y: 53, w: 28, h: 28 },
  ];
}

export function Cabin({
  scene,
  bubble,
  onPetSimba,
  bekBubble,
  onTapBek,
}: {
  scene: CabinScene;
  bubble?: string | null;
  onPetSimba?: () => void;
  bekBubble?: string | null;
  onTapBek?: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLCanvasElement>(null);
  const [W, setW] = useState(BASE_W);

  // Work out how wide the room should be so it exactly fills the box (no stretching).
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const { width, height } = box.getBoundingClientRect();
      if (width && height) setW(Math.min(MAX_W, Math.max(BASE_W, Math.round((H * width) / height))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!motion) {
      // Still picture, refreshed once a minute so the sky and clock keep up with the time.
      draw(ctx, W, new Date(), 0, scene, false);
      const id = setInterval(() => draw(ctx, W, new Date(), 0, scene, false), 60_000);
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
        draw(ctx, W, new Date(), frame, scene, true);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [scene, W]);

  const { phase } = skyAt(new Date());
  const words: Record<SkyPhase, string> = { night: 'a starry night', dawn: 'sunrise', day: 'daytime', dusk: 'sunset' };

  return (
    <div className="cabin" ref={boxRef}>
      <canvas
        ref={ref}
        width={W}
        height={H}
        className="cabin__canvas"
        role="img"
        aria-label={`Your cosy cabin with a fire. Outside the window it is ${words[phase]} in Sheffield.`}
      />
      {stations(W).map((s) => (
        <a
          key={s.href}
          href={s.href}
          className={`station ${s.sign === 'bottom' ? 'station--sign-bottom' : ''}`}
          style={{ left: `${(s.x / W) * 100}%`, top: `${(s.y / H) * 100}%`, width: `${(s.w / W) * 100}%`, height: `${(s.h / H) * 100}%` }}
          aria-label={`${s.sub}: open ${s.label}`}
        >
          <span className="station__sign">
            <PixelIcon name={s.icon} size={14} />
            {s.label}
          </span>
        </a>
      ))}
      {(() => {
        const s = simbaSpot(W, scene.simba);
        const box = { x: s.x - 3, y: s.y - 2, w: s.sitting ? 13 : 17, h: s.sitting ? 13 : 9 };
        return (
          <>
            <button
              type="button"
              className="simba"
              style={{ left: `${(box.x / W) * 100}%`, top: `${(box.y / H) * 100}%`, width: `${(box.w / W) * 100}%`, height: `${(box.h / H) * 100}%` }}
              onClick={onPetSimba}
              aria-label="Simba the cat. Tap to pet him."
            />
            <span className="simba-name" style={{ left: `${((box.x + box.w / 2) / W) * 100}%`, top: `${(box.y / H) * 100}%` }} aria-hidden="true">
              <PixelIcon name="cat" size={10} />
              Simba
            </span>
            {bubble && (
              <p className="simba-bubble" style={{ left: `${Math.min(80, Math.max(20, ((box.x + box.w / 2) / W) * 100))}%`, top: `${(box.y / H) * 100}%` }} role="status">
                {bubble}
              </p>
            )}
          </>
        );
      })()}
      {(() => {
        const b = bekSpot(W, scene.simba);
        // Only his upper body is the tap area, so the prayer mat underneath stays tappable.
        const box = { x: b.x - 2, y: b.y, w: BEK_W * BEK_SCALE + 4, h: 22 };
        const cx = ((box.x + box.w / 2) / W) * 100;
        return (
          <>
            <button
              type="button"
              className="simba"
              style={{ left: `${(box.x / W) * 100}%`, top: `${(box.y / H) * 100}%`, width: `${(box.w / W) * 100}%`, height: `${(box.h / H) * 100}%` }}
              onClick={onTapBek}
              aria-label="Bek (that's you!). Tap for how your day is going."
            />
            <span className="simba-name simba-name--bek" style={{ left: `${cx}%`, top: `${(box.y / H) * 100}%` }} aria-hidden="true">
              Bek
            </span>
            {bekBubble && (
              <p className="simba-bubble simba-bubble--bek" style={{ left: `${Math.min(80, Math.max(20, cx))}%`, top: `${(box.y / H) * 100}%` }} role="status">
                {bekBubble}
              </p>
            )}
          </>
        );
      })()}
    </div>
  );
}
