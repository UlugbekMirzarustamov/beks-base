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
  /** Monthly limit in US dollars. */
  limit: number;
  icon: CategoryIcon;
}

export interface Expense extends Base {
  amount: number; // US dollars, always positive
  /** If it was paid in pounds: what it cost in £ (the dollar amount was worked out from it). */
  paidGbp?: number;
  categoryId: string;
  note: string;
  date: string; // YYYY-MM-DD
  /** Set when this expense was created automatically by a recurring bill. */
  recurringId?: string;
  /** Bought with the wish fund: comes out of the fund, not out of that day's allowance. */
  fromWish?: boolean;
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

/** One real class on a real date (from a school timetable). Unlike ClassSlot it doesn't repeat. */
export interface ClassSession extends Base {
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string;
  name: string; // e.g. "Physics"
  room: string; // e.g. "Room 2.14"
  teacher: string;
}

export interface StudyBlock extends Base {
  date: string;
  start: string;
  end: string;
  title: string;
}

/** What kind of thing a calendar event is (exams live in Study → Tests, deadlines in tasks). */
export type CalKind = 'class' | 'appointment' | 'travel' | 'birthday' | 'event';

/** One entry in the universal calendar. */
export interface CalEvent extends Base {
  title: string;
  kind: CalKind;
  /** First (or only) day, YYYY-MM-DD. */
  date: string;
  /** "HH:MM"; empty = all day. */
  start: string;
  end: string;
  /** Last day of a multi-day event (e.g. a trip); empty = same day. Only for non-repeating events. */
  endDate: string;
  repeat: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** Last day a repeating event happens (YYYY-MM-DD); empty = forever. */
  until: string;
  location: string;
  notes: string;
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

// ---------- Prayer ----------
export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerSettings {
  /** Asr starts when a shadow is 2× (Hanafi, common in Uzbekistan) or 1× (standard) an object's length. */
  asr: 'hanafi' | 'standard';
  /** Minutes to add/subtract per prayer, to match your local mosque's timetable. */
  offsets: Record<PrayerName, number>;
  /** Show the full-screen "time to pray" call when opening the app. */
  call: boolean;
}

/** Money put aside towards something (a flight home, a laptop…). */
export interface SavingsGoal extends Base {
  name: string;
  target: number; // dollars
  icon: 'plane' | 'house' | 'book' | 'heart' | 'star' | 'gift' | 'coin';
  created: string; // YYYY-MM-DD
  /** + money in, − money taken out */
  deposits: { id: string; date: string; amount: number; note: string }[];
  /** Set when the goal was reached (so we celebrate only once). */
  reached?: string;
}

/** Qur'an reading progress (Madani mushaf, 604 pages). */
export interface QuranProgress {
  /** Last page finished (0 = not started this round). */
  page: number;
  /** Pages a day you're aiming for. */
  dailyGoal: number;
  /** "YYYY-MM-DD" → pages read that day */
  log: Record<string, number>;
  /** Times you've read the whole Qur'an (khatm) in the app. */
  khatms: number;
}

/** How Bek's blocky character looks in the cabin (all colours are #rrggbb). */
export interface Avatar {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  /** Wear a doppi (Uzbek skullcap). */
  doppi: boolean;
}

/** Something you'd love to buy with the money you save by spending less each day. */
export interface Wish extends Base {
  name: string;
  cost: number; // approximate, in dollars
  icon: 'gift' | 'plane' | 'phone' | 'book' | 'heart' | 'star' | 'house' | 'globe';
  created: string;
  /** The day you bought it (it's then on the "wishes come true" shelf). */
  bought?: string;
}

/** Sound mixer: each channel 0 (off) … 8 (loudest). */
export interface Mixer {
  rain: number;
  fire: number;
  wind: number;
  /** The lo-fi cabin radio (soft piano, slow beat, vinyl crackle). */
  lofi: number;
}

/** A Friday-night look back by the campfire, saved under that week's Monday. */
export interface Campfire {
  /** The one thing you're proud of this week. */
  win: string;
  /** The ONE thing to focus on next week. */
  focus: string;
  /** When you sat by the fire (YYYY-MM-DD). */
  date: string;
}

/** A fish caught at the pond. */
export interface Catch {
  id: string;
  fish: string;
  date: string;
}

/** Looking after yourself (= looking after Simba): meals and glasses of water that day. */
export interface Care {
  meals: number;
  water: number;
}

/** Fajr rise: when you tapped "I'm up" that morning, and whether it was before sunrise. */
export interface Rise {
  time: string; // HH:MM
  onTime: boolean;
}

/** One hard thing promised to Simba in the morning. `kept` is set once you say how it went. */
export interface Promise_ {
  text: string;
  kept?: boolean;
}

/** A big goal on the vision board: what, why, by when, and a picture. */
export interface VisionGoal extends Base {
  title: string;
  why: string;
  /** Target date (YYYY-MM-DD), optional. */
  by: string;
  /** A small JPEG (data: URL), optional. */
  photo: string;
  done?: string;
}

/** A Ramadan day: did you fast, did you pray taraweeh. */
export interface FastDay {
  fasted: boolean;
  taraweeh: boolean;
}

// ---------- Settings & the whole thing ----------
export interface Settings {
  /** 'auto' follows UK time (night 19:00–07:00). */
  theme: 'auto' | 'day' | 'night';
  /** Old single sound choice (kept so old backups still load; replaced by `mixer`). */
  sound: 'off' | 'rain' | 'fire';
  mixer: Mixer;
  /** Little sound effects (clicks, bells, purrs). */
  sfx: boolean;
  avatar: Avatar;
  prayer: PrayerSettings;
  /** How many Uzbek so'm for $1 — typed in by hand. */
  usdToUzs: number;
  /** How many pounds for $1 (e.g. 0.76) — used when you pay in £. Typed in by hand. */
  gbpPerUsd: number;
  /** false = old amounts may still be in pounds; the Money screen asks once. */
  currencyChecked: boolean;
  /** Old setting from when the app used pounds (so'm per £1). Only read when upgrading. */
  gbpToUzs?: number;
  pomodoroWork: number;
  pomodoroBreak: number;
  /** Hard mode: stricter rules for weeks when you want to go all in. */
  hardMode: boolean;
}

import type { Pot } from './pot';

export interface AppData {
  /** The backup format (always 1). */
  version: 1;
  /** Which shape the data is in; see lib/migrate.ts. Old data without it is version 1. */
  schemaVersion: number;
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
  /** Real dated classes (school timetable) */
  sessions: ClassSession[];
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
  /** "YYYY-MM-DD" → prayers marked as prayed that day */
  prayers: Record<string, PrayerName[]>;
  goals: SavingsGoal[];
  /** "YYYY-MM-DD" → tasbih count that day */
  tasbih: Record<string, number>;
  quran: QuranProgress;
  /** Badge id → the day it was earned */
  badges: Record<string, string>;
  /** "YYYY-MM-DD" → today's 1% quest and whether you did it */
  quests: Record<string, { id: string; done: boolean }>;
  /** Evening "YYYY-MM-DD" → bedtime "HH:MM" */
  sleepLog: Record<string, string>;
  /** "YYYY-MM-DD" → the mistake recalled that morning and how it went */
  recall: Record<string, { id: string; result?: 'got' | 'again' }>;
  /** The money plan: one pot that must last N months (null = not set up). */
  pot: Pot | null;
  /** Things you're saving for with the wish fund. */
  wishes: Wish[];
  /** Friday campfire reviews, by the Monday of that week. */
  campfires: Record<string, Campfire>;
  /** "YYYY-MM-DD" → that Ramadan day */
  fasts: Record<string, FastDay>;
  /** Fish caught at the pond (the fish book). */
  catches: Catch[];
  /** "YYYY-MM-DD" → meals and water (Simba's needs) */
  care: Record<string, Care>;
  /** The universal calendar's own events (classes, appointments, travel, birthdays, events). */
  events: CalEvent[];
  /** "YYYY-MM-DD" → when you got up (Fajr rise) */
  rise: Record<string, Rise>;
  /** "YYYY-MM-DD" → that morning's promise to Simba */
  promises: Record<string, Promise_>;
  /** The vision board: your big goals. */
  vision: VisionGoal[];
  /** Cabin shop: items you own, which item is shown in each spot, coins spent. */
  shop: { owned: string[]; placed: Record<string, string>; spent: number };
  /** One-time updates already applied to this data (e.g. "mixer", "usd"). */
  applied: string[];
}
