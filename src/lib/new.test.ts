import { describe, expect, it } from 'vitest';
import { normalize } from './backup';
import { careStatus, onTimeBedtime } from './care';
import { brutalLine, oversleptRecently, riseOnTime, riseStreak, unresolvedPromise, wishReady } from './push';
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
