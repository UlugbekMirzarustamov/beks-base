/**
 * The sound mixer: rain, fire and wind, each with its own "volume stairs" —
 * eight pixel steps that get taller as it gets louder. Tap or drag across the
 * steps, or use the arrow keys. The cabin reacts too: louder fire = bigger
 * flames, more rain = more drops at the window, more wind = racing clouds.
 */
import type { KeyboardEvent, PointerEvent } from 'react';
import { MAX_LEVEL, type Channel } from '../lib/sound';
import type { Mixer } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon, type IconName } from './icons';

const CHANNELS: { id: Channel; label: string; icon: IconName }[] = [
  { id: 'rain', label: 'Rain', icon: 'rain' },
  { id: 'fire', label: 'Fire', icon: 'flame' },
  { id: 'wind', label: 'Wind', icon: 'wind' },
];

const PRESETS: { label: string; mix: Mixer }[] = [
  { label: 'Cosy night', mix: { rain: 2, fire: 5, wind: 1 } },
  { label: 'Rainy study', mix: { rain: 6, fire: 2, wind: 0 } },
  { label: 'Storm outside', mix: { rain: 8, fire: 3, wind: 6 } },
];

/** One channel: a mute button + eight steps. Works like a slider. */
function VolumeStairs({ label, icon, value, onChange }: { label: string; icon: IconName; value: number; onChange: (v: number) => void }) {
  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    onChange(Math.max(1, Math.min(MAX_LEVEL, Math.ceil(((e.clientX - box.left) / box.width) * MAX_LEVEL))));
  };
  const onKey = (e: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (step) onChange(Math.max(0, Math.min(MAX_LEVEL, value + step)));
    else if (e.key === 'Home') onChange(0);
    else if (e.key === 'End') onChange(MAX_LEVEL);
    else return;
    e.preventDefault();
  };
  return (
    <div className="stairs-row">
      <button type="button" className={`icon-btn stairs-row__mute ${value === 0 ? 'is-off' : ''}`} onClick={() => onChange(value === 0 ? 3 : 0)} aria-label={value === 0 ? `Turn on ${label}` : `Mute ${label}`}>
        <PixelIcon name={icon} size={22} />
      </button>
      <span className="stairs-row__label">{label}</span>
      <div
        className="stairs"
        role="slider"
        tabIndex={0}
        aria-label={`${label} volume`}
        aria-valuemin={0}
        aria-valuemax={MAX_LEVEL}
        aria-valuenow={value}
        aria-valuetext={value === 0 ? 'off' : `${value} of ${MAX_LEVEL}`}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => e.buttons === 1 && fromPointer(e)}
      >
        {Array.from({ length: MAX_LEVEL }, (_, i) => (
          <span key={i} className={`stairs__step ${i < value ? 'is-on' : ''}`} style={{ height: `${30 + i * 10}%` }} />
        ))}
      </div>
      <span className="stairs-row__value" aria-hidden="true">
        {value === 0 ? 'off' : value}
      </span>
    </div>
  );
}

export function SoundMixer() {
  const { data, update } = useStore();
  const mix = data.settings.mixer;
  const set = (patch: Partial<Mixer>) => update((d) => void (d.settings.mixer = { ...d.settings.mixer, ...patch }));
  const silent = mix.rain + mix.fire + mix.wind === 0;

  return (
    <div className="mixer">
      {CHANNELS.map((c) => (
        <VolumeStairs key={c.id} label={c.label} icon={c.icon} value={mix[c.id]} onChange={(v) => set({ [c.id]: v })} />
      ))}
      <div className="mixer__presets">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="btn btn--small" onClick={() => set(p.mix)}>
            {p.label}
          </button>
        ))}
        <button type="button" className="btn btn--small btn--danger" onClick={() => set({ rain: 0, fire: 0, wind: 0 })} disabled={silent}>
          Quiet all
        </button>
      </div>
      <label className="check">
        <input type="checkbox" checked={data.settings.sfx} onChange={(e) => update((d) => void (d.settings.sfx = e.target.checked))} />
        <span>Little sounds (taps, bells, coins, Simba purring)</span>
      </label>
    </div>
  );
}
