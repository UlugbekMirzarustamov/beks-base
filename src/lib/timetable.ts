/**
 * Bek's real USIC timetable for November 2026, typed in from the "My Session"
 * calendar. Each class becomes a dated ClassSession, so the app always shows
 * the right classes for the right day (weeks are not all identical).
 *
 * To add next month: copy the pattern below with the new weeks, give it a new
 * id (e.g. "usic-dec-2026") and add it to TIMETABLES.
 */
import { addDays } from './dates';
import { uid } from './id';
import type { ClassSession } from './types';

/** [start, end, class, room, teacher] */
type Row = [string, string, string, string, string];
/** Monday … Friday (weekends are free) */
type Week = [Row[], Row[], Row[], Row[], Row[]];

const AES_ONLINE: Row = ['09:00', '10:00', 'Academic English Skills', 'Online', 'Andrew Davies'];
const MATHS_MON: Row = ['11:00', '13:00', 'Mathematics', 'KH03', 'Jacob Thompson'];
const PHYS_MON: Row = ['14:00', '15:30', 'Physics', 'SOL711', 'Hamza Khan'];
const PHYS_TUE: Row = ['11:00', '12:30', 'Physics', 'SOL703', 'Hamza Khan'];
const PHYS_TUE_LT: Row = ['13:00', '14:00', 'Physics', 'SOL403LT', 'Benjamin'];
const WED: Row[] = [
  ['09:00', '11:00', 'Academic English Skills', 'SOL709', 'Andrew Davies'],
  ['11:00', '13:00', 'Mathematics', 'SOL703', 'Jacob Thompson'],
  ['16:30', '18:00', 'University of Sheffield Events', 'Online', 'Simon Clark'],
];
const AES_THU: Row = ['09:00', '11:00', 'Academic English Skills', 'SOL504', 'Andrew Davies'];
const MATHS_THU: Row = ['14:00', '15:30', 'Mathematics', 'SOL711', 'Jacob Thompson'];
const FRI: Row[] = [
  ['09:30', '11:00', 'Physics', 'SOL713', 'Hamza Khan'],
  ['11:00', '12:30', 'Mathematics', 'KH11', 'Jacob Thompson'],
  ['15:00', '16:00', 'Physics', 'SOL711', 'Hamza Khan'],
];

// Week 1 (1–7 Nov)
const WEEK_1: Week = [
  [AES_ONLINE, MATHS_MON, PHYS_MON, ['15:30', '17:00', 'Project Skills for STEM', 'SOL704', 'Marion Bateman']],
  [AES_ONLINE, PHYS_TUE, PHYS_TUE_LT, ['14:00', '17:00', 'Physics', 'SOL713', 'Simon Stables']],
  WED,
  [AES_THU, ['11:00', '12:30', 'Project Skills for STEM', 'SOL708', 'Marion Bateman'], MATHS_THU],
  FRI,
];

// Week 2 (8–14 Nov): new Project Skills teacher, no Tuesday lab, Progress Coach workshop on Thursday
const WEEK_2: Week = [
  [AES_ONLINE, MATHS_MON, PHYS_MON, ['15:30', '17:00', 'Project Skills for STEM', 'SOL704', 'Maryam Cheheltani']],
  [AES_ONLINE, PHYS_TUE, PHYS_TUE_LT],
  WED,
  [
    AES_THU,
    ['11:00', '12:30', 'Project Skills for STEM', 'SOL708', 'Maryam Cheheltani'],
    MATHS_THU,
    ['15:30', '16:30', 'Progress Coach Workshop', 'KH06', ''],
  ],
  FRI,
];

// Week 3 (15–21 Nov) — and week 4 (22–28 Nov) is exactly the same
const WEEK_3: Week = [WEEK_2[0], WEEK_2[1], WED, WEEK_2[3].slice(0, 3), FRI];

const NOVEMBER_2026: { monday: string; week: Week }[] = [
  { monday: '2026-11-02', week: WEEK_1 },
  { monday: '2026-11-09', week: WEEK_2 },
  { monday: '2026-11-16', week: WEEK_3 },
  { monday: '2026-11-23', week: WEEK_3 },
];

/** Every timetable the app knows about, by id. Each one is added to your data once. */
export const TIMETABLES: Record<string, () => ClassSession[]> = {
  'usic-nov-2026': () =>
    NOVEMBER_2026.flatMap(({ monday, week }) =>
      week.flatMap((rows, day) =>
        rows.map(([start, end, name, room, teacher]) => ({ id: uid(), date: addDays(monday, day), start, end, name, room, teacher })),
      ),
    ),
};
