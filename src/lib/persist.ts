/**
 * Keeping your data safe: loading, safety copies (snapshots) and recovery.
 *
 * Rules this file follows:
 *  1. Loading NEVER overwrites your data. If stored data can't be read, checked
 *     or updated, loading reports an error and the stored data is left exactly as it was.
 *  2. Before anything risky (import, reset, £→$ conversion, an app update step,
 *     restoring), a snapshot of the current data is written, read back and checked.
 *     If that fails, the risky action doesn't happen.
 *  3. The newest 3 good snapshots are kept. Old ones are removed only AFTER a new
 *     one has been checked. Data that couldn't be read is kept under
 *     "unreadable:<time>" and never removed automatically.
 *
 * Everything works through the small `KV` interface, so tests can use a fake
 * storage that fails on purpose.
 */
import { backupPhotos, normalize, parseBackup, validateData, type Photo } from './backup';
import { APP_KEY, PHOTOS_KEY, type KV } from './db';
import { createInitialData, upgrade } from './seed';
import type { AppData } from './types';

export const SNAPSHOT_PREFIX = 'snapshot:';
export const UNREADABLE_PREFIX = 'unreadable:';
export const MAX_SNAPSHOTS = 3;

export interface Snapshot {
  reason: string;
  createdAt: string; // ISO time
  data: AppData;
  photos?: Photo[];
}
export interface SnapshotInfo {
  id: string;
  reason: string;
  createdAt: string;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const isSnapshot = (v: unknown): v is Snapshot => {
  const s = v as Snapshot | null;
  return Boolean(s && typeof s === 'object' && typeof s.createdAt === 'string' && validateData(s.data, s.createdAt.slice(0, 10)).length === 0);
};

// ---------------------------------------------------------------- snapshots
/** Good snapshots, newest first. */
export async function listSnapshots(kv: KV): Promise<SnapshotInfo[]> {
  const ids = (await kv.keys()).filter((k) => k.startsWith(SNAPSHOT_PREFIX));
  const out: SnapshotInfo[] = [];
  for (const id of ids) {
    const snap = await kv.get(id).catch(() => undefined);
    if (isSnapshot(snap)) out.push({ id, reason: snap.reason, createdAt: snap.createdAt });
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}

/**
 * Write a safety copy of `data` (plus the family photos), read it back and check
 * it's identical. Only then remove copies older than the newest 3.
 * Throws if the copy can't be written or checked — callers must then NOT go ahead.
 */
export async function createSnapshot(kv: KV, data: unknown, reason: string, now = new Date()): Promise<SnapshotInfo> {
  const photos = await kv.get(PHOTOS_KEY).catch(() => undefined);
  const snap = { reason, createdAt: now.toISOString(), data, ...(Array.isArray(photos) ? { photos } : {}) };
  if (!isSnapshot(snap)) throw new Error("Couldn't make a safety copy (there's no readable data to copy)");
  const id = `${SNAPSHOT_PREFIX}${snap.createdAt}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    await kv.put(id, snap);
    const back = await kv.get(id);
    if (JSON.stringify(back) !== JSON.stringify(snap)) throw new Error('the copy read back differently');
  } catch (e) {
    await kv.del(id).catch(() => undefined); // drop the half-made copy; older copies are untouched
    throw new Error(`Couldn't make a safety copy (${message(e)})`);
  }
  // The new copy is verified, so it's now safe to tidy up the oldest ones.
  try {
    const all = await listSnapshots(kv);
    for (const old of all.slice(MAX_SNAPSHOTS)) await kv.del(old.id);
  } catch {
    /* tidying up can wait until next time: an extra copy never hurts */
  }
  return { id, reason, createdAt: snap.createdAt };
}

/** Keep whatever is stored now before it gets replaced: a snapshot if it's readable, otherwise an "unreadable:" copy. */
async function preserveStored(kv: KV, reason: string, today: string, now = new Date()): Promise<void> {
  const stored = await kv.get(APP_KEY);
  if (stored === undefined) return;
  if (validateData(stored, today).length === 0) {
    await createSnapshot(kv, stored, reason, now);
    return;
  }
  await keepUnreadable(kv, stored, now);
}

async function keepUnreadable(kv: KV, raw: unknown, now = new Date()): Promise<void> {
  const id = `${UNREADABLE_PREFIX}${now.toISOString()}`;
  await kv.put(id, raw);
  if (JSON.stringify(await kv.get(id)) !== JSON.stringify(raw)) throw new Error("Couldn't keep a copy of the stored data");
}

// ---------------------------------------------------------------- loading
export type LoadResult =
  | { kind: 'fresh' }
  | { kind: 'ok'; data: AppData; warning?: string }
  | { kind: 'error'; problem: 'storage' | 'unreadable'; message: string; raw?: unknown };

/**
 * Read, check and update the saved data. Never overwrites anything — the only
 * write is a snapshot before an update step. `legacy` reads the old localStorage copy.
 */
export async function loadApp(
  kv: KV,
  today: string,
  opts: { legacy?: () => unknown; migrate?: (d: AppData, today: string) => AppData } = {},
): Promise<LoadResult> {
  const migrate = opts.migrate ?? upgrade;
  let raw: unknown;
  try {
    raw = await kv.get(APP_KEY);
  } catch (e) {
    return { kind: 'error', problem: 'storage', message: `Your phone's storage couldn't be opened (${message(e)}).` };
  }
  if (raw === undefined && opts.legacy) {
    try {
      raw = opts.legacy();
    } catch (e) {
      return { kind: 'error', problem: 'unreadable', message: `An older copy of your data couldn't be read (${message(e)}).` };
    }
  }
  if (raw === undefined) return { kind: 'fresh' };

  const problems = validateData(raw, today);
  if (problems.length) return { kind: 'error', problem: 'unreadable', message: `Your saved data looks damaged: ${problems.slice(0, 3).join('; ')}.`, raw };
  let normalized: AppData;
  let updated: AppData;
  try {
    normalized = normalize(raw as Partial<AppData>, today);
    updated = migrate(structuredClone(normalized), today);
  } catch (e) {
    return { kind: 'error', problem: 'unreadable', message: `An app update step failed on your data (${message(e)}).`, raw };
  }
  if (JSON.stringify(updated) === JSON.stringify(normalized)) return { kind: 'ok', data: normalized };
  // An update step changes your data: keep a safety copy of it first.
  try {
    await createSnapshot(kv, raw, 'Before an app update');
  } catch {
    return {
      kind: 'ok',
      data: normalized,
      warning: "Couldn't make a safety copy, so the latest app update wasn't applied to your data yet. Your data is safe; it will try again next time.",
    };
  }
  return { kind: 'ok', data: updated };
}

// ---------------------------------------------------------------- risky changes
/** Replace all data, but only after a verified snapshot of `current`. Throws (changing nothing) if either step fails. */
export async function safeReplace(kv: KV, current: AppData, next: AppData, reason: string): Promise<void> {
  await createSnapshot(kv, current, reason);
  await kv.put(APP_KEY, next);
}

/** Put a snapshot back (and its photos). What's stored now is kept first. */
export async function restoreSnapshot(kv: KV, id: string, today: string): Promise<void> {
  const snap = await kv.get(id);
  if (!isSnapshot(snap)) throw new Error('That safety copy is damaged');
  await preserveStored(kv, 'Before restoring a safety copy', today);
  await kv.put(APP_KEY, normalize(snap.data, today));
  if (snap.photos) await kv.put(PHOTOS_KEY, snap.photos);
}

/** Restore from a backup file's text. An invalid file throws BEFORE anything is changed. */
export async function restoreBackupText(kv: KV, text: string, today: string): Promise<void> {
  const data = upgrade(parseBackup(text, today), today);
  const photos = backupPhotos(text);
  await preserveStored(kv, 'Before restoring a backup file', today);
  await kv.put(APP_KEY, data);
  if (photos.length) await kv.put(PHOTOS_KEY, photos);
}

/** Recovery "open anyway": keep the damaged data aside untouched, then repair what can be repaired. */
export async function openAnyway(kv: KV, raw: unknown, today: string): Promise<void> {
  await keepUnreadable(kv, raw);
  const repaired =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? upgrade(normalize({ ...(raw as Partial<AppData>), version: 1 }, today), today) : createInitialData(today);
  await kv.put(APP_KEY, repaired);
}
