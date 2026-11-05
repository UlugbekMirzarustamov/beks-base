import { describe, expect, it } from 'vitest';
import { normalize } from './backup';
import { bossFor, STAMINA_HP } from './boss';
import { careStatus, onTimeBedtime } from './care';
import { biting, casts, catchFish } from './fish';
import { pixelLevel } from './pixels';
import { hijri, ramadanInfo } from './ramadan';
import { emptyData } from './seed';

const TODAY = '2026-11-05';

describe('ramadan', () => {
  it('knows Ramadan 1448 starts around 8 Feb 2027', () => {
    expect(hijri('2027-02-08')).toEqual({ year: 1448, month: 9, day: 1 });
    const r = ramadanInfo(TODAY);
    expect(r.now).toBe(false);
    expect(r.start).toBe('2027-02-08');
    expect(r.daysUntil).toBe(95);
    expect(r.end >= '2027-03-08').toBe(true);
  });
  it('counts the day of Ramadan', () => {
    const r = ramadanInfo('2027-02-12');
    expect(r.now).toBe(true);
    expect(r.day).toBe(5);
  });
});

describe('exam boss', () => {
  it('loses HP for green topics and Pomodoros', () => {
    const d = emptyData(TODAY);
    const test = { id: 't1', name: 'Physics mid-term', date: '2026-11-20', subjectId: 'physics' };
    d.tests.push(test);
    const fresh = bossFor(test, d);
    expect(fresh.hp).toBe(fresh.maxHp);
    expect(fresh.maxHp).toBe(11 * 10 + STAMINA_HP);
    d.topics.find((t) => t.subjectId === 'physics')!.confidence = 'green';
    d.studyLog.push({ id: 's', subjectId: 'physics', minutes: 25, date: '2026-11-10' }, { id: 's2', subjectId: 'maths', minutes: 25, date: '2026-11-10' });
    const hit = bossFor(test, d);
    expect(hit.hp).toBe(fresh.maxHp - 10 - 6);
    expect(hit.weakSpots).toHaveLength(10);
  });
});

describe('fishing', () => {
  it('earns casts from Pomodoros and full prayer days', () => {
    const d = emptyData(TODAY);
    expect(casts(d).left).toBe(3);
    d.studyLog.push({ id: 's', subjectId: null, minutes: 25, date: TODAY });
    d.prayers[TODAY] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    d.catches.push({ id: 'c', fish: 'minnow', date: TODAY });
    expect(casts(d)).toEqual({ earned: 5, left: 4 });
  });
  it('only lets special fish bite at the right time', () => {
    const autumnDay = biting({ season: 'autumn', night: false, fullPrayer: false }).map((f) => f.id);
    expect(autumnDay).toContain('leaf');
    expect(autumnDay).not.toContain('eel');
    expect(autumnDay).not.toContain('golden');
    expect(biting({ season: 'winter', night: true, fullPrayer: true }).map((f) => f.id)).toEqual(expect.arrayContaining(['ice', 'eel', 'golden']));
    expect(catchFish({ season: 'autumn', night: false, fullPrayer: false }, 0).id).toBe('minnow');
    expect(catchFish({ season: 'autumn', night: false, fullPrayer: false }, 0.9999).id).toBe('sturgeon');
  });
});

describe('Simba needs you', () => {
  it('judges bedtimes', () => {
    expect(onTimeBedtime('23:30')).toBe(true);
    expect(onTimeBedtime('00:20')).toBe(true);
    expect(onTimeBedtime('02:10')).toBe(false);
  });
  it('gets hungry after lunch with no meals', () => {
    const d = emptyData(TODAY);
    expect(careStatus(d, TODAY, 14).hungry).toBe(true);
    d.care[TODAY] = { meals: 2, water: 5 };
    d.sleepLog['2026-11-04'] = '23:15';
    const s = careStatus(d, TODAY, 15);
    expect(s.hungry).toBe(false);
    expect(s.hearts).toBe(3);
  });
});

describe('year in pixels', () => {
  it('colours days by prayers, study and money', () => {
    const d = emptyData(TODAY);
    expect(pixelLevel(d, 'prayer', TODAY)).toBeNull();
    d.prayers[TODAY] = ['fajr', 'dhuhr'];
    expect(pixelLevel(d, 'prayer', TODAY)).toBe(2);
    d.studyLog.push({ id: 's', subjectId: null, minutes: 100, date: TODAY });
    expect(pixelLevel(d, 'study', TODAY)).toBe(4);
    d.pot = { total: 3700, start: '2026-11-04', months: 5 };
    expect(pixelLevel(d, 'money', TODAY)).toBe(5);
    d.expenses.push({ id: 'e', amount: 40, categoryId: 'food', note: '', date: TODAY });
    expect(pixelLevel(d, 'money', TODAY)).toBe(1);
  });
});

describe('older saved data', () => {
  it('gets the lo-fi radio channel added to the mixer', () => {
    const d = emptyData(TODAY) as unknown as Record<string, unknown>;
    const settings = d.settings as Record<string, unknown>;
    settings.mixer = { rain: 2, fire: 3, wind: 0 };
    const out = normalize(d, TODAY);
    expect(out.settings.mixer).toEqual({ rain: 2, fire: 3, wind: 0, lofi: 0 });
    expect(out.catches).toEqual([]);
  });
});
