/**
 * The money plan: one pot of money that has to last until a set day (e.g. $5,300 until April).
 * Every purchase comes out of the pot.
 *
 * Set aside (optional, e.g. $1,900 for rent): taken out first and kept for that bill only.
 * Paying it ("Paid rent") comes out of the set-aside money, never out of a day's allowance.
 *
 * The idea in one line: you get the same allowance every day
 * ((pot − set aside) ÷ days). Whatever you DON'T spend goes into SAVED at the end of the day;
 * overspending takes from it. So Saved is simply "how far ahead of plan you are" — money you can
 * spend on wishes without running out.
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
  /** Money kept aside for one big bill (e.g. rent), not part of the daily allowance. */
  setAside?: number;
  /** What the set-aside money is for (e.g. "Rent"). */
  setAsideLabel?: string;
  /** No longer used (the old daily maximum + dream room jar). Kept so old saved plans still load. */
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

/** A fresh plan from `start` until `end` (inclusive), with money set aside for one bill. */
export function freshPot(total: number, setAside: number, start: string, end: string, label = 'Rent'): Pot {
  const days = daysBetween(start, end) + 1;
  const p: Pot = { total, start, months: Math.max(1, Math.round(days / 30)), days };
  if (setAside > 0) {
    p.setAside = setAside;
    p.setAsideLabel = label;
  }
  return p;
}

/** Not part of everyday spending: bought with Saved, paid from the set-aside money, or an old dream room buy. */
const special = (e: Expense) => Boolean(e.fromWish || e.fromSetAside || e.fromDream);

/** Everyday spending on each day of the plan (wishes and set-aside payments don't count here). */
export function spendByDay(expenses: Expense[], from: string, to: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of expenses) if (!special(e) && e.date >= from && e.date <= to) map.set(e.date, roundPennies((map.get(e.date) ?? 0) + e.amount));
  return map;
}

export interface PotStatus {
  end: string;
  totalDays: number;
  /** Money for everyday life: the pot minus what's set aside. */
  spendable: number;
  /** The fixed daily allowance: spendable ÷ days, rounded down to the cent. */
  daily: number;
  /** Set aside for one bill (0 if none), what's been paid from it, and what's still kept for it. */
  setAside: number;
  setAsidePaid: number;
  setAsideLeft: number;
  /** Full days already finished in the plan (before today). */
  daysPassed: number;
  /** Days left including today. */
  daysLeft: number;
  spentToday: number;
  spentTotal: number;
  /** Money left in the pot (including what's still set aside). */
  remaining: number;
  /** Today's allowance minus what you've spent today (negative = over). */
  leftToday: number;
  /**
   * Saved: (allowance × finished days) − everyday spending before today
   * − wishes already bought − anything you're over today's allowance. Can be negative.
   */
  fund: number;
  /** If you spent the whole rest of the everyday money evenly from today. */
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
  const setAside = roundPennies(Math.max(0, Math.min(p.total, p.setAside ?? 0)));
  const spendable = roundPennies(p.total - setAside);
  const daily = Math.floor(roundPennies((spendable / totalDays) * 100)) / 100;
  const clampedToday = today < p.start ? p.start : today > end ? end : today;
  const daysPassed = Math.max(0, Math.min(totalDays, daysBetween(p.start, today)));
  const daysLeft = Math.max(0, daysBetween(clampedToday, end) + 1);
  const byDay = spendByDay(expenses, p.start, end);
  const spentToday = byDay.get(today) ?? 0;
  const everyday = roundPennies([...byDay.values()].reduce((a, n) => a + n, 0));
  const inPlan = (e: Expense) => e.date >= p.start && e.date <= end;
  const sum = (keep: (e: Expense) => boolean) => roundPennies(expenses.filter((e) => keep(e) && inPlan(e)).reduce((a, e) => a + e.amount, 0));
  const wishSpent = sum((e) => Boolean(e.fromWish));
  const setAsidePaid = sum((e) => Boolean(e.fromSetAside) && !e.fromWish);
  const dreamSpent = sum((e) => Boolean(e.fromDream) && !e.fromWish && !e.fromSetAside);
  const spentTotal = roundPennies(everyday + wishSpent + setAsidePaid + dreamSpent);
  const spentBefore = roundPennies(everyday - spentToday);
  const remaining = roundPennies(p.total - spentTotal);
  const fund = roundPennies(daily * daysPassed - spentBefore - wishSpent - dreamSpent - Math.max(0, spentToday - daily));
  const evenPerDay = daysLeft > 0 ? Math.max(0, Math.floor(roundPennies(((spendable - spentBefore - wishSpent - dreamSpent) / daysLeft) * 100)) / 100) : 0;
  const daysSoFar = daysPassed + (spentToday > 0 ? 1 : 0);
  const avgPerDay = daysSoFar > 0 && everyday > 0 ? roundPennies(everyday / daysSoFar) : null;
  let runsOutOn: string | null = null;
  if (avgPerDay && avgPerDay > 0) {
    const everydayLeft = roundPennies(spendable - everyday - wishSpent - dreamSpent);
    const out = addDays(today, Math.floor(everydayLeft / avgPerDay));
    if (out < end) runsOutOn = out;
  }
  let underStreak = 0;
  for (let d = addDays(today, -1); d >= p.start && (byDay.get(d) ?? 0) <= daily; d = addDays(d, -1)) underStreak++;
  return {
    end,
    totalDays,
    spendable,
    daily,
    setAside,
    setAsidePaid,
    setAsideLeft: roundPennies(Math.max(0, setAside - setAsidePaid)),
    daysPassed,
    daysLeft,
    spentToday,
    spentTotal,
    remaining,
    leftToday: roundPennies(daily - spentToday),
    fund,
    evenPerDay,
    avgPerDay,
    runsOutOn,
    underStreak,
  };
}

/** How many days until Saved reaches `cost`, saving `perDay` a day (null if never). */
export function daysUntil(cost: number, fund: number, perDay: number): number | null {
  if (fund >= cost) return 0;
  if (perDay <= 0) return null;
  return Math.ceil((cost - fund) / perDay);
}
