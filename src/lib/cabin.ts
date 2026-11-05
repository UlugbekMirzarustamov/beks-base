/**
 * The cabin's "life": things you unlock by levelling up, seasons, streaks,
 * and Simba the cat's moods. Plain functions (no React), so they're easy to test.
 */
import { addDays } from './dates';

// ---------------------------------------------------------------- unlocks
export interface Unlock {
  id: 'teapot' | 'lamp' | 'hangingPlant' | 'cushion' | 'lights' | 'trophy' | 'basket';
  name: string;
  level: number;
  description: string;
}

/** Each level brings something new into the cabin. */
export const UNLOCKS: Unlock[] = [
  { id: 'teapot', name: 'Choynak & piyola', level: 2, description: 'A blue-and-white teapot and cup on the chest, with a little steam.' },
  { id: 'lamp', name: 'Reading lamp', level: 3, description: 'A warm lamp on top of the bookshelf for late study nights.' },
  { id: 'hangingPlant', name: 'Hanging plant', level: 4, description: 'A trailing plant from the ceiling beam.' },
  { id: 'cushion', name: 'Ko‘rpacha cushion', level: 5, description: 'A striped floor cushion by the fire. Simba approves.' },
  { id: 'lights', name: 'Fairy lights', level: 6, description: 'Warm little lights along the ceiling beam.' },
  { id: 'trophy', name: 'Golden trophy', level: 8, description: 'Proof on the mantel that you keep going.' },
  { id: 'basket', name: "Simba's basket", level: 10, description: 'A woven bed so Simba can nap in style.' },
];

export const unlockedIds = (level: number) => new Set(UNLOCKS.filter((u) => u.level <= level).map((u) => u.id));
export const nextUnlock = (level: number) => UNLOCKS.find((u) => u.level > level) ?? null;
export const unlocksAtLevel = (level: number) => UNLOCKS.filter((u) => u.level === level);

// ---------------------------------------------------------------- seasons
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

/** UK seasons by month (Dec–Feb winter, Mar–May spring, Jun–Aug summer, Sep–Nov autumn). */
export function seasonOf(date: string): Season {
  const m = Number(date.slice(5, 7));
  if (m === 12 || m <= 2) return 'winter';
  if (m <= 5) return 'spring';
  if (m <= 8) return 'summer';
  return 'autumn';
}

// ---------------------------------------------------------------- streaks
/** Days in a row (ending today — or yesterday, if today isn't done yet) for which `done(day)` is true. */
export function streak(done: (date: string) => boolean, today: string): number {
  let day = done(today) ? today : addDays(today, -1);
  let n = 0;
  while (done(day) && n < 3650) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

/** The windowsill tulips grow with your prayer streak: 0 (sprout) … 4 (in full bloom). */
export function plantStage(prayerStreak: number): 0 | 1 | 2 | 3 | 4 {
  if (prayerStreak >= 14) return 4;
  if (prayerStreak >= 7) return 3;
  if (prayerStreak >= 3) return 2;
  if (prayerStreak >= 1) return 1;
  return 0;
}

// ---------------------------------------------------------------- Simba
export type SimbaMood = 'sleep' | 'study' | 'prayer' | 'hungry' | 'worried' | 'cosy';

/** What Simba is up to, most important first. */
export function simbaMood(s: { prayerDue: boolean; studying: boolean; overBudget: boolean; starLit: boolean; night: boolean; hungry?: boolean }): SimbaMood {
  if (s.prayerDue) return 'prayer';
  if (s.studying) return 'study';
  if (s.hungry) return 'hungry';
  if (s.overBudget) return 'worried';
  if (s.starLit || s.night) return 'cosy';
  return 'sleep';
}

/** What Bek is doing in each of Simba's moods (they hang out together). */
export type BekPose = 'stand' | 'book' | 'pray' | 'think' | 'tea';
export const BEK_POSE: Record<SimbaMood, BekPose> = { sleep: 'stand', study: 'book', prayer: 'pray', hungry: 'think', worried: 'think', cosy: 'tea' };

export const SIMBA_LINES: Record<SimbaMood, string[]> = {
  prayer: ["It's {prayer} time, Bek. I saved you a spot on the mat.", 'Mrrp! The lantern is waiting for you.', 'Five minutes for {prayer}? I’ll keep it warm.'],
  study: ['Shh… I’m studying too.', 'You focus. I’ll guard the books.', 'One more page, Bek. You’ve got this.'],
  hungry: ['Mrow… my bowl is empty. Is yours too? Eat something proper, Bek.', 'Lunch? For both of us? Please?', '*sits by the empty bowl and stares at you*'],
  worried: ['Our chest feels a bit light… cook at home today?', 'Mrow… the money bar is red.', 'Maybe skip the coffee today? Just saying.'],
  cosy: ['Purrr… cosy night by the fire.', 'Proud of you today, Bek.', 'The fire is warm. Rest well.'],
  sleep: ['Zzz…', '*stretches* …five more minutes.', '*slow blink* (that means I love you)'],
};

/** Things Simba says when you pet him. */
export const SIMBA_PETS = ['Purrrr!', 'Mrrp?', '*headbutts your hand*', 'Simba approves.', 'Did someone say snacks?', '*rolls over for belly rubs*', 'Mrow! Back to work, Bek.'];

export const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
