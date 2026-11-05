/**
 * Dated school timetables. Each class becomes a dated ClassSession, so the app shows
 * the right classes on the right day (weeks don't have to be identical).
 *
 * PRIVACY: this repository is public, so real timetables (module names, rooms,
 * staff names) must NOT be written here. The November 2026 timetable that used to
 * live in this file has already been added to Bek's own data on his device
 * (recorded as a one-time step in `data.applied`), so removing it changes nothing there.
 * Future timetables should be entered in the app itself, not in code.
 */
import { addDays } from './dates';
import { uid } from './id';
import type { ClassSession } from './types';

/** [start, end, class, room, teacher] */
export type Row = [string, string, string, string, string];
/** Monday … Friday (weekends are free) */
export type Week = [Row[], Row[], Row[], Row[], Row[]];

/** Turn weeks of rows (each starting on a Monday) into dated class sessions. */
export function sessionsFromWeeks(weeks: { monday: string; week: Week }[]): ClassSession[] {
  return weeks.flatMap(({ monday, week }) =>
    week.flatMap((rows, day) => rows.map(([start, end, name, room, teacher]) => ({ id: uid(), date: addDays(monday, day), start, end, name, room, teacher }))),
  );
}

/** Timetables added to the data once each (by id, via `upgrade()` in seed.ts). Intentionally empty in public code. */
export const TIMETABLES: Record<string, () => ClassSession[]> = {};
