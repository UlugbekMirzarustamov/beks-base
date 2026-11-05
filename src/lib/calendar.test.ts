import { describe, expect, it } from 'vitest';
import { conflicts, itemsOn, newEvent, occursOn, upcoming, type CalItem } from './calendar';
import { emptyData } from './seed';
import type { CalEvent } from './types';

const TODAY = '2026-11-05'; // a Thursday
const ev = (over: Partial<CalEvent>): CalEvent => ({ id: over.id ?? 'e', ...newEvent(over.date ?? TODAY), ...over });

describe('repeating events', () => {
  it('one-off and multi-day events', () => {
    const once = ev({ date: TODAY });
    expect(occursOn(once, TODAY)).toBe(true);
    expect(occursOn(once, '2026-11-06')).toBe(false);
    const trip = ev({ date: '2026-12-20', endDate: '2026-12-27', kind: 'travel' });
    expect(['2026-12-19', '2026-12-20', '2026-12-24', '2026-12-27', '2026-12-28'].map((d) => occursOn(trip, d))).toEqual([false, true, true, true, false]);
  });

  it('daily, weekly and an end date', () => {
    const weekly = ev({ repeat: 'weekly', until: '2026-11-26' }); // Thursdays to 26 Nov
    expect(occursOn(weekly, '2026-11-12')).toBe(true);
    expect(occursOn(weekly, '2026-11-13')).toBe(false);
    expect(occursOn(weekly, '2026-11-26')).toBe(true);
    expect(occursOn(weekly, '2026-12-03')).toBe(false); // after "until"
    expect(occursOn(weekly, '2026-10-29')).toBe(false); // before it started
    expect(occursOn(ev({ repeat: 'daily' }), '2027-01-01')).toBe(true);
  });

  it('monthly on the 31st falls on the last day of short months', () => {
    const rent = ev({ date: '2026-10-31', repeat: 'monthly' });
    expect(occursOn(rent, '2026-11-30')).toBe(true);
    expect(occursOn(rent, '2026-11-29')).toBe(false);
    expect(occursOn(rent, '2027-02-28')).toBe(true);
    expect(occursOn(rent, '2026-12-31')).toBe(true);
  });

  it('yearly birthdays, including 29 February', () => {
    const bday = ev({ date: '2004-02-29', kind: 'birthday', repeat: 'yearly' });
    expect(occursOn(bday, '2027-02-28')).toBe(true); // not a leap year
    expect(occursOn(bday, '2028-02-29')).toBe(true);
    expect(occursOn(bday, '2028-02-28')).toBe(false);
    expect(newEvent(TODAY, 'birthday').repeat).toBe('yearly');
  });
});

describe('one calendar for everything', () => {
  it('merges events, classes, exams, deadlines and study blocks, all-day first', () => {
    const d = emptyData(TODAY);
    d.events.push(ev({ id: 'dentist', title: 'Dentist', kind: 'appointment', start: '16:00', end: '16:30' }));
    d.sessions.push({ id: 's', date: TODAY, start: '09:00', end: '10:00', name: 'Maths', room: 'Room A', teacher: '' });
    d.timetable.push({ id: 't', day: 3, start: '11:00', end: '12:00', name: 'Physics', room: 'Lab' }); // Thursday
    d.tests.push({ id: 'x', name: 'Mock exam', date: TODAY, subjectId: null });
    d.tasks.push({ id: 'k', title: 'Essay', due: TODAY, done: false });
    d.studyBlocks.push({ id: 'b', date: TODAY, start: '14:00', end: '15:00', title: 'Revise SUVAT' });
    expect(itemsOn(d, TODAY).map((i) => `${i.kind}:${i.title}`)).toEqual([
      'deadline:Essay',
      'exam:Mock exam',
      'class:Maths',
      'class:Physics',
      'study:Revise SUVAT',
      'appointment:Dentist',
    ]);
    expect(itemsOn(d, '2026-11-06')).toEqual([]); // Friday: nothing
  });

  it('upcoming skips classes and finished tasks, and shows a trip once', () => {
    const d = emptyData(TODAY);
    d.events.push(ev({ id: 'trip', title: 'Trip home', kind: 'travel', date: '2026-11-10', endDate: '2026-11-14' }));
    d.events.push(ev({ id: 'c', title: 'Lecture', kind: 'class', repeat: 'weekly', start: '09:00' }));
    d.tasks.push({ id: 'done', title: 'Old essay', due: '2026-11-07', done: true }, { id: 'todo', title: 'Lab report', due: '2026-11-08', done: false });
    expect(upcoming(d, TODAY).map((i) => i.title)).toEqual(['Lab report', 'Trip home']);
  });
});

describe('conflicts', () => {
  const item = (title: string, start: string, end = ''): CalItem => ({ key: title, id: title, source: 'event', kind: 'event', title, date: TODAY, start, end, location: '' });
  it('finds overlaps but not back-to-back or all-day items', () => {
    const list = [item('A', '09:00', '10:00'), item('B', '09:30', '11:00'), item('C', '11:00', '12:00'), item('All day', '')];
    expect(conflicts(list).map(([a, b]) => `${a.title}+${b.title}`)).toEqual(['A+B']);
  });
  it('treats a missing end time as one hour', () => {
    expect(conflicts([item('A', '09:00'), item('B', '09:45', '10:15')])).toHaveLength(1);
    expect(conflicts([item('A', '09:00'), item('B', '10:00', '10:15')])).toHaveLength(0);
  });
});
