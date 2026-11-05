import { describe, expect, it } from 'vitest';
import { normalize } from './backup';
import { bossFor, STAMINA_HP } from './boss';
import { careStatus, onTimeBedtime } from './care';
import { biting, casts, catchFish } from './fish';
import { pixelLevel } from './pixels';
import { brutalLine, ghostRace, oversleptRecently, riseOnTime, riseStreak, unresolvedPromise, wishReady } from './push';
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

describe('you vs last week', () => {
  it('races this week so far against last week up to the same day', () => {
    const d = emptyData(TODAY); // Thursday 5 Nov → Mon 2–Thu 5 vs Mon 26–Thu 29 Oct
    d.studyLog.push({ id: 'a', subjectId: null, minutes: 25, date: '2026-10-27' }, { id: 'b', subjectId: null, minutes: 25, date: '2026-10-30' });
    d.studyLog.push({ id: 'c', subjectId: null, minutes: 25, date: '2026-11-03' }, { id: 'd', subjectId: null, minutes: 25, date: '2026-11-04' });
    d.expenses.push({ id: 'e1', amount: 30, categoryId: 'food', note: '', date: '2026-10-28' }, { id: 'e2', amount: 20, categoryId: 'food', note: '', date: '2026-11-03' });
    const race = ghostRace(d, TODAY, false);
    const pom = race.rows.find((r) => r.id === 'pomodoros')!;
    expect(pom).toMatchObject({ you: 2, ghost: 1, status: 'ahead' }); // Fri 30 Oct is after "Thursday" last week
    expect(race.rows.find((r) => r.id === 'spent')).toMatchObject({ you: 20, ghost: 30, status: 'ahead' });
    // Hard mode: the ghost is 10% faster (and spends 10% less).
    const hard = ghostRace(d, TODAY, true);
    expect(hard.rows.find((r) => r.id === 'pomodoros')!.ghost).toBe(1.1);
    expect(hard.rows.find((r) => r.id === 'spent')!.ghost).toBe(27);
  });
});

describe('Fajr rise & promises', () => {
  it('is on time only before sunrise', () => {
    expect(riseOnTime('06:10', 7 * 60)).toBe(true);
    expect(riseOnTime('07:20', 7 * 60)).toBe(false);
  });
  it('counts the streak and the oversleeps', () => {
    const d = emptyData(TODAY);
    d.rise['2026-11-03'] = { time: '06:00', onTime: true };
    d.rise['2026-11-04'] = { time: '06:05', onTime: true };
    d.rise[TODAY] = { time: '08:30', onTime: false };
    expect(riseStreak(d, TODAY)).toBe(0);
    delete d.rise[TODAY];
    expect(riseStreak(d, TODAY)).toBe(2);
    d.rise[TODAY] = { time: '08:30', onTime: false };
    expect(oversleptRecently(d, TODAY)).toBe(1);
  });
  it('fills the brutal line with real times', () => {
    const line = brutalLine(TODAY, '05:13', '07:05');
    expect(line).not.toContain('{');
  });
  it('asks about yesterday’s promise until it is answered', () => {
    const d = emptyData(TODAY);
    expect(unresolvedPromise(d, TODAY)).toBeNull();
    d.promises['2026-11-04'] = { text: 'Two Pomodoros' };
    expect(unresolvedPromise(d, TODAY)).toBe('2026-11-04');
    d.promises['2026-11-04'].kept = true;
    expect(unresolvedPromise(d, TODAY)).toBeNull();
  });
  it('makes wishes need a 10% buffer in hard mode', () => {
    expect(wishReady(100, 100, false)).toBe(true);
    expect(wishReady(100, 100, true)).toBe(false);
    expect(wishReady(110, 100, true)).toBe(true);
  });
});
