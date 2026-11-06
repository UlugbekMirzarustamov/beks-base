/**
 * The money plan: one pot of money that has to last a set number of days or months
 * (e.g. $2,000 for 140 days). Every purchase comes out of the pot.
 *
 * Optional daily cap (e.g. $15): the allowance is never more than the cap, and the rest of each day's
 * share goes into the DREAM ROOM JAR — worked out from the plan (never copied), spent only on dream items.
 *
 * The idea in one line: you get the same allowance every day
 * (pot ÷ days). Whatever you DON'T spend goes into your WISH FUND;
 * overspending takes from it. So the wish fund is simply "how far ahead
 * of plan you are" — money you can spend on wishes without running out.
 */
import { addDays, daysBetween } from './dates';
import { roundPennies } from './money';
import type { Expense } from './types';

export interface Pot {
  total: number;
  start: string; // first day of the plan, YYYY-MM-DD
  months: number;
  /** Plan length in days (e.g. 140). When set, it is used instead of `months`. */
  days?: number;
  /** Most you can spend per day (e.g. 15). The rest of each day's share goes to the dream room jar. */
  cap?: number;
  /** Last day the app showed "yesterday you saved…" (so it only shows once a day). */
  lastCloseout?: string;
}

/** Add whole months to a date (31 Jan + 1 month → 28/29 Feb). */
export function addMonthsToDate(ymd: string, months: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/** Last day of the plan (inclusive): 4 Nov + 5 months → 3 Apr. */
export const potEnd = (p: Pot) => (p.days && p.days > 0 ? addDays(p.start, Math.round(p.days) - 1) : addDays(addMonthsToDate(p.start, p.months), -1));

/** Everyday spending on each day of the plan (wishes bought with the wish fund don't count here). */
export function spendByDay(expenses: Expense[], from: string, to: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of expenses) if (!e.fromWish && !e.fromDream && e.date >= from && e.date <= to) map.set(e.date, roundPennies((map.get(e.date) ?? 0) + e.amount));
  return map;
}

export interface PotStatus {
  end: string;
  totalDays: number;
  /** The fixed daily allowance: pot ÷ days (never above the cap), rounded down to the cent. */
  daily: number;
  /** What goes into the dream room jar each day (0 without a cap). */
  dreamPerDay: number;
  /** Dream room jar now: saved so far (finished days) minus dream items bought. */
  dreamJar: number;
  /** What the dream room jar will have reached by the last day (before any purchases). */
  dreamTotal: number;
  /** Full days already finished in the plan (before today). */
  daysPassed: number;
  /** Days left including today. */
  daysLeft: number;
  spentToday: number;
  spentTotal: number;
  /** Money left in the pot. */
  remaining: number;
  /** Today's allowance minus what you've spent today (negative = over). */
  leftToday: number;
  /**
   * Wish fund: (allowance × finished days) − everyday spending before today
   * − wishes already bought − anything you're over today's allowance. Can be negative.
   */
  fund: number;
  /** If you spent the whole rest of the pot evenly from today. */
  evenPerDay: number;
  /** Average spent per day so far (null if nothing to go on yet). */
  avgPerDay: number | null;
  /** The day the money runs out at your average pace (null if it lasts / no data). */
  runsOutOn: string | null;
  /** Days in a row (ending yesterday) you stayed within the daily allowance. */
  underStreak: number;
}

export function potStatus(p: Pot, expenses: Expense[], today: string): PotStatus {
  const end = potEnd(p);
  const totalDays = daysBetween(p.start, end) + 1;
  const share = p.total / totalDays;
  const daily = Math.floor(roundPennies(Math.min(share, p.cap && p.cap > 0 ? p.cap : Infinity) * 100)) / 100;
  const dreamPerDay = p.cap && p.cap > 0 && share > daily ? share - daily : 0;
  const clampedToday = today < p.start ? p.start : today > end ? end : today;
  const daysPassed = Math.max(0, Math.min(totalDays, daysBetween(p.start, today)));
  const daysLeft = Math.max(0, daysBetween(clampedToday, end) + 1);
  const byDay = spendByDay(expenses, p.start, end);
  const spentToday = byDay.get(today) ?? 0;
  const everyday = roundPennies([...byDay.values()].reduce((a, n) => a + n, 0));
  const wishSpent = roundPennies(expenses.filter((e) => e.fromWish && e.date >= p.start && e.date <= end).reduce((a, e) => a + e.amount, 0));
  const dreamSpent = roundPennies(expenses.filter((e) => e.fromDream && e.date >= p.start && e.date <= end).reduce((a, e) => a + e.amount, 0));
  const spentTotal = roundPennies(everyday + wishSpent + dreamSpent);
  const spentBefore = roundPennies(everyday - spentToday);
  const remaining = roundPennies(p.total - spentTotal);
  const fund = roundPennies(daily * daysPassed - spentBefore - wishSpent - Math.max(0, spentToday - daily));
  const evenPerDay = daysLeft > 0 ? Math.max(0, Math.floor(roundPennies(((p.total - spentBefore - wishSpent - dreamSpent) / daysLeft) * 100)) / 100) : 0;
  const daysSoFar = daysPassed + (spentToday > 0 ? 1 : 0);
  const avgPerDay = daysSoFar > 0 && everyday > 0 ? roundPennies(everyday / daysSoFar) : null;
  let runsOutOn: string | null = null;
  if (avgPerDay && avgPerDay > 0) {
    const out = addDays(today, Math.floor(remaining / avgPerDay));
    if (out < end) runsOutOn = out;
  }
  let underStreak = 0;
  for (let d = addDays(today, -1); d >= p.start && (byDay.get(d) ?? 0) <= daily; d = addDays(d, -1)) underStreak++;
  const dreamJar = roundPennies(dreamPerDay * daysPassed - dreamSpent);
  const dreamTotal = roundPennies(dreamPerDay * totalDays);
  return { end, totalDays, daily, dreamPerDay: roundPennies(dreamPerDay), dreamJar, dreamTotal, daysPassed, daysLeft, spentToday, spentTotal, remaining, leftToday: roundPennies(daily - spentToday), fund, evenPerDay, avgPerDay, runsOutOn, underStreak };
}

/** How many days until the wish fund reaches `cost`, saving `perDay` a day (null if never). */
export function daysUntil(cost: number, fund: number, perDay: number): number | null {
  if (fund >= cost) return 0;
  if (perDay <= 0) return null;
  return Math.ceil((cost - fund) / perDay);
}
