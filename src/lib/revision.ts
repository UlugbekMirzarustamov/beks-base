/**
 * The revision planner: spreads short revision sessions over the days before your exams,
 * giving more time to weak topics (red > amber/unrated > green) and to exams that are close.
 * It only suggests: nothing is saved until you put the plan in your week. Plain functions.
 */
import { addDays, daysBetween, fromMinutes, toMinutes } from './dates';
import type { AppData, Confidence } from './types';

export const SESSION_MINUTES = 30;
const WEIGHT: Record<string, number> = { red: 3, amber: 2, unrated: 2, green: 1 };
const weightOf = (c: Confidence) => WEIGHT[c ?? 'unrated'];

export interface RevisionSession {
  date: string;
  start: string;
  end: string;
  /** What to revise, e.g. "Momentum (Physics)". */
  title: string;
  testId: string;
}

interface Item {
  key: string;
  title: string;
  testId: string;
  exam: string;
  weight: number;
}

/**
 * Plan sessions from tomorrow until the day before each exam (at most `horizon` days ahead).
 * `minutesPerDay` is split into 30-minute sessions starting at `startTime`, back to back.
 */
export function planRevision(d: AppData, today: string, opts: { minutesPerDay: number; startTime: string; horizon?: number }): RevisionSession[] {
  const horizon = opts.horizon ?? 28;
  const last = addDays(today, horizon);
  const exams = d.tests.filter((t) => t.date > today && t.date <= last).sort((a, b) => a.date.localeCompare(b.date));
  const items: Item[] = [];
  for (const t of exams) {
    const subject = d.subjects.find((s) => s.id === t.subjectId);
    const topics = t.subjectId ? d.topics.filter((p) => p.subjectId === t.subjectId) : [];
    if (topics.length) {
      for (const p of topics) items.push({ key: `${t.id}-${p.id}`, title: `${p.name} (${subject?.name ?? t.name})`, testId: t.id, exam: t.date, weight: weightOf(p.confidence) });
    } else {
      items.push({ key: t.id, title: `Revise for ${t.name}`, testId: t.id, exam: t.date, weight: 2 });
    }
  }
  if (!items.length) return [];

  const slots = Math.max(1, Math.floor(opts.minutesPerDay / SESSION_MINUTES));
  const done = new Map<string, number>();
  const out: RevisionSession[] = [];
  for (let day = addDays(today, 1); day < exams[exams.length - 1].date; day = addDays(day, 1)) {
    const open = items.filter((i) => i.exam > day);
    const usedToday = new Set<string>();
    for (let s = 0; s < slots && open.length; s++) {
      const pool = open.filter((i) => !usedToday.has(i.key));
      const from = pool.length ? pool : open;
      // Weak topics and close exams first; topics that already have sessions get less.
      const score = (i: Item) => (i.weight * (1 + 3 / Math.max(1, daysBetween(day, i.exam)))) / (1 + (done.get(i.key) ?? 0));
      const best = from.reduce((a, b) => (score(b) > score(a) + 1e-9 ? b : a));
      usedToday.add(best.key);
      done.set(best.key, (done.get(best.key) ?? 0) + 1);
      const start = toMinutes(opts.startTime) + s * SESSION_MINUTES;
      out.push({ date: day, start: fromMinutes(start % 1440), end: fromMinutes((start + SESSION_MINUTES) % 1440), title: best.title, testId: best.testId });
    }
  }
  return out;
}
