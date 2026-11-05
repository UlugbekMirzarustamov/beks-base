/**
 * Storage: ONE IndexedDB database ("ulus-base") with ONE key → value store ("kv").
 *
 * Keys used:
 *   "appdata"             all of AppData (one object)
 *   "photos"              the family photos (kept apart so AppData stays small)
 *   "snapshot:<time>…"    automatic safety copies (see lib/persist.ts)
 *   "unreadable:<time>"   stored data that couldn't be read, kept untouched for recovery
 *
 * The one rule: IndexedDB is the only place data is WRITTEN. Every write waits
 * until the database confirms it (transaction "complete") and rejects otherwise,
 * so a failed save is never reported as a success. IndexedDB writes are atomic:
 * a write either fully happens or leaves the old value in place.
 *
 * (Older versions sometimes fell back to localStorage. That copy is only ever
 * READ — when IndexedDB is empty — and is never written or deleted here.)
 */
const DB_NAME = 'ulus-base';
const STORE = 'kv';

/** A tiny key → value storage interface (IndexedDB in the app, an in-memory fake in tests). */
export interface KV {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('Could not open storage'));
      req.onblocked = () => reject(new Error('Storage is blocked by another open copy of the app'));
    }).catch((e: unknown) => {
      dbPromise = null; // so "Try again" really tries again
      throw e;
    });
  }
  return dbPromise;
}

/** Run one request in its own transaction; resolves only once the transaction has COMPLETED. */
function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = action(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req.result as T);
        tx.onerror = () => reject(tx.error ?? req.error ?? new Error('Storage error'));
        tx.onabort = () => reject(tx.error ?? new Error('The save was interrupted'));
      }),
  );
}

/** The real storage used by the app. */
export const idb: KV = {
  get: (key) => run('readonly', (s) => s.get(key)),
  put: (key, value) => run('readwrite', (s) => s.put(value, key)).then(() => undefined),
  del: (key) => run('readwrite', (s) => s.delete(key)).then(() => undefined),
  keys: () => run<IDBValidKey[]>('readonly', (s) => s.getAllKeys()).then((ks) => ks.map(String)),
};

export const APP_KEY = 'appdata';
export const PHOTOS_KEY = 'photos';

/** Old builds wrote here when IndexedDB failed. Read-only now; a broken copy throws (→ recovery, never overwritten). */
export function readLegacyCopy(): unknown {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(DB_NAME);
  } catch {
    return undefined;
  }
  return raw ? JSON.parse(raw) : undefined;
}

/** Save all app data. Rejects if the write didn't complete. */
export const saveData = (data: unknown, kv: KV = idb) => kv.put(APP_KEY, data);

/** The family photo list. Rejects if it can't be read (so nothing saves over photos we couldn't load). */
export const loadPhotoList = (kv: KV = idb) => kv.get(PHOTOS_KEY);
export const savePhotoList = (list: unknown, kv: KV = idb) => kv.put(PHOTOS_KEY, list);

/** Ask the browser not to delete our data when the device is low on space. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* not supported — that's fine */
  }
}
