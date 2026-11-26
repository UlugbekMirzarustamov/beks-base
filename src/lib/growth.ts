/**
 * Growing a little every day, worked out from what's already saved (nothing new is stored):
 *  - monthStory(): a short look back over one month.
 * Prayers are never counted here (worship is never scored).
 */
import { addDays, monthOf } from './dates';
import { spentInMonth } from './money';
import type { AppData, Mood } from './types';

const filled = (items: string[] | undefined) => (items ?? []).filter((t) => t.trim()).length;

/** The top 3 for a day: today's live list, or the archived one. */
function goalsOn(d: AppData, day: string): { set: number; done: number } {
  const g = d.priorities.date === day ? d.priorities : d.dayGoals[day];
  if (!g) return { set: 0, done: 0 };
  return { set: filled(g.items), done: g.items.filter((t, i) => t.trim() && g.done[i]).length };
}

export const goalsSetOn = (d: AppData, day: string) => goalsOn(d, day).set > 0;
export const eveningDoneOn = (d: AppData, day: string) => Boolean(d.nightLogs[day]?.line.trim());

export interface DayStats {
  goalsSet: number;
  goalsDone: number;
  focusMin: number;
  wrote: boolean;
}

export function statsOn(d: AppData, day: string): DayStats {
  const g = goalsOn(d, day);
  const focusMin = d.studyLog.reduce((sum, s) => (s.date === day ? sum + s.minutes : sum), 0);
  return { goalsSet: g.set, goalsDone: g.done, focusMin, wrote: eveningDoneOn(d, day) };
}

// ---------------------------------------------------------------- the month story
export const MOOD_NAMES: Record<Mood, string> = { 1: 'Awful', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Great' };

export interface MonthStory {
  month: string;
  days: number;
  daysWithGoals: number;
  goalsSet: number;
  goalsDone: number;
  evenings: number;
  focusMin: number;
  moods: Record<Mood, number>;
  /** Most common mood (ties go to the happier one), or null if none logged. */
  usualMood: Mood | null;
  spent: number;
  /** The day with the most goals done (then most focus), if any were done. */
  bestDay: string | null;
  /** Up to 3 evening lines from the happiest days. */
  highlights: { date: string; line: string }[];
}

export function monthStory(d: AppData, month: string, today: string): MonthStory {
  const moods: Record<Mood, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const story: MonthStory = { month, days: 0, daysWithGoals: 0, goalsSet: 0, goalsDone: 0, evenings: 0, focusMin: 0, moods, usualMood: null, spent: 0, bestDay: null, highlights: [] };
  let best = { done: 0, focus: 0 };
  const happy: { date: string; line: string; mood: number }[] = [];

  for (let day = `${month}-01`; monthOf(day) === month && day <= today; day = addDays(day, 1)) {
    const s = statsOn(d, day);
    story.days++;
    if (s.goalsSet) story.daysWithGoals++;
    story.goalsSet += s.goalsSet;
    story.goalsDone += s.goalsDone;
    story.focusMin += s.focusMin;
    if (s.wrote) story.evenings++;
    const mood = d.moods[day];
    if (mood) moods[mood]++;
    if (s.goalsDone > best.done || (s.goalsDone === best.done && s.goalsDone > 0 && s.focusMin > best.focus)) {
      best = { done: s.goalsDone, focus: s.focusMin };
      story.bestDay = day;
    }
    if (s.wrote && mood && mood >= 4) happy.push({ date: day, line: d.nightLogs[day].line.trim(), mood });
  }

  let top = 0;
  for (const m of [5, 4, 3, 2, 1] as Mood[]) {
    if (moods[m] > top) {
      top = moods[m];
      story.usualMood = m;
    }
  }
  story.spent = spentInMonth(d.expenses, month);
  story.highlights = happy
    .sort((a, b) => b.mood - a.mood || a.date.localeCompare(b.date))
    .slice(0, 3)
    .map(({ date, line }) => ({ date, line }));
  return story;
}
