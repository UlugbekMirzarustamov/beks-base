import { describe, expect, it } from 'vitest';
import { exportJson, parseBackup } from './backup';
import { guessColumns, parseCsv, rowsToPurchases } from './csv';
import { daysBetween, startOfWeek, todayUK, weekdayOf } from './dates';
import { clearExampleData, createInitialData, hasExampleData } from './seed';
import { levelInfo } from './xp';

const TODAY = '2026-11-03';

describe('backup', () => {
  it('export → import gives back exactly the same data', () => {
    const data = createInitialData(TODAY);
    data.xp = 345;
    data.moods[TODAY] = 4;
    const restored = parseBackup(exportJson(data), TODAY);
    expect(restored).toEqual(data);
  });

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('hello', TODAY)).toThrow();
    expect(() => parseBackup('{"foo":1}', TODAY)).toThrow();
  });

  it('fills in missing fields from older backups', () => {
    const old = { version: 1, expenses: [], xp: 50 };
    const r = parseBackup(JSON.stringify(old), TODAY);
    expect(r.xp).toBe(50);
    expect(r.categories.length).toBeGreaterThan(0);
    expect(r.settings.pomodoroWork).toBe(25);
  });
});

describe('example data', () => {
  it('can be cleared in one go, keeping starter topics & formulas', () => {
    const data = createInitialData(TODAY);
    expect(hasExampleData(data)).toBe(true);
    const cleared = clearExampleData(data, TODAY);
    expect(hasExampleData(cleared)).toBe(false);
    expect(cleared.expenses).toHaveLength(0);
    expect(cleared.topics.length).toBe(14);
    expect(cleared.flashcards.length).toBeGreaterThan(15);
  });
});

describe('csv import', () => {
  it('reads a bank CSV and keeps only spending', () => {
    const text = 'Date,Name,Amount\n03/11/2026,"Tesco, Sheffield",-12.50\n04/11/2026,Salary,500\n05/11/2026,Bus,-2.60\n';
    const rows = parseCsv(text);
    const cols = guessColumns(rows[0]);
    const purchases = rowsToPurchases(rows.slice(1), cols);
    expect(purchases).toEqual([
      { date: '2026-11-03', amount: 12.5, description: 'Tesco, Sheffield' },
      { date: '2026-11-05', amount: 2.6, description: 'Bus' },
    ]);
  });
});

describe('dates & xp', () => {
  it('uses UK time, not the computer time zone', () => {
    // 23:30 UTC on 31 Oct 2026 is still 31 Oct in the UK (GMT), but 1 Nov in Tashkent.
    expect(todayUK(new Date('2026-10-31T23:30:00Z'))).toBe('2026-10-31');
    // During British Summer Time, 23:30 UTC is already the next day in the UK.
    expect(todayUK(new Date('2026-07-01T23:30:00Z'))).toBe('2026-07-02');
  });

  it('does week maths', () => {
    expect(weekdayOf('2026-11-02')).toBe(0); // Monday
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02');
    expect(daysBetween('2026-11-03', '2026-11-21')).toBe(18);
  });

  it('levels up', () => {
    expect(levelInfo(0)).toEqual({ level: 1, into: 0, needed: 100 });
    expect(levelInfo(100)).toEqual({ level: 2, into: 0, needed: 150 });
    expect(levelInfo(260).level).toBe(3);
  });
});
