import { describe, expect, it } from 'vitest';
import { nextUnlock, plantStage, seasonOf, simbaMood, streak, unlockedIds } from './cabin';
import { juzOfPage } from './quran';
import { parseWeather, weatherKind } from './weather';
import { newlyEarned } from './badges';
import { emptyData } from './seed';

describe('cabin', () => {
  it('unlocks furniture as you level up', () => {
    expect(unlockedIds(1).size).toBe(0);
    expect(unlockedIds(3)).toEqual(new Set(['teapot', 'lamp']));
    expect(nextUnlock(1)?.id).toBe('teapot');
    expect(nextUnlock(99)).toBeNull();
  });

  it('knows the UK season', () => {
    expect(seasonOf('2026-11-04')).toBe('autumn');
    expect(seasonOf('2026-12-25')).toBe('winter');
    expect(seasonOf('2027-03-21')).toBe('spring'); // Navruz
    expect(seasonOf('2027-07-01')).toBe('summer');
  });

  it('counts streaks and grows the plant', () => {
    const done = new Set(['2026-11-02', '2026-11-03']);
    expect(streak((d) => done.has(d), '2026-11-04')).toBe(2); // today not done yet → counts up to yesterday
    done.add('2026-11-04');
    expect(streak((d) => done.has(d), '2026-11-04')).toBe(3);
    expect(plantStage(0)).toBe(0);
    expect(plantStage(3)).toBe(2);
    expect(plantStage(30)).toBe(4);
  });

  it('gives Simba the most important mood', () => {
    const base = { prayerDue: false, studying: false, overBudget: false, starLit: false, night: false };
    expect(simbaMood(base)).toBe('sleep');
    expect(simbaMood({ ...base, overBudget: true, studying: true })).toBe('study');
    expect(simbaMood({ ...base, prayerDue: true, studying: true })).toBe('prayer');
    expect(simbaMood({ ...base, night: true })).toBe('cosy');
  });
});

describe('weather', () => {
  it('maps weather codes', () => {
    expect(weatherKind(0)).toBe('clear');
    expect(weatherKind(61)).toBe('rain');
    expect(weatherKind(73)).toBe('snow');
    expect(weatherKind(95)).toBe('storm');
    expect(weatherKind(45)).toBe('fog');
  });

  it('reads the Open-Meteo answer', () => {
    const w = parseWeather(
      {
        current: { temperature_2m: 8.6, weather_code: 3, is_day: 1 },
        daily: { time: ['2026-11-04'], weather_code: [61], temperature_2m_max: [10.4], temperature_2m_min: [4.6], precipitation_probability_max: [80] },
      },
      1,
    );
    expect(w).toEqual({ fetched: 1, current: { temp: 9, code: 3, isDay: true }, daily: [{ date: '2026-11-04', code: 61, max: 10, min: 5, rain: 80 }] });
    expect(() => parseWeather({})).toThrow();
  });
});

describe('quran', () => {
  it('knows which juz a page is in (Madani mushaf)', () => {
    expect(juzOfPage(1)).toBe(1);
    expect(juzOfPage(21)).toBe(1);
    expect(juzOfPage(22)).toBe(2);
    expect(juzOfPage(582)).toBe(30);
    expect(juzOfPage(604)).toBe(30);
  });
});

describe('badges', () => {
  it('awards badges when you earn them, and only once', () => {
    const d = emptyData('2026-11-04');
    expect(newlyEarned(d, '2026-11-04').map((b) => b.id)).toEqual([]);
    d.prayers['2026-11-04'] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const ids = newlyEarned(d, '2026-11-04').map((b) => b.id);
    expect(ids).toContain('first-lantern');
    expect(ids).toContain('five-lanterns');
    expect(ids).not.toContain('steadfast'); // needs 7 days in a row
    d.badges = Object.fromEntries(ids.map((id) => [id, '2026-11-04']));
    expect(newlyEarned(d, '2026-11-04')).toEqual([]);
  });
});
