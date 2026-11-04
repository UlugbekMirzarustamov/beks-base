/**
 * Real Sheffield weather from Open-Meteo (free, no key, no account).
 * Only Sheffield's fixed location is sent — never anything about you.
 * The last forecast is kept in localStorage so it still shows offline.
 */
import type { IconName } from '../ui/icons';

export const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=53.38&longitude=-1.47' +
  '&current=temperature_2m,weather_code,is_day' +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
  '&timezone=Europe%2FLondon&forecast_days=7';

export interface Weather {
  fetched: number; // ms timestamp
  current: { temp: number; code: number; isDay: boolean };
  daily: { date: string; code: number; max: number; min: number; rain: number }[];
}

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';

/** WMO weather code → a simple kind (what the cabin window should show). */
export function weatherKind(code: number): WeatherKind {
  if (code === 0) return 'clear';
  if (code <= 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'rain'; // drizzle, rain, showers
}

export const WEATHER_INFO: Record<WeatherKind, { label: string; icon: IconName }> = {
  clear: { label: 'Clear', icon: 'sun' },
  partly: { label: 'Partly cloudy', icon: 'partly' },
  cloudy: { label: 'Cloudy', icon: 'cloud' },
  fog: { label: 'Foggy', icon: 'fog' },
  rain: { label: 'Rain', icon: 'rain' },
  snow: { label: 'Snow', icon: 'snow' },
  storm: { label: 'Thunderstorm', icon: 'storm' },
};

/** Turn Open-Meteo's JSON into our small Weather object (throws if it looks wrong). */
export function parseWeather(json: unknown, now = Date.now()): Weather {
  const j = json as {
    current: { temperature_2m: number; weather_code: number; is_day: number };
    daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: (number | null)[] };
  };
  if (!j?.current || !Array.isArray(j?.daily?.time)) throw new Error('Unexpected weather data');
  return {
    fetched: now,
    current: { temp: Math.round(j.current.temperature_2m), code: j.current.weather_code, isDay: j.current.is_day === 1 },
    daily: j.daily.time.map((date, i) => ({
      date,
      code: j.daily.weather_code[i],
      max: Math.round(j.daily.temperature_2m_max[i]),
      min: Math.round(j.daily.temperature_2m_min[i]),
      rain: j.daily.precipitation_probability_max[i] ?? 0,
    })),
  };
}
