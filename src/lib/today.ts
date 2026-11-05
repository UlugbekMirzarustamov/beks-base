/**
 * The daily dashboard ("Today" on Home): the few numbers that matter today,
 * worked out from data that already exists — nothing new is stored except the
 * optional sleep & energy check-in. Plain functions, so they're easy to test.
 */
import { upcoming, type CalItem } from './calendar';
import { addDays, daysBetween } from './dates';
import { roundPennies, safeToSpend, savedIn } from './money';
import { potStatus } from './pot';
import type { AppData } from './types';

/** Exams and deadlines (tasks + assignments) in the next `days` days, soonest first. */
export const deadlinesSoon = (d: AppData, today: string, days = 7): CalItem[] => upcoming(d, today, days).filter((i) => i.kind === 'exam' || i.kind === 'deadline');

export interface MoneyToday {
  /** What's left to spend today (can be negative when over). */
  left: number;
  /** Spent today (everyday spending, not wishes). */
  spent: number;
  source: 'plan' | 'month';
}

/** Today's money: from the money plan if there is one, otherwise from the monthly budget. */
export function moneyToday(d: AppData, today: string): MoneyToday {
  if (d.pot) {
    const s = potStatus(d.pot, d.expenses, today);
    return { left: s.leftToday, spent: s.spentToday, source: 'plan' };
  }
  const spent = roundPennies(d.expenses.filter((e) => e.date === today && !e.fromWish).reduce((a, e) => a + e.amount, 0));
  // The month's daily budget as it stood at the start of today.
  const before = safeToSpend(d.monthlyBudget, d.expenses.filter((e) => e.date !== today), today).perDay;
  return { left: roundPennies(before - spent), spent, source: 'month' };
}

export interface GoalProgress {
  key: string;
  title: string;
  /** 0–1 for savings jars; null for goals with a date. */
  pct: number | null;
  /** Days left for a goal with a date; null otherwise. */
  daysLeft: number | null;
  href: string;
}

/** Up to `limit` goals in progress: the nearest dated vision goal, then the fullest savings jars. */
export function goalProgress(d: AppData, today: string, limit = 3): GoalProgress[] {
  const dated = d.vision
    .filter((g) => !g.done && g.by && g.by >= today)
    .sort((a, b) => a.by.localeCompare(b.by))
    .map((g): GoalProgress => ({ key: `vision-${g.id}`, title: g.title, pct: null, daysLeft: daysBetween(today, g.by), href: '#/reflect/vision' }));
  const jars = d.goals
    .filter((g) => !g.reached && g.target > 0)
    .map((g): GoalProgress => ({ key: `jar-${g.id}`, title: g.name, pct: Math.max(0, Math.min(1, savedIn(g) / g.target)), daysLeft: null, href: '#/money/savings' }))
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  return [...dated.slice(0, 1), ...jars, ...dated.slice(1)].slice(0, limit);
}

/** Roughly how long you slept: last night's "going to sleep" time to this morning's Fajr-rise time (to the half hour). */
export function sleptHours(d: AppData, today: string): number | null {
  const bed = d.sleepLog[addDays(today, -1)];
  const up = d.rise[today]?.time;
  if (!bed || !up) return null;
  const [bh, bm] = bed.split(':').map(Number);
  const [uh, um] = up.split(':').map(Number);
  let mins = uh * 60 + um - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  const hours = Math.round((mins / 60) * 2) / 2;
  return hours > 0 && hours <= 16 ? hours : null;
}
