/**
 * Real Sheffield weather: a tiny shared store + hook, and the 7-day card.
 * Fetches from Open-Meteo at most every 30 minutes and keeps the last forecast
 * in localStorage, so it still shows (marked as old) when you're offline.
 */
import { useEffect, useState } from 'react';
import { weekdayOf, WEEKDAYS } from '../lib/dates';
import { parseWeather, WEATHER_INFO, WEATHER_URL, weatherKind, type Weather, type WeatherKind } from '../lib/weather';
import { PixelIcon } from './icons';
import { Empty, Panel } from './kit';

const KEY = 'beks-weather';
const FRESH_MS = 30 * 60_000;

function readCache(): Weather | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null') as Weather | null;
  } catch {
    return null;
  }
}

let current: Weather | null = readCache();
let inflight: Promise<void> | null = null;
const listeners = new Set<(w: Weather | null) => void>();

function refresh(): Promise<void> {
  if (inflight) return inflight;
  inflight = fetch(WEATHER_URL)
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
    .then((json) => {
      current = parseWeather(json);
      try {
        localStorage.setItem(KEY, JSON.stringify(current));
      } catch {
        /* storage full or blocked: keep it in memory only */
      }
      listeners.forEach((l) => l(current));
    })
    .catch(() => {
      /* offline or the service is down: keep showing the last forecast */
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** The latest forecast (or null if we've never managed to get one). */
export function useWeather(): Weather | null {
  const [w, setW] = useState(current);
  useEffect(() => {
    listeners.add(setW);
    const check = () => {
      if (navigator.onLine !== false && (!current || Date.now() - current.fetched > FRESH_MS)) void refresh();
    };
    check();
    const id = setInterval(check, 5 * 60_000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('online', check);
    return () => {
      listeners.delete(setW);
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('online', check);
    };
  }, []);
  return w;
}

/** What the cabin window should show now — only if the forecast is recent (under 3 hours old). */
export function windowWeather(w: Weather | null): WeatherKind | null {
  return w && Date.now() - w.fetched < 3 * 3600_000 ? weatherKind(w.current.code) : null;
}

export function WeatherCard() {
  const w = useWeather();
  if (!w) {
    return (
      <Panel title="Sheffield weather" icon="cloud">
        <Empty>Connect to the internet once to load the forecast.</Empty>
      </Panel>
    );
  }
  const now = WEATHER_INFO[weatherKind(w.current.code)];
  const old = Date.now() - w.fetched > 3 * 3600_000;
  const updated = new Date(w.fetched).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
  return (
    <Panel title="Sheffield weather" icon={now.icon}>
      <div className="weather-now">
        <PixelIcon name={now.icon} size={48} />
        <span className="weather-now__temp">{w.current.temp}°</span>
        <span className="weather-now__label">
          {now.label}
          <small className="muted">{old ? `last updated ${updated} (offline?)` : `updated ${updated}`}</small>
        </span>
      </div>
      <ol className="weather-week" aria-label="Next 7 days">
        {w.daily.map((d, i) => {
          const info = WEATHER_INFO[weatherKind(d.code)];
          return (
            <li key={d.date} className={i === 0 ? 'is-today' : ''}>
              <span className="weather-week__day">{i === 0 ? 'Today' : WEEKDAYS[weekdayOf(d.date)]}</span>
              <PixelIcon name={info.icon} size={26} title={info.label} />
              <span className="weather-week__temp">
                {d.max}°<small>{d.min}°</small>
              </span>
              <span className={`weather-week__rain ${d.rain >= 60 ? 'is-wet' : ''}`}>{d.rain}%</span>
            </li>
          );
        })}
      </ol>
      <p className="muted small">Rain % = chance of rain. Take an umbrella on blue days!</p>
    </Panel>
  );
}
