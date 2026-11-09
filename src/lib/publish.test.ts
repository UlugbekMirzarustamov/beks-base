import { describe, expect, it, vi } from 'vitest';
import { entryKey, mergeForSite, publishDiary } from './publish';

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const remote = (entries: unknown[]) => ({ sha: 'abc', content: b64(JSON.stringify({ bekDiary: 1, entries })) });
const res = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status });
const a = { date: '2026-01-01', text: 'first' };
const b = { date: '2026-01-02', time: '09:30', text: 'ünï second' };

describe('live diary', () => {
  it('merges site and diary, oldest first, without duplicates or removed entries', () => {
    expect(mergeForSite([b], [a, b], [])).toEqual([a, b]);
    expect(mergeForSite([a, b], [b], [entryKey(a)])).toEqual([b]);
  });

  it('posts a new entry, keeping non-English letters intact', async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValueOnce(res(200, remote([a]))).mockResolvedValueOnce(res(200));
    expect(await publishDiary('fake', [a, b], [], send)).toBe('live');
    const body = JSON.parse(String(send.mock.calls[1][1]?.body)) as { content: string; sha: string };
    expect(body.sha).toBe('abc');
    const bytes = Uint8Array.from(atob(body.content), (c) => c.charCodeAt(0));
    expect(JSON.parse(new TextDecoder().decode(bytes)).entries).toEqual([a, b]);
  });

  it('writes nothing when the site already matches', async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(res(200, remote([a])));
    expect(await publishDiary('fake', [a], [], send)).toBe('live');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('never overwrites a site file it cannot read', async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(res(200, { sha: 'x', content: b64('broken') }));
    expect(await publishDiary('fake', [a], [], send)).toBe('failed');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('reports a bad key and being offline', async () => {
    expect(await publishDiary('fake', [a], [], vi.fn<typeof fetch>().mockResolvedValue(res(401)))).toBe('bad-key');
    expect(await publishDiary('fake', [a], [], vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')))).toBe('failed');
  });

  it('retries once if the file changed underneath it', async () => {
    const send = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(res(200, remote([])))
      .mockResolvedValueOnce(res(409))
      .mockResolvedValueOnce(res(200, remote([])))
      .mockResolvedValueOnce(res(200));
    expect(await publishDiary('fake', [a], [], send)).toBe('live');
    expect(send).toHaveBeenCalledTimes(4);
  });
});
