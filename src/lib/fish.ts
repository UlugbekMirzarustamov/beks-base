/**
 * The fishing pond behind the cabin. You EARN casts — they can't be bought:
 *   +1 for every Pomodoro you finish, +1 for every day with all five prayers,
 *   and 3 to start with. Each cast catches one fish for your fish book.
 * Some fish only bite in one season, at night, or on a full-prayer day.
 */
import { PRAYERS } from './prayer';
import type { Season } from './cabin';
import type { AppData } from './types';

export type Rarity = 'common' | 'rare' | 'legend' | 'junk';

export interface Fish {
  id: string;
  name: string;
  rarity: Rarity;
  /** Little description for the fish book. */
  note: string;
  /** Body and fin colours for the pixel sprite. */
  colour: string;
  fin: string;
  /** Only bites in these seasons / at night / on full-prayer days. */
  seasons?: Season[];
  night?: boolean;
  fullPrayer?: boolean;
}

export const FISH: Fish[] = [
  { id: 'minnow', name: 'Sheffield minnow', rarity: 'common', note: 'Tiny, fast and everywhere. A good start.', colour: '#a8b8a0', fin: '#6f8068' },
  { id: 'perch', name: 'Striped perch', rarity: 'common', note: 'Green stripes, orange fins. Likes quiet mornings.', colour: '#9fbf4a', fin: '#e8762a' },
  { id: 'roach', name: 'Red-eyed roach', rarity: 'common', note: 'Silver with bright red eyes.', colour: '#c9d3de', fin: '#d64541' },
  { id: 'carp', name: 'Golden-brown carp', rarity: 'common', note: 'Big, slow and patient. Like a good revision plan.', colour: '#c9963a', fin: '#8a6420' },
  { id: 'trout', name: 'Peak District trout', rarity: 'common', note: 'Speckled, from the cold streams in the hills.', colour: '#b8a07a', fin: '#d98aa0' },
  { id: 'boot', name: 'Old boot', rarity: 'junk', note: 'Someone lost this in 1987. Still counts!', colour: '#5b3a1d', fin: '#3b2512' },
  { id: 'pike', name: 'Pike', rarity: 'rare', note: 'Long, sharp-toothed hunter of the deep end.', colour: '#5f8a3a', fin: '#c9a04a' },
  { id: 'eel', name: 'Moonlight eel', rarity: 'rare', note: 'Only comes out after dark.', colour: '#3a4a6a', fin: '#9fdcff', night: true },
  { id: 'koi', name: 'Blossom koi', rarity: 'rare', note: 'Pink and white, like spring petals.', colour: '#f2a6c8', fin: '#ffffff', seasons: ['spring'] },
  { id: 'leaf', name: 'Autumn leaf fish', rarity: 'rare', note: 'Orange as a fallen leaf. Only in autumn.', colour: '#d9822b', fin: '#b5541f', seasons: ['autumn'] },
  { id: 'ice', name: 'Frost fish', rarity: 'rare', note: 'Almost see-through. Only bites in winter.', colour: '#cfe8f7', fin: '#8fd3ff', seasons: ['winter'] },
  { id: 'sun', name: 'Sunfish', rarity: 'rare', note: 'Round and bright. Loves long summer days.', colour: '#ffd93b', fin: '#f0a020', seasons: ['summer'] },
  { id: 'samarkand', name: 'Samarkand blue', rarity: 'rare', note: 'Blue as the Registan domes. A fish from home.', colour: '#2a8fd8', fin: '#e8cf96' },
  { id: 'sturgeon', name: 'Aral sturgeon', rarity: 'legend', note: 'An ancient fish from the old Aral Sea. Very, very rare.', colour: '#6b6b6b', fin: '#c9d3de' },
  { id: 'golden', name: 'Golden fish', rarity: 'legend', note: 'Only bites on a day you prayed all five. Shines like a lantern.', colour: '#ffcf3a', fin: '#fff3b0', fullPrayer: true },
];

export const fishById = (id: string) => FISH.find((f) => f.id === id);

const WEIGHT: Record<Rarity, number> = { common: 60, junk: 12, rare: 14, legend: 2 };

export const fullPrayerDay = (d: AppData, day: string) => PRAYERS.every((p) => d.prayers[day]?.includes(p));

/** Casts you've earned in total and how many are left. */
export function casts(d: AppData): { earned: number; left: number } {
  const fullDays = Object.keys(d.prayers).filter((day) => fullPrayerDay(d, day)).length;
  const earned = 3 + d.studyLog.length + fullDays;
  return { earned, left: Math.max(0, earned - d.catches.length) };
}

/** Which fish can bite right now. */
export function biting(when: { season: Season; night: boolean; fullPrayer: boolean }): Fish[] {
  return FISH.filter((f) => (!f.seasons || f.seasons.includes(when.season)) && (!f.night || when.night) && (!f.fullPrayer || when.fullPrayer));
}

/** Pick a fish. `roll` is a random number 0–1 (passed in so it can be tested). */
export function catchFish(when: { season: Season; night: boolean; fullPrayer: boolean }, roll: number): Fish {
  const pool = biting(when);
  const weightOf = (f: Fish) => WEIGHT[f.rarity] * (f.fullPrayer ? 2 : 1);
  const total = pool.reduce((a, f) => a + weightOf(f), 0);
  let r = roll * total;
  for (const f of pool) {
    r -= weightOf(f);
    if (r < 0) return f;
  }
  return pool[pool.length - 1];
}
