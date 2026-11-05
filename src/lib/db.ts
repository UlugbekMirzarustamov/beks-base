/**
 * A tiny IndexedDB wrapper: one database, one "key → value" store.
 * We save the whole AppData object under one key. It's small (kilobytes),
 * so this is simple and fast.
 *
 * If IndexedDB isn't available (some private-browsing modes) we fall back to
 * localStorage so the app still works.
 */
const DB_NAME = 'ulus-base';
const STORE = 'kv';
const KEY = 'appdata';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = action(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req.result as T);
        tx.onerror = () => reject(tx.error);
      }),
  );
}

/** Load the saved data, or `undefined` on first launch. */
export async function loadData(): Promise<unknown> {
  try {
    return await run('readonly', (s) => s.get(KEY));
  } catch {
    const raw = localStorage.getItem(DB_NAME);
    return raw ? JSON.parse(raw) : undefined;
  }
}

export async function saveData(data: unknown): Promise<void> {
  try {
    await run('readwrite', (s) => s.put(data, KEY));
  } catch {
    localStorage.setItem(DB_NAME, JSON.stringify(data));
  }
}

/**
 * Family photos are kept under their own key (not inside AppData), so the
 * main data stays small and quick to save. They never leave this device
 * unless you export a backup.
 */
const PHOTOS_KEY = 'photos';

export async function loadPhotoList(): Promise<unknown> {
  try {
    return await run('readonly', (s) => s.get(PHOTOS_KEY));
  } catch {
    return undefined;
  }
}

export async function savePhotoList(list: unknown): Promise<void> {
  await run('readwrite', (s) => s.put(list, PHOTOS_KEY));
}

/** Ask the browser not to delete our data when the device is low on space. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* not supported — that's fine */
  }
}
