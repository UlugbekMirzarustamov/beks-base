/**
 * Live diary: posts diary entries to the public file behind the site's four-nights page.
 *
 * The key that allows posting stays on this device under its own storage key, outside the
 * app data, so it never ends up in backups or safety copies.
 */
import { idb, type KV } from './db';
import { parseDiaryFile } from './diary';
import type { DiaryEntry } from './types';

const FILE_URL = 'https://api.github.com/repos/UlugbekMirzarustamov/beks-base/contents/public/four-nights.json';
const KEY_NAME = 'publishToken';

export const loadPublishKey = async (kv: KV = idb) => ((await kv.get(KEY_NAME)) as string | undefined) ?? null;
export const savePublishKey = (key: string, kv: KV = idb) => kv.put(KEY_NAME, key);
export const forgetPublishKey = (kv: KV = idb) => kv.del(KEY_NAME);

export type PublishResult = 'live' | 'bad-key' | 'failed';
type Entry = Omit<DiaryEntry, 'id'>;

/** Identifies an entry the same way on every device. */
export const entryKey = (e: { date: string; text: string }) => `${e.date}|${e.text}`;

const toBase64 = (s: string) => {
  let bin = '';
  for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b);
  return btoa(bin);
};
const fromBase64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

const plain = (e: Entry): Entry => ({ date: e.date, ...(e.time ? { time: e.time } : {}), text: e.text });
const render = (entries: Entry[]) => `${JSON.stringify({ bekDiary: 1, entries }, null, 2)}\n`;

/** The site's entries (minus removed ones) plus everything in this diary, oldest first. */
export function mergeForSite(site: Entry[], diary: Entry[], removed: string[]): Entry[] {
  const gone = new Set(removed);
  const merged = new Map<string, Entry>();
  for (const e of [...site, ...diary]) if (!gone.has(entryKey(e))) merged.set(entryKey(e), plain(e));
  return [...merged.values()].sort((a, b) => `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`));
}

/** Makes the public file match the diary. If the site's file can't be read, nothing is written. */
export async function publishDiary(key: string, diary: Entry[], removed: string[], send: typeof fetch = fetch, tries = 2): Promise<PublishResult> {
  const headers = { Authorization: `Bearer ${key}`, Accept: 'application/vnd.github+json' };
  try {
    const got = await send(FILE_URL, { headers, cache: 'no-store' });
    if (got.status === 401 || got.status === 403) return 'bad-key';
    if (!got.ok) return 'failed';
    const file = (await got.json()) as { sha: string; content: string };
    const site = parseDiaryFile(fromBase64(file.content));
    if (!site) return 'failed';

    const next = render(mergeForSite(site, diary, removed));
    if (next === render(site.map(plain))) return 'live';

    const put = await send(FILE_URL, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ message: 'Update diary', content: toBase64(next), sha: file.sha }),
    });
    if (put.ok) return 'live';
    if (put.status === 401 || put.status === 403) return 'bad-key';
    // Someone else changed the file a moment ago: read it again and retry once.
    if ((put.status === 409 || put.status === 422) && tries > 1) return publishDiary(key, diary, removed, send, tries - 1);
    return 'failed';
  } catch {
    return 'failed';
  }
}
