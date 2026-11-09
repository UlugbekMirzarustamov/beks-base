import { describe, expect, it } from 'vitest';
import { doorIsShut, eveningDue, suggestTopThree, weekInWords } from './dayDoor';
import { emptyData } from './seed';
import type { Priorities } from './types';

const day = '2026-11-09'; // a Monday
const top = (items: string[], extra: Partial<Priorities> = {}): Priorities => ({ date: day, items, done: [false, false, false], ...extra });

describe('the morning door', () => {
  it('stays shut until all three are written', () => {
    expect(doorIsShut(top(['', '', '']), day, 9)).toBe(true);
    expect(doorIsShut(top(['a', 'b', ' ']), day, 9)).toBe(true);
    expect(doorIsShut(top(['a', 'b', 'c']), day, 9)).toBe(false);
  });
  it('stays open once entered, even while a goal is being edited', () => {
    expect(doorIsShut(top(['a', '', 'c'], { entered: true }), day, 9)).toBe(false);
  });
  it('shuts again on a new day, but not in the small hours', () => {
    expect(doorIsShut(top(['a', 'b', 'c']), '2026-11-10', 9)).toBe(true);
    expect(doorIsShut(top(['', '', '']), day, 2)).toBe(false);
  });
});

describe('fill them for me', () => {
  it('starts with last night\'s plan and never repeats itself', () => {
    const d = emptyData(day);
    d.nightLogs['2026-11-08'] = { line: 'x', good: ['', '', ''], tomorrow: 'Finish lab' };
    d.planGoals.push(
      { id: '1', level: 'week', period: day, title: 'finish lab', done: false, parentId: null },
      { id: '2', level: 'week', period: day, title: 'Gym twice', done: false, parentId: null },
      { id: '3', level: 'week', period: day, title: 'Done one', done: true, parentId: null },
    );
    expect(suggestTopThree(d, day)).toEqual(['Finish lab', 'Gym twice']);
  });
});

describe('the evening and the week', () => {
  it('asks from the evening until something is written', () => {
    const d = emptyData(day);
    expect(eveningDue(d, day, 18)).toBe(false);
    expect(eveningDue(d, day, 20)).toBe(true);
    d.nightLogs[day] = { line: 'Good day', good: ['', '', ''], tomorrow: '' };
    expect(eveningDue(d, day, 20)).toBe(false);
  });
  it('adds up each day\'s goals and words, including today', () => {
    const d = emptyData(day);
    d.dayGoals['2026-11-09'] = { items: ['a', 'b', 'c'], done: [true, false, true] };
    d.priorities = { date: '2026-11-10', items: ['x', 'y', ''], done: [true, false, false] };
    d.nightLogs['2026-11-09'] = { line: 'Busy', good: ['', '', ''], tomorrow: '' };
    d.moods['2026-11-09'] = 4;
    const w = weekInWords(d, '2026-11-09', '2026-11-10');
    expect(w.goalsSet).toBe(5);
    expect(w.goalsDone).toBe(3);
    expect(w.days).toEqual([{ date: '2026-11-09', line: 'Busy', mood: 4 }]);
  });
});
