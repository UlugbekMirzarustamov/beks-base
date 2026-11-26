import { describe, expect, it } from 'vitest';
import { monthStory } from './growth';
import { emptyData } from './seed';
import type { AppData } from './types';

const today = '2026-11-09';
const log = { good: ['', '', ''], tomorrow: '' };

/** A full day: top 3 set (with `done` ticked) and an evening line. */
function fullDay(d: AppData, day: string, done = [false, false, false]) {
  d.dayGoals[day] = { items: ['a', 'b', 'c'], done };
  d.nightLogs[day] = { ...log, line: 'did stuff' };
}

describe('the month story', () => {
  it('adds up the month so far', () => {
    const d = emptyData(today);
    fullDay(d, '2026-11-02', [true, true, true]);
    fullDay(d, '2026-11-03', [true, false, false]);
    d.moods['2026-11-02'] = 5;
    d.moods['2026-11-03'] = 3;
    d.moods['2026-10-31'] = 1; // last month: not counted
    d.studyLog.push({ id: 's', subjectId: null, minutes: 40, date: '2026-11-03' });
    const s = monthStory(d, '2026-11', today);
    expect(s).toMatchObject({ days: 9, daysWithGoals: 2, goalsSet: 6, goalsDone: 4, evenings: 2, focusMin: 40, usualMood: 5, bestDay: '2026-11-02' });
    expect(s.moods[1]).toBe(0);
    expect(s.highlights).toEqual([{ date: '2026-11-02', line: 'did stuff' }]);
  });
  it('covers a whole past month', () => {
    expect(monthStory(emptyData(today), '2026-10', today).days).toBe(31);
  });
});
