/**
 * A calm Home: which cards show up front ("now"), which wait in "More for today", and which are
 * hidden — from your own pins and hides. Plain functions, so they're easy to test. Nothing is ever
 * deleted: a hidden card is one tap away in "Arrange Home".
 * (Kept short on purpose: the game and decoration cards were removed at Bek's request.)
 */
import type { AppData } from './types';

export type CardId = 'today' | 'dates' | 'friday' | 'fajr' | 'ramadan' | 'week' | 'backup' | 'classes' | 'coming' | 'test' | 'top3' | 'due' | 'inbox' | 'money' | 'weather';

/** Every Home card: its name (for Arrange Home) and where it goes by default. */
export const HOME_CARDS: { id: CardId; name: string; place: 'now' | 'more' }[] = [
  { id: 'today', name: 'Today', place: 'now' },
  { id: 'dates', name: 'Important dates (when close)', place: 'now' },
  { id: 'friday', name: "Jumu'ah (Fridays)", place: 'now' },
  { id: 'fajr', name: 'Fajr rise (mornings)', place: 'now' },
  { id: 'ramadan', name: 'Ramadan (when near)', place: 'now' },
  { id: 'week', name: 'Look back on the week (Fri–Sun)', place: 'now' },
  { id: 'backup', name: 'Backup reminder (when due)', place: 'now' },
  { id: 'classes', name: "Today's classes", place: 'more' },
  { id: 'coming', name: 'Coming up', place: 'more' },
  { id: 'test', name: 'Next test', place: 'more' },
  { id: 'top3', name: 'Top 3', place: 'more' },
  { id: 'due', name: 'Due soon', place: 'more' },
  { id: 'inbox', name: 'Inbox', place: 'more' },
  { id: 'money', name: 'Safe to spend', place: 'more' },
  { id: 'weather', name: 'Weather', place: 'more' },
];

/** Where a card goes right now. Pins and hides win; otherwise its default place. */
export function placeOf(id: CardId, home: AppData['settings']['home'], _hour?: number): 'now' | 'more' | 'hidden' {
  if (home.hidden.includes(id)) return 'hidden';
  if (home.pinned.includes(id)) return 'now';
  return HOME_CARDS.find((c) => c.id === id)?.place ?? 'more';
}

/** Cards for one area, pinned ones first (in the order you pinned them). */
export function cardsIn(area: 'now' | 'more', home: AppData['settings']['home'], hour?: number): CardId[] {
  const ids = HOME_CARDS.map((c) => c.id).filter((id) => placeOf(id, home, hour) === area);
  const pinned = home.pinned.filter((id): id is CardId => ids.includes(id as CardId));
  return [...pinned, ...ids.filter((id) => !pinned.includes(id))];
}
