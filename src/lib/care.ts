/**
 * "Simba needs you": Simba is only as well as you are. Eat proper meals, drink
 * water and sleep on time, and he's happy; skip them and he notices.
 */
import { addDays, toMinutes } from './dates';
import type { AppData } from './types';

export const MEAL_GOAL = 3;
export const WATER_GOAL = 8;

/** Bedtime "HH:MM" counts as on time between 20:00 and 00:30. */
export function onTimeBedtime(hhmm: string): boolean {
  const m = toMinutes(hhmm);
  return m >= 20 * 60 || m <= 30;
}

export interface CareStatus {
  meals: number;
  water: number;
  /** Last night: true = on time, false = late, null = not logged. */
  slept: boolean | null;
  /** 0–3 hearts: one each for meals, water and sleep going well. */
  hearts: number;
  /** It's past lunchtime (13:00) and you haven't eaten yet. */
  hungry: boolean;
}

export function careStatus(d: AppData, today: string, hour: number): CareStatus {
  const c = d.care[today] ?? { meals: 0, water: 0 };
  const bedtime = d.sleepLog[addDays(today, -1)];
  const slept = bedtime ? onTimeBedtime(bedtime) : null;
  // Meals and water are judged by how far into the day it is (2 meals by 18:00 is fine).
  const mealsDue = hour < 10 ? 0 : hour < 14 ? 1 : hour < 19 ? 2 : 3;
  const waterDue = Math.max(0, Math.min(WATER_GOAL, Math.floor((hour - 8) / 1.75)));
  const hearts = (c.meals >= mealsDue ? 1 : 0) + (c.water >= waterDue ? 1 : 0) + (slept !== false ? 1 : 0);
  return { meals: c.meals, water: c.water, slept, hearts, hungry: hour >= 13 && c.meals === 0 };
}
