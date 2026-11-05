/**
 * Export / Import of ALL data as one JSON file.
 *
 * File format:
 *   { "app": "ulus-base", "exportedAt": "2026-11-03T12:00:00.000Z", "data": { ...AppData } }
 */
import { emptyData } from './seed';
import type { AppData } from './types';

/** A family photo (a small JPEG as a data: URL). */
export interface Photo {
  id: string;
  src: string;
  caption: string;
  added: string; // YYYY-MM-DD
}

/** The backup also carries your family photos (if any), so moving to a new phone keeps them. */
export function exportJson(data: AppData, now: Date = new Date(), photos: Photo[] = []): string {
  return JSON.stringify({ app: 'ulus-base', exportedAt: now.toISOString(), data, ...(photos.length ? { photos } : {}) }, null, 2);
}

/** The photos inside a backup file (an empty list if it has none or looks wrong). */
export function backupPhotos(text: string): Photo[] {
  try {
    const list = (JSON.parse(text) as { photos?: unknown }).photos;
    return Array.isArray(list) ? list.filter((p): p is Photo => typeof p?.src === 'string' && p.src.startsWith('data:image/')) : [];
  } catch {
    return [];
  }
}

export const backupFileName = (today: string) => `beks-base-backup-${today}.json`;

/** The AppData inside a backup file's text (or the file itself, for very old backups). Throws on non-JSON. */
function unwrap(text: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON. Pick a file exported from Bek's Base.");
  }
  const obj = parsed as { app?: string; data?: unknown } | null;
  return obj && obj.app === 'ulus-base' ? obj.data : parsed;
}

/**
 * Turn a backup file's text back into AppData.
 * Throws an Error with a friendly message if the file isn't a valid backup —
 * this happens BEFORE anything in the app is changed. Missing fields (e.g. from
 * an older version) are filled with defaults.
 */
export function parseBackup(text: string, today: string): AppData {
  const data = unwrap(text);
  const problems = validateData(data, today);
  if (problems.length) {
    throw new Error(
      problems[0] === NOT_A_BACKUP ? "That doesn't look like a Bek's Base backup." : `That backup looks damaged, so nothing was changed. (${problems.slice(0, 3).join('; ')})`,
    );
  }
  return normalize(data as Partial<AppData>, today);
}

const NOT_A_BACKUP = 'not a Bek\'s Base backup';
const isPlain = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
/** Lists of plain words rather than records. */
const WORD_LISTS = new Set(['applied']);
const isDay = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Checks that data really is Bek's Base data with the right SHAPES (it doesn't
 * judge the values). Returns a list of problems; an empty list means it's fine.
 * Used for imports, and for stored data on start-up.
 */
export function validateData(data: unknown, today: string): string[] {
  if (!isPlain(data) || data.version !== 1) return [NOT_A_BACKUP];
  const problems: string[] = [];
  if (!Array.isArray(data.expenses)) problems.push('"expenses" should be a list');
  const base = emptyData(today) as unknown as Record<string, unknown>;
  for (const [key, def] of Object.entries(base)) {
    const value = data[key];
    if (value === undefined) continue; // older backups simply don't have newer parts
    if (Array.isArray(def)) {
      if (!Array.isArray(value)) problems.push(`"${key}" should be a list`);
      else if (!WORD_LISTS.has(key) && value.some((item) => !isPlain(item))) problems.push(`"${key}" has broken entries`);
    } else if (isPlain(def)) {
      if (!isPlain(value)) problems.push(`"${key}" should be a group of values`);
    } else if (def !== null && value !== null && typeof value !== typeof def) problems.push(`"${key}" has the wrong type`);
  }
  // Money must be exactly right: every purchase needs a real amount and a date.
  for (const e of Array.isArray(data.expenses) ? data.expenses : []) {
    if (!isPlain(e) || typeof e.amount !== 'number' || !Number.isFinite(e.amount) || !isDay(e.date)) {
      problems.push('a purchase is missing its amount or date');
      break;
    }
  }
  const pot = data.pot;
  if (pot !== undefined && pot !== null && (!isPlain(pot) || typeof pot.total !== 'number' || !isDay(pot.start) || typeof pot.months !== 'number')) {
    problems.push('the money plan is incomplete');
  }
  return [...new Set(problems)];
}

/**
 * Fill `value` in with `def` wherever something is missing, at every level.
 * - A value of the wrong basic type is replaced by the default (as before).
 * - Keys that aren't in the defaults are KEPT (nothing you saved is dropped).
 * - Lists are kept as they are; only empty slots (null/undefined) are removed.
 */
function fill(def: unknown, value: unknown): unknown {
  if (value === undefined || value === null) return def;
  if (Array.isArray(def)) return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined) : def;
  if (isPlain(def)) {
    if (!isPlain(value)) return def;
    const out: Record<string, unknown> = { ...value };
    for (const key of Object.keys(def)) out[key] = fill(def[key], value[key]);
    return out;
  }
  if (def === null) return value; // a slot that may be empty (e.g. the money plan)
  return typeof value === typeof def ? value : def;
}

/** Inside records keyed by date: the shape each entry needs (so a half-saved entry can't crash a screen). */
const NIGHT_LOG = { line: '', good: ['', '', ''], tomorrow: '' };

/** Fill in anything missing with defaults, so the app never crashes on an older/partial file. */
export function normalize(data: Partial<AppData>, today: string): AppData {
  const out = fill(emptyData(today), data) as AppData;
  // Data from before schema versions existed is version 1, so its migrations still run.
  if (typeof data.schemaVersion !== 'number') out.schemaVersion = 1;
  for (const [day, log] of Object.entries(out.nightLogs)) out.nightLogs[day] = fill(NIGHT_LOG, log) as AppData['nightLogs'][string];
  out.goals = out.goals.map((g) => (Array.isArray(g.deposits) ? g : { ...g, deposits: [] }));
  return out;
}
