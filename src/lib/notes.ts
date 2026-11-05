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

// ---------------------------------------------------------------- the knowledge garden
export interface GardenGraph {
  /** Each note with how many notes it's connected to (either direction). */
  plants: { note: LectureNote; links: number }[];
  /** Pairs of connected notes (each pair once). */
  vines: [string, string][];
  /** Notes you've linked to but not written yet, with how many notes point at them. */
  seeds: { title: string; count: number }[];
  /** Notes with no links in or out. */
  lonely: LectureNote[];
}

/** How your notes connect: the knowledge garden. Links to topics aren't seeds (they're your topics). */
export function gardenGraph(notes: LectureNote[], topicNames: string[] = []): GardenGraph {
  const pairs = new Set<string>();
  const vines: [string, string][] = [];
  const seedCount = new Map<string, { title: string; count: number }>();
  const topics = new Set(topicNames.map(fold));
  for (const n of notes) {
    for (const title of linksIn(n.body)) {
      const target = findNote(notes, title);
      if (target && target.id !== n.id) {
        const key = [n.id, target.id].sort().join('|');
        if (!pairs.has(key)) {
          pairs.add(key);
          vines.push([n.id, target.id]);
        }
      } else if (!target && !topics.has(fold(title))) {
        const s = seedCount.get(fold(title)) ?? { title, count: 0 };
        s.count++;
        seedCount.set(fold(title), s);
      }
    }
  }
  const degree = new Map<string, number>();
  for (const [a, b] of vines) {
    degree.set(a, (degree.get(a) ?? 0) + 1);
    degree.set(b, (degree.get(b) ?? 0) + 1);
  }
  const plants = notes.map((note) => ({ note, links: degree.get(note.id) ?? 0 }));
  return {
    plants,
    vines,
    seeds: [...seedCount.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title)),
    lonely: plants.filter((p) => p.links === 0 && linksIn(p.note.body).length === 0).map((p) => p.note),
  };
}
