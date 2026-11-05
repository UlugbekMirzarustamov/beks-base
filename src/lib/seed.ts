/**
 * Starting data.
 *
 * - `emptyData()` = the "starter kit" everyone gets: budget categories, Physics &
 *   Maths topics, formula flashcards, habits.
 * - `createInitialData()` = starter kit + your real school timetable.
 * - `upgrade()` = keeps saved data up to date (see below).
 */
import { uid } from './id';
import { TIMETABLES } from './timetable';
import { migrate, SCHEMA_VERSION } from './migrate';
import type { AppData, Category, Flashcard, Topic } from './types';

/** The budget the app starts with, in US dollars (about £650). Editable in Money → Budget. */
export const DEFAULT_BUDGET = 850;

const CATEGORIES: Category[] = [
  { id: 'rent', name: 'Rent', limit: 460, icon: 'house' },
  { id: 'food', name: 'Food', limit: 185, icon: 'apple' },
  { id: 'transport', name: 'Transport', limit: 40, icon: 'bus' },
  { id: 'phone', name: 'Phone', limit: 20, icon: 'phone' },
  { id: 'fun', name: 'Fun', limit: 50, icon: 'star' },
  { id: 'savings', name: 'Savings', limit: 65, icon: 'coin' },
  { id: 'other', name: 'Other', limit: 30, icon: 'box' },
];

const PHYSICS_TOPICS = [
  'Units & rearranging',
  'Scalars & vectors',
  'SUVAT',
  "Newton's laws",
  'Resistive forces',
  'Work, energy & power',
  'Momentum & impulse',
  'Circular motion',
  'Electricity',
  'Waves',
  'Materials',
];
const MATHS_TOPICS = ['Coordinate geometry', 'Circle geometry', 'Trigonometry (sine/cosine rule)'];

/** [front, back] */
const FORMULAS: [string, string][] = [
  ["Newton's 2nd law", 'F = ma'],
  ['Weight', 'W = mg'],
  ['Momentum', 'p = mv'],
  ['Force from change in momentum', 'F = Δp / Δt'],
  ['Kinetic energy', 'KE = ½mv²'],
  ['Gravitational potential energy', 'GPE = mgh'],
  ['SUVAT — no s', 'v = u + at'],
  ['SUVAT — no v', 's = ut + ½at²'],
  ['SUVAT — no t', 'v² = u² + 2as'],
  ['SUVAT — no a', 's = ½(u + v)t'],
  ['Slope: weight component ALONG the slope', 'mg sin θ'],
  ['Slope: weight component INTO the slope', 'mg cos θ'],
  ['Lift accelerating upwards (N = reaction)', 'N − mg = ma'],
  ['Distance between two points', 'd = √((x₂ − x₁)² + (y₂ − y₁)²)'],
  ['Midpoint of two points', '( (x₁ + x₂)/2 , (y₁ + y₂)/2 )'],
  ['Gradient between two points', 'm = (y₂ − y₁) / (x₂ − x₁)'],
  ['Perpendicular gradients', 'm₁ × m₂ = −1'],
  ['Circle with centre (a, b), radius r', '(x − a)² + (y − b)² = r²'],
  ['Cosine rule', 'a² = b² + c² − 2bc cos A'],
  ['Sine rule', 'a / sin A = b / sin B = c / sin C'],
  ['Area of a triangle (2 sides + angle)', 'Area = ½ab sin C'],
];

export function emptyData(today: string): AppData {
  const topics: Topic[] = [
    ...PHYSICS_TOPICS.map((name) => ({ id: uid(), subjectId: 'physics', name, confidence: null })),
    ...MATHS_TOPICS.map((name) => ({ id: uid(), subjectId: 'maths', name, confidence: null })),
  ];
  const flashcards: Flashcard[] = FORMULAS.map(([front, back]) => ({ id: uid(), front, back, box: 0 }));

  return {
    version: 1,
    schemaVersion: SCHEMA_VERSION,
    settings: {
      theme: 'auto',
      sound: 'off',
      mixer: { rain: 0, fire: 0, wind: 0, lofi: 0 },
      sfx: true,
      avatar: { skin: '#e0b48a', hair: '#2b1d14', shirt: '#3f8f5a', pants: '#2f3e66', doppi: true },
      prayer: { asr: 'hanafi', method: 'mwl', offsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, call: true },
      usdToUzs: 12500,
      gbpPerUsd: 0.76,
      currencyChecked: true,
      pomodoroWork: 25,
      pomodoroBreak: 5, breakEvery: 50,
      hardMode: false,
    },
    monthlyBudget: DEFAULT_BUDGET,
    categories: CATEGORIES.map((c) => ({ ...c })),
    expenses: [],
    recurring: [],
    subjects: [
      { id: 'physics', name: 'Physics' },
      { id: 'maths', name: 'Maths' },
    ],
    tests: [],
    topics,
    mistakes: [],
    flashcards,
    studyLog: [],
    tasks: [],
    priorities: { date: today, items: ['', '', ''], done: [false, false, false] },
    timetable: [],
    sessions: [],
    studyBlocks: [],
    xp: 0,
    vocab: [],
    habits: [
      { id: 'sleep', name: 'Slept 7h+', icon: 'moon' },
      { id: 'exercise', name: 'Exercise', icon: 'heart' },
      { id: 'family', name: 'Called family', icon: 'phone' },
    ],
    habitLog: {},
    moods: {},
    notes: [],
    reflections: {},
    nightLogs: {},
    letters: [],
    prayers: {},
    goals: [],
    tasbih: {},
    quran: { page: 0, dailyGoal: 4, log: {}, khatms: 0 },
    badges: {},
    shop: { owned: [], placed: {}, spent: 0 },
    quests: {},
    pot: null,
    wishes: [],
    campfires: {},
    fasts: {},
    catches: [],
    care: {},
    events: [],
    groceries: [],
    pantry: [],
    recipes: [],
    meals: {},
    admin: [],
    lectureNotes: [],
    friday: {},
    hifz: [],
    simbaGifts: [],
    planGoals: [],
    inbox: [],
    assignments: [],
    checkins: {},
    rise: {},
    promises: {},
    vision: [],
    sleepLog: {},
    recall: {},
    applied: [],
  };
}

/** First launch: the starter kit plus your real timetable. (No made-up example items any more.) */
export function createInitialData(today: string): AppData {
  return upgrade(emptyData(today), today);
}

/**
 * Brings saved data up to date. Runs every time the app opens, and is safe to
 * run again and again:
 *  1. removes any old "(example)" items the app used to add — your own items stay;
 *  2. adds each school timetable (lib/timetable.ts) once;
 *  3. turns the old single "sound" setting into mixer levels;
 *  4. switches money to US dollars (the Money screen then asks once whether
 *     old amounts were in pounds — nothing is converted without asking);
 *  5. runs the numbered schema migrations (lib/migrate.ts).
 */
export function upgrade(data: AppData, today: string): AppData {
  const d = hasExampleData(data) ? clearExampleData(data, today) : data;
  const missing = Object.keys(TIMETABLES).filter((id) => !d.applied.includes(id));
  const out: AppData = missing.length
    ? { ...d, sessions: [...d.sessions, ...missing.flatMap((id) => TIMETABLES[id]())], applied: [...d.applied, ...missing] }
    : d;
  let result = out;
  if (!result.applied.includes('mixer')) {
    const { sound } = result.settings;
    result = {
      ...result,
      applied: [...result.applied, 'mixer'],
      settings: { ...result.settings, sound: 'off', mixer: { rain: sound === 'rain' ? 4 : 0, fire: sound === 'fire' ? 4 : 0, wind: 0, lofi: 0 } },
    };
  }
  // (Older versions also had a one-time step that set up a personal money plan. It has been
  // removed from the public code; data that already ran it keeps its plan and its `applied` entry.
  // New installs set up their own plan in Money → Plan.)
  if (!result.applied.includes('usd')) {
    const s = result.settings;
    const hasMoney = result.expenses.length > 0 || result.recurring.length > 0 || result.monthlyBudget !== DEFAULT_BUDGET;
    result = {
      ...result,
      applied: [...result.applied, 'usd'],
      settings: {
        ...s,
        // Keep your own so'm rate, turned into "per dollar".
        usdToUzs: s.gbpToUzs && s.gbpToUzs !== 16000 ? Math.round(s.gbpToUzs * s.gbpPerUsd) : s.usdToUzs,
        currencyChecked: !hasMoney,
      },
    };
  }
  // Numbered schema migrations (lib/migrate.ts) always run last.
  return migrate(result, today);
}

/** True if any example items are still in the data. */
export function hasExampleData(d: AppData): boolean {
  const lists = [d.expenses, d.recurring, d.tests, d.mistakes, d.tasks, d.timetable, d.studyBlocks, d.vocab, d.notes, d.topics, d.flashcards, d.letters];
  return Boolean(d.priorities.example) || lists.some((list) => list.some((item) => item.example));
}

/** Remove every example item, keeping everything you added yourself. */
export function clearExampleData(d: AppData, today: string): AppData {
  const keep = <T extends { example?: boolean }>(list: T[]) => list.filter((item) => !item.example);
  return {
    ...d,
    expenses: keep(d.expenses),
    recurring: keep(d.recurring),
    tests: keep(d.tests),
    mistakes: keep(d.mistakes),
    tasks: keep(d.tasks),
    timetable: keep(d.timetable),
    studyBlocks: keep(d.studyBlocks),
    vocab: keep(d.vocab),
    notes: keep(d.notes),
    topics: keep(d.topics),
    flashcards: keep(d.flashcards),
    letters: keep(d.letters),
    priorities: d.priorities.example ? { date: today, items: ['', '', ''], done: [false, false, false] } : d.priorities,
  };
}
