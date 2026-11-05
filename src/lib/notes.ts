/**
 * Lecture notes: [[links]] between notes (and to your topics), backlinks, and splitting a note
 * into text and links for showing it. Plain functions, so they're easy to test.
 */
import { fold } from './search';
import type { LectureNote } from './types';

const LINK = /\[\[([^[\]\n]{1,80})\]\]/g;

/** The titles a note links to with [[Title]], each once, in order. */
export function linksIn(body: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of body.matchAll(LINK)) {
    const title = m[1].trim();
    if (title && !seen.has(fold(title))) {
      seen.add(fold(title));
      out.push(title);
    }
  }
  return out;
}

/** The note with this title (ignoring case and accents), if there is one. */
export const findNote = (notes: LectureNote[], title: string) => notes.find((n) => fold(n.title) === fold(title));

/** Notes that link to this one. */
export const backlinks = (notes: LectureNote[], note: LectureNote) =>
  notes.filter((n) => n.id !== note.id && linksIn(n.body).some((t) => fold(t) === fold(note.title)));

/** A note's text split into plain parts and [[link]] parts, for showing it. */
export function splitLinks(body: string): ({ text: string } | { link: string })[] {
  const out: ({ text: string } | { link: string })[] = [];
  let last = 0;
  for (const m of body.matchAll(LINK)) {
    if (m.index! > last) out.push({ text: body.slice(last, m.index) });
    out.push({ link: m[1].trim() });
    last = m.index! + m[0].length;
  }
  if (last < body.length) out.push({ text: body.slice(last) });
  return out;
}
