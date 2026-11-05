/**
 * Year in pixels: one little square for every day of the year, coloured by
 * how that day went — mood, prayers, money or study. Plain functions for testing.
 */
import { potStatus, spendByDay } from './pot';
import { PRAYERS } from './prayer';
import type { AppData } from './types';

export type PixelKind = 'mood' | 'prayer' | 'money' | 'study';

/** 1 (worst) … 5 (best), or null when there's nothing logged that day. `spent` can be passed in to save work. */
export function pixelLevel(d: AppData, kind: PixelKind, day: string, spent?: Map<string, number>): number | null {
  switch (kind) {
    case 'mood':
      return d.moods[day] ?? null;
    case 'prayer': {
      const n = PRAYERS.filter((p) => d.prayers[day]?.includes(p)).length;
      return n ? n : null;
    }
    case 'study': {
      const mins = d.studyLog.filter((s) => s.date === day).reduce((a, s) => a + s.minutes, 0);
      if (!mins) return null;
      return mins >= 150 ? 5 : mins >= 100 ? 4 : mins >= 50 ? 3 : 2;
    }
    case 'money': {
      if (!d.pot || day < d.pot.start) return null;
      const daily = potStatus(d.pot, [], d.pot.start).daily;
      const amount = (spent ?? spendByDay(d.expenses, d.pot.start, day)).get(day) ?? 0;
      if (amount === 0) return 5;
      if (amount <= daily / 2) return 4;
      if (amount <= daily) return 3;
      if (amount <= daily * 1.5) return 2;
      return 1;
    }
  }
}
