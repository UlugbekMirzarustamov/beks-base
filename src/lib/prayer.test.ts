import { describe, expect, it } from 'vitest';
import { prayerNow, prayerTimes, qiblaBearing } from './prayer';
import type { PrayerSettings } from './types';

const HANAFI: PrayerSettings = { asr: 'hanafi', offsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, call: true };
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const between = (m: number, from: string, to: string) => {
  expect(clock(m) >= from && clock(m) <= to, `${clock(m)} should be ${from}–${to}`).toBe(true);
};

describe('prayer times in Sheffield', () => {
  it('match the real sky in November (GMT)', () => {
    const t = prayerTimes('2026-11-04', HANAFI);
    between(t.sunrise, '07:05', '07:20'); // sunrise ~07:12
    between(t.dhuhr, '11:46', '11:53'); // solar noon ~11:50
    between(t.maghrib, '16:22', '16:38'); // sunset ~16:30
    between(t.asr, '14:25', '14:45'); // Hanafi Asr (~14:35 — the sun is very low in a Sheffield November)
    between(prayerTimes('2026-11-04', { ...HANAFI, asr: 'standard' }).asr, '13:45', '14:05'); // standard Asr
    expect(t.fajr).toBeLessThan(t.sunrise - 60);
    expect(t.isha).toBeGreaterThan(t.maghrib + 60);
  });

  it('use British Summer Time in June and still give Fajr and Isha', () => {
    const t = prayerTimes('2026-06-21', HANAFI);
    between(t.dhuhr, '13:00', '13:08'); // BST
    expect(Number.isFinite(t.fajr) && Number.isFinite(t.isha)).toBe(true);
    expect(t.fajr).toBeLessThan(t.sunrise);
    expect(t.isha).toBeGreaterThan(t.maghrib);
  });

  it('standard Asr is earlier than Hanafi Asr, and offsets apply', () => {
    const standard = prayerTimes('2026-11-04', { ...HANAFI, asr: 'standard' });
    const hanafi = prayerTimes('2026-11-04', HANAFI);
    expect(standard.asr).toBeLessThan(hanafi.asr);
    const shifted = prayerTimes('2026-11-04', { ...HANAFI, offsets: { ...HANAFI.offsets, dhuhr: 5 } });
    expect(shifted.dhuhr - hanafi.dhuhr).toBe(5);
  });

  it('knows the current and next prayer', () => {
    const t = prayerTimes('2026-11-04', HANAFI);
    const afterDhuhr = prayerNow('2026-11-04', t.dhuhr + 10, HANAFI);
    expect(afterDhuhr.current?.name).toBe('dhuhr');
    expect(afterDhuhr.next.name).toBe('asr');
    // 1am belongs to last night's Isha
    const lateNight = prayerNow('2026-11-04', 60, HANAFI);
    expect(lateNight.current?.name).toBe('isha');
    expect(lateNight.current?.date).toBe('2026-11-03');
    expect(lateNight.next.name).toBe('fajr');
    // Between sunrise and Dhuhr there is no prayer due
    expect(prayerNow('2026-11-04', t.sunrise + 30, HANAFI).current).toBeNull();
  });

  it('points the qibla south-east', () => {
    const q = qiblaBearing();
    expect(q).toBeGreaterThan(115);
    expect(q).toBeLessThan(123);
  });
});
