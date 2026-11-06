/**
 * A calm Home: which cards show up front ("now"), which wait in "More for today", and which are
 * hidden — from the time of day and your own pins/hides — plus the Discover shelf of features you
 * haven't tried yet. Plain functions, so they're easy to test. Nothing is ever deleted: a hidden card
 * is one tap away in "Arrange Home", and every feature is still reachable from its station and search.
 */
import type { AppData } from './types';

export type CardId =
  | 'today'
  | 'dates'
  | 'friday'
  | 'fajr'
  | 'ramadan'
  | 'promise'
  | 'campfire'
  | 'week'
  | 'quest'
  | 'classes'
  | 'coming'
  | 'kitchen'
  | 'inbox'
  | 'money'
  | 'ghost'
  | 'simba'
  | 'weather'
  | 'savings'
  | 'backup'
  | 'test'
  | 'top3'
  | 'due'
  | 'mood'
  | 'level'
  | 'clocks';

/** Every Home card: its name (for Arrange Home) and where it goes by default. */
export const HOME_CARDS: { id: CardId; name: string; place: 'now' | 'more' }[] = [
  { id: 'today', name: 'Today', place: 'now' },
  { id: 'quest', name: "Today's 1% quest", place: 'now' },
  { id: 'dates', name: 'Important dates (when close)', place: 'now' },
  { id: 'friday', name: "Jumu'ah (Fridays)", place: 'now' },
  { id: 'fajr', name: 'Fajr rise (mornings)', place: 'now' },
  { id: 'ramadan', name: 'Ramadan (when near)', place: 'now' },
  { id: 'promise', name: 'Promise to Simba', place: 'now' },
  { id: 'campfire', name: 'Friday campfire', place: 'now' },
  { id: 'week', name: 'Look back on the week (Fri–Sun)', place: 'now' },
  { id: 'backup', name: 'Backup reminder (when due)', place: 'now' },
  { id: 'classes', name: "Today's classes", place: 'more' },
  { id: 'coming', name: 'Coming up', place: 'more' },
  { id: 'test', name: 'Next test', place: 'more' },
  { id: 'top3', name: 'Top 3', place: 'more' },
  { id: 'due', name: 'Due soon', place: 'more' },
  { id: 'kitchen', name: 'Kitchen', place: 'more' },
  { id: 'inbox', name: 'Inbox', place: 'more' },
  { id: 'money', name: 'Safe to spend', place: 'more' },
  { id: 'savings', name: 'Savings jars', place: 'more' },
  { id: 'mood', name: 'Mood check-in', place: 'more' },
  { id: 'simba', name: "Simba's needs", place: 'more' },
  { id: 'ghost', name: 'You vs last week', place: 'more' },
  { id: 'weather', name: 'Weather', place: 'more' },
  { id: 'clocks', name: 'Clocks (UK / Tashkent)', place: 'more' },
  { id: 'level', name: 'Level, badges & shop', place: 'more' },
];

/**
 * Where a card goes right now. Pins and hides win; otherwise its default place, except that the
 * morning promise is a morning thing (05:00–12:00; otherwise it waits in "more").
 */
export function placeOf(id: CardId, home: AppData['settings']['home'], hour: number): 'now' | 'more' | 'hidden' {
  if (home.hidden.includes(id)) return 'hidden';
  if (home.pinned.includes(id)) return 'now';
  if (id === 'promise' && (hour >= 12 || hour < 5)) return 'more';
  return HOME_CARDS.find((c) => c.id === id)?.place ?? 'more';
}

/** Cards for one area, pinned ones first (in the order you pinned them). */
export function cardsIn(area: 'now' | 'more', home: AppData['settings']['home'], hour: number): CardId[] {
  const ids = HOME_CARDS.map((c) => c.id).filter((id) => placeOf(id, home, hour) === area);
  const pinned = home.pinned.filter((id): id is CardId => ids.includes(id as CardId));
  return [...pinned, ...ids.filter((id) => !pinned.includes(id))];
}

// ---------------------------------------------------------------- Discover
export interface DiscoverTip {
  id: string;
  title: string;
  pitch: string;
  href: string;
  icon: 'apple' | 'star' | 'scroll' | 'sword' | 'book' | 'quran' | 'house' | 'table' | 'shelf';
  /** True once you've started using it — then it leaves the shelf. */
  used: (d: AppData) => boolean;
}

export const DISCOVER: DiscoverTip[] = [
  { id: 'goals', title: 'Goals', pitch: 'Set this week’s goals and link them to your year and your dreams.', href: '#/planner/goals', icon: 'star', used: (d) => d.planGoals.length > 0 },
  { id: 'notes', title: 'Lecture notes', pitch: 'One place per lesson: notes, slides, photos of the board, formulas.', href: '#/study/notes', icon: 'scroll', used: (d) => d.lectureNotes.length > 0 },
  { id: 'mock', title: 'Mock exams', pitch: 'Practise in real exam conditions and get a predicted grade.', href: '#/study/mock', icon: 'sword', used: (d) => d.mocks.length > 0 || d.examQuestions.length > 0 },
  { id: 'physics', title: 'Physics practice', pitch: 'Endless physics problems, checked instantly, plus a formula sheet.', href: '#/study/tools', icon: 'table', used: (d) => d.flashcards.some((c) => /=/.test(c.back)) && d.mistakes.some((m) => m.why === 'From physics practice') },
  { id: 'kitchen', title: 'Kitchen', pitch: 'Shopping list, pantry with use-by dates, meal plan and your cookbook.', href: '#/kitchen', icon: 'apple', used: (d) => d.groceries.length + d.pantry.length + d.recipes.length > 0 },
  { id: 'hifz', title: 'Hifz', pitch: 'Track the surahs you’re memorising, with gentle revision reminders.', href: '#/prayer/hifz', icon: 'quran', used: (d) => d.hifz.length > 0 },
  { id: 'library', title: 'Islamic library', pitch: 'Duas for every moment, a private good deeds journal, books to learn from.', href: '#/prayer/library', icon: 'book', used: (d) => d.duaFavs.length + d.myDuas.length + d.deeds.length + d.learning.length > 0 },
  { id: 'admin', title: 'Student admin', pitch: 'Visa, passport and tenancy as checklists with reminders.', href: '#/planner/admin', icon: 'scroll', used: (d) => d.admin.length > 0 },
  { id: 'rooms', title: 'Rooms', pitch: 'Visit the library, garden and Life Museum — and Simba has a gift for you.', href: '#/rooms', icon: 'house', used: (d) => d.simbaGifts.length > 0 },
  { id: 'archive', title: 'Archive', pitch: 'Everything you’ve written, month by month.', href: '#/archive', icon: 'shelf', used: () => false },
];

/** Up to `limit` features you haven't used or dismissed yet. */
export const discoverTips = (d: AppData, limit = 3) => DISCOVER.filter((t) => !t.used(d) && !d.settings.home.dismissed.includes(t.id)).slice(0, limit);
