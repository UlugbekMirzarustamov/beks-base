/**
 * Shown instead of the app when saved data can't be loaded. Nothing has been
 * changed or deleted at this point — every option here first keeps a copy of
 * what's stored, then restores, and reloads the app.
 */
import { useEffect, useState } from 'react';
import { todayUK } from '../lib/dates';
import { idb } from '../lib/db';
import { listSnapshots, openAnyway, restoreBackupText, restoreSnapshot, type SnapshotInfo } from '../lib/persist';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function Recovery({ problem, message, raw, onRetry }: { problem: 'storage' | 'unreadable'; message: string; raw?: unknown; onRetry: () => void }) {
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    listSnapshots(idb).then(setSnapshots, () => setSnapshots([]));
  }, []);

  /** Run a restore; reload on success, show the reason on failure (nothing changed). */
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setBusy(false);
    }
  };
  /** Restoring needs two taps, so it can't happen by accident. */
  const twoTap = (key: string, fn: () => Promise<void>) => {
    if (confirming !== key) {
      setConfirming(key);
      return;
    }
    setConfirming(null);
    void act(fn);
  };
  const downloadRaw = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(raw, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `beks-base-stored-data-${todayUK()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <main className="recovery" role="alert">
      <h1 className="recovery__title">Your base couldn't be opened</h1>
      <p>{message}</p>
      <p className="recovery__safe">
        <strong>Your saved data has not been changed or deleted.</strong> Nothing will be overwritten unless you choose an option below.
      </p>
      {error && <p className="alert alert--over">{error}</p>}

      <section className="recovery__box">
        <button type="button" className="btn btn--primary btn--wide" onClick={onRetry} disabled={busy}>
          Try again
        </button>
        {problem === 'storage' && <p className="muted small">Close other tabs with Bek's Base open, then try again. Restarting the phone can help too.</p>}
      </section>

      {snapshots.length > 0 && (
        <section className="recovery__box">
          <h2 className="recovery__h">Safety copies</h2>
          <ul className="recovery__list">
            {snapshots.map((s) => (
              <li key={s.id}>
                <span>
                  <strong>{when(s.createdAt)}</strong>
                  <small className="muted"> · {s.reason}</small>
                </span>
                <button type="button" className="btn btn--small" disabled={busy} onClick={() => twoTap(s.id, () => restoreSnapshot(idb, s.id, todayUK()))}>
                  {confirming === s.id ? 'Tap again to restore' : 'Restore'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="recovery__box">
        <h2 className="recovery__h">Restore a backup file</h2>
        <label className="btn btn--wide file-btn">
          Choose backup file (.json)
          <input
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) await act(async () => restoreBackupText(idb, await file.text(), todayUK()));
            }}
          />
        </label>
        <p className="muted small">An invalid file is rejected before anything changes.</p>
      </section>

      {raw !== undefined && (
        <section className="recovery__box">
          <h2 className="recovery__h">Other options</h2>
          <button type="button" className="btn btn--wide" onClick={downloadRaw} disabled={busy}>
            Download the stored data (to keep or get help)
          </button>
          <button type="button" className="btn btn--wide btn--danger" disabled={busy} onClick={() => twoTap('open', () => openAnyway(idb, raw, todayUK()))}>
            {confirming === 'open' ? 'Tap again: keep a copy, then repair and open' : 'Repair and open anyway'}
          </button>
          <p className="muted small">"Repair" keeps an untouched copy of the stored data first, then fixes what it can.</p>
        </section>
      )}
    </main>
  );
}
