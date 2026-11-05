/**
 * The universal calendar: ONE place that knows everything dated in Bek's Base.
 *
 * It doesn't copy data — it reads what already exists and merges it per day:
 *   - calendar events (`data.events`: classes, appointments, travel, birthdays, events),
 *     with daily / weekly / monthly / yearly repeats and multi-day trips;
 *   - dated school classes (`sessions`) and weekly classes (`timetable`);
 *   - exams (`tests`), task deadlines (`tasks.due`) and study blocks.
 * Plain functions, so they're easy to test.
 */
import { addDays, daysBetween, daysInMonth, toMinutes, weekdayOf } from './dates';
import type { AppData, CalEvent, CalKind } from './types';

/** Every kind of item the calendar shows. */
export type ItemKind = CalKind | 'exam' | 'deadline' | 'study';

export const KIND_INFO: Record<ItemKind, { label: string; colour: string }> = {
  class: { label: 'Class', colour: '#2a6fa8' },
  exam: { label: 'Exam', colour: '#d64541' },
  deadline: { label: 'Deadline', colour: '#e8a317' },
  study: { label: 'Study', colour: '#5fa83b' },
  appointment: { label: 'Appointment', colour: '#7a4fa3' },
  travel: { label: 'Travel', colour: '#16a085' },
  birthday: { label: 'Birthday', colour: '#f27ab8' },
  event: { label: 'Event', colour: '#8a5a2e' },
};

/** One thing on one day, whatever it came from. */
export interface CalItem {
  /** Unique within a day (source + id). */
  key: string;
  /** The id in its own list (event, session, slot, test, task or study block). */
  id: string;
  source: 'event' | 'session' | 'timetable' | 'test' | 'task' | 'study';
  kind: ItemKind;
  title: string;
  date: string;
  /** "HH:MM", or empty for all-day items. */
  start: string;
  end: string;
  location: string;
  done?: boolean;
}

const dayOf = (ymd: string) => Number(ymd.slice(8, 10));
const monthOfYear = (ymd: string) => Number(ymd.slice(5, 7));
const yearOf = (ymd: string) => Number(ymd.slice(0, 4));

/** Does this event happen on `date`? */
export function occursOn(e: CalEvent, date: string): boolean {
  if (date < e.date) return false;
  if (e.repeat !== 'none' && e.until && date > e.until) return false;
  switch (e.repeat) {
    case 'none':
      return date <= (e.endDate && e.endDate > e.date ? e.endDate : e.date);
    case 'daily':
      return true;
    case 'weekly':
      return weekdayOf(date) === weekdayOf(e.date);
    case 'monthly':
      // The 31st falls on the last day of shorter months.
      return dayOf(date) === Math.min(dayOf(e.date), daysInMonth(yearOf(date), monthOfYear(date)));
    case 'yearly':
      // A 29 February birthday shows on the 28th in other years.
      return monthOfYear(date) === monthOfYear(e.date) && dayOf(date) === Math.min(dayOf(e.date), daysInMonth(yearOf(date), monthOfYear(date)));
  }
}

const byTime = (a: CalItem, b: CalItem) => (a.start === b.start ? a.title.localeCompare(b.title) : a.start === '' ? -1 : b.start === '' ? 1 : a.start.localeCompare(b.start));

/** Everything on one day, all-day items first, then by time. */
export function itemsOn(d: AppData, date: string): CalItem[] {
  const items: CalItem[] = [];
  for (const e of d.events) {
    if (!occursOn(e, date)) continue;
    items.push({ key: `event-${e.id}`, id: e.id, source: 'event', kind: e.kind, title: e.title, date, start: e.start, end: e.end, location: e.location });
  }
  for (const c of d.sessions) {
    if (c.date === date) items.push({ key: `session-${c.id}`, id: c.id, source: 'session', kind: 'class', title: c.name, date, start: c.start, end: c.end, location: c.room });
  }
  for (const c of d.timetable) {
    if (c.day === weekdayOf(date)) items.push({ key: `timetable-${c.id}`, id: c.id, source: 'timetable', kind: 'class', title: c.name, date, start: c.start, end: c.end, location: c.room });
  }
  for (const t of d.tests) {
    if (t.date === date) items.push({ key: `test-${t.id}`, id: t.id, source: 'test', kind: 'exam', title: t.name, date, start: '', end: '', location: '' });
  }
  for (const t of d.tasks) {
    if (t.due === date) items.push({ key: `task-${t.id}`, id: t.id, source: 'task', kind: 'deadline', title: t.title, date, start: '', end: '', location: '', done: t.done });
  }
  for (const b of d.studyBlocks) {
    if (b.date === date) items.push({ key: `study-${b.id}`, id: b.id, source: 'study', kind: 'study', title: b.title, date, start: b.start, end: b.end, location: '' });
  }
  return items.sort(byTime);
}

/** Items for every day from `from` to `to` (inclusive, at most a year). */
export function itemsBetween(d: AppData, from: string, to: string): Map<string, CalItem[]> {
  const out = new Map<string, CalItem[]>();
  for (let day = from; day <= to && daysBetween(from, day) <= 366; day = addDays(day, 1)) out.set(day, itemsOn(d, day));
  return out;
}

/** Minutes an item takes up; one with no (or a wrong) end time counts as an hour. */
const span = (i: CalItem): [number, number] => {
  const s = toMinutes(i.start);
  const e = i.end ? toMinutes(i.end) : s + 60;
  return [s, e > s ? e : s + 60];
};

/** Timed items that overlap each other on the same day (back-to-back is fine; all-day items never clash). */
export function conflicts(items: CalItem[]): [CalItem, CalItem][] {
  const timed = items.filter((i) => i.start);
  const out: [CalItem, CalItem][] = [];
  for (let a = 0; a < timed.length; a++) {
    for (let b = a + 1; b < timed.length; b++) {
      const [as, ae] = span(timed[a]);
      const [bs, be] = span(timed[b]);
      if (as < be && bs < ae) out.push([timed[a], timed[b]]);
    }
  }
  return out;
}

/** The next important things (not classes, study blocks or finished tasks) in the coming `days`, soonest first. */
export function upcoming(d: AppData, today: string, days = 14): CalItem[] {
  const out: CalItem[] = [];
  const shownTrips = new Set<string>();
  for (const [, items] of itemsBetween(d, today, addDays(today, days))) {
    for (const i of items) {
      if (i.kind === 'class' || i.kind === 'study' || i.done) continue;
      // A multi-day trip shows once (on its first day in the range), not every day.
      const multiDay = i.source === 'event' && d.events.find((e) => e.id === i.id)?.repeat === 'none';
      if (multiDay) {
        if (shownTrips.has(i.id)) continue;
        shownTrips.add(i.id);
      }
      out.push(i);
    }
  }
  return out;
}

/** A blank event for the add form. */
export const newEvent = (date: string, kind: CalKind = 'event'): Omit<CalEvent, 'id'> => ({
  title: '',
  kind,
  date,
  start: '',
  end: '',
  endDate: '',
  repeat: kind === 'birthday' ? 'yearly' : 'none',
  until: '',
  location: '',
  notes: '',
});
