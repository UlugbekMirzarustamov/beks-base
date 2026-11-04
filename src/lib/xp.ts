/**
 * XP and levels, just for fun.
 * Level 1 → 2 costs 100 XP, and each level after costs 50 XP more than the last.
 */

/** How much XP each action gives. */
export const XP = {
  task: 10,
  priority: 15,
  pomodoro: 25,
  topicGreen: 10,
  mistakeReviewed: 5,
  flashcardGot: 2,
  habit: 3,
} as const;

export const xpForLevel = (level: number) => 100 + (level - 1) * 50;

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level. */
  into: number;
  /** XP needed to finish the current level. */
  needed: number;
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1;
  let rest = Math.max(0, xp);
  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level);
    level++;
  }
  return { level, into: rest, needed: xpForLevel(level) };
}
