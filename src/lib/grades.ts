/**
 * Grades: weighted averages and "what mark do I still need?".
 *
 * A module's assessments are its assignments AND its exams (tests) — each keeps
 * living in its own list; this file only reads them. Weights and marks are in %.
 * If the weights you've entered add up to less than 100%, the rest counts as
 * "not entered yet" (still to come); if they add up to more, they're scaled.
 * Plain functions, so they're easy to test.
 */
import type { AppData } from './types';

export interface Assessment {
  id: string;
  title: string;
  source: 'assignment' | 'test';
  date: string;
  /** % of the module's final mark, or null if not set. */
  weight: number | null;
  /** Result in %, or null if not marked yet. */
  mark: number | null;
}

const num = (v: number | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** All assessments of one module (assignments + exams), by date. */
export function assessmentsFor(d: AppData, subjectId: string): Assessment[] {
  return [
    ...d.assignments.filter((a) => a.subjectId === subjectId).map((a) => ({ id: a.id, title: a.title, source: 'assignment' as const, date: a.due, weight: num(a.weight), mark: num(a.mark) })),
    ...d.tests.filter((t) => t.subjectId === subjectId).map((t) => ({ id: t.id, title: t.name, source: 'test' as const, date: t.date, weight: num(t.weight), mark: num(t.mark) })),
  ].sort((a, b) => a.date.localeCompare(b.date));
}

export interface ModuleGrade {
  /** Sum of all weights entered. */
  totalWeight: number;
  /** Weight already marked. */
  gradedWeight: number;
  /** % of the final mark still to come (including anything not entered yet). */
  remainingWeight: number;
  /** Your average so far over the marked work (null if nothing is marked). */
  average: number | null;
  /** Points of the final mark already secured (out of 100). */
  secured: number;
  /** The average needed on the remaining work to reach the target (null without a target). */
  needed: number | null;
  status: 'no-weights' | 'no-target' | 'safe' | 'possible' | 'impossible' | 'done';
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function moduleGrade(items: Assessment[], target?: number): ModuleGrade {
  const weighted = items.filter((i) => i.weight !== null && i.weight > 0);
  const totalWeight = weighted.reduce((a, i) => a + (i.weight ?? 0), 0);
  // Out of 100, unless the weights entered add up to more (then they're the whole).
  const base = Math.max(100, totalWeight);
  const graded = weighted.filter((i) => i.mark !== null);
  const gradedWeight = graded.reduce((a, i) => a + (i.weight ?? 0), 0);
  const points = graded.reduce((a, i) => a + (i.weight ?? 0) * (i.mark ?? 0), 0) / base; // out of 100
  const left = base - gradedWeight;
  const average = gradedWeight > 0 ? round1((points * base) / gradedWeight) : null;
  const out = { totalWeight, gradedWeight, remainingWeight: round1((left / base) * 100), average, secured: round1(points), needed: null };
  if (totalWeight === 0) return { ...out, status: 'no-weights' };
  if (left <= 0) return { ...out, status: 'done' };
  if (target === undefined || !(target > 0)) return { ...out, status: 'no-target' };
  const needed = round1((target - points) / (left / base));
  return { ...out, needed, status: needed <= 0 ? 'safe' : needed > 100 ? 'impossible' : 'possible' };
}

/** UK degree classification for a percentage — a rough guide only (your course's rules may differ). */
export function band(mark: number): string {
  if (mark >= 70) return 'First';
  if (mark >= 60) return '2:1';
  if (mark >= 50) return '2:2';
  if (mark >= 40) return 'Pass';
  return 'Below pass';
}

/** Open assignments, most urgent first: by due date, then time, then priority. */
export function openAssignments(d: AppData) {
  const rank = { high: 0, medium: 1, low: 2 };
  return d.assignments
    .filter((a) => a.status === 'todo' || a.status === 'doing')
    .sort((a, b) => a.due.localeCompare(b.due) || a.dueTime.localeCompare(b.dueTime) || rank[a.priority] - rank[b.priority]);
}
