import { describe, expect, it } from 'vitest';
import { backupFiles, exportJson, normalize, parseBackup, validateData } from './backup';
import { APP_KEY, FILES_KEY, PHOTOS_KEY, saveData, type KV } from './db';
import { migrate, SCHEMA_VERSION, type Migration } from './migrate';
import { createSnapshot, dailyBackup, DAILY_PREFIX, listAllSnapshots, listSnapshots, loadApp, openAnyway, restoreBackupText, restoreSnapshot, safeReplace, SNAPSHOT_PREFIX, UNREADABLE_PREFIX } from './persist';
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

describe('every new part of the data loads after saving', () => {
  it('passes validation with an entry in every list added since Phase 2', () => {
    const d = emptyData(TODAY);
    d.groceries = [{ id: 'g', text: 'milk', done: false }];
    d.pantry = [{ id: 'p', name: 'Rice', qty: 1, unit: 'kg', expires: '' }];
    d.recipes = [{ id: 'r', name: 'Plov', ingredients: ['rice'], steps: '', minutes: null }];
    d.meals = { [TODAY]: { dinner: { text: 'Plov', recipeId: 'r' } } };
    d.admin = [{ id: 'a', title: 'Visa', area: 'visa', date: '', dateLabel: 'Expires', remind: 30, steps: [{ id: 's', text: 'x', done: false, due: '' }], notes: '', finished: false }];
    d.lectureNotes = [{ id: 'n', subjectId: null, title: 'L1', date: TODAY, body: '', updated: '' }];
    d.friday = { '2026-11-06': ['ghusl'] };
    d.hifz = [{ id: '112', surah: 112, learned: 4, revised: '', interval: 1 }];
    d.simbaGifts = [{ date: TODAY, gift: 'a pebble' }];
    d.planGoals = [{ id: 'pg', level: 'week', period: '2026-11-02', title: 'x', done: false, parentId: null }];
    d.duaFavs = ['knowledge'];
    d.myDuas = [{ id: 'm', title: 'x', text: 'y', note: '' }];
    d.deeds = [{ id: 'd', date: TODAY, text: 'x' }];
    d.learning = [{ id: 'l', title: 'x', by: '', kind: 'book', status: 'want', link: '', notes: '' }];
    d.examQuestions = [{ id: 'eq', subjectId: null, topicId: null, question: 'q', answer: 'a', marks: 2 }];
    d.mocks = [{ id: 'mk', subjectId: null, testId: null, date: TODAY, minutes: 5, used: 60, score: 1, max: 2, leftApp: 0, items: [{ question: 'q', answer: 'a', given: '', marks: 2, got: 1 }] }];
    const saved = JSON.parse(JSON.stringify(d));
    expect(validateData(saved, TODAY)).toEqual([]);
    expect(validateData({ ...saved, duaFavs: [{ id: 1 }] }, TODAY)).toEqual(['"duaFavs" has broken entries']);
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

  it('data saved before the kitchen and admin existed opens with empty lists; old bills and events keep working', () => {
    const d = emptyData(TODAY) as any;
    for (const k of ['groceries', 'pantry', 'recipes', 'meals', 'admin', 'lectureNotes', 'friday', 'hifz', 'simbaGifts', 'planGoals', 'duaFavs', 'myDuas', 'deeds', 'learning', 'examQuestions', 'mocks']) delete d[k];
    delete d.settings.prayer.method;
    delete d.settings.breakEvery;
    d.recurring = [{ id: 'b', name: 'Phone', amount: 10, categoryId: 'phone', day: 3, lastAdded: null }];
    d.events = [{ id: 'e', title: 'Birthday', kind: 'birthday', date: '2000-01-02', start: '', end: '', endDate: '', repeat: 'yearly', until: '', location: '', notes: '' }];
    const out = normalize(d, TODAY);
    expect(out.groceries).toEqual([]);
    expect(out.pantry).toEqual([]);
    expect(out.recipes).toEqual([]);
    expect(out.meals).toEqual({});
    expect(out.admin).toEqual([]);
    expect(out.lectureNotes).toEqual([]);
    expect(out.friday).toEqual({});
    expect(out.hifz).toEqual([]);
    expect(out.simbaGifts).toEqual([]);
    expect(out.planGoals).toEqual([]);
    expect([out.duaFavs, out.myDuas, out.deeds, out.learning, out.examQuestions, out.mocks]).toEqual([[], [], [], [], [], []]);
    expect(out.settings.breakEvery).toBe(50);
    expect(out.settings.prayer.method).toBe('mwl');
    expect(out.recurring[0]).toEqual(d.recurring[0]);
    expect(out.events[0]).toEqual(d.events[0]);
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

describe('lesson files (images and PDFs on lecture notes)', () => {
  const file = { id: 'f1', noteId: 'n1', name: 'slides.pdf', type: 'application/pdf', size: 10, data: 'data:application/pdf;base64,JVBERi0=', added: TODAY };

  it('go into safety copies and come back with a restore', async () => {
    const original = ready();
    const kv = withApp(original);
    kv.store.set(FILES_KEY, JSON.stringify([file]));
    const snap = await createSnapshot(kv, original, 'Before importing a backup', at(1));
    await kv.put(FILES_KEY, []);
    await restoreSnapshot(kv, snap.id, TODAY);
    expect(await kv.get(FILES_KEY)).toEqual([file]);
  });

  it('travel inside backup files; broken entries are left out', async () => {
    const kv = withApp(ready());
    const text = exportJson(ready(), new Date(), [], [file]);
    expect(backupFiles(text)).toEqual([file]);
    const withJunk = JSON.stringify({ ...JSON.parse(text), files: [file, { id: 'x', noteId: 'n', data: 'javascript:alert(1)' }] });
    expect(backupFiles(withJunk)).toEqual([file]);
    await restoreBackupText(kv, text, TODAY);
    expect(await kv.get(FILES_KEY)).toEqual([file]);
  });

  it('are not copied into the small daily backups (like photos)', async () => {
    const kv = withApp(ready());
    kv.store.set(FILES_KEY, JSON.stringify([file]));
    await dailyBackup(kv, ready(), TODAY, at(2));
    const id = (await kv.keys()).find((k) => k.startsWith(DAILY_PREFIX))!;
    expect((await kv.get(id)) as object).not.toHaveProperty('files');
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

describe('numbered schema migrations', () => {
  it('treats data without a version as version 1 and migrates it to the latest', () => {
    const old = ready() as Partial<AppData>;
    delete old.schemaVersion;
    expect(normalize(old, TODAY).schemaVersion).toBe(1);
    expect(migrate(normalize(old, TODAY), TODAY).schemaVersion).toBe(SCHEMA_VERSION);
    expect(ready().schemaVersion).toBe(SCHEMA_VERSION); // fresh data starts at the latest version
  });

  it('runs each step once, in order, and is safe to run again', () => {
    const seen: string[] = [];
    const list: Migration[] = [
      { to: 3, name: 'b', run: (d) => (seen.push('b'), { ...d, xp: d.xp + 10 }) },
      { to: 2, name: 'a', run: (d) => (seen.push('a'), { ...d, xp: d.xp * 2 }) },
    ];
    const d = { ...ready(), schemaVersion: 1, xp: 5 };
    const once = migrate(d, TODAY, list, 3);
    expect(seen).toEqual(['a', 'b']);
    expect(once).toMatchObject({ xp: 20, schemaVersion: 3 });
    expect(migrate(once, TODAY, list, 3)).toEqual(once);
    expect(seen).toEqual(['a', 'b']);
  });

  it('refuses data saved by a newer app version (never overwrites it)', async () => {
    expect(() => migrate({ ...ready(), schemaVersion: 99 }, TODAY)).toThrow(/newer version/);
    const kv = withApp({ ...ready(), schemaVersion: 99 });
    const before = [...kv.store.entries()];
    const r = await loadApp(kv, TODAY);
    expect(r).toMatchObject({ kind: 'error', problem: 'unreadable' });
    expect([...kv.store.entries()]).toEqual(before);
  });

  it('old data gets a verified safety copy, then is migrated on load', async () => {
    const old = ready() as Partial<AppData>;
    delete old.schemaVersion;
    const kv = withApp(old);
    const r = await loadApp(kv, TODAY);
    expect(r.kind === 'ok' && r.data.schemaVersion).toBe(SCHEMA_VERSION);
    expect((await listSnapshots(kv)).map((s) => s.reason)).toEqual(['Before an app update']);
    expect(await kv.get(APP_KEY)).toEqual(old); // loading itself never overwrites the stored data
  });
});

describe('daily automatic backups', () => {
  it('makes one verified backup per day, without photos', async () => {
    const data = ready();
    const kv = withApp(data);
    kv.store.set(PHOTOS_KEY, JSON.stringify([photo]));
    expect(await dailyBackup(kv, data, TODAY, at(1))).toBe(true);
    expect(await dailyBackup(kv, data, TODAY, at(2))).toBe(false); // already done today
    const [only] = await listSnapshots(kv, DAILY_PREFIX);
    const saved = (await kv.get(only.id)) as { data: AppData; photos?: unknown };
    expect(saved.data).toEqual(data);
    expect(saved.photos).toBeUndefined();
  });

  it('keeps the newest 7 and never pushes out the safety copies', async () => {
    const data = ready();
    const kv = withApp(data);
    for (let i = 1; i <= 3; i++) await createSnapshot(kv, data, `safety ${i}`, at(i));
    for (let day = 1; day <= 9; day++) {
      const date = `2026-11-${String(day).padStart(2, '0')}`;
      await dailyBackup(kv, data, date, new Date(`${date}T08:00:00Z`));
    }
    expect((await listSnapshots(kv, DAILY_PREFIX)).map((s) => s.createdAt.slice(8, 10))).toEqual(['09', '08', '07', '06', '05', '04', '03']);
    expect(await listSnapshots(kv)).toHaveLength(3);
    expect(await listAllSnapshots(kv)).toHaveLength(10);
  });

  it('two backups started at the same moment make exactly one, without errors', async () => {
    const data = ready();
    const kv = withApp(data);
    const results = await Promise.all([dailyBackup(kv, data, TODAY, at(1)), dailyBackup(kv, data, TODAY, at(1))]);
    expect(results).toEqual([true, true]); // the second simply shares the first one's work
    expect(await listSnapshots(kv, DAILY_PREFIX)).toHaveLength(1);
    expect(await dailyBackup(kv, data, TODAY, at(2))).toBe(false);
  });

  it('a failed daily backup throws and leaves earlier backups alone', async () => {
    const data = ready();
    const kv = withApp(data);
    await dailyBackup(kv, data, '2026-11-04', at(1));
    const before = [...kv.store.entries()];
    kv.failPut = (k) => k.startsWith(DAILY_PREFIX);
    await expect(dailyBackup(kv, data, TODAY, at(2))).rejects.toThrow(/safety copy/);
    expect([...kv.store.entries()]).toEqual(before);
  });

  it('a daily backup can be restored like any safety copy', async () => {
    const original = ready();
    original.xp = 7;
    const kv = withApp(original);
    await dailyBackup(kv, original, TODAY, at(1));
    await saveData({ ...original, xp: 999 }, kv);
    const [daily] = await listSnapshots(kv, DAILY_PREFIX);
    await restoreSnapshot(kv, daily.id, TODAY);
    expect(((await kv.get(APP_KEY)) as AppData).xp).toBe(7);
  });
});
