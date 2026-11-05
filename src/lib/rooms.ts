/**
 * The cabin's rooms: what each room shows from your real life (books for notes, jars for the
 * pantry, stars for nights you wrote), the Garden of Years, the Life Museum timeline, Simba's
 * activities and daily gift, and the break timer. Plain functions, so they're easy to test.
 * The rooms are a cosy view of what you already did — no new points or penalties.
 */
import { BADGES } from './badges';
import { addDays } from './dates';
import { FISH } from './fish';
import type { AppData } from './types';

export type RoomId = 'library' | 'kitchen' | 'workshop' | 'bedroom' | 'observatory' | 'garden' | 'attic';

export const ROOMS: { id: RoomId; name: string; simba: string; lines: string[] }[] = [
  { id: 'library', name: 'Library', simba: 'Simba is reading over your shoulder', lines: ['Mrrp. This one has pictures?', 'Simba sits on the open page. Study break?', 'Purr… the books smell nice.'] },
  { id: 'kitchen', name: 'Kitchen', simba: 'Simba is waiting by the bowl', lines: ['Is that plov? For me?', 'Simba stares at the fridge very politely.', 'Mrrow! (translation: snack time)'] },
  { id: 'workshop', name: 'Workshop', simba: 'Simba is batting a loose bolt', lines: ['Clink! The bolt rolls under the bench.', 'Simba inspects your blueprint. Approved.', 'Engineer cat reporting for duty.'] },
  { id: 'bedroom', name: 'Bedroom', simba: 'Simba is napping on the bed', lines: ['Zzz… (one ear twitches)', 'Simba stretches and goes back to sleep.', 'Purr… sleep early tonight, okay?'] },
  { id: 'observatory', name: 'Observatory', simba: 'Simba is watching the stars', lines: ['Every star is a night you wrote about.', 'Simba tries to catch a shooting star.', 'Mrrp. The sky is so big.'] },
  { id: 'garden', name: 'Garden of Years', simba: 'Simba is chasing a butterfly', lines: ['Pounce! Missed.', 'Simba rolls in the warm grass.', 'Each flower is a month of good days.'] },
  { id: 'attic', name: 'Life Museum', simba: 'Simba is exploring the boxes', lines: ['Simba found something shiny!', 'A dusty box… Simba sneezes.', 'Look how far you have come.'] },
];

export interface RoomStats {
  books: number;
  readingToday: boolean;
  jars: number;
  cookingToday: boolean;
  finished: number;
  sleptWell: boolean;
  stars: number;
}

/** What the rooms show, read from your data (never copied). */
export function roomStats(d: AppData, today: string): RoomStats {
  const bedtime = d.sleepLog[addDays(today, -1)];
  return {
    books: d.lectureNotes.length + d.vocab.length + d.flashcards.length + d.recipes.length,
    readingToday: d.lectureNotes.some((n) => n.date === today),
    jars: d.pantry.filter((p) => p.qty > 0).length,
    cookingToday: Boolean(d.meals[today] && Object.keys(d.meals[today]).length),
    finished: d.assignments.filter((a) => a.status === 'submitted' || a.status === 'graded').length + d.admin.filter((a) => a.finished).length,
    // In bed between 19:00 and 23:30 last night.
    sleptWell: Boolean(bedtime && bedtime >= '19:00' && bedtime <= '23:30'),
    stars: Object.values(d.nightLogs).filter((l) => l.line.trim() || l.good.some((g) => g.trim())).length,
  };
}

/** A "good day": you wrote that night, or your mood was 4 or 5 out of 5. */
const goodDay = (d: AppData, day: string) => {
  const log = d.nightLogs[day];
  return Boolean((log && (log.line.trim() || log.good.some((g) => g.trim()))) || (d.moods[day] ?? 0) >= 4);
};

/** Garden of Years: for each month of `year`, how many good days it had and how tall its flower is (0–4). */
export function gardenOfYear(d: AppData, year: number): { month: number; days: number; stage: number }[] {
  const counts = new Array<number>(12).fill(0);
  const seen = new Set([...Object.keys(d.nightLogs), ...Object.keys(d.moods)]);
  for (const day of seen) if (day.startsWith(`${year}-`) && goodDay(d, day)) counts[Number(day.slice(5, 7)) - 1]++;
  return counts.map((days, i) => ({ month: i + 1, days, stage: days === 0 ? 0 : days < 4 ? 1 : days < 10 ? 2 : days < 20 ? 3 : 4 }));
}

/** The years the garden can show (any year with notes or moods, plus this one), newest first. */
export function gardenYears(d: AppData, today: string): number[] {
  const years = new Set([Number(today.slice(0, 4))]);
  for (const day of [...Object.keys(d.nightLogs), ...Object.keys(d.moods)]) years.add(Number(day.slice(0, 4)));
  return [...years].filter((y) => y > 2000).sort((a, b) => b - a);
}

export interface Exhibit {
  date: string;
  kind: 'badge' | 'savings' | 'vision' | 'assignment' | 'campfire' | 'fish' | 'gift';
  title: string;
}

/** The Life Museum: milestones you've already reached, newest first. Worship is never put on display. */
export function museum(d: AppData): Exhibit[] {
  const out: Exhibit[] = [];
  for (const [id, date] of Object.entries(d.badges)) {
    const b = BADGES.find((x) => x.id === id);
    // Badges about prayer and Qur'an stay private (never scored or shown off).
    if (b && !['lantern', 'mat', 'quran', 'bead', 'moon'].includes(b.icon)) out.push({ date, kind: 'badge', title: `Badge: ${b.name}` });
  }
  for (const g of d.goals) if (g.reached) out.push({ date: g.reached, kind: 'savings', title: `Saved up: ${g.name}` });
  for (const v of d.vision) if (v.done) out.push({ date: v.done, kind: 'vision', title: `Dream reached: ${v.title}` });
  for (const a of d.assignments) if (a.status === 'graded') out.push({ date: a.due, kind: 'assignment', title: `Handed in: ${a.title}` });
  for (const c of Object.values(d.campfires)) if (c.win.trim()) out.push({ date: c.date, kind: 'campfire', title: `Campfire win: ${c.win}` });
  const firstCatch = new Map<string, string>();
  for (const c of [...d.catches].sort((a, b) => a.date.localeCompare(b.date))) if (!firstCatch.has(c.fish)) firstCatch.set(c.fish, c.date);
  for (const [fish, date] of firstCatch) out.push({ date, kind: 'fish', title: `First catch: ${FISH.find((f) => f.id === fish)?.name ?? fish}` });
  for (const g of d.simbaGifts) out.push({ date: g.date, kind: 'gift', title: `Simba's gift: ${g.gift}` });
  return out.filter((e) => e.date).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

// ---------------------------------------------------------------- Simba's gifts
export const GIFTS = ['a crunchy autumn leaf', 'a lost sock', 'a pigeon feather', 'a smooth pebble', 'a bottle cap', 'a pine cone', 'a hair tie', 'a tiny twig', 'a shiny button', 'a ball of fluff', 'a bit of string', 'a clover leaf'];

/** Simba's gift for a day: the same all day, different on most days. */
export function giftFor(date: string): string {
  let h = 0;
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GIFTS[h % GIFTS.length];
}

/** Simba has a gift waiting if you haven't taken today's yet. */
export const giftWaiting = (d: AppData, today: string) => !d.simbaGifts.some((g) => g.date === today);

// ---------------------------------------------------------------- Break reminders
/** Minutes of screen time before a break reminder, or 0 when switched off. */
export const breakDue = (activeMinutes: number, every: number) => every > 0 && activeMinutes >= every;

export const BREAK_IDEAS = ['Stand up and stretch your back and shoulders.', 'Drink a glass of water.', 'Look at something 20 metres away for 20 seconds.', 'Roll your shoulders and wrists.', 'Walk around the room — Simba will follow you.'];
