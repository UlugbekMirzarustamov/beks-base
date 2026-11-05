import { describe, expect, it } from 'vitest';
import { breakDue, gardenOfYear, gardenYears, giftFor, giftWaiting, GIFTS, museum, roomStats } from './rooms';
import { emptyData } from './seed';

const TODAY = '2026-11-05';

describe('rooms show your real life', () => {
  it('counts books, jars, finished work, stars and last night’s bedtime', () => {
    const d = emptyData(TODAY);
    d.lectureNotes = [{ id: 'n', subjectId: null, title: 'L1', date: TODAY, body: '', updated: '' }];
    d.pantry = [{ id: 'a', name: 'Rice', qty: 1, unit: '', expires: '' }, { id: 'b', name: 'Milk', qty: 0, unit: '', expires: '' }];
    d.meals[TODAY] = { dinner: { text: 'Plov' } };
    d.nightLogs['2026-11-01'] = { line: 'Good day', good: ['', '', ''], tomorrow: '' };
    d.nightLogs['2026-11-02'] = { line: '', good: ['', '', ''], tomorrow: '' };
    d.sleepLog['2026-11-04'] = '23:10';
    const s = roomStats(d, TODAY);
    expect(s.books).toBe(1 + d.vocab.length + d.flashcards.length);
    expect(s).toMatchObject({ readingToday: true, jars: 1, cookingToday: true, stars: 1, sleptWell: true });
    d.sleepLog['2026-11-04'] = '01:30';
    expect(roomStats(d, TODAY).sleptWell).toBe(false);
  });
});

describe('Garden of Years', () => {
  it('grows one flower per month from good days (notes or a 4–5 mood)', () => {
    const d = emptyData(TODAY);
    for (let i = 1; i <= 12; i++) d.moods[`2026-03-${String(i).padStart(2, '0')}`] = 5;
    d.moods['2026-04-01'] = 2;
    d.nightLogs['2026-04-02'] = { line: 'nice', good: ['', '', ''], tomorrow: '' };
    d.moods['2025-12-31'] = 4;
    const g = gardenOfYear(d, 2026);
    expect(g).toHaveLength(12);
    expect(g[2]).toEqual({ month: 3, days: 12, stage: 3 });
    expect(g[3]).toMatchObject({ days: 1, stage: 1 });
    expect(g[0].stage).toBe(0);
    expect(gardenYears(d, TODAY)).toEqual([2026, 2025]);
  });
});

describe('Life Museum', () => {
  it('collects milestones newest first and never shows worship', () => {
    const d = emptyData(TODAY);
    d.badges = { 'first-lantern': '2026-10-01', 'focus': '2026-10-02' };
    d.goals = [{ id: 'g', name: 'Laptop', target: 500, icon: 'star', created: '2026-01-01', deposits: [], reached: '2026-09-01' }];
    d.catches = [{ id: 'c1', fish: 'carp', date: '2026-08-01' }, { id: 'c2', fish: 'carp', date: '2026-08-05' }];
    d.simbaGifts = [{ date: '2026-11-04', gift: 'a pebble' }];
    const m = museum(d);
    expect(m[0]).toMatchObject({ kind: 'gift', date: '2026-11-04' });
    expect(m.some((e) => e.title.includes('First lantern'))).toBe(false);
    expect(m.filter((e) => e.kind === 'fish')).toHaveLength(1);
    expect(m.find((e) => e.kind === 'savings')?.title).toBe('Saved up: Laptop');
    expect([...m].sort((a, b) => b.date.localeCompare(a.date))).toEqual(m);
  });
});

describe('Simba and breaks', () => {
  it('has one gift a day', () => {
    expect(giftFor(TODAY)).toBe(giftFor(TODAY));
    expect(GIFTS).toContain(giftFor(TODAY));
    const days = new Set(Array.from({ length: 30 }, (_, i) => giftFor(`2026-11-${String(i + 1).padStart(2, '0')}`)));
    expect(days.size).toBeGreaterThan(5);
    const d = emptyData(TODAY);
    expect(giftWaiting(d, TODAY)).toBe(true);
    d.simbaGifts.push({ date: TODAY, gift: 'x' });
    expect(giftWaiting(d, TODAY)).toBe(false);
  });

  it('reminds you to take a break only when it is switched on', () => {
    expect(breakDue(49, 50)).toBe(false);
    expect(breakDue(50, 50)).toBe(true);
    expect(breakDue(500, 0)).toBe(false);
  });
});
