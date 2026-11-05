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

/**
 * Turn a backup file's text back into AppData.
 * Throws an Error with a friendly message if the file isn't a valid backup.
 * Missing fields (e.g. from an older version) are filled with defaults.
 */
export function parseBackup(text: string, today: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON. Pick a file exported from Bek's Base.");
  }
  const obj = parsed as { app?: string; data?: unknown };
  const data = (obj && obj.app === 'ulus-base' ? obj.data : parsed) as Partial<AppData> | undefined;
  if (!data || typeof data !== 'object' || data.version !== 1 || !Array.isArray(data.expenses)) {
    throw new Error("That doesn't look like a Bek's Base backup.");
  }
  return normalize(data, today);
}

/** Fill in anything missing with defaults, so the app never crashes on an older/partial file. */
export function normalize(data: Partial<AppData>, today: string): AppData {
  const base = emptyData(today);
  const out = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof AppData)[]) {
    const value = data[key];
    if (value === undefined || value === null) continue;
    const def = base[key];
    // Only accept a value if it has the same basic type as the default.
    if (Array.isArray(def) ? Array.isArray(value) : typeof value === typeof def) out[key] = value;
  }
  out.settings = { ...base.settings, ...(data.settings ?? {}) };
  // Older data has no lo-fi radio channel yet.
  (out.settings as AppData['settings']).mixer = { ...base.settings.mixer, ...(data.settings?.mixer ?? {}) };
  return out as unknown as AppData;
}
