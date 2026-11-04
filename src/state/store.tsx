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
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { normalize } from '../lib/backup';
import { todayUK } from '../lib/dates';
import { loadData, requestPersistentStorage, saveData } from '../lib/db';
import { uid } from '../lib/id';
import { applyRecurring, formatGBP } from '../lib/money';
import { createInitialData, upgrade } from '../lib/seed';
import { playChime } from '../lib/sound';
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
  replaceAll: (data: AppData) => void;
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

  // ----- Load once on start (first launch: starter kit + timetable). `upgrade` tidies older saved data. -----
  useEffect(() => {
    loadData()
      .then((saved) => setData(saved ? upgrade(normalize(saved as Partial<AppData>, todayUK()), todayUK()) : createInitialData(todayUK())))
      .catch(() => setData(createInitialData(todayUK())));
    requestPersistentStorage();
  }, []);

  // ----- Save automatically, shortly after every change -----
  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(() => saveData(data), 250);
    return () => clearTimeout(timer);
  }, [data]);

  // Save immediately if the app is being closed / hidden (phones kill background tabs).
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden' && dataRef.current) saveData(dataRef.current);
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

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
    const id = uid();
    setToasts((list) => [...list.slice(-3), { id, text, kind }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), kind === 'error' ? 5000 : 2600);
  }, []);

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
        priorities: newDay ? { date: today, items: ['', '', ''], done: [false, false, false] } : prev.priorities,
      },
    );
    for (const e of r.added) toast(`Bill added: ${e.note} ${formatGBP(e.amount)}`, 'info');
  }, [today, loaded, toast]);

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
        if (levelInfo(after).level > levelInfo(before).level) toast(`LEVEL UP! You are now level ${levelInfo(after).level}`, 'level');
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
        replaceAll: (d: AppData) => setData(d),
        gainXp,
        toast,
        toasts,
        expenseSheet,
        openExpense: (editing = null) => setExpenseSheet({ open: true, editing }),
        closeExpense: () => setExpenseSheet({ open: false, editing: null }),
      },
    [data, today, update, gainXp, toast, toasts, expenseSheet],
  );

  if (!value) {
    return (
      <div className="splash" role="status">
        <p className="pixel-title">Loading your base…</p>
      </div>
    );
  }
  return (
    <StoreContext.Provider value={value}>
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
    navigator.vibrate?.(200);
    if (timer.mode === 'work') {
      const minutes = data.settings.pomodoroWork;
      update((d) => {
        d.studyLog.push({ id: uid(), subjectId: timer.subjectId, minutes, date: today });
      });
      gainXp(XP.pomodoro, `${minutes} min studied`);
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
