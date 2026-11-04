/**
 * Prayer times for Sheffield, worked out on the device (works offline, no API).
 *
 * Uses the well-known sun-position method (as in PrayTimes.org) with:
 *  - Fajr when the sun is 18° below the horizon, Isha at 17° (Muslim World League),
 *  - Asr: Hanafi (shadow = 2× object, common in Uzbekistan) or standard (1×),
 *  - Maghrib at sunset,
 *  - the "angle-based" rule for high latitudes, so summer Fajr/Isha still exist
 *    in the UK when the sky never gets fully dark.
 * Mosques round or adjust differently, so each prayer has a +/- minutes offset in settings.
 */
import { addDays, UK_TZ, zonedParts } from './dates';
import type { PrayerName, PrayerSettings } from './types';

export const SHEFFIELD = { lat: 53.3811, lng: -1.4701 };
export const PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const PRAYER_INFO: Record<PrayerName, { name: string; arabic: string; rakat: string }> = {
  fajr: { name: 'Fajr', arabic: 'الفجر', rakat: '2 sunnah · 2 fard' },
  dhuhr: { name: 'Dhuhr', arabic: 'الظهر', rakat: '4 sunnah · 4 fard · 2 sunnah' },
  asr: { name: 'Asr', arabic: 'العصر', rakat: '4 fard' },
  maghrib: { name: 'Maghrib', arabic: 'المغرب', rakat: '3 fard · 2 sunnah' },
  isha: { name: 'Isha', arabic: 'العشاء', rakat: '4 fard · 2 sunnah · 3 witr' },
};

// ---- degree-based maths helpers ----
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const sin = (d: number) => Math.sin(rad(d));
const cos = (d: number) => Math.cos(rad(d));
const tan = (d: number) => Math.tan(rad(d));
const arcsin = (x: number) => deg(Math.asin(x));
const arccos = (x: number) => deg(Math.acos(x));
const arctan2 = (y: number, x: number) => deg(Math.atan2(y, x));
const arccot = (x: number) => deg(Math.atan(1 / x));
const fix = (a: number, b: number) => {
  const r = a - b * Math.floor(a / b);
  return r < 0 ? r + b : r;
};
const fixAngle = (a: number) => fix(a, 360);
const fixHour = (a: number) => fix(a, 24);

function julian(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

/** Sun's declination and the "equation of time" for a Julian date. */
function sunPosition(jd: number) {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * sin(g) + 0.02 * sin(2 * g));
  const e = 23.439 - 0.00000036 * D;
  const RA = arctan2(cos(e) * sin(L), cos(L)) / 15;
  return { decl: arcsin(sin(e) * sin(L)), eqt: q / 15 - fixHour(RA) };
}

/** UK clock offset from GMT on a date: 0 in winter, 1 in summer (BST). */
function ukOffsetHours(date: string): number {
  return zonedParts(new Date(`${date}T12:00:00Z`), UK_TZ).hour - 12;
}

/** Minutes after midnight (UK clock time). */
export interface DayTimes {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export function prayerTimes(date: string, settings: PrayerSettings, place = SHEFFIELD): DayTimes {
  const [y, m, d] = date.split('-').map(Number);
  const { lat, lng } = place;
  const jDate = julian(y, m, d) - lng / (15 * 24);

  const midDay = (t: number) => fixHour(12 - sunPosition(jDate + t).eqt);
  const sunAngleTime = (angle: number, t: number, before = false) => {
    const decl = sunPosition(jDate + t).decl;
    const T = arccos((-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat))) / 15;
    return midDay(t) + (before ? -T : T);
  };
  const asrTime = (factor: number, t: number) => {
    const decl = sunPosition(jDate + t).decl;
    return sunAngleTime(-arccot(factor + tan(Math.abs(lat - decl))), t);
  };
  const factor = settings.asr === 'hanafi' ? 2 : 1;

  // First guesses (hours), refined twice using the sun's position at those times.
  const guess = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, isha: 18 };
  let t = { ...guess };
  for (let i = 0; i < 2; i++) {
    const at = (k: keyof typeof guess) => (Number.isFinite(t[k]) ? t[k] : guess[k]) / 24;
    t = {
      fajr: sunAngleTime(18, at('fajr'), true),
      sunrise: sunAngleTime(0.833, at('sunrise'), true),
      dhuhr: midDay(at('dhuhr')),
      asr: asrTime(factor, at('asr')),
      sunset: sunAngleTime(0.833, at('sunset')),
      isha: sunAngleTime(17, at('isha')),
    };
  }
  // From "sun time" to UK clock time.
  const shift = ukOffsetHours(date) - lng / 15;
  for (const k of Object.keys(t) as (keyof typeof t)[]) t[k] += shift;

  // High-latitude rule: Fajr/Isha are never further from sunrise/sunset than (angle/60) of the night.
  const night = fixHour(t.sunrise - t.sunset);
  const fajrMax = (18 / 60) * night;
  if (!Number.isFinite(t.fajr) || t.sunrise - t.fajr > fajrMax) t.fajr = t.sunrise - fajrMax;
  const ishaMax = (17 / 60) * night;
  if (!Number.isFinite(t.isha) || t.isha - t.sunset > ishaMax) t.isha = t.sunset + ishaMax;

  const mins = (h: number, offset = 0) => Math.round(h * 60) + offset;
  const o = settings.offsets;
  return {
    fajr: mins(t.fajr, o.fajr),
    sunrise: mins(t.sunrise),
    dhuhr: mins(t.dhuhr, o.dhuhr),
    asr: mins(t.asr, o.asr),
    maghrib: mins(t.sunset, o.maghrib),
    isha: mins(t.isha, o.isha),
  };
}

export interface PrayerSlot {
  name: PrayerName;
  /** The day this prayer belongs to (Isha after midnight still belongs to the evening before). */
  date: string;
  start: number; // minutes after midnight of `date`
  /** When its time runs out (Fajr → sunrise, others → the next prayer). May be > 1440 for Isha. */
  end: number;
}

export function daySlots(date: string, settings: PrayerSettings): PrayerSlot[] {
  const t = prayerTimes(date, settings);
  const nextFajr = prayerTimes(addDays(date, 1), settings).fajr + 24 * 60;
  return [
    { name: 'fajr', date, start: t.fajr, end: t.sunrise },
    { name: 'dhuhr', date, start: t.dhuhr, end: t.asr },
    { name: 'asr', date, start: t.asr, end: t.maghrib },
    { name: 'maghrib', date, start: t.maghrib, end: t.isha },
    { name: 'isha', date, start: t.isha, end: nextFajr },
  ];
}

/**
 * Where we are right now.
 *  - `current`: the prayer whose time is running now (null between sunrise and Dhuhr),
 *  - `next`: the next prayer to start, and how many minutes until it does.
 */
export function prayerNow(today: string, nowMins: number, settings: PrayerSettings) {
  const slots = daySlots(today, settings);
  const yesterdayIsha = daySlots(addDays(today, -1), settings)[4];
  let current: (PrayerSlot & { minsLeft: number }) | null = null;
  if (nowMins < slots[0].start) {
    // After midnight but before Fajr: still last night's Isha.
    current = { ...yesterdayIsha, minsLeft: yesterdayIsha.end - (nowMins + 24 * 60) };
  } else {
    const live = [...slots].reverse().find((s) => s.start <= nowMins && nowMins < s.end);
    if (live) current = { ...live, minsLeft: live.end - nowMins };
  }
  const upcoming = slots.find((s) => s.start > nowMins);
  const next = upcoming
    ? { ...upcoming, minsUntil: upcoming.start - nowMins }
    : (() => {
        const f = daySlots(addDays(today, 1), settings)[0];
        return { ...f, minsUntil: f.start + 24 * 60 - nowMins };
      })();
  return { slots, current, next };
}

/** Direction of the Kaaba from Sheffield, in degrees clockwise from north (about 119°, south-east). */
export function qiblaBearing(place = SHEFFIELD): number {
  const kaaba = { lat: 21.4225, lng: 39.8262 };
  const dLng = kaaba.lng - place.lng;
  return fixAngle(arctan2(sin(dLng), cos(place.lat) * tan(kaaba.lat) - sin(place.lat) * cos(dLng)));
}

/** 785 → "13:05" */
export const minsToClock = (m: number) => {
  const x = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
};

/** 95 → "1h 35m", 20 → "20 min" */
export const minsToWait = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`);
