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
import type { Mixer } from '../lib/types';
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

function draw(ctx: CanvasRenderingContext2D, W: number, now: Date, frame: number, levels: Mixer, motion: boolean) {
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

  // ---------- Window: sky, sun/moon, hills ----------
  const { x: WX, y: WY, w: WW, h: WH } = win;
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
  const isSun = hour >= sunrise && hour <= sunset;
  const nightLength = 24 - (sunset - sunrise);
  const progress = isSun ? (hour - sunrise) / (sunset - sunrise) : ((hour - sunset + 24) % 24) / nightLength;
  const bx = Math.round(WX + 2 + progress * (WW - 8));
  const by = Math.round(WY + 16 - Math.sin(progress * Math.PI) * 12);
  if (isSun) {
    r(bx - 1, by - 1, 6, 6, '#fff3b0');
    r(bx, by, 4, 4, '#ffd84a');
  } else {
    r(bx, by, 4, 4, '#f4f1de');
    r(bx + 2, by, 2, 2, mix(skyTop, skyBottom, 0.3)); // moon "bite"
  }
  if (phase !== 'night') {
    for (let c = 0; c < 2; c++) {
      const cloudX = WX - 10 + ((c * 27 + flick * (0.15 + levels.wind * 0.35)) % (WW + 14)); // wind = faster clouds
      const cloudY = WY + 5 + c * 7;
      const col = phase === 'day' ? '#ffffff' : '#f7c9b0';
      r(cloudX, cloudY + 1, 10, 2, col);
      r(cloudX + 2, cloudY, 5, 1, col);
    }
  }
  const [far, near] = HILLS[phase];
  for (let x = 0; x < WW; x++) {
    const hf = 7 + Math.round(Math.sin(x * 0.25) * 2 + Math.sin(x * 0.11) * 2);
    r(WX + x, WY + WH - hf, 1, hf, far);
    const hn = 3 + Math.round(Math.sin(x * 0.4 + 1) * 1.5);
    r(WX + x, WY + WH - hn, 1, hn, near);
  }
  r(WX + 32, WY + 20, 4, 3, phase === 'night' ? '#3a3040' : '#d9d0c0'); // house
  r(WX + 31, WY + 19, 6, 1, '#7a3b2e');
  r(WX + 33, WY + 21, 1, 1, phase === 'night' || phase === 'dusk' ? '#ffd27a' : '#6a7a8a');
  r(WX + 9, WY + 19, 1, 4, '#4a2e15'); // tree
  r(WX + 7, WY + 15, 5, 4, near);
  if (levels.rain > 0) {
    for (let i = 0; i < levels.rain * 4; i++) { // more rain volume = more drops
      const x = WX + Math.floor(rand(i * 7) * WW);
      const y = WY + ((Math.floor(rand(i * 3) * WH) + flick * 3) % WH);
      r(x, y, 1, 3, 'rgba(190,220,255,0.75)');
    }
  }
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
  r(92 + C, 42, 6, 4, '#c0603a');
  r(91 + C, 41, 8, 1, '#a04a2a');
  const sway = motion && levels.wind > 0 && frame % Math.max(3, 12 - levels.wind) < 2 ? 1 : 0; // leaves wobble in the wind
  r(93 + C, 37, 1, 4, '#3f7a26');
  r(95 + C + sway, 35, 1, 6, '#5fa83b');
  r(97 + C, 38, 1, 3, '#3f7a26');
  r(94 + C, 36, 1, 1, '#5fa83b');
  r(96 + C, 37, 1, 1, '#5fa83b');

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

  // ---------- Sleeping cat (next to the mat) ----------
  const breathe = motion && frame % 24 < 12 ? 1 : 0;
  const k = 104 + C; // cat x
  r(k, 85 - breathe, 10, 4 + breathe, '#5a5a66');
  r(k + 8, 84, 4, 4, '#5a5a66');
  r(k + 8, 83, 1, 1, '#5a5a66');
  r(k + 11, 83, 1, 1, '#5a5a66');
  r(k - 3, 87, 3, 1, '#5a5a66');
  r(k + 3, 86, 1, 3, '#46464f');
  r(k + 6, 86, 1, 3, '#46464f');
  r(k + 10, 86, 1, 1, '#2b2b2b');

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

export function Cabin({ mix }: { mix: Mixer }) {
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
      draw(ctx, W, new Date(), 0, mix, false);
      const id = setInterval(() => draw(ctx, W, new Date(), 0, mix, false), 60_000);
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
        draw(ctx, W, new Date(), frame, mix, true);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mix, W]);

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
    </div>
  );
}
