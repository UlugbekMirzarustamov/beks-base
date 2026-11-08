import { describe, expect, it } from 'vitest';
import { addToDiary, parseDiaryFile, sortDiary, stampNow } from './diary';
import { emptyData } from './seed';
import { buildIndex } from './search';
import type { DiaryEntry } from './types';

const entry = (date: string, time: string | undefined, text = 'sample'): DiaryEntry => ({ id: `${date}${time}`, date, text, ...(time ? { time } : {}) });

describe('diary', () => {
  it('stamps with UK date and time', () => {
    expect(stampNow(new Date('2026-07-01T23:30:00Z'))).toEqual({ date: '2026-07-02', time: '00:30' });
  });

  it('sorts newest first, using the time inside a day', () => {
    const sorted = sortDiary([entry('2026-01-01', '08:00'), entry('2026-01-02', undefined), entry('2026-01-01', '21:00')]);
    expect(sorted.map((e) => `${e.date} ${e.time ?? ''}`)).toEqual(['2026-01-02 ', '2026-01-01 21:00', '2026-01-01 08:00']);
  });

  it('reads a good file, with or without a time', () => {
    const file = JSON.stringify({ bekDiary: 1, entries: [{ date: '2026-01-01', time: '00:45', text: 'a' }, { date: '2026-01-02', text: 'b' }] });
    expect(parseDiaryFile(file)).toEqual([{ date: '2026-01-01', time: '00:45', text: 'a' }, { date: '2026-01-02', text: 'b' }]);
  });

  it('refuses the whole file if anything is wrong', () => {
    expect(parseDiaryFile('not json')).toBeNull();
    expect(parseDiaryFile('{"entries":[]}')).toBeNull();
    expect(parseDiaryFile(JSON.stringify({ bekDiary: 1, entries: [{ date: '2026-01-01', text: 'ok' }, { date: 'soon', text: 'bad' }] }))).toBeNull();
    expect(parseDiaryFile(JSON.stringify({ bekDiary: 1, entries: [{ date: '2026-01-01', time: '25:00', text: 'bad' }] }))).toBeNull();
    expect(parseDiaryFile(JSON.stringify({ bekDiary: 1, entries: [{ date: '2026-01-01', text: '  ' }] }))).toBeNull();
  });

  it('only adds: keeps existing entries and never duplicates', () => {
    const diary = [entry('2026-01-01', '10:00', 'mine')];
    const incoming = [{ date: '2026-01-01', text: 'mine' }, { date: '2026-01-02', text: 'new' }];
    expect(addToDiary(diary, incoming)).toBe(1);
    expect(addToDiary(diary, incoming)).toBe(0);
    expect(diary.map((e) => e.text)).toEqual(['mine', 'new']);
  });

  it('starts empty and shows up in search', () => {
    const d = emptyData('2026-01-01');
    expect(d.diary).toEqual([]);
    d.diary.push(entry('2026-01-01', '10:00', 'a quiet walk by the river'));
    expect(buildIndex(d).some((r) => r.kind === 'Diary')).toBe(true);
  });
});
