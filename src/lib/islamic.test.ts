import { describe, expect, it } from 'vitest';
import { afterRevision, dueForRevision, hijriLabel, isFriday, nextFriday, nextOccasions } from './islamic';
import { prayerTimes } from './prayer';
import { SURAHS } from './surahs';
import type { HifzItem, PrayerSettings } from './types';

const BASE: PrayerSettings = { asr: 'hanafi', offsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, call: true };

describe('calculation methods', () => {
  it('keeps the Muslim World League times by default and changes Fajr/Isha by method', () => {
    const mwl = prayerTimes('2026-11-04', BASE);
    expect(prayerTimes('2026-11-04', { ...BASE, method: 'mwl' })).toEqual(mwl);
    const isna = prayerTimes('2026-11-04', { ...BASE, method: 'isna' });
    expect(isna.fajr).toBeGreaterThan(mwl.fajr); // 15° is later than 18°
    expect(isna.isha).toBeLessThan(mwl.isha);
    expect(isna.dhuhr).toBe(mwl.dhuhr);
    const makkah = prayerTimes('2026-11-04', { ...BASE, method: 'makkah' });
    expect(makkah.isha - makkah.maghrib).toBe(90);
  });
});

describe('Islamic calendar', () => {
  it('names the Hijri date and finds the next occasions in order', () => {
    expect(hijriLabel('2026-11-05')).toMatch(/^\d{1,2} [A-Z][\w-]+.* 14\d\d AH$/);
    const next = nextOccasions('2026-11-05');
    expect(next.map((o) => o.name)).toContain('Start of Ramadan');
    expect(next.map((o) => o.name)).toContain('Eid al-Adha');
    expect([...next].sort((a, b) => a.daysLeft - b.daysLeft)).toEqual(next);
    const eid = next.find((o) => o.name === 'Eid al-Fitr')!;
    const ramadan = next.find((o) => o.name === 'Start of Ramadan')!;
    expect(eid.date > ramadan.date).toBe(true);
  });

  it('knows Fridays', () => {
    expect(isFriday('2026-11-06')).toBe(true);
    expect(isFriday('2026-11-05')).toBe(false);
    expect(nextFriday('2026-11-05')).toBe('2026-11-06');
    expect(nextFriday('2026-11-06')).toBe('2026-11-06');
  });
});

describe('hifz revision', () => {
  const item = (surah: number, revised: string, interval: number, learned = 4): HifzItem => ({ id: String(surah), surah, learned, revised, interval });

  it('has all 114 surahs and 6236 ayahs', () => {
    expect(SURAHS).toHaveLength(114);
    expect(SURAHS.reduce((n, [, a]) => n + a, 0)).toBe(6236);
  });

  it('lists surahs due for revision, most overdue first', () => {
    const items = [item(112, '2026-11-04', 1), item(113, '2026-10-20', 7), item(114, '2026-11-05', 3), item(1, '', 1), item(2, '', 1, 0)];
    expect(dueForRevision(items, '2026-11-05').map((i) => i.surah)).toEqual([1, 113, 112]);
  });

  it('spaces revisions further apart while solid, and brings shaky ones back tomorrow', () => {
    const a = afterRevision(item(112, '', 1), '2026-11-05', true);
    expect(a).toMatchObject({ revised: '2026-11-05', interval: 3 });
    expect(afterRevision({ ...a, interval: 60 }, '2026-11-05', true).interval).toBe(60);
    expect(afterRevision({ ...a, interval: 14 }, '2026-11-05', false).interval).toBe(1);
  });
});
