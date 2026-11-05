import { describe, expect, it } from 'vitest';
import { exportJson, normalize, parseBackup } from './backup';
import { APP_KEY, PHOTOS_KEY, saveData, type KV } from './db';
import { createSnapshot, listSnapshots, loadApp, openAnyway, restoreBackupText, restoreSnapshot, safeReplace, SNAPSHOT_PREFIX, UNREADABLE_PREFIX } from './persist';
import { createInitialData, emptyData } from './seed';
import type { AppData } from './types';

const TODAY = '2026-11-05';

/** In-memory storage that can be told to fail (values stored as JSON, like a real copy). */
class FakeKV implements KV {
  store = new Map<string, string>();
  failGet = false;
  failPut: (key: string) => boolean = () => false;
  /** Pretend a write was cut short: the stored value ends up damaged but no error is raised. */
  corruptPut: (key: string) => boolean = () => false;
  async get(key: string) {
    if (this.failGet) throw new Error('read failed');
    const v = this.store.get(key);
    return v === undefined ? undefined : JSON.parse(v);
  }
  async put(key: string, value: unknown) {
    if (this.failPut(key)) throw new Error('write failed');
    this.store.set(key, this.corruptPut(key) ? JSON.stringify({ cut: 'short' }) : JSON.stringify(value));
  }
  async del(key: string) {
    this.store.delete(key);
  }
  async keys() {
    return [...this.store.keys()];
  }
  raw(key: string) {
    return this.store.get(key);
  }
}

const ready = () => createInitialData(TODAY); // fully up to date: loading it needs no update step
const withApp = (data: unknown) => {
  const kv = new FakeKV();
  kv.store.set(APP_KEY, JSON.stringify(data));
  return kv;
};
const at = (n: number) => new Date(Date.UTC(2026, 10, 5, 10, n));
const photo = { id: 'p1', src: 'data:image/jpeg;base64,AA', caption: 'Mum', added: TODAY };

describe('loading', () => {
  it('failed initial loading reports an error and writes nothing', async () => {
    const kv = withApp(ready());
    const before = kv.raw(APP_KEY);
    kv.failGet = true;
    const r = await loadApp(kv, TODAY);
    expect(r).toMatchObject({ kind: 'error', problem: 'storage' });
    expect(kv.raw(APP_KEY)).toBe(before);
    expect(await kv.keys()).toEqual([APP_KEY]);
  });

  it('corrupted stored data is reported, kept exactly as it is, and never replaced by defaults', async () => {
    for (const bad of ['garbage', [1, 2], { version: 2, expenses: [] }, { version: 1, expenses: 'oops' }, { version: 1, expenses: [{ amount: '5' }] }]) {
      const kv = withApp(bad);
      const before = kv.raw(APP_KEY);
      const r = await loadApp(kv, TODAY);
      expect(r.kind).toBe('error');
      if (r.kind === 'error') expect(r.raw).toEqual(bad);
      expect(kv.raw(APP_KEY)).toBe(before);
      expect(await kv.keys()).toEqual([APP_KEY]);
    }
  });

  it('an unreadable old localStorage copy is an error, not a fresh start', async () => {
    const r = await loadApp(new FakeKV(), TODAY, {
      legacy: () => {
        throw new SyntaxError('bad JSON');
      },
    });
    expect(r.kind).toBe('error');
  });

  it('empty storage is a fresh start; good data loads as it is', async () => {
    expect(await loadApp(new FakeKV(), TODAY)).toEqual({ kind: 'fresh' });
    const data = ready();
    data.xp = 321;
    expect(await loadApp(withApp(data), TODAY)).toEqual({ kind: 'ok', data });
  });

  it('reads the old localStorage copy when IndexedDB is empty', async () => {
    const data = ready();
    data.xp = 77;
    const r = await loadApp(new FakeKV(), TODAY, { legacy: () => data });
    expect(r.kind === 'ok' && r.data.xp).toBe(77);
  });
});

describe('migrations', () => {
  it('takes a verified safety copy before an update step changes data, and never overwrites the stored data', async () => {
    const kv = withApp(emptyData(TODAY)); // never upgraded: the update steps will change it
    const before = kv.raw(APP_KEY);
    const r = await loadApp(kv, TODAY);
    expect(r.kind === 'ok' && r.data.applied.length).toBeGreaterThan(0);
    const snaps = await listSnapshots(kv);
    expect(snaps.map((s) => s.reason)).toEqual(['Before an app update']);
    expect(kv.raw(APP_KEY)).toBe(before);
  });

  it('a failing update step stops loading without touching anything', async () => {
    const kv = withApp(ready());
    const before = [...kv.store.entries()];
    const r = await loadApp(kv, TODAY, {
      migrate: () => {
        throw new Error('step 7 broke');
      },
    });
    expect(r).toMatchObject({ kind: 'error', problem: 'unreadable' });
    expect([...kv.store.entries()]).toEqual(before);
  });

  it('if the safety copy before an update fails, the data opens un-updated with a warning', async () => {
    const old = emptyData(TODAY);
    const kv = withApp(old);
    kv.failPut = (k) => k.startsWith(SNAPSHOT_PREFIX);
    const r = await loadApp(kv, TODAY);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.warning).toBeTruthy();
      expect(r.data).toEqual(normalize(old, TODAY));
    }
    expect(await kv.keys()).toEqual([APP_KEY]);
  });
});

describe('missing nested properties', () => {
  it('fills in every level without dropping anything you saved', () => {
    const d = emptyData(TODAY) as any;
    delete d.settings.prayer.offsets;
    delete d.settings.mixer.lofi;
    delete d.quran.dailyGoal;
    delete d.shop.placed;
    d.nightLogs = { '2026-11-01': { line: 'A good day' } };
    d.goals = [{ id: 'g', name: 'Flight', target: 500, icon: 'plane', created: TODAY }];
    d.futureThing = { keep: true };
    d.settings.newSetting = 'kept';
    const out = normalize(d, TODAY) as AppData & { futureThing?: unknown; settings: { newSetting?: string } };
    expect(out.settings.prayer.offsets).toEqual({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 });
    expect(out.settings.mixer.lofi).toBe(0);
    expect(out.quran.dailyGoal).toBe(4);
    expect(out.shop.placed).toEqual({});
    expect(out.nightLogs['2026-11-01']).toEqual({ line: 'A good day', good: ['', '', ''], tomorrow: '' });
    expect(out.goals[0].deposits).toEqual([]);
    expect(out.futureThing).toEqual({ keep: true });
    expect(out.settings.newSetting).toBe('kept');
  });
});

describe('imports', () => {
  it('rejects invalid backups with a clear message', () => {
    const good = ready();
    const wrap = (data: unknown) => JSON.stringify({ app: 'ulus-base', data });
    expect(() => parseBackup('not json', TODAY)).toThrow(/valid JSON/);
    expect(() => parseBackup(wrap({ hello: 1 }), TODAY)).toThrow(/doesn't look like/);
    expect(() => parseBackup(wrap({ ...good, tasks: 'none' }), TODAY)).toThrow(/damaged/);
    expect(() => parseBackup(wrap({ ...good, expenses: [{ id: 'e', amount: 'ten', date: TODAY }] }), TODAY)).toThrow(/purchase/);
    expect(() => parseBackup(wrap({ ...good, pot: { total: 1000 } }), TODAY)).toThrow(/money plan/);
    expect(parseBackup(exportJson(good), TODAY)).toEqual(good);
  });

  it('an invalid backup file changes nothing in storage', async () => {
    const kv = withApp(ready());
    const before = [...kv.store.entries()];
    await expect(restoreBackupText(kv, '{"app":"ulus-base","data":{"version":1,"expenses":[null]}}', TODAY)).rejects.toThrow();
    expect([...kv.store.entries()]).toEqual(before);
  });

  it('a valid backup file is restored after keeping the current data', async () => {
    const current = ready();
    current.xp = 10;
    const kv = withApp(current);
    const incoming = ready();
    incoming.xp = 999;
    await restoreBackupText(kv, exportJson(incoming, new Date(), [photo]), TODAY);
    expect((await kv.get(APP_KEY)) as AppData).toMatchObject({ xp: 999 });
    expect(await kv.get(PHOTOS_KEY)).toEqual([photo]);
    const [snap] = await listSnapshots(kv);
    expect(((await kv.get(snap.id)) as { data: AppData }).data.xp).toBe(10);
  });
});

describe('snapshots', () => {
  it('backup and restore: a snapshot brings back the data and photos exactly', async () => {
    const original = ready();
    original.xp = 50;
    const kv = withApp(original);
    kv.store.set(PHOTOS_KEY, JSON.stringify([photo]));
    const snap = await createSnapshot(kv, original, 'Before importing a backup', at(1));
    const changed = ready();
    changed.xp = 5000;
    await saveData(changed, kv);
    await kv.put(PHOTOS_KEY, []);
    await restoreSnapshot(kv, snap.id, TODAY);
    expect(await kv.get(APP_KEY)).toEqual(original);
    expect(await kv.get(PHOTOS_KEY)).toEqual([photo]);
    // What was there before the restore is itself kept as a snapshot.
    expect((await listSnapshots(kv)).some((s) => s.reason === 'Before restoring a safety copy')).toBe(true);
  });

  it('keeps only the newest three good snapshots', async () => {
    const kv = withApp(ready());
    for (let i = 1; i <= 5; i++) {
      const d = ready();
      d.xp = i;
      await createSnapshot(kv, d, `copy ${i}`, at(i));
    }
    expect((await listSnapshots(kv)).map((s) => s.reason)).toEqual(['copy 5', 'copy 4', 'copy 3']);
  });

  it('failed backup creation: nothing is replaced and older snapshots stay', async () => {
    const current = ready();
    const kv = withApp(current);
    for (let i = 1; i <= 3; i++) await createSnapshot(kv, current, `copy ${i}`, at(i));
    const before = [...kv.store.entries()];
    kv.failPut = (k) => k.startsWith(SNAPSHOT_PREFIX);
    await expect(safeReplace(kv, current, createInitialData(TODAY), 'Before a full reset')).rejects.toThrow(/safety copy/);
    expect([...kv.store.entries()]).toEqual(before);
  });

  it('interrupted snapshot write: the damaged copy is dropped and the previous good ones are kept', async () => {
    const current = ready();
    const kv = withApp(current);
    for (let i = 1; i <= 3; i++) await createSnapshot(kv, current, `copy ${i}`, at(i));
    const before = [...kv.store.entries()];
    kv.corruptPut = (k) => k.startsWith(SNAPSHOT_PREFIX);
    await expect(createSnapshot(kv, current, 'copy 4', at(4))).rejects.toThrow(/safety copy/);
    expect([...kv.store.entries()]).toEqual(before);
    expect((await listSnapshots(kv)).map((s) => s.reason)).toEqual(['copy 3', 'copy 2', 'copy 1']);
  });

  it("refuses to make a snapshot of data that isn't valid", async () => {
    await expect(createSnapshot(new FakeKV(), { version: 1 }, 'x')).rejects.toThrow(/safety copy/);
  });
});

describe('saving', () => {
  it('failed saving rejects (never a silent success) and leaves the old data in place', async () => {
    const old = ready();
    old.xp = 1;
    const kv = withApp(old);
    kv.failPut = (k) => k === APP_KEY;
    const next = ready();
    next.xp = 2;
    await expect(saveData(next, kv)).rejects.toThrow('write failed');
    await expect(safeReplace(kv, old, next, 'Before importing a backup')).rejects.toThrow('write failed');
    expect((await kv.get(APP_KEY)) as AppData).toMatchObject({ xp: 1 });
    // The safety copy made before the failed write is still there for recovery.
    expect(await listSnapshots(kv)).toHaveLength(1);
  });
});

describe('recovery', () => {
  it('"repair and open anyway" first keeps the damaged data untouched', async () => {
    const damaged = { version: 1, expenses: 'oops', xp: 40 };
    const kv = withApp(damaged);
    await openAnyway(kv, damaged, TODAY);
    const kept = (await kv.keys()).find((k) => k.startsWith(UNREADABLE_PREFIX))!;
    expect(await kv.get(kept)).toEqual(damaged);
    const repaired = (await kv.get(APP_KEY)) as AppData;
    expect(repaired.expenses).toEqual([]);
    expect(repaired.xp).toBe(40);
    expect((await loadApp(kv, TODAY)).kind).toBe('ok');
  });
});
