/**
 * All the data shapes used by Bek's Base.
 *
 * Everything lives in ONE big `AppData` object that is saved to IndexedDB.
 * That keeps Export/Import simple: the backup file is just this object as JSON.
 *
 * Dates are stored as plain strings:
 *   - "YYYY-MM-DD" for days   (e.g. "2026-11-03")
 *   - "YYYY-MM"    for months (e.g. "2026-11")
 *   - "HH:MM"      for times  (e.g. "09:30")
 * Strings sort correctly and never get confused by time zones.
 */

/** Items created by the example/demo data have `example: true`, so we can remove them in one go. */
interface Base {
  id: string;
  example?: boolean;
}

// ---------- Money ----------
export type CategoryIcon = 'house' | 'apple' | 'bus' | 'phone' | 'star' | 'coin' | 'box';

export interface Category extends Base {
  name: string;
  /** Monthly limit in pounds. */
  limit: number;
  icon: CategoryIcon;
}

export interface Expense extends Base {
  amount: number; // pounds, always positive
  categoryId: string;
  note: string;
  date: string; // YYYY-MM-DD
  /** Set when this expense was created automatically by a recurring bill. */
  recurringId?: string;
}

export interface RecurringBill extends Base {
  name: string;
  amount: number;
  categoryId: string;
  /** Day of the month it is paid (1–31). Clamped to the month length (e.g. 31 → 30 in November). */
  day: number;
  /** The last month ("YYYY-MM") this bill was added for, so it is never added twice. */
  lastAdded: string | null;
}

// ---------- Study ----------
export interface Subject extends Base {
  name: string;
}

export interface Test extends Base {
  name: string;
  date: string; // YYYY-MM-DD
  subjectId: string | null;
}

export type Confidence = 'red' | 'amber' | 'green' | null;

export interface Topic extends Base {
  subjectId: string;
  name: string;
  confidence: Confidence;
}

export interface Mistake extends Base {
  question: string;
  wrongAnswer: string;
  correctAnswer: string;
  why: string;
  topicId: string | null;
  reviewAgain: boolean;
  date: string;
}

export interface Flashcard extends Base {
  front: string; // e.g. "Newton's 2nd law"
  back: string; // e.g. "F = ma"
  /** Simple "Leitner box": 0 = needs practice, higher = known better. */
  box: number;
}

export interface StudySession extends Base {
  subjectId: string | null;
  minutes: number;
  date: string;
}

// ---------- Planner ----------
export interface Task extends Base {
  title: string;
  due: string | null; // YYYY-MM-DD
  done: boolean;
}

export interface Priorities {
  date: string; // the day these top-3 belong to
  items: string[]; // always 3
  done: boolean[]; // always 3
  example?: boolean;
}

/** 0 = Monday … 6 = Sunday */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ClassSlot extends Base {
  day: Weekday;
  start: string; // HH:MM
  end: string;
  name: string;
  room: string;
}

export interface StudyBlock extends Base {
  date: string;
  start: string;
  end: string;
  title: string;
}

// ---------- Phase 2 ----------
export interface VocabWord extends Base {
  word: string;
  meaning: string;
  /** An example sentence using the word. */
  sentence: string;
  subjectId: string | null;
}

export interface Habit extends Base {
  name: string;
  icon: 'moon' | 'heart' | 'phone' | 'check';
}

export interface Note extends Base {
  title: string;
  body: string;
  updated: string; // ISO timestamp
}

/** 1 = awful … 5 = great */
export type Mood = 1 | 2 | 3 | 4 | 5;

/** Tonight's quick log under the telescope: one line, good things, a plan. */
export interface NightLog {
  line: string; // today in one sentence
  good: string[]; // always 3
  tomorrow: string;
  /** XP already given for this night (so editing doesn't give it twice). */
  rewarded?: boolean;
}

/** A sealed letter to future you. It can only be read on/after `openOn`. */
export interface Letter extends Base {
  title: string;
  body: string;
  written: string; // YYYY-MM-DD
  openOn: string; // YYYY-MM-DD
  opened: boolean;
}

/** A weekly look back. Saved under the Monday of that week ("YYYY-MM-DD"). */
export interface Reflection {
  wentWell: string;
  hard: string;
  learned: string;
  next: string;
  updated: string; // ISO timestamp
}

// ---------- Settings & the whole thing ----------
export interface Settings {
  /** 'auto' follows UK time (night 19:00–07:00). */
  theme: 'auto' | 'day' | 'night';
  sound: 'off' | 'rain' | 'fire';
  /** How many Uzbek som for £1 — typed in by hand. */
  gbpToUzs: number;
  pomodoroWork: number;
  pomodoroBreak: number;
}

export interface AppData {
  /** Bumped if the shape ever changes, so old backups can be upgraded. */
  version: 1;
  settings: Settings;
  monthlyBudget: number;
  categories: Category[];
  expenses: Expense[];
  recurring: RecurringBill[];

  subjects: Subject[];
  tests: Test[];
  topics: Topic[];
  mistakes: Mistake[];
  flashcards: Flashcard[];
  studyLog: StudySession[];

  tasks: Task[];
  priorities: Priorities;
  timetable: ClassSlot[];
  studyBlocks: StudyBlock[];

  xp: number;

  vocab: VocabWord[];
  habits: Habit[];
  /** "YYYY-MM-DD" → list of habit ids done that day */
  habitLog: Record<string, string[]>;
  /** "YYYY-MM-DD" → mood */
  moods: Record<string, Mood>;
  notes: Note[];
  /** Monday "YYYY-MM-DD" → that week's reflection */
  reflections: Record<string, Reflection>;
  /** "YYYY-MM-DD" → that night's log (each one is a star in your sky) */
  nightLogs: Record<string, NightLog>;
  letters: Letter[];
}
