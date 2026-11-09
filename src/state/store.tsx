/**
 * The app's "brain": holds all data, saves it automatically, and offers helpers
 * (update data, give XP, show toasts, run the Pomodoro timer).
 *
 * Any component can do:
 *   const { data, update, gainXp, toast } = useStore();
 *   update((d) => { d.tasks.push(newTask); });
 *
 * `update` gives you a COPY of the data to change freely; React then re-draws
 * and the copy is saved to IndexedDB a moment later.
 *
 * Data safety (see lib/persist.ts):
 *  - Nothing is saved until your data has loaded AND passed its checks. If it
 *    can't be loaded, the recovery screen shows instead and nothing is overwritten.
 *  - A failed save shows a red banner with "Try again" — never a silent failure.
 *  - `replaceAll` (import, reset, £→$) first makes a checked safety copy, and
 *    changes nothing if that fails.
 *  - Once a day, a verified automatic backup is made (lib/persist.ts `dailyBackup`).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { todayUK } from '../lib/dates';
import { idb, readLegacyCopy, requestPersistentStorage, saveData } from '../lib/db';
import { dailyBackup, loadApp, restoreSnapshot as restoreSnapshotIn, safeReplace } from '../lib/persist';
import { Recovery } from '../ui/Recovery';
import { uid } from '../lib/id';
import { applyRecurring, formatMoney } from '../lib/money';
import { createInitialData } from '../lib/seed';
import { newlyEarned } from '../lib/badges';
import { unlocksAtLevel } from '../lib/cabin';
import { buzz, playChime, sfx } from '../lib/sound';
import type { AppData, Expense } from '../lib/types';
import { levelInfo, XP } from '../lib/xp';

export type ToastKind = 'pop' | 'xp' | 'level' | 'warn' | 'error' | 'info';
export interface Toast {
  id: string;
  text: string;
  kind: ToastKind;
}

interface StoreValue {
  data: AppData;
  /** Today in the UK, refreshed every 30 seconds (so midnight is noticed). */
  today: string;
  update: (change: (draft: AppData) => void) => void;
  /**
   * Replace ALL data (import, reset, £→$). Makes a checked safety copy first and
   * saves before showing anything. Resolves false (nothing changed) if either fails.
   */
  replaceAll: (data: AppData, reason: string) => Promise<boolean>;
  /** Put a safety copy back, then reload the app. */
  restoreSnapshot: (id: string) => Promise<void>;
  gainXp: (amount: number, reason?: string) => void;
  toast: (text: string, kind?: ToastKind) => void;
  toasts: Toast[];
  /** Open the "add/edit purchase" sheet from anywhere (e.g. the big + button). */
  expenseSheet: { open: boolean; editing: Expense | null };
  openExpense: (editing?: Expense | null) => void;
  closeExpense: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside <StoreProvider>');
  return value;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [today, setToday] = useState(() => todayUK());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [expenseSheet, setExpenseSheet] = useState<StoreValue['expenseSheet']>({ open: false, editing: null });
  const dataRef = useRef<AppData | null>(null);
  dataRef.current = data;
  const [failure, setFailure] = useState<{ problem: 'storage' | 'unreadable'; message: string; raw?: unknown } | null>(null);
  const [saveError, setSaveError] = useState<{ text: string; photos?: boolean } | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  /** Saving is allowed only after a successful load, and is paused while all data is being replaced. */
  const canSave = useRef(false);
  const paused = useRef(false);
  /** Bumped by replaceAll, so a save that was scheduled before it can't write the old data afterwards. */
  const generation = useRef(0);

  // ----- Load once on start (first launch: starter kit + timetable). -----
  const load = useCallback(async () => {
    setFailure(null);
    const today = todayUK();
    const r = await loadApp(idb, today, { legacy: readLegacyCopy });
    if (r.kind === 'error') {
      setFailure(r); // stored data is left exactly as it is
      return;
    }
    canSave.current = true;
    setData(r.kind === 'fresh' ? createInitialData(today) : r.data);
    if (r.kind === 'ok' && r.warning) setWarning(r.warning);
    // Once a day: an automatic, verified backup of the data that just loaded (newest 7 kept).
    if (r.kind === 'ok') {
      dailyBackup(idb, r.data, today).catch((e: unknown) =>
        setWarning(`Today's automatic backup couldn't be made (${e instanceof Error ? e.message : 'storage error'}). Your data is still saved; consider exporting a backup.`),
      );
    }
  }, []);
  useEffect(() => {
    void load();
    requestPersistentStorage();
  }, [load]);

  /** Save, and show the red banner if it fails (cleared by the next good save). */
  const save = useCallback((d: AppData, gen: number) => {
    if (!canSave.current || paused.current || gen !== generation.current) return;
    saveData(d).then(
      () => setSaveError((err) => (err?.photos ? err : null)), // a good save clears its own error, not a photo one
      (e: unknown) => setSaveError({ text: e instanceof Error ? e.message : 'Unknown storage error' }),
    );
  }, []);

  // ----- Save automatically, shortly after every change -----
  useEffect(() => {
    if (!data) return;
    const gen = generation.current;
    const timer = setTimeout(() => save(data, gen), 250);
    return () => clearTimeout(timer);
  }, [data, save]);

  // Photos are saved separately (screens/Photos.tsx); their failures show the same banner.
  useEffect(() => {
    const onPhotoError = (e: Event) => setSaveError({ text: (e as CustomEvent<string>).detail, photos: true });
    window.addEventListener('beks:save-error', onPhotoError);
    return () => window.removeEventListener('beks:save-error', onPhotoError);
  }, []);

  // Save immediately if the app is being closed / hidden (phones kill background tabs).
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden' && dataRef.current) save(dataRef.current, generation.current);
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, [save]);

  // ----- Keep "today" fresh -----
  useEffect(() => {
    const tick = () => setToday(todayUK());
    const id = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  const toast = useCallback((text: string, kind: ToastKind = 'info') => {
    // Each kind of pop-up has its own little sound (if "Little sounds" is on).
    const sound = ({ pop: 'pop', xp: 'chime', level: 'levelup' } as const)[kind as 'pop' | 'xp' | 'level'];
    if (sound) sfx(sound);
    const id = uid();
    setToasts((list) => [...list.slice(-3), { id, text, kind }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), kind === 'error' ? 5000 : 2600);
  }, []);

  const replaceAll = useCallback(
    async (next: AppData, reason: string) => {
      const current = dataRef.current;
      if (!current) return false;
      paused.current = true;
      generation.current++;
      try {
        await safeReplace(idb, current, next, reason);
        dataRef.current = next;
        setData(next);
        setSaveError((err) => (err?.photos ? err : null));
        return true;
      } catch (e) {
        toast(`Nothing was changed: ${e instanceof Error ? e.message : 'storage error'}`, 'error');
        return false;
      } finally {
        paused.current = false;
      }
    },
    [toast],
  );

  const restoreSnapshot = useCallback(
    async (id: string) => {
      paused.current = true; // stays paused: the page reloads with the restored data
      try {
        await restoreSnapshotIn(idb, id, todayUK());
        location.reload();
      } catch (e) {
        paused.current = false;
        toast(`Couldn't restore: ${e instanceof Error ? e.message : 'storage error'}`, 'error');
      }
    },
    [toast],
  );

  // ----- New day: add recurring bills, start fresh top-3 -----
  const loaded = data !== null;
  const lastDayChecked = useRef('');
  useEffect(() => {
    const current = dataRef.current;
    // The ref guard makes sure this runs once per day (React may run effects twice in development).
    if (!current || lastDayChecked.current === today) return;
    lastDayChecked.current = today;
    const r = applyRecurring(current.recurring, current.expenses, today, uid);
    const newDay = current.priorities.date !== today;
    if (!r.added.length && !newDay) return;
    setData((prev) =>
      prev && {
        ...prev,
        recurring: r.bills,
        expenses: r.expenses,
        dayGoals: newDay && !prev.priorities.example && prev.priorities.items.some((t) => t.trim()) ? { ...prev.dayGoals, [prev.priorities.date]: { items: prev.priorities.items, done: prev.priorities.done } } : prev.dayGoals,
        priorities: newDay ? { date: today, items: ['', '', ''], done: [false, false, false] } : prev.priorities,
      },
    );
    for (const e of r.added) toast(`Bill added: ${e.note} ${formatMoney(e.amount)}`, 'info');
  }, [today, loaded, toast]);

  // ----- Badges: award any that were just earned (and celebrate, max 3 pop-ups at once) -----
  useEffect(() => {
    if (!data) return;
    const fresh = newlyEarned(data, today);
    if (!fresh.length) return;
    setData((prev) => prev && { ...prev, badges: { ...prev.badges, ...Object.fromEntries(fresh.map((b) => [b.id, today])) } });
    fresh.slice(0, 3).forEach((b) => toast(`Badge earned: ${b.name}!`, 'level'));
    if (fresh.length > 3) toast(`…and ${fresh.length - 3} more badges! (More → Badges)`, 'level');
  }, [data, today, toast]);

  const update = useCallback((change: (draft: AppData) => void) => {
    setData((prev) => {
      if (!prev) return prev;
      const draft = structuredClone(prev);
      change(draft);
      return draft;
    });
  }, []);

  const gainXp = useCallback(
    (amount: number, reason?: string) => {
      const before = dataRef.current?.xp ?? 0;
      const after = Math.max(0, before + amount);
      setData((prev) => (prev ? { ...prev, xp: Math.max(0, prev.xp + amount) } : prev));
      if (amount > 0) {
        toast(`+${amount} XP${reason ? ' · ' + reason : ''}`, 'xp');
        const newLevel = levelInfo(after).level;
        if (newLevel > levelInfo(before).level) {
          toast(`LEVEL UP! You are now level ${newLevel}`, 'level');
          for (const u of unlocksAtLevel(newLevel)) toast(`New in your cabin: ${u.name}!`, 'level');
        }
      }
    },
    [toast],
  );

  const value = useMemo<StoreValue | null>(
    () =>
      data && {
        data,
        today,
        update,
        replaceAll,
        restoreSnapshot,
        gainXp,
        toast,
        toasts,
        expenseSheet,
        openExpense: (editing = null) => setExpenseSheet({ open: true, editing }),
        closeExpense: () => setExpenseSheet({ open: false, editing: null }),
      },
    [data, today, update, replaceAll, restoreSnapshot, gainXp, toast, toasts, expenseSheet],
  );

  if (failure) return <Recovery problem={failure.problem} message={failure.message} raw={failure.raw} onRetry={() => void load()} />;
  if (!value) {
    return (
      <div className="splash" role="status">
        <p className="pixel-title">Loading your base…</p>
      </div>
    );
  }
  return (
    <StoreContext.Provider value={value}>
      {saveError && (
        <div className="save-banner save-banner--error" role="alert">
          <span>
            <strong>Not saved!</strong> {saveError.text}.{saveError.photos ? '' : " Your latest changes are only in this open app. Don't close it."}
          </span>
          {saveError.photos ? (
            <button type="button" className="btn btn--small" onClick={() => setSaveError(null)}>
              OK
            </button>
          ) : (
            <button type="button" className="btn btn--small" onClick={() => dataRef.current && save(dataRef.current, generation.current)}>
              Try again
            </button>
          )}
        </div>
      )}
      {warning && (
        <div className="save-banner" role="status">
          <span>{warning}</span>
          <button type="button" className="btn btn--small" onClick={() => setWarning(null)}>
            OK
          </button>
        </div>
      )}
      <TimerProvider>{children}</TimerProvider>
    </StoreContext.Provider>
  );
}

/* =========================================================================
 * Pomodoro timer. Lives here (not in the Study screen) so it keeps running
 * while you look at other screens. Uses an "ends at" timestamp, so it stays
 * correct even if the phone sleeps. Saved in localStorage so a refresh keeps it.
 * ========================================================================= */
export interface TimerState {
  mode: 'work' | 'break';
  /** When running: the time (ms) it ends. When paused: null. */
  endsAt: number | null;
  /** Seconds left while paused. */
  remaining: number;
  subjectId: string | null;
}

interface TimerValue {
  timer: TimerState;
  /** Seconds left right now. */
  secondsLeft: number;
  running: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setSubject: (id: string | null) => void;
}

const TimerContext = createContext<TimerValue | null>(null);
export function useTimer(): TimerValue {
  const value = useContext(TimerContext);
  if (!value) throw new Error('useTimer must be used inside <TimerProvider>');
  return value;
}

const TIMER_KEY = 'ulus-timer';

function TimerProvider({ children }: { children: ReactNode }) {
  const { data, update, gainXp, toast, today } = useStore();
  const workSecs = data.settings.pomodoroWork * 60;
  const breakSecs = data.settings.pomodoroBreak * 60;

  const [timer, setTimer] = useState<TimerState>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(TIMER_KEY) ?? 'null') as TimerState | null;
      if (saved && (saved.mode === 'work' || saved.mode === 'break')) return saved;
    } catch {
      /* ignore a broken saved timer */
    }
    return { mode: 'work', endsAt: null, remaining: workSecs, subjectId: 'physics' };
  });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    try {
      localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
    } catch {
      /* storage blocked — the timer just won't survive a refresh */
    }
  }, [timer]);

  // When the work/break length is changed in settings, a paused timer picks up the new length.
  const lengths = useRef(`${workSecs}/${breakSecs}`);
  useEffect(() => {
    if (lengths.current === `${workSecs}/${breakSecs}`) return; // unchanged (e.g. first render)
    lengths.current = `${workSecs}/${breakSecs}`;
    setTimer((t) => (t.endsAt !== null ? t : { ...t, remaining: t.mode === 'work' ? workSecs : breakSecs }));
  }, [workSecs, breakSecs]);

  const running = timer.endsAt !== null;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [running]);

  const secondsLeft = running ? Math.max(0, Math.ceil((timer.endsAt! - now) / 1000)) : timer.remaining;

  // Phase finished?
  useEffect(() => {
    if (!running || secondsLeft > 0) return;
    playChime();
    buzz(200);
    if (timer.mode === 'work') {
      const minutes = data.settings.pomodoroWork;
      update((d) => {
        d.studyLog.push({ id: uid(), subjectId: timer.subjectId, minutes, date: today });
      });
      gainXp(XP.pomodoro, `${minutes} min studied`);
      setTimeout(() => sfx('kettle'), 900); // time to put the kettle on
      setTimer((t) => ({ ...t, mode: 'break', endsAt: null, remaining: breakSecs }));
    } else {
      toast('Break over — ready for another round?', 'info');
      setTimer((t) => ({ ...t, mode: 'work', endsAt: null, remaining: workSecs }));
    }
  }, [running, secondsLeft, timer.mode, timer.subjectId, data.settings.pomodoroWork, update, gainXp, toast, today, workSecs, breakSecs]);

  // Show the countdown in the browser tab title.
  useEffect(() => {
    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const ss = String(secondsLeft % 60).padStart(2, '0');
    document.title = running ? `${mm}:${ss} ${timer.mode === 'work' ? 'Study' : 'Break'} · Bek's Base` : "Bek's Base";
  }, [running, secondsLeft, timer.mode]);

  const value: TimerValue = {
    timer,
    secondsLeft,
    running,
    start: () => {
      setNow(Date.now());
      setTimer((t) => ({ ...t, endsAt: Date.now() + t.remaining * 1000 }));
    },
    pause: () => setTimer((t) => ({ ...t, endsAt: null, remaining: secondsLeft })),
    reset: () => setTimer((t) => ({ ...t, endsAt: null, remaining: t.mode === 'work' ? workSecs : breakSecs })),
    skip: () =>
      setTimer((t) => ({ ...t, mode: t.mode === 'work' ? 'break' : 'work', endsAt: null, remaining: t.mode === 'work' ? breakSecs : workSecs })),
    setSubject: (subjectId) => setTimer((t) => ({ ...t, subjectId })),
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}
