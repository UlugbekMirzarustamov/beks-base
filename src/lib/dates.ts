/**
 * Date helpers. The app always thinks in UK time (Europe/London), even if the
 * phone is set to another time zone (e.g. after a trip home to Tashkent).
 *
 * Days are "YYYY-MM-DD" strings. To do maths on them we turn them into UTC
 * midnight Dates, which never have daylight-saving surprises.
 */
import type { Weekday } from './types';

export const UK_TZ = 'Europe/London';
export const TASHKENT_TZ = 'Asia/Tashkent';

export interface ZonedParts {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
}

/** What the clock on the wall says in `timeZone` at the moment `date`. */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Today's date in the UK, e.g. "2026-11-03". */
export function todayUK(now: Date = new Date()): string {
  const p = zonedParts(now, UK_TZ);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** "2026-11-03" → "2026-11" */
export const monthOf = (ymd: string) => ymd.slice(0, 7);

/** Number of days in a month (month is 1–12). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toUTC(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addDays(ymd: string, n: number): string {
  const d = toUTC(ymd);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUTC(d);
}

/** Whole days from `a` to `b` (positive if b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86_400_000);
}

/** Monday = 0 … Sunday = 6 */
export function weekdayOf(ymd: string): Weekday {
  return ((toUTC(ymd).getUTCDay() + 6) % 7) as Weekday;
}

export const startOfWeek = (ymd: string) => addDays(ymd, -weekdayOf(ymd));

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-03" → "Tue 3 Nov" */
export function formatDay(ymd: string): string {
  const [, m, d] = ymd.split('-').map(Number);
  return `${WEEKDAYS[weekdayOf(ymd)]} ${d} ${MONTHS[m - 1]}`;
}

/** "2026-11" → "November 2026" */
export function formatMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Shift a "YYYY-MM" month by n months. */
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** Clock time in a zone, e.g. "14:05". */
export function clockIn(timeZone: string, now: Date = new Date()): string {
  const p = zonedParts(now, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** "09:30" → 570 */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** 570 → "09:30" */
export const fromMinutes = (mins: number) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;

/** Night mode hours in the UK: 19:00 → 06:59. */
export function isNightUK(now: Date = new Date()): boolean {
  const h = zonedParts(now, UK_TZ).hour;
  return h >= 19 || h < 7;
}

/** "in 3 days", "today", "2 days ago" */
export function relativeDays(n: number): string {
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
