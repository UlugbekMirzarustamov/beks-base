import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { bestSelf, flame, flameSize, monthStory } from './growth';
import { emptyData } from './seed';
import type { AppData } from './types';

const today = '2026-11-09';
const log = { good: ['', '', ''], tomorrow: '' };

/** A full day: top 3 set (with `done` ticked) and an evening line. */
function fullDay(d: AppData, day: string, done = [false, false, false]) {
  d.dayGoals[day] = { items: ['a', 'b', 'c'], done };
  d.nightLogs[day] = { ...log, line: 'did stuff' };
}

describe('the streak flame', () => {
  it('is not lit before anything is written', () => {
    expect(flame(emptyData(today), today).heat).toBe(0);
  });
  it('grows one step for each full day', () => {
    const d = emptyData(today);
    for (let i = 1; i <= 4; i++) fullDay(d, addDays(today, -i));
    expect(flame(d, today).heat).toBe(4);
  });
  it('shrinks on missed days but never back to zero', () => {
    const d = emptyData(today);
    fullDay(d, addDays(today, -12));
    fullDay(d, addDays(today, -11));
    // then 10 empty days
    expect(flame(d, today).heat).toBe(1);
  });
  it('holds steady on a half day (only goals or only the evening)', () => {
    const d = emptyData(today);
    fullDay(d, addDays(today, -3));
    fullDay(d, addDays(today, -2));
    d.dayGoals[addDays(today, -1)] = { items: ['x', '', ''], done: [false, false, false] };
    expect(flame(d, today).heat).toBe(2);
  });
  it("counts today once both are done, and says what's missing", () => {
    const d = emptyData(today);
    d.priorities = { date: today, items: ['a', 'b', 'c'], done: [false, false, false], entered: true };
    expect(flame(d, today)).toMatchObject({ heat: 0, goalsToday: true, eveningToday: false });
    d.nightLogs[today] = { ...log, line: 'good day' };
    expect(flame(d, today).heat).toBe(1);
  });
  it('has sizes from a spark to a blaze', () => {
    expect([0, 1, 3, 7, 14, 30].map(flameSize)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('yesterday vs today', () => {
  it('is quiet when yesterday was empty', () => {
    expect(bestSelf(emptyData(today), today)).toBeNull();
  });
  it('compares goals done and focus minutes', () => {
    const d = emptyData(today);
    fullDay(d, addDays(today, -1), [true, true, false]);
    d.studyLog.push({ id: 's1', subjectId: null, minutes: 25, date: addDays(today, -1) });
    d.priorities = { date: today, items: ['a', 'b', 'c'], done: [true, false, false], entered: true };
    const b = bestSelf(d, today)!;
    expect(b.yesterday).toMatchObject({ goalsDone: 2, focusMin: 25, wrote: true });
    expect(b.beaten).toBe(false);
    d.studyLog.push({ id: 's2', subjectId: null, minutes: 50, date: today });
    expect(bestSelf(d, today)!.beaten).toBe(true);
  });
});

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
