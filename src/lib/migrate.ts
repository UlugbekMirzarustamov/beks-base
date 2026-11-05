/**
 * Numbered schema migrations.
 *
 * `data.schemaVersion` says which shape the data is in (old data without it = 1).
 * Each migration moves it up exactly one version, in order, and is a pure function
 * (AppData in → AppData out), so it's easy to test. It runs inside `upgrade()`,
 * which runs on load only after `loadApp` has taken a verified safety copy.
 *
 * To change the data shape:
 *   1. bump SCHEMA_VERSION,
 *   2. add `{ to: <new version>, name, run }` to MIGRATIONS,
 *   3. add a test in persist.test.ts that migrates real-looking old data.
 * Never edit a migration that has already shipped — add a new one instead.
 */
import type { AppData } from './types';

export const SCHEMA_VERSION = 2;

export interface Migration {
  /** The version the data has AFTER this migration. */
  to: number;
  name: string;
  run: (d: AppData, today: string) => AppData;
}

export const MIGRATIONS: Migration[] = [
  // Baseline: start recording the schema version. Changes nothing else.
  { to: 2, name: 'Record the schema version', run: (d) => d },
];

/** Bring data up to `latest`, one numbered step at a time. Refuses data from a newer app version. */
export function migrate(d: AppData, today: string, list: Migration[] = MIGRATIONS, latest = SCHEMA_VERSION): AppData {
  const from = d.schemaVersion ?? 1;
  if (from > latest) {
    throw new Error(`This data was saved by a newer version of Bek's Base (data version ${from}, this app understands up to ${latest}). Reload the app to get the latest version`);
  }
  let out = d;
  for (const m of [...list].sort((a, b) => a.to - b.to)) {
    if (m.to > (out.schemaVersion ?? 1) && m.to <= latest) out = { ...m.run(out, today), schemaVersion: m.to };
  }
  return out;
}
