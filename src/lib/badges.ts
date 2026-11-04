/**
 * Badges: little pixel medals for real milestones. Each badge has a rule that
 * looks at your data; when it first becomes true the app saves the date and
 * celebrates. Badges are never taken away.
 */
import type { IconName } from '../ui/icons';
import { levelInfo } from './xp';
import { streak } from './cabin';
import { PRAYERS } from './prayer';
import { QURAN_PAGES } from './quran';
import { potStatus } from './pot';
import type { AppData } from './types';

export interface Badge {
  id: string;
  name: string;
  /** How to earn it (shown even before you have it, so you know what to aim for). */
  how: string;
  icon: IconName;
  /** Medal colour */
  tier: 'bronze' | 'silver' | 'gold';
  earned: (d: AppData, today: string) => boolean;
}

const fullPrayerDay = (d: AppData, day: string) => PRAYERS.every((p) => d.prayers[day]?.includes(p));
const prayedAny = (d: AppData) => Object.values(d.prayers).some((list) => list.length > 0);
const quranPagesRead = (d: AppData) => Object.values(d.quran.log).reduce((a, n) => a + n, 0) + d.quran.khatms * QURAN_PAGES;
const studyMinutes = (d: AppData) => d.studyLog.reduce((a, s) => a + s.minutes, 0);

export const BADGES: Badge[] = [
  // Prayer
  { id: 'first-lantern', name: 'First lantern', how: 'Mark your first prayer as prayed.', icon: 'lantern', tier: 'bronze', earned: (d) => prayedAny(d) },
  { id: 'five-lanterns', name: 'Five lanterns', how: 'Pray all five prayers in one day.', icon: 'lantern', tier: 'silver', earned: (d) => Object.keys(d.prayers).some((day) => fullPrayerDay(d, day)) },
  { id: 'steadfast', name: 'Steadfast', how: 'All five prayers, 7 days in a row.', icon: 'mat', tier: 'gold', earned: (d, t) => streak((day) => fullPrayerDay(d, day), t) >= 7 },
  { id: 'pillar', name: 'Pillar', how: 'All five prayers, 30 days in a row.', icon: 'mat', tier: 'gold', earned: (d, t) => streak((day) => fullPrayerDay(d, day), t) >= 30 },
  { id: 'dhikr', name: 'Remembrance', how: 'Do 100 tasbih in one day.', icon: 'bead', tier: 'silver', earned: (d) => Object.values(d.tasbih).some((n) => n >= 100) },
  { id: 'first-juz', name: 'First juz', how: "Read 20 pages of the Qur'an.", icon: 'quran', tier: 'silver', earned: (d) => quranPagesRead(d) >= 20 },
  { id: 'khatm', name: 'Khatm', how: "Finish the whole Qur'an.", icon: 'quran', tier: 'gold', earned: (d) => d.quran.khatms >= 1 },
  // Study
  { id: 'focus', name: 'Focus', how: 'Finish your first Pomodoro.', icon: 'clock', tier: 'bronze', earned: (d) => d.studyLog.length >= 1 },
  { id: 'deep-worker', name: 'Deep worker', how: 'Finish 10 Pomodoros.', icon: 'clock', tier: 'silver', earned: (d) => d.studyLog.length >= 10 },
  { id: 'scholar', name: 'Scholar', how: 'Study for 50 hours in total.', icon: 'book', tier: 'gold', earned: (d) => studyMinutes(d) >= 50 * 60 },
  { id: 'got-it', name: 'Got it!', how: 'Rate a topic green.', icon: 'check', tier: 'bronze', earned: (d) => d.topics.some((t) => t.confidence === 'green') },
  {
    id: 'subject-master',
    name: 'Subject master',
    how: 'Get every topic of a subject to green.',
    icon: 'shelf',
    tier: 'gold',
    earned: (d) => d.subjects.some((s) => {
      const topics = d.topics.filter((t) => t.subjectId === s.id);
      return topics.length > 0 && topics.every((t) => t.confidence === 'green');
    }),
  },
  { id: 'learner', name: 'Learns from mistakes', how: 'Log 5 mistakes in the notebook.', icon: 'cross', tier: 'silver', earned: (d) => d.mistakes.length >= 5 },
  { id: 'formula-fluent', name: 'Formula fluent', how: 'Know 10 formula cards well.', icon: 'card', tier: 'silver', earned: (d) => d.flashcards.filter((c) => c.box >= 2).length >= 10 },
  // Money
  { id: 'bookkeeper', name: 'Bookkeeper', how: 'Log your first purchase.', icon: 'coin', tier: 'bronze', earned: (d) => d.expenses.length >= 1 },
  { id: 'saver', name: 'Saver', how: 'Start a savings jar.', icon: 'gift', tier: 'bronze', earned: (d) => d.goals.length >= 1 },
  { id: 'goal-getter', name: 'Goal getter', how: 'Fill a savings jar to the top.', icon: 'gift', tier: 'gold', earned: (d) => d.goals.some((g) => Boolean(g.reached)) },
  { id: 'wish', name: 'Wish come true', how: 'Buy a wish with money you saved.', icon: 'star', tier: 'gold', earned: (d) => d.wishes.some((w) => Boolean(w.bought)) },
  { id: 'thrifty', name: 'Thrifty week', how: 'Stay within your daily allowance 7 days in a row.', icon: 'coin', tier: 'silver', earned: (d, t) => Boolean(d.pot && potStatus(d.pot, d.expenses, t).underStreak >= 7) },
  // Reflect & life
  { id: 'stargazer', name: 'Stargazer', how: "Light your first star (Reflect → Tonight).", icon: 'star', tier: 'bronze', earned: (d) => Object.values(d.nightLogs).some((l) => l.rewarded) },
  { id: 'constellation', name: 'Constellation', how: 'Log 7 nights in a row.', icon: 'telescope', tier: 'gold', earned: (d, t) => streak((day) => Boolean(d.nightLogs[day]?.line.trim()), t) >= 7 },
  { id: 'time-traveller', name: 'Time traveller', how: 'Seal a letter to future you.', icon: 'letter', tier: 'bronze', earned: (d) => d.letters.length >= 1 },
  { id: 'habit', name: 'Creature of habit', how: 'Keep any habit 7 days in a row.', icon: 'check', tier: 'silver', earned: (d, t) => d.habits.some((h) => streak((day) => d.habitLog[day]?.includes(h.id) ?? false, t) >= 7) },
  { id: 'cosy-cabin', name: 'Cosy cabin', how: 'Reach level 5.', icon: 'house', tier: 'silver', earned: (d) => levelInfo(d.xp).level >= 5 },
  { id: 'legend', name: 'Legend of the cabin', how: 'Reach level 10.', icon: 'star', tier: 'gold', earned: (d) => levelInfo(d.xp).level >= 10 },
];

/** Badges whose rule is now true but which haven't been awarded yet. */
export function newlyEarned(d: AppData, today: string): Badge[] {
  return BADGES.filter((b) => !d.badges[b.id] && b.earned(d, today));
}
