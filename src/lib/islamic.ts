/**
 * Deen helpers: the Hijri date in words, the next Islamic occasions, the Jumu'ah (Friday) steps,
 * and the hifz (memorisation) revision schedule. All private — nothing here is ever scored.
 * Dates come from the browser's Umm al-Qura calendar, so they can differ by a day from moon sighting.
 */
import { addDays, daysBetween, weekdayOf } from './dates';
import { hijri } from './ramadan';
import type { HifzItem } from './types';

export const HIJRI_MONTHS = ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'];

/** "14 Jumada al-Ula 1448 AH" */
export function hijriLabel(date: string): string {
  const h = hijri(date);
  return `${h.day} ${HIJRI_MONTHS[h.month - 1] ?? ''} ${h.year} AH`;
}

const OCCASIONS: { name: string; month: number; day: number }[] = [
  { name: 'Islamic New Year', month: 1, day: 1 },
  { name: 'Ashura', month: 1, day: 10 },
  { name: 'Start of Ramadan', month: 9, day: 1 },
  { name: 'Eid al-Fitr', month: 10, day: 1 },
  { name: 'Day of Arafah', month: 12, day: 9 },
  { name: 'Eid al-Adha', month: 12, day: 10 },
];

/** The next Islamic occasions from today (within about a year), soonest first. */
export function nextOccasions(today: string): { name: string; date: string; daysLeft: number }[] {
  const out: { name: string; date: string; daysLeft: number }[] = [];
  const found = new Set<string>();
  for (let n = 0; n <= 360 && found.size < OCCASIONS.length; n++) {
    const date = addDays(today, n);
    const h = hijri(date);
    for (const o of OCCASIONS) {
      if (!found.has(o.name) && h.month === o.month && h.day === o.day) {
        found.add(o.name);
        out.push({ name: o.name, date, daysLeft: n });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- Jumu'ah
export const FRIDAY_STEPS: { id: string; text: string }[] = [
  { id: 'ghusl', text: 'Ghusl (a full bath) before Jumu’ah' },
  { id: 'clothes', text: 'Clean, best clothes and a little perfume' },
  { id: 'kahf', text: 'Read Surah al-Kahf' },
  { id: 'salawat', text: 'Send lots of salawat on the Prophet ﷺ' },
  { id: 'early', text: 'Go to the mosque early and listen to the khutbah' },
  { id: 'dua', text: 'Make dua in the last hour before Maghrib' },
];

export const isFriday = (date: string) => weekdayOf(date) === 4;

/** The coming Friday (today if it's Friday). */
export const nextFriday = (today: string) => addDays(today, (4 - weekdayOf(today) + 7) % 7);

// ---------------------------------------------------------------- Hifz revision
/** Revise again in 1, 3, 7, 14, 30, then 60 days as a surah stays solid. */
const STEPS = [1, 3, 7, 14, 30, 60];

/** Surahs that are due for revision today (never revised, or their gap has passed), most overdue first. */
export function dueForRevision(items: HifzItem[], today: string): HifzItem[] {
  return items
    .filter((i) => i.learned > 0 && (!i.revised || daysBetween(i.revised, today) >= i.interval))
    .sort((a, b) => overdue(b, today) - overdue(a, today) || a.surah - b.surah);
}
const overdue = (i: HifzItem, today: string) => (i.revised ? daysBetween(i.revised, today) - i.interval : 9999);

/** After revising: "solid" moves to the next longer gap, "shaky" brings it back tomorrow. */
export function afterRevision(item: HifzItem, today: string, solid: boolean): HifzItem {
  const next = solid ? (STEPS.find((s) => s > item.interval) ?? STEPS[STEPS.length - 1]) : 1;
  return { ...item, revised: today, interval: next };
}
