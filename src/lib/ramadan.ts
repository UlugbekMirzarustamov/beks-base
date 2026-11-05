/**
 * Ramadan: when it is, which day of it today is, and how long until it starts.
 * Uses the browser's built-in Islamic (Umm al-Qura) calendar, so no dates are
 * typed in by hand. The real start can differ by a day with the moon sighting —
 * the app says "about" for that reason.
 */
import { addDays, daysBetween } from './dates';

const HIJRI = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' });

/** The Islamic date for a "YYYY-MM-DD" day. */
export function hijri(date: string): { year: number; month: number; day: number } {
  const parts = HIJRI.formatToParts(new Date(`${date}T12:00:00Z`));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day') };
}

export const isRamadan = (date: string) => hijri(date).month === 9;

export interface RamadanInfo {
  /** Today is in Ramadan. */
  now: boolean;
  /** Day of Ramadan (1–30), or 0 before it starts. */
  day: number;
  /** First and last day of this (or the next) Ramadan. */
  start: string;
  end: string;
  /** Days until it starts (0 during Ramadan). */
  daysUntil: number;
}

/** This Ramadan (if we're in it) or the next one. */
export function ramadanInfo(today: string): RamadanInfo {
  let start = today;
  if (isRamadan(today)) {
    while (isRamadan(addDays(start, -1))) start = addDays(start, -1);
  } else {
    // Ramadan comes round every ~354 days, so it's always within a year.
    for (let i = 1; i <= 400 && !isRamadan(start); i++) start = addDays(today, i);
  }
  let end = start;
  while (isRamadan(addDays(end, 1))) end = addDays(end, 1);
  const now = today >= start && today <= end;
  return { now, day: now ? daysBetween(start, today) + 1 : 0, start, end, daysUntil: now ? 0 : daysBetween(today, start) };
}
