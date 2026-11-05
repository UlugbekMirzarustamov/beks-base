/**
 * Goals at every level: a year, a month, a week — and the day (your top 3, kept in `priorities`).
 * Each goal can support one a level up, so today's work connects to the year and to your dreams.
 * Plain functions, so they're easy to test. No points: progress is just progress.
 */
import { addDays, startOfWeek } from './dates';
import type { AppData, GoalLevel, PlanGoal } from './types';

export const LEVELS: GoalLevel[] = ['year', 'month', 'week'];
/** The level a goal supports (a year goal supports a vision goal). */
export const PARENT: Record<GoalLevel, GoalLevel | 'vision'> = { year: 'vision', month: 'year', week: 'month' };

/** The period a date belongs to: "2026", "2026-11" or the week's Monday. */
export function periodOf(level: GoalLevel, date: string): string {
  return level === 'year' ? date.slice(0, 4) : level === 'month' ? date.slice(0, 7) : startOfWeek(date);
}

/** The period before: last year, last month, last week. */
export function previousPeriod(level: GoalLevel, period: string): string {
  if (level === 'year') return String(Number(period) - 1);
  if (level === 'week') return addDays(period, -7);
  const [y, m] = period.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

export const goalsIn = (goals: PlanGoal[], level: GoalLevel, period: string) => goals.filter((g) => g.level === level && g.period === period);

/** Done / total for one level and period. */
export function levelProgress(goals: PlanGoal[], level: GoalLevel, period: string): { done: number; total: number } {
  const list = goalsIn(goals, level, period);
  return { done: list.filter((g) => g.done).length, total: list.length };
}

/** Unfinished goals from the previous period that could be carried over (not already carried). */
export function carryOverCandidates(goals: PlanGoal[], level: GoalLevel, today: string): PlanGoal[] {
  const now = periodOf(level, today);
  const current = new Set(goalsIn(goals, level, now).map((g) => g.title.trim().toLowerCase()));
  return goalsIn(goals, level, previousPeriod(level, now)).filter((g) => !g.done && !current.has(g.title.trim().toLowerCase()));
}

/** The chain of goals this one supports, up to the vision board ("Pass Physics ← Revise waves"). */
export function supportChain(d: AppData, goal: PlanGoal): string[] {
  const out: string[] = [];
  let parentId = goal.parentId;
  let level: GoalLevel | 'vision' = PARENT[goal.level];
  for (let i = 0; i < 4 && parentId; i++) {
    if (level === 'vision') {
      const v = d.vision.find((x) => x.id === parentId);
      if (v) out.push(v.title);
      break;
    }
    const p = d.planGoals.find((x) => x.id === parentId);
    if (!p) break;
    out.push(p.title);
    parentId = p.parentId;
    level = PARENT[p.level];
  }
  return out;
}
