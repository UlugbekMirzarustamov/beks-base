/**
 * Things that PUSH you: racing last week's ghost, the morning promise to Simba,
 * the Fajr rise (and the brutal wake-up call when you sleep through it), and the
 * rules of hard mode. Plain functions so they're easy to test.
 */
import { streak } from './cabin';
import { dayHash } from './daily';
import { addDays, daysBetween, startOfWeek, toMinutes } from './dates';
import { PRAYERS } from './prayer';
import type { AppData } from './types';

// ---------------------------------------------------------------- hard mode
/** What hard mode changes (shown on its switch, so the rules are clear). */
export const HARD_RULES = [
  'The ghost of last week gets 10% faster: you must beat last week by 10%.',
  'A broken morning promise costs 50 coins instead of 20.',
  'Sleeping through Fajr costs 25 XP.',
  'Wishes only unlock when your wish fund covers them + 10% safety.',
];
export const PROMISE_XP = 25;
export const promisePenalty = (hard: boolean) => (hard ? 50 : 20);
export const OVERSLEPT_XP = 25;
export const wishReady = (fund: number, cost: number, hard: boolean) => fund >= Math.round(cost * (hard ? 110 : 100)) / 100;

// ---------------------------------------------------------------- you vs last week
export interface GhostRow {
  id: string;
  label: string;
  you: number;
  /** Last week by the same weekday (×1.1 in hard mode; ×0.9 for spending). */
  ghost: number;
  /** For money spent: less is better. */
  lowerIsBetter?: boolean;
  status: 'ahead' | 'behind' | 'tie';
}

function weekStats(d: AppData, from: string, to: string) {
  const inRange = (day: string) => day >= from && day <= to;
  const days: string[] = [];
  for (let x = from; x <= to; x = addDays(x, 1)) days.push(x);
  return {
    pomodoros: d.studyLog.filter((s) => inRange(s.date)).length,
    lanterns: days.reduce((a, day) => a + PRAYERS.filter((p) => d.prayers[day]?.includes(p)).length, 0),
    fajr: days.filter((day) => d.rise[day]?.onTime).length,
    stars: days.filter((day) => d.nightLogs[day]?.rewarded).length,
    promises: days.filter((day) => d.promises[day]?.kept).length,
    spent: Math.round(d.expenses.filter((e) => !e.fromWish && inRange(e.date)).reduce((a, e) => a + e.amount, 0) * 100) / 100,
  };
}

const GHOST_ROWS: [keyof ReturnType<typeof weekStats>, string, boolean?][] = [
  ['pomodoros', 'Pomodoros'],
  ['lanterns', 'Lanterns lit'],
  ['fajr', 'Fajr on time'],
  ['stars', 'Stars lit'],
  ['promises', 'Promises kept'],
  ['spent', 'Money spent', true],
];

/** This week so far (Monday → today) against last week up to the same weekday. */
export function ghostRace(d: AppData, today: string, hard: boolean): { rows: GhostRow[]; ahead: number } {
  const monday = startOfWeek(today);
  const into = daysBetween(monday, today);
  const you = weekStats(d, monday, today);
  const ghost = weekStats(d, addDays(monday, -7), addDays(monday, into - 7));
  const rows = GHOST_ROWS.map(([id, label, lower]): GhostRow => {
    const target = lower ? Math.round(ghost[id] * (hard ? 0.9 : 1) * 100) / 100 : Math.ceil(ghost[id] * (hard ? 1.1 : 1) * 10) / 10;
    const mine = you[id];
    const status = mine === target ? 'tie' : (lower ? mine < target : mine > target) ? 'ahead' : 'behind';
    return { id, label, you: mine, ghost: target, lowerIsBetter: lower, status };
  });
  return { rows, ahead: rows.filter((r) => r.status === 'ahead').length };
}

// ---------------------------------------------------------------- morning promise
/** Promise ideas, aimed at where you're weakest. */
export function promiseIdeas(d: AppData, today: string): string[] {
  const y = addDays(today, -1);
  const ideas: string[] = [];
  if (!d.rise[today]?.onTime) ideas.push('Be in bed by 23:30 so I wake for Fajr');
  if (PRAYERS.some((p) => !d.prayers[y]?.includes(p))) ideas.push('Pray all five on time today');
  if (!d.studyLog.some((s) => s.date === y)) ideas.push('Do 2 Pomodoros before dinner');
  ideas.push('No takeaway today, cook at home', 'No phone for the first hour after waking', 'Review 10 flashcards', 'Call home');
  return ideas.slice(0, 5);
}

/** The newest earlier-day promise you haven't said kept/broken yet (looks back 3 days). */
export function unresolvedPromise(d: AppData, today: string): string | null {
  for (let i = 1; i <= 3; i++) {
    const day = addDays(today, -i);
    if (d.promises[day] && d.promises[day].kept === undefined) return day;
  }
  return null;
}

// ---------------------------------------------------------------- Fajr rise
/** On time = up before sunrise (Fajr's time hasn't run out). */
export const riseOnTime = (hhmm: string, sunriseMins: number) => toMinutes(hhmm) < sunriseMins;

/** Mornings in a row up for Fajr (0 the moment you oversleep). */
export const riseStreak = (d: AppData, today: string) => (d.rise[today]?.onTime === false ? 0 : streak((day) => Boolean(d.rise[day]?.onTime), today));

/** Times you slept through Fajr in the last 30 days. */
export const oversleptRecently = (d: AppData, today: string) =>
  Object.entries(d.rise).filter(([day, r]) => !r.onTime && day > addDays(today, -30) && day <= today).length;

/**
 * The wake-up call for sleeping through Fajr. Harsh on purpose (you asked for it),
 * but about the CHOICE, never about who you are, and it always ends with what to do now.
 */
export const BRUTAL = [
  'Fajr was at {fajr}. You were asleep. Allah called you before the world woke up, and you chose the pillow.',
  'Sunrise was at {sunrise}. Your Fajr never came. Thousands of people in Sheffield got up for it in the cold and dark. You didn’t.',
  'Your parents sent you across the world to become someone. That someone doesn’t sleep through Fajr.',
  'You set the alarm. You turned it off. Not tiredness, not the weather. You.',
  'Every person you admire was awake at {fajr}. You were dreaming about being one of them.',
  'The day started without you. Everything you planned is already behind, and it’s your own doing.',
  'You said you’d wake up. Simba heard you say it. He was up at {fajr}. You weren’t.',
  'Two rak‘ahs. That’s all it was. Five minutes. And you slept through them.',
];

export const brutalLine = (today: string, fajr: string, sunrise: string) =>
  BRUTAL[dayHash(today, 'brutal') % BRUTAL.length].replace(/\{fajr\}/g, fajr).replace(/\{sunrise\}/g, sunrise);
