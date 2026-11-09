/**
 * The two daily moments: the morning door (write your top 3 before the app opens) and the evening
 * check-in (what you did, how you felt). They use the top 3, night log and mood that already exist,
 * so the week view reads the same words. Plain functions, so they're easy to test.
 */
import { deadlinesSoon } from './today';
import { addDays, weekdayOf } from './dates';
import { goalsIn, periodOf } from './goals';
import type { AppData, Mood, Priorities } from './types';

/** Before this hour it still counts as last night: no door at 1am. */
export const DOOR_FROM_HOUR = 4;
/** The evening check-in appears from this hour. */
export const EVENING_FROM_HOUR = 19;

const filled = (items: string[]) => items.filter((t) => t.trim()).length;

/** True when the door should stay shut. Once opened it stays open all day, even while you edit a goal. */
export function doorIsShut(p: Priorities, today: string, hour: number): boolean {
  if (hour < DOOR_FROM_HOUR) return false;
  return p.date !== today || !(p.entered || filled(p.items) >= 3);
}

/** Ideas for "fill them for me": last night's plan, exams and deadlines soon, then this week's goals. */
export function suggestTopThree(d: AppData, today: string): string[] {
  const ideas = [
    d.nightLogs[addDays(today, -1)]?.tomorrow ?? '',
    ...deadlinesSoon(d, today, 7).map((i) => `Work on: ${i.title}`),
    ...goalsIn(d.planGoals, 'week', periodOf('week', today)).filter((g) => !g.done).map((g) => g.title),
  ];
  const seen = new Set<string>();
  return ideas
    .map((t) => t.trim())
    .filter((t) => t && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()))
    .slice(0, 3);
}

/** True when tonight's check-in hasn't been written yet. */
export const eveningDue = (d: AppData, today: string, hour: number) => hour >= EVENING_FROM_HOUR && !d.nightLogs[today]?.line.trim();

export const isSunday = (date: string) => weekdayOf(date) === 6;

export interface WeekDay {
  date: string;
  line: string;
  mood: Mood | null;
}

/** One week as you wrote it: each evening's words and mood, and how many top-3 goals got done. */
export function weekInWords(d: AppData, monday: string, today: string): { days: WeekDay[]; goalsDone: number; goalsSet: number } {
  let goalsDone = 0;
  let goalsSet = 0;
  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(monday, i);
    if (date > today) break;
    const top = d.priorities.date === date ? d.priorities : d.dayGoals[date];
    top?.items.forEach((t, j) => {
      if (!t.trim()) return;
      goalsSet++;
      if (top.done[j]) goalsDone++;
    });
    const line = d.nightLogs[date]?.line.trim() ?? '';
    const mood = d.moods[date] ?? null;
    if (line || mood) days.push({ date, line, mood });
  }
  return { days, goalsDone, goalsSet };
}
