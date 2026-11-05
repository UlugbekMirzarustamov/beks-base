import { describe, expect, it } from 'vitest';
import { exportJson, parseBackup } from './backup';
import { guessColumns, parseCsv, rowsToPurchases } from './csv';
import { daysBetween, startOfWeek, todayUK, weekdayOf } from './dates';
import { clearExampleData, createInitialData, emptyData, hasExampleData, upgrade } from './seed';
import { sessionsFromWeeks, type Row, type Week } from './timetable';
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

describe('upgrading saved data', () => {
  it('removes old example items but keeps your own', () => {
    const data = createInitialData(TODAY);
    data.expenses = [
      { id: 'a', amount: 3.2, categoryId: 'food', note: 'Coffee (example)', date: TODAY, example: true },
      { id: 'b', amount: 4.5, categoryId: 'transport', note: 'My bus', date: TODAY },
    ];
    data.tasks = [{ id: 't', title: 'Physics worksheet (example)', due: null, done: false, example: true }];
    expect(hasExampleData(data)).toBe(true);
    const up = upgrade(data, TODAY);
    expect(hasExampleData(up)).toBe(false);
    expect(up.expenses.map((e) => e.note)).toEqual(['My bus']);
    expect(up.tasks).toHaveLength(0);
    expect(up.topics.length).toBe(14);
    expect(clearExampleData(up, TODAY)).toEqual(up);
  });

  it('turns timetable weeks into dated classes (made-up example timetable)', () => {
    const mon: Row = ['09:00', '10:00', 'Maths', 'Room A', ''];
    const fri: Row = ['14:00', '15:30', 'Physics lab', 'Lab 2', ''];
    const week: Week = [[mon], [], [], [], [fri]];
    const sessions = sessionsFromWeeks([
      { monday: '2026-11-02', week },
      { monday: '2026-11-09', week },
    ]);
    const on = (date: string) => sessions.filter((s) => s.date === date).map((s) => `${s.start} ${s.name} ${s.room}`);
    expect(on('2026-11-02')).toEqual(['09:00 Maths Room A']);
    expect(on('2026-11-13')).toEqual(['14:00 Physics lab Lab 2']);
    expect(on('2026-11-07')).toEqual([]); // Saturday
    expect(sessions).toHaveLength(4);
  });

  it("keeps classes already in someone's data and never adds a timetable twice", () => {
    const data = createInitialData(TODAY);
    data.sessions = [{ id: 's1', date: TODAY, start: '09:00', end: '10:00', name: 'Maths', room: 'Room A', teacher: '' }];
    data.applied = [...data.applied, 'timetable-2026-11'];
    const up = upgrade(data, TODAY);
    expect(up.sessions).toEqual(data.sessions);
    expect(up.applied).toContain('timetable-2026-11');
  });

  it('asks about old pound amounts only if there is money data from before', () => {
    expect(createInitialData(TODAY).settings.currencyChecked).toBe(true);
    const old = emptyData(TODAY);
    old.monthlyBudget = 650; // the old £ default
    old.settings.gbpToUzs = 17000; // your own so'm-per-£ rate
    const up = upgrade(old, TODAY);
    expect(up.settings.currencyChecked).toBe(false);
    expect(up.settings.usdToUzs).toBe(Math.round(17000 * up.settings.gbpPerUsd));
    expect(upgrade(up, TODAY)).toEqual(up); // only happens once
  });

  it('turns the old sound setting into mixer levels', () => {
    const data = emptyData(TODAY);
    data.settings.sound = 'fire';
    expect(upgrade(data, TODAY).settings.mixer).toEqual({ rain: 0, fire: 4, wind: 0, lofi: 0 });
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
