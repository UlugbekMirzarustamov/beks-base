/**
 * Starting data.
 *
 * - `emptyData()` = the "starter kit" everyone gets: budget categories, Physics &
 *   Maths topics, formula flashcards, habits. This is NOT example data and is
 *   never removed by "Clear example data".
 * - `createInitialData()` = starter kit + EXAMPLE items (marked `example: true`)
 *   so the app doesn't look empty on first launch.
 */
import { addDays, monthOf, weekdayOf } from './dates';
import { uid } from './id';
import type { AppData, Category, Flashcard, Topic } from './types';

/** The budget the app starts with (you said £600–700, so £650). Editable in Money → Setup. */
export const DEFAULT_BUDGET = 650;

const CATEGORIES: Category[] = [
  { id: 'rent', name: 'Rent', limit: 350, icon: 'house' },
  { id: 'food', name: 'Food', limit: 140, icon: 'apple' },
  { id: 'transport', name: 'Transport', limit: 30, icon: 'bus' },
  { id: 'phone', name: 'Phone', limit: 15, icon: 'phone' },
  { id: 'fun', name: 'Fun', limit: 40, icon: 'star' },
  { id: 'savings', name: 'Savings', limit: 50, icon: 'coin' },
  { id: 'other', name: 'Other', limit: 25, icon: 'box' },
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
    settings: { theme: 'auto', sound: 'off', gbpToUzs: 16000, pomodoroWork: 25, pomodoroBreak: 5 },
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
  };
}

/** First launch: starter kit + clearly-labelled example items. */
export function createInitialData(today: string): AppData {
  const d = emptyData(today);
  const ex = { example: true } as const;
  const month = monthOf(today);
  const day = Number(today.slice(8, 10));
  // Example purchases on earlier days of this month (never in the future).
  const earlier = (n: number) => (day > n ? addDays(today, -n) : today);

  d.expenses = [
    { id: uid(), amount: 23.4, categoryId: 'food', note: 'Weekly shop (example)', date: earlier(2), ...ex },
    { id: uid(), amount: 3.2, categoryId: 'food', note: 'Coffee (example)', date: today, ...ex },
    { id: uid(), amount: 2.6, categoryId: 'transport', note: 'Bus (example)', date: earlier(1), ...ex },
    { id: uid(), amount: 12, categoryId: 'fun', note: 'Cinema (example)', date: earlier(3), ...ex },
  ];
  d.recurring = [
    // lastAdded = this month, so the example rent isn't auto-added on top of everything.
    { id: uid(), name: 'Rent (example)', amount: 350, categoryId: 'rent', day: 1, lastAdded: month, ...ex },
    { id: uid(), name: 'Phone plan (example)', amount: 10, categoryId: 'phone', day: 15, lastAdded: null, ...ex },
  ];
  d.tests = [
    { id: uid(), name: 'Physics test (example)', date: addDays(today, 18), subjectId: 'physics', ...ex },
    { id: uid(), name: 'Maths test (example)', date: addDays(today, 40), subjectId: 'maths', ...ex },
  ];
  d.mistakes = [
    {
      id: uid(),
      question: 'Box on a 30° slope, m = 2 kg. Force along the slope?',
      wrongAnswer: '2 × 9.81 × cos 30 = 17.0 N',
      correctAnswer: '2 × 9.81 × sin 30 = 9.81 N',
      why: 'Mixed up sin and cos. ALONG the slope = sin, INTO the slope = cos.',
      topicId: null,
      reviewAgain: true,
      date: today,
      ...ex,
    },
  ];
  d.tasks = [
    { id: uid(), title: 'Physics worksheet (example)', due: addDays(today, 1), done: false, ...ex },
    { id: uid(), title: 'Email student services (example)', due: addDays(today, 3), done: false, ...ex },
    { id: uid(), title: 'Buy bus pass (example)', due: null, done: true, ...ex },
  ];
  d.priorities = { date: today, items: ['Review SUVAT', 'Do 1 Pomodoro of Maths', 'Call home'], done: [false, false, false], example: true };
  d.timetable = [
    { id: uid(), day: 0, start: '09:00', end: '11:00', name: 'Physics (example)', room: 'Room 1.02', ...ex },
    { id: uid(), day: 0, start: '13:00', end: '15:00', name: 'Maths (example)', room: 'Room 2.10', ...ex },
    { id: uid(), day: 2, start: '10:00', end: '12:00', name: 'Maths (example)', room: 'Room 2.10', ...ex },
    { id: uid(), day: 3, start: '09:00', end: '12:00', name: 'Physics lab (example)', room: 'Lab B', ...ex },
    { id: uid(), day: 4, start: '11:00', end: '13:00', name: 'English (example)', room: 'Room 0.05', ...ex },
  ];
  // A study block on the next weekday afternoon.
  const studyDay = weekdayOf(today) >= 5 ? addDays(today, 7 - weekdayOf(today)) : today;
  d.studyBlocks = [{ id: uid(), date: studyDay, start: '16:00', end: '17:30', title: 'Study: SUVAT (example)', ...ex }];
  d.vocab = [
    { id: uid(), word: 'Resultant (example)', meaning: 'The single force that has the same effect as all the forces together.', sentence: 'The resultant force is 5 N to the right.', subjectId: 'physics', ...ex },
  ];
  d.notes = [{ id: uid(), title: 'Welcome to your base! (example)', body: 'This is your journal. Write anything here — it stays only on this device.', updated: new Date().toISOString(), ...ex }];
  return d;
}

/** True if any example items are still in the data. */
export function hasExampleData(d: AppData): boolean {
  const lists = [d.expenses, d.recurring, d.tests, d.mistakes, d.tasks, d.timetable, d.studyBlocks, d.vocab, d.notes, d.topics, d.flashcards];
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
    priorities: d.priorities.example ? { date: today, items: ['', '', ''], done: [false, false, false] } : d.priorities,
  };
}
