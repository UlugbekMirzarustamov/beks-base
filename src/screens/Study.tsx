/**
 * 📚 STUDY: the focus timer and exam countdowns. That's all, on purpose.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { daysBetween, formatDay, startOfWeek } from '../lib/dates';
import { uid } from '../lib/id';
import type { Test } from '../lib/types';
import { useStore, useTimer } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Bar, Empty, Field, Panel, Tabs, useConfirm, useSubRoute } from '../ui/kit';

const TABS = ['timer', 'tests'] as const;
type Tab = (typeof TABS)[number];

/** Study, kept simple: the focus timer and exam dates. (Notes, topics, formulas, mistakes, mock exams,
 *  assignments and tools were removed at Bek's request; anything saved there is still in the data.) */
export default function Study({ sub }: { sub?: string }) {
  const [tab, setTab] = useSubRoute<Tab>('study', sub, TABS);
  return (
    <div className="screen">
      <h1 className="screen__title">
        <PixelIcon name="shelf" size={28} /> Study
      </h1>
      <Tabs<Tab>
        label="Study sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'timer', label: 'Focus timer', icon: 'clock' },
          { id: 'tests', label: 'Exams', icon: 'calendar' },
        ]}
      />
      {tab === 'timer' && <Timer />}
      {tab === 'tests' && <Tests />}
    </div>
  );
}

// ---------------------------------------------------------------- Tests
/** "18 days left", "TOMORROW", "TODAY!", "done" */
export function daysLeftLabel(days: number): string {
  if (days < 0) return 'done';
  if (days === 0) return 'TODAY!';
  if (days === 1) return 'tomorrow';
  return `${days} days left`;
}

function Tests() {
  const ask = useConfirm();
  const { data, update, today, toast } = useStore();
  const [editing, setEditing] = useState<Test | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('');
  const [room, setRoom] = useState('');

  const sorted = [...data.tests].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter((t) => t.date >= today);
  const past = sorted.filter((t) => t.date < today).reverse();

  const startEdit = (t: Test) => {
    setEditing(t);
    setName(t.name);
    setDate(t.date);
    setSubjectId(t.subjectId ?? '');
    setTime(t.time ?? '');
    setDuration(t.duration ? String(t.duration) : '');
    setRoom(t.room ?? '');
  };
  const clear = () => {
    setEditing(null);
    setName('');
    setDate('');
    setSubjectId('');
    setTime('');
    setDuration('');
    setRoom('');
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) {
      toast('Give the test a name and a date', 'error');
      return;
    }
    const mins = Math.round(Number(duration));
    update((d) => {
      const value = { name: name.trim(), date, subjectId: subjectId || null };
      // Time, length and room are optional: an empty box removes them.
      const extra = { ...(time ? { time } : {}), ...(mins > 0 ? { duration: mins } : {}), ...(room.trim() ? { room: room.trim() } : {}) };
      const t = editing && d.tests.find((x) => x.id === editing.id);
      if (t) {
        delete t.time;
        delete t.duration;
        delete t.room;
        Object.assign(t, value, extra);
      } else d.tests.push({ id: uid(), ...value, ...extra });
    });
    toast(editing ? 'Test updated' : 'Test added', 'pop');
    clear();
  };
  const remove = async (t: Test) => {
    if (!(await ask(`Delete "${t.name}"?`))) return;
    update((d) => {
      d.tests = d.tests.filter((x) => x.id !== t.id);
    });
    if (editing?.id === t.id) clear();
  };

  const row = (t: Test) => {
    const days = daysBetween(today, t.date);
    return (
      <li key={t.id} className={`test-row ${days < 0 ? 'is-past' : days <= 7 ? 'is-soon' : ''}`}>
        <div className="test-row__days">
          <span className="test-row__num">{days < 0 ? '✓' : days}</span>
          <span className="test-row__unit">{days < 0 ? 'done' : days === 1 ? 'day' : 'days'}</span>
        </div>
        <div className="test-row__info">
          <strong>{t.name}</strong>
          <small className="muted">
            {formatDay(t.date)}
            {t.time ? ` · ${t.time}${t.duration ? ` (${t.duration} min)` : ''}` : ''}
            {t.room ? ` · ${t.room}` : ''}
            {t.subjectId ? ` · ${data.subjects.find((s) => s.id === t.subjectId)?.name ?? ''}` : ''}
          </small>
        </div>
        <button type="button" className="icon-btn" onClick={() => startEdit(t)} aria-label={`Edit ${t.name}`}>
          <PixelIcon name="pencil" size={18} />
        </button>
        <button type="button" className="icon-btn" onClick={() => remove(t)} aria-label={`Delete ${t.name}`}>
          <PixelIcon name="trash" size={18} />
        </button>
      </li>
    );
  };

  return (
    <div className="grid grid--2">
      <Panel title="Countdowns" icon="calendar">
        {upcoming.length === 0 && <Empty>No tests coming up. Add one →</Empty>}
        <ul className="test-list">{upcoming.map(row)}</ul>
        {past.length > 0 && (
          <details className="details">
            <summary>Past tests ({past.length})</summary>
            <ul className="test-list">{past.map(row)}</ul>
          </details>
        )}
      </Panel>
      <Panel title={editing ? 'Edit test' : 'Add a test'} icon="plus">
        <form className="form" onSubmit={save}>
          <Field label="Test name">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Physics mid-term" />
          </Field>
          <div className="form__row">
            <Field label="Date" className="grow">
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Subject" className="grow">
              <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">—</option>
                {data.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="form__row">
            <Field label="Starts (optional)" className="grow">
              <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
            <Field label="Minutes" className="grow">
              <input className="input" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="120" />
            </Field>
          </div>
          <Field label="Room (optional)">
            <input className="input" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. Exam hall, seat 42" maxLength={60} />
          </Field>
          <div className="form__actions">
            {editing && (
              <button type="button" className="btn" onClick={clear}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn--primary grow">
              {editing ? 'Save changes' : 'Add test'}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- Pomodoro timer
const FOCUS_TIPS = ['Phone face down. You\'ve got this.', 'One thing at a time.', 'Stuck? Write the question down and ask it later.', 'Sip some water.'];

/** Big full-screen countdown: nothing else on screen while you study. Esc or "Exit" closes it. */
function FocusScreen({ onExit }: { onExit: () => void }) {
  const { data } = useStore();
  const { timer, secondsLeft, running, start, pause, skip } = useTimer();
  const ref = useRef<HTMLDivElement>(null);
  const total = (timer.mode === 'work' ? data.settings.pomodoroWork : data.settings.pomodoroBreak) * 60;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const subject = data.subjects.find((x) => x.id === timer.subjectId)?.name ?? 'Other';
  const [tip] = useState(() => FOCUS_TIPS[Math.floor(Math.random() * FOCUS_TIPS.length)]);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onExit();
    // Leaving the browser's own full screen (e.g. swipe/Esc) also closes this view.
    const onFullscreen = () => !document.fullscreenElement && onExit();
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFullscreen);
    // Keep the screen awake while studying (where the browser supports it).
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock
      ?.request('screen')
      .then((l) => (lock = l))
      .catch(() => {});
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFullscreen);
      lock?.release().catch(() => {});
    };
  }, [onExit]);

  return (
    <div ref={ref} className={`focus focus--${timer.mode}`} role="dialog" aria-modal="true" aria-label="Full-screen focus timer" tabIndex={-1}>
      <p className="focus__mode">{timer.mode === 'work' ? 'FOCUS' : 'BREAK'}</p>
      <p className="focus__subject">{timer.mode === 'work' ? subject : 'Stretch, breathe, look away from the screen'}</p>
      <p className="focus__time" role="timer" aria-live="off">
        {mm}:{ss}
      </p>
      <div className="focus__bar">
        <Bar value={total - secondsLeft} max={total} label="Time passed" color={timer.mode === 'work' ? 'var(--lantern)' : 'var(--sky)'} />
      </div>
      <div className="focus__actions">
        {running ? (
          <button type="button" className="btn grow" onClick={pause}>
            Pause
          </button>
        ) : (
          <button type="button" className="btn btn--primary grow" onClick={start}>
            {secondsLeft < total ? 'Resume' : timer.mode === 'work' ? 'Start focus' : 'Start break'}
          </button>
        )}
        <button type="button" className="btn" onClick={skip}>
          Skip
        </button>
        <button type="button" className="btn" onClick={onExit}>
          Exit full screen
        </button>
      </div>
      <p className="focus__tip">{tip}</p>
    </div>
  );
}

function Timer() {
  const { data, update, today } = useStore();
  const { timer, secondsLeft, running, start, pause, reset, skip, setSubject } = useTimer();
  const total = (timer.mode === 'work' ? data.settings.pomodoroWork : data.settings.pomodoroBreak) * 60;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const weekStart = startOfWeek(today);
  const stats = useMemo(() => {
    const week = data.studyLog.filter((s) => s.date >= weekStart && s.date <= today);
    const bySubject = data.subjects.map((s) => ({ name: s.name, minutes: week.filter((x) => x.subjectId === s.id).reduce((a, x) => a + x.minutes, 0) }));
    const other = week.filter((x) => !data.subjects.some((s) => s.id === x.subjectId)).reduce((a, x) => a + x.minutes, 0);
    if (other) bySubject.push({ name: 'Other', minutes: other });
    const todayMins = data.studyLog.filter((s) => s.date === today).reduce((a, x) => a + x.minutes, 0);
    return { bySubject, todayMins, weekMins: week.reduce((a, x) => a + x.minutes, 0) };
  }, [data.studyLog, data.subjects, weekStart, today]);
  const maxMins = Math.max(60, ...stats.bySubject.map((s) => s.minutes));

  const setLen = (key: 'pomodoroWork' | 'pomodoroBreak', v: number) =>
    update((d) => void (d.settings[key] = Math.min(120, Math.max(1, Math.round(v) || 1))));

  // Pressing Start opens the full-screen focus view (and real browser full screen where allowed).
  const [focusOpen, setFocusOpen] = useState(false);
  const openFocus = () => {
    setFocusOpen(true);
    document.documentElement.requestFullscreen?.().catch(() => {
      /* not allowed (e.g. iPhone) — the in-app full-screen view still covers everything */
    });
  };
  const closeFocus = useCallback(() => {
    setFocusOpen(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);
  const startFocus = () => {
    start();
    openFocus();
  };

  return (
    <div className="grid grid--2">
      {focusOpen && <FocusScreen onExit={closeFocus} />}
      <Panel title="Pomodoro" icon="clock" className={`timer timer--${timer.mode}`}>
        <p className="timer__mode">{timer.mode === 'work' ? 'FOCUS' : 'BREAK'}</p>
        <p className="timer__time" role="timer" aria-live="off">
          {mm}:{ss}
        </p>
        <Bar value={total - secondsLeft} max={total} label="Time passed" color={timer.mode === 'work' ? 'var(--lantern)' : 'var(--sky)'} />
        <Field label="Studying">
          <select className="input" value={timer.subjectId ?? ''} onChange={(e) => setSubject(e.target.value || null)} disabled={running}>
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="">Other</option>
          </select>
        </Field>
        <div className="form__actions">
          {running ? (
            <>
              <button type="button" className="btn grow" onClick={pause}>
                Pause
              </button>
              <button type="button" className="btn btn--primary" onClick={openFocus}>
                Full screen
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--primary grow" onClick={startFocus}>
              {secondsLeft < total ? 'Resume' : 'Start'}
            </button>
          )}
          <button type="button" className="btn" onClick={reset}>
            Reset
          </button>
          <button type="button" className="btn" onClick={skip}>
            Skip
          </button>
        </div>
        <div className="form__row">
          <Field label="Focus (min)" className="grow">
            <input className="input" type="number" min={1} max={120} value={data.settings.pomodoroWork} onChange={(e) => setLen('pomodoroWork', Number(e.target.value))} />
          </Field>
          <Field label="Break (min)" className="grow">
            <input className="input" type="number" min={1} max={60} value={data.settings.pomodoroBreak} onChange={(e) => setLen('pomodoroBreak', Number(e.target.value))} />
          </Field>
        </div>
        <p className="muted small">Finishing a focus round logs the minutes. The timer keeps running on other screens.</p>
      </Panel>
      <Panel title="Study minutes" icon="star">
        <p className="big-number big-number--small">{stats.todayMins} min today</p>
        <p className="muted">{stats.weekMins} min this week (since Monday)</p>
        <ul className="cat-bars">
          {stats.bySubject.map((s) => (
            <li key={s.name} className="cat-bar">
              <div className="cat-bar__row">
                <span className="cat-bar__name">{s.name}</span>
                <span className="cat-bar__nums">{s.minutes} min</span>
              </div>
              <Bar value={s.minutes} max={maxMins} label={`${s.name} minutes this week`} color="var(--grass)" />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
