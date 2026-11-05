/**
 * 🎣 The pond behind the cabin. Casts are earned (1 per Pomodoro, 1 per day with
 * all five prayers). Cast → wait for the bobber to dip → tap "Reel in!" fast →
 * a fish for your fish book. If you're too slow it gets away, but you keep the cast.
 */
import { useEffect, useRef, useState } from 'react';
import { seasonOf, type Season } from '../lib/cabin';
import { formatDay } from '../lib/dates';
import { casts, catchFish, FISH, fullPrayerDay, type Fish } from '../lib/fish';
import { uid } from '../lib/id';
import type { Avatar } from '../lib/types';
import { buzz, sfx } from '../lib/sound';
import { BEK_H, drawBek, skyAt } from '../scene/Cabin';
import { useStore } from '../state/store';
import { PixelArt, PixelIcon } from '../ui/icons';
import { Panel } from '../ui/kit';

const W = 160;
const H = 90;

const FISH_ART = ['..ff......', '.fbbbb...f', 'bbbbebb.ff', 'bbbbbbbbff', '.bbbbbb..f', '..ff......'];
const BOOT_ART = ['..bbb.....', '..bfb.....', '..bbb.....', '..bbbbbbb.', '..bbbbbbbb', '..ffffffff'];

export function FishSprite({ fish, size = 48, hidden = false }: { fish: Fish; size?: number; hidden?: boolean }) {
  const palette = hidden ? { b: '#3b2a1a', f: '#3b2a1a', e: '#3b2a1a' } : { b: fish.colour, f: fish.fin, e: '#1a1110' };
  return <PixelArt rows={fish.id === 'boot' ? BOOT_ART : FISH_ART} palette={palette} size={size} label={hidden ? 'Not caught yet' : fish.name} />;
}

type Phase = 'idle' | 'waiting' | 'bite' | 'caught' | 'missed';

function drawPond(ctx: CanvasRenderingContext2D, frame: number, phase: Phase, avatar: Avatar, season: Season) {
  const r = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  const sky = skyAt(new Date()).phase;
  const night = sky === 'night';
  const skyCols = { night: ['#0b1030', '#28336e'], dawn: ['#4a5aa0', '#f6a76a'], day: ['#4fa8ea', '#bfe6fb'], dusk: ['#3b3f8f', '#f08a5d'] }[sky];
  for (let i = 0; i < 12; i++) r(0, i * 4, W, 4, i < 6 ? skyCols[0] : skyCols[1]);
  if (night) for (let i = 0; i < 25; i++) r((i * 53) % W, (i * 17) % 34, 1, 1, '#fff8d0');
  else r(126, 8, 6, 6, '#ffd84a');
  // hills
  const hill = season === 'winter' ? '#dfe8f0' : season === 'autumn' ? '#8a7a3a' : '#6cbf45';
  for (let x = 0; x < W; x++) {
    const h = 10 + Math.round(Math.sin(x * 0.05) * 4 + Math.sin(x * 0.13) * 2);
    r(x, 46 - h, 1, h, night ? '#1f3b2a' : hill);
  }
  // the cabin on the left, with a lit window and smoke from the chimney
  r(6, 26, 30, 20, '#7a4e2a');
  r(4, 22, 34, 5, '#5b3a1d');
  r(14, 31, 8, 7, night ? '#ffcf6a' : '#8fd3ff');
  r(28, 16, 4, 8, '#8c8c8c');
  r(29, 12 - ((frame >> 2) % 4), 2, 2, 'rgba(220,220,220,0.6)');
  // grass + water
  r(0, 46, W, 44, night ? '#1c3a24' : season === 'winter' ? '#e8eef5' : '#4f9a35');
  ctx.fillStyle = night ? '#1a2a55' : '#3a8fd8';
  ctx.beginPath();
  ctx.ellipse(100, 70, 58, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 8; i++) r(60 + ((i * 23 + frame) % 80), 62 + ((i * 7) % 16), 4, 1, night ? '#3a4a80' : '#8fd3ff');
  for (const x of [44, 47, 150, 153]) r(x, 54, 1, 10, '#3f7a26'); // reeds
  // jetty
  r(40, 64, 34, 3, '#8a5a2e');
  for (let x = 40; x < 74; x += 5) r(x, 64, 1, 3, '#5b3a1d');
  r(42, 67, 2, 8, '#5b3a1d');
  r(70, 67, 2, 8, '#5b3a1d');
  // Bek on the jetty, rod out over the water
  const bx = 58;
  const by = 64 - BEK_H;
  drawBek(ctx, bx, by, 'stand', avatar, frame % 40 === 0, 1, night ? 0.3 : 0);
  for (let i = 0; i < 14; i++) r(bx + 8 + i, by + 9 - Math.round(i * 0.6), 1, 1, '#6e4522'); // rod
  if (phase !== 'idle') {
    const tipX = bx + 21;
    const tipY = by + 1;
    const bobX = 104;
    const bobY = 68 + (phase === 'bite' ? (frame % 2 ? 2 : 1) : frame % 6 < 3 ? 0 : 1);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.quadraticCurveTo((tipX + bobX) / 2, tipY + 20, bobX + 1, bobY);
    ctx.stroke();
    r(bobX, bobY - 2, 3, 2, '#d64541');
    r(bobX, bobY, 3, 1, '#ffffff');
    if (phase === 'bite') {
      r(bobX - 3, bobY - 12, 2, 6, '#ffd93b'); // "!"
      r(bobX - 3, bobY - 4, 2, 2, '#ffd93b');
      r(bobX - 4, bobY + 2, 11, 1, '#bfe6fb'); // splash ring
    }
  }
}

export default function Pond() {
  const { data, update, today, gainXp, toast } = useStore();
  const ref = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [last, setLast] = useState<Fish | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { left, earned } = casts(data);
  const season = seasonOf(today);
  const night = skyAt(new Date()).phase === 'night';
  const full = fullPrayerDay(data, today);
  const avatar = data.settings.avatar;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    const tick = () => drawPond(ctx, frame++, phase, avatar, season);
    tick();
    const id = setInterval(tick, phase === 'bite' ? 90 : 160);
    return () => clearInterval(id);
  }, [phase, avatar, season]);

  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  const stopTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const cast = () => {
    if (left <= 0) return;
    sfx('pop');
    setPhase('waiting');
    later(() => {
      setPhase('bite');
      sfx('bead');
      buzz([30, 40, 30]);
      later(() => setPhase((p) => (p === 'bite' ? 'missed' : p)), 1600);
    }, 1500 + Math.random() * 3500);
  };
  const reel = () => {
    stopTimers();
    if (phase === 'waiting') {
      setPhase('idle'); // pulled too early: nothing is used up
      toast('Too early! Wait for the bobber to dip.', 'info');
      return;
    }
    const fish = catchFish({ season, night, fullPrayer: full }, Math.random());
    const first = !data.catches.some((c) => c.fish === fish.id);
    update((d) => void d.catches.push({ id: uid(), fish: fish.id, date: today }));
    setLast(fish);
    setPhase('caught');
    sfx(fish.rarity === 'legend' ? 'levelup' : 'coin');
    if (first) gainXp(fish.rarity === 'legend' ? 50 : fish.rarity === 'rare' ? 20 : 5, `new fish: ${fish.name}`);
  };

  const count = (id: string) => data.catches.filter((c) => c.fish === id).length;
  const found = FISH.filter((f) => count(f.id) > 0).length;

  return (
    <div className="screen pond">
      <h1 className="screen__title">
        <PixelIcon name="fish" size={28} /> The Pond
      </h1>
      <div className="pond__scene">
        <canvas ref={ref} width={W} height={H} className="pond__canvas" role="img" aria-label="Bek fishing from a little jetty at the pond behind the cabin" />
        {phase === 'caught' && last && (
          <div className={`catch-card catch-card--${last.rarity}`} role="status">
            <FishSprite fish={last} size={72} />
            <strong>{last.name}</strong>
            <small>{last.rarity === 'legend' ? '★ LEGENDARY ★' : last.rarity === 'rare' ? 'Rare!' : last.rarity === 'junk' ? 'Well… it counts!' : 'Nice catch'}</small>
            <small className="muted">{last.note}</small>
          </div>
        )}
      </div>
      <div className="pond__controls">
        <p className="pond__casts">
          <PixelIcon name="fish" size={18} /> <strong>{left}</strong> cast{left === 1 ? '' : 's'} left
        </p>
        {phase === 'waiting' || phase === 'bite' ? (
          <button type="button" className={`btn btn--wide ${phase === 'bite' ? 'btn--primary pond__reel' : ''}`} onClick={reel}>
            {phase === 'bite' ? 'REEL IN!' : 'Waiting for a bite…'}
          </button>
        ) : (
          <button type="button" className="btn btn--primary btn--wide" onClick={cast} disabled={left <= 0}>
            {left <= 0 ? 'No casts left — finish a Pomodoro!' : phase === 'missed' ? 'It got away… cast again' : phase === 'caught' ? 'Cast again' : 'Cast the line'}
          </button>
        )}
        <p className="muted small">
          You've earned {earned} casts: 3 to start, +1 for every Pomodoro, +1 for every day with all five prayers.
          {full ? ' You prayed all five today, so the Golden fish might bite!' : ''}
        </p>
      </div>
      <Panel title={`Fish book · ${found}/${FISH.length}`} icon="book">
        <ul className="fish-book">
          {FISH.map((f) => {
            const n = count(f.id);
            const firstDay = data.catches.find((c) => c.fish === f.id)?.date;
            const hint = f.fullPrayer ? 'Bites on full-prayer days' : f.night ? 'Bites at night' : f.seasons ? `Only in ${f.seasons[0]}` : f.rarity === 'legend' ? 'Very rare' : 'Keep fishing';
            return (
              <li key={f.id} className={`fish-book__item fish-book__item--${f.rarity} ${n ? '' : 'is-unknown'}`}>
                <FishSprite fish={f} size={44} hidden={!n} />
                <strong>{n ? f.name : '???'}</strong>
                <small className="muted">{n && firstDay ? `×${n} · first ${formatDay(firstDay)}` : hint}</small>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
