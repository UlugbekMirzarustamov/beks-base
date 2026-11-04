/**
 * Qur'an reading helpers, using the common Madani mushaf: 604 pages, 30 juz.
 * Juz 1 is pages 1–21; from then on each juz starts every 20 pages (juz 2 → page 22 … juz 30 → page 582).
 */
import type { QuranProgress } from './types';

export const QURAN_PAGES = 604;

export function juzOfPage(page: number): number {
  if (page <= 21) return 1;
  return Math.min(30, Math.floor((page - 2) / 20) + 1);
}

/**
 * Record `pages` read today. Moves your bookmark forward, and when you pass the
 * last page it counts a completed reading (khatm) and starts again from page 1.
 * Negative pages = undo.
 */
export function logReading(q: QuranProgress, today: string, pages: number): { quran: QuranProgress; finished: boolean } {
  const todayPages = Math.max(0, (q.log[today] ?? 0) + pages);
  let page = q.page + pages;
  let khatms = q.khatms;
  let finished = false;
  if (page >= QURAN_PAGES) {
    page -= QURAN_PAGES;
    khatms++;
    finished = true;
  }
  return { quran: { ...q, page: Math.max(0, page), khatms, log: { ...q.log, [today]: todayPages } }, finished };
}
