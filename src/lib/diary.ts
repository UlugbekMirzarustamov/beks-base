/**
 * The diary in Reflect: free writing where every entry keeps its date and time.
 *
 * Entries can also be added from a private file on the phone, shaped like:
 *   { "bekDiary": 1, "entries": [{ "date": "2026-01-31", "time": "22:15", "text": "..." }] }
 * "time" is optional. The file only ever adds entries; adding it twice changes nothing.
 */
import { clockIn, todayUK, UK_TZ } from './dates';
import { uid } from './id';
import type { DiaryEntry } from './types';

/** The date and time right now, in the app's clock (UK). */
export function stampNow(now: Date = new Date()): { date: string; time: string } {
  return { date: todayUK(now), time: clockIn(UK_TZ, now) };
}

/** Newest first. An entry with no known time sorts as the start of its day. */
export function sortDiary(list: DiaryEntry[]): DiaryEntry[] {
  return [...list].sort((a, b) => `${b.date} ${b.time ?? ''}`.localeCompare(`${a.date} ${a.time ?? ''}`));
}

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTime = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

/** Reads a diary file. Returns null if any part of it isn't right, so nothing half-imports. */
export function parseDiaryFile(json: string): Omit<DiaryEntry, 'id'>[] | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  const file = raw as { bekDiary?: unknown; entries?: unknown } | null;
  if (!file || file.bekDiary !== 1 || !Array.isArray(file.entries)) return null;
  const out: Omit<DiaryEntry, 'id'>[] = [];
  for (const e of file.entries as ({ date?: unknown; time?: unknown; text?: unknown } | null)[]) {
    if (!e || !isDate(e.date) || typeof e.text !== 'string' || !e.text.trim()) return null;
    if (e.time !== undefined && !isTime(e.time)) return null;
    out.push({ date: e.date, text: e.text, ...(e.time ? { time: e.time } : {}) });
  }
  return out;
}

/** Adds entries that aren't already in the diary (same date and text). Returns how many were added. */
export function addToDiary(diary: DiaryEntry[], incoming: Omit<DiaryEntry, 'id'>[]): number {
  let added = 0;
  for (const e of incoming) {
    if (diary.some((d) => d.date === e.date && d.text === e.text)) continue;
    diary.push({ id: uid(), ...e });
    added++;
  }
  return added;
}
