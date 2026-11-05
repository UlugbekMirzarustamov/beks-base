/**
 * 🗓️ PLANNER — "the Crafting table".
 * Tabs: Today (top 3 + tasks) · Calendar (day/week/month, everything dated) · Week (time blocks) · Timetable · Admin
 */
import { lazy, Suspense, useState, type FormEvent } from 'react';
import { occursOn } from '../lib/calendar';
import { InboxPanel } from './Capture';
import { addDays, daysBetween, formatDay, fromMinutes, relativeDays, startOfWeek, toMinutes, weekdayOf, WEEKDAYS, WEEKDAYS_LONG } from '../lib/dates';
import { uid } from '../lib/id';
import type { AppData, Task, Weekday } from '../lib/types';
import { XP } from '../lib/xp';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Empty, Field, Panel, Segmented, Tabs, useConfirm, useSubRoute } from '../ui/kit';

const TABS = ['today', 'calendar', 'week', 'timetable', 'admin'] as const;
// The calendar loads on first open (it's prefetched for offline use in App.tsx).
const CalendarTab = lazy(() => import('./Calendar'));
const AdminTab = lazy(() => import('./Admin'));
type Tab = (typeof TABS)[number];

export default function Planner({ sub }: { sub?: string }) {
  const [tab, setTab] = useSubRoute<Tab>('planner', sub, TABS);
  return (
    <div className="screen">
      <h1 className="screen__title">
        <PixelIcon name="table" size={28} /> The Crafting Table
      </h1>
      <Tabs<Tab>
        label="Planner sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'today', label: 'Today', icon: 'check' },
          { id: 'calendar', label: 'Calendar', icon: 'calendar' },
          { id: 'week', label: 'Week plan', icon: 'clock' },
          { id: 'timetable', label: 'Timetable', icon: 'clock' },
          { id: 'admin', label: 'Admin', icon: 'scroll' },
        ]}
      />
      {tab === 'today' && (
        <div className="grid grid--2">
          <Panel title="Today's top 3" icon="star">
            <TopThree editable />
          </Panel>
          <Tasks />
          <InboxPanel />
        </div>
      )}
      {tab === 'calendar' && (
        <Suspense fallback={<p className="muted center">Opening…</p>}>
          <CalendarTab />
        </Suspense>
      )}
      {tab === 'week' && <Week />}
      {tab === 'timetable' && <Timetable />}
      {tab === 'admin' && (
        <Suspense fallback={<p className="muted center">Opening…</p>}>
          <AdminTab />
        </Suspense>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Top 3 priorities
/** Today's three most important things. Used here and on Home. */
export function TopThree({ editable = false }: { editable?: boolean }) {
  const { data, update, gainXp } = useStore();
  const p = data.priorities;

  const toggle = (i: number) => {
    const done = !p.done[i];
    update((d) => {
      d.priorities.done[i] = done;
    });
    gainXp(done ? XP.priority : -XP.priority, done ? 'priority done' : undefined);
  };

  if (!editable && p.items.every((x) => !x.trim())) {
    return (
      <Empty>
        No priorities yet. <a href="#/planner/today">Pick your top 3 →</a>
      </Empty>
    );
  }
  return (
    <ol className="top3">
      {p.items.map((item, i) =>
        !editable && !item.trim() ? null : (
          <li key={i} className={`top3__item ${p.done[i] ? 'is-done' : ''}`}>
            <span className="top3__num" aria-hidden="true">
              {i + 1}
            </span>
            <input
              type="checkbox"
              className="pixel-check"
              checked={p.done[i]}
              disabled={!item.trim()}
              onChange={() => toggle(i)}
              aria-label={`Done: ${item || `priority ${i + 1}`}`}
            />
            {editable ? (
              <input
                className="input grow"
                aria-label={`Priority ${i + 1}`}
                placeholder={['Most important thing…', 'Second thing…', 'Third thing…'][i]}
                value={item}
                onChange={(e) =>
                  update((d) => {
                    d.priorities.items[i] = e.target.value;
                  })
                }
              />
            ) : (
              <span className="grow">{item}</span>
            )}
          </li>
        ),
      )}
    </ol>
  );
}

// ---------------------------------------------------------------- Tasks
/** Tick / untick a task (gives or takes back XP so it can't be farmed). */
export function useToggleTask() {
  const { update, gainXp } = useStore();
  return (t: Task) => {
    update((d) => {
      const item = d.tasks.find((x) => x.id === t.id);
      if (item) item.done = !t.done;
    });
    gainXp(t.done ? -XP.task : XP.task, t.done ? undefined : 'task done');
  };
}

export function TaskRow({ task }: { task: Task }) {
  const ask = useConfirm();
  const { today, update } = useStore();
  const toggle = useToggleTask();
  const days = task.due ? daysBetween(today, task.due) : null;
  const remove = async () => {
    if (!(await ask(`Delete "${task.title}"?`))) return;
    update((d) => {
      d.tasks = d.tasks.filter((x) => x.id !== task.id);
    });
  };
  return (
    <li className={`task ${task.done ? 'is-done' : ''} ${days !== null && days < 0 && !task.done ? 'is-overdue' : ''}`}>
      <input type="checkbox" className="pixel-check" checked={task.done} onChange={() => toggle(task)} aria-label={`Done: ${task.title}`} />
      <span className="task__title grow">{task.title}</span>
      {task.due && <span className={`task__due ${days !== null && days <= 1 ? 'is-soon' : ''}`}>{days !== null && days < 0 && !task.done ? `overdue ${-days}d` : relativeDays(days ?? 0)}</span>}
      <button type="button" className="icon-btn" onClick={remove} aria-label={`Delete ${task.title}`}>
        <PixelIcon name="trash" size={16} />
      </button>
    </li>
  );
}

const byDue = (a: Task, b: Task) => (a.due ?? '9999').localeCompare(b.due ?? '9999');

function Tasks() {
  const ask = useConfirm();
  const { data, update, toast } = useStore();
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const open = data.tasks.filter((t) => !t.done).sort(byDue);
  const done = data.tasks.filter((t) => t.done);

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    update((d) => {
      d.tasks.push({ id: uid(), title: title.trim(), due: due || null, done: false });
    });
    toast('Task added', 'pop');
    setTitle('');
    setDue('');
  };
  const clearDone = async () => {
    if (!(await ask(`Remove ${done.length} finished task(s)?`, { ok: 'Remove' }))) return;
    update((d) => {
      d.tasks = d.tasks.filter((t) => !t.done);
    });
  };

  return (
    <Panel title="Tasks" icon="check">
      <form className="form" onSubmit={add}>
        <div className="form__row form__row--wrap">
          <input className="input grow" aria-label="New task" placeholder="Add a task…" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="input" type="date" aria-label="Deadline (optional)" value={due} onChange={(e) => setDue(e.target.value)} />
          <button type="submit" className="btn btn--primary">
            Add
          </button>
        </div>
      </form>
      {open.length === 0 && <Empty>All done! Time for a cup of tea.</Empty>}
      <ul className="tasks">
        {open.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
      </ul>
      {done.length > 0 && (
        <details className="details">
          <summary>Done ({done.length})</summary>
          <ul className="tasks">
            {done.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
          <button type="button" className="btn btn--small" onClick={clearDone}>
            Clear finished
          </button>
        </details>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------- Week view
const DAY_START = 8 * 60; // 08:00
const DAY_END = 22 * 60; // 22:00
const pct = (mins: number) => ((Math.min(DAY_END, Math.max(DAY_START, mins)) - DAY_START) / (DAY_END - DAY_START)) * 100;

interface Block {
  id: string;
  start: number;
  end: number;
  title: string;
  sub?: string;
  kind: 'class' | 'study' | 'free';
}

/** Gaps of 30+ minutes between busy blocks (08:00–22:00) = your free time. */
function freeGaps(busy: Block[]): Block[] {
  const sorted = [...busy].sort((a, b) => a.start - b.start);
  const gaps: Block[] = [];
  let cursor = DAY_START;
  for (const b of sorted) {
    if (b.start - cursor >= 30) gaps.push({ id: `free-${cursor}`, start: cursor, end: b.start, title: 'Free', kind: 'free' });
    cursor = Math.max(cursor, b.end);
  }
  if (DAY_END - cursor >= 30) gaps.push({ id: `free-${cursor}`, start: cursor, end: DAY_END, title: 'Free', kind: 'free' });
  return gaps;
}

const duration = (mins: number) => (mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins}m`);

function Week() {
  const ask = useConfirm();
  const { data, today, update, toast } = useStore();
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const [selected, setSelected] = useState(weekdayOf(today));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [form, setForm] = useState({ date: '', start: '16:00', end: '17:00', title: '' });

  const addBlock = (e: FormEvent) => {
    e.preventDefault();
    const date = form.date || days[selected];
    if (toMinutes(form.end) <= toMinutes(form.start)) {
      toast('End time must be after start time', 'error');
      return;
    }
    update((d) => {
      d.studyBlocks.push({ id: uid(), date, start: form.start, end: form.end, title: form.title.trim() || 'Study' });
    });
    toast('Study block added', 'pop');
    setForm({ ...form, title: '' });
  };
  const removeBlock = async (id: string, title: string) => {
    if (!(await ask(`Delete study block "${title}"?`))) return;
    update((d) => {
      d.studyBlocks = d.studyBlocks.filter((b) => b.id !== id);
    });
  };

  return (
    <>
      <Panel
        title="Your week"
        icon="calendar"
        actions={
          <div className="month-picker">
            <button type="button" className="btn btn--small" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
              <PixelIcon name="arrowL" size={16} />
            </button>
            <button type="button" className="btn btn--small" onClick={() => setWeekStart(startOfWeek(today))}>
              This week
            </button>
            <button type="button" className="btn btn--small" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">
              <PixelIcon name="arrowR" size={16} />
            </button>
          </div>
        }
      >
        <div className="day-chips" role="group" aria-label="Choose a day">
          {days.map((d, i) => (
            <button key={d} type="button" className={`day-chip ${d === today ? 'is-today' : ''}`} aria-pressed={i === selected} onClick={() => setSelected(i as Weekday)}>
              <span>{WEEKDAYS[i]}</span>
              <strong>{Number(d.slice(8))}</strong>
            </button>
          ))}
        </div>
        <div className="legend" aria-hidden="true">
          <span className="legend__item legend__item--class">Class</span>
          <span className="legend__item legend__item--study">Study</span>
          <span className="legend__item legend__item--free">Free</span>
          <span className="legend__item legend__item--due">Deadline</span>
        </div>
        <div className="week">
          <div className="week__hours" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => DAY_START + i * 120).map((m) => (
              <span key={m} style={{ top: `${pct(m)}%` }}>
                {fromMinutes(m)}
              </span>
            ))}
          </div>
          {days.map((date, i) => {
            const classes: Block[] = classesOn(data, date).map((c) => ({
              id: c.id,
              start: toMinutes(c.start),
              end: toMinutes(c.end),
              title: c.name,
              sub: c.room,
              kind: 'class',
            }));
            const study: Block[] = data.studyBlocks
              .filter((b) => b.date === date)
              .map((b) => ({ id: b.id, start: toMinutes(b.start), end: toMinutes(b.end), title: b.title, kind: 'study' }));
            const blocks = [...freeGaps([...classes, ...study]), ...classes, ...study];
            const deadlines = [
              ...data.tasks.filter((t) => t.due === date && !t.done).map((t) => ({ id: t.id, text: t.title })),
              ...data.tests.filter((t) => t.date === date).map((t) => ({ id: t.id, text: `TEST: ${t.name}` })),
            ];
            return (
              <section key={date} className={`week__day ${i === selected ? 'is-selected' : ''} ${date === today ? 'is-today' : ''}`} aria-label={`${WEEKDAYS_LONG[i]} ${formatDay(date)}`}>
                <h3 className="week__head">{formatDay(date)}</h3>
                <ul className="week__due">
                  {deadlines.map((dl) => (
                    <li key={dl.id}>{dl.text}</li>
                  ))}
                </ul>
                <div className="week__track">
                  {blocks.map((b) => {
                    const style = { top: `${pct(b.start)}%`, height: `${pct(b.end) - pct(b.start)}%` };
                    const text = (
                      <>
                        <strong>{b.kind === 'free' ? `Free ${duration(b.end - b.start)}` : b.title}</strong>
                        <small>
                          {fromMinutes(b.start)}–{fromMinutes(b.end)}
                          {b.sub ? ` · ${b.sub}` : ''}
                        </small>
                      </>
                    );
                    return b.kind === 'study' ? (
                      <button key={b.id} type="button" className="block block--study" style={style} onClick={() => removeBlock(b.id, b.title)} title="Tap to delete">
                        {text}
                      </button>
                    ) : (
                      <div key={b.id} className={`block block--${b.kind}`} style={style}>
                        {text}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </Panel>
      <Panel title="Plan a study block" icon="plus">
        <form className="form" onSubmit={addBlock}>
          <div className="form__row form__row--wrap">
            <Field label="Day" className="grow">
              <input className="input" type="date" value={form.date || days[selected]} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="From">
              <input className="input" type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </Field>
            <Field label="To">
              <input className="input" type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </Field>
          </div>
          <Field label="What will you study?">
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Physics: momentum questions" />
          </Field>
          <button type="submit" className="btn btn--primary">
            Add study block
          </button>
        </form>
      </Panel>
    </>
  );
}

// ---------------------------------------------------------------- Timetable
export interface ClassItem {
  id: string;
  start: string;
  end: string;
  name: string;
  room: string;
  teacher: string;
  /** true = a dated school class; false = a class you set to repeat every week */
  dated: boolean;
}

/** All classes on a day: your dated school timetable, weekly repeating classes and classes added in the calendar, in time order. */
export function classesOn(data: AppData, date: string): ClassItem[] {
  const dated = data.sessions.filter((c) => c.date === date).map((c) => ({ ...c, dated: true }));
  const weekly = data.timetable.filter((c) => c.day === weekdayOf(date)).map((c) => ({ ...c, teacher: '', dated: false }));
  const fromCalendar = data.events
    .filter((e) => e.kind === 'class' && e.start && occursOn(e, date))
    .map((e) => ({ id: e.id, start: e.start, end: e.end || e.start, name: e.title, room: e.location, teacher: '', dated: true }));
  return [...dated, ...weekly, ...fromCalendar].sort((a, b) => a.start.localeCompare(b.start));
}

function Timetable() {
  const ask = useConfirm();
  const { data, update, toast, today } = useStore();
  const [form, setForm] = useState({ repeat: false, date: today, day: weekdayOf(today), start: '09:00', end: '10:00', name: '', room: '', teacher: '' });

  // School classes from today onwards, grouped by day.
  const upcoming = data.sessions.filter((c) => c.date >= today).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const byDay = new Map<string, typeof upcoming>();
  for (const c of upcoming) byDay.set(c.date, [...(byDay.get(c.date) ?? []), c]);
  const days = [...byDay.keys()];
  const lastDay = days[days.length - 1];

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast('Type the class name', 'error');
      return;
    }
    if (toMinutes(form.end) <= toMinutes(form.start)) {
      toast('End time must be after start time', 'error');
      return;
    }
    const base = { id: uid(), start: form.start, end: form.end, name: form.name.trim(), room: form.room.trim() };
    update((d) => {
      if (form.repeat) d.timetable.push({ ...base, day: form.day });
      else d.sessions.push({ ...base, date: form.date, teacher: form.teacher.trim() });
    });
    toast(form.repeat ? `${base.name} added every ${WEEKDAYS_LONG[form.day]}` : `${base.name} added on ${formatDay(form.date)}`, 'pop');
    setForm({ ...form, name: '', room: '', teacher: '' });
  };
  const removeSession = async (id: string, name: string, date: string) => {
    if (!(await ask(`Remove ${name} on ${formatDay(date)}?`, { ok: 'Remove' }))) return;
    update((d) => {
      d.sessions = d.sessions.filter((c) => c.id !== id);
    });
  };
  const removeWeekly = async (id: string, name: string) => {
    if (!(await ask(`Remove ${name} from your repeating classes?`, { ok: 'Remove' }))) return;
    update((d) => {
      d.timetable = d.timetable.filter((c) => c.id !== id);
    });
  };

  const dayGroup = (date: string) => (
    <div key={date} className={`day-group ${date === today ? 'is-today' : ''}`}>
      <h3 className="day-group__title">
        {formatDay(date)}
        {date === today ? ' · today' : ''}
      </h3>
      <ul className="list">
        {byDay.get(date)!.map((c) => (
          <li key={c.id} className="list__item">
            <div className="list__main">
              <span className="time-tag">
                {c.start}–{c.end}
              </span>
              <span className="list__text">
                <span>{c.name}</span>
                <small className="muted">{[c.room, c.teacher].filter(Boolean).join(' · ')}</small>
              </span>
            </div>
            <button type="button" className="icon-btn" onClick={() => removeSession(c.id, c.name, c.date)} aria-label={`Remove ${c.name} on ${formatDay(c.date)}`}>
              <PixelIcon name="trash" size={16} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="grid grid--2">
      <Panel title="School timetable" icon="calendar">
        <p className="muted small">
          {lastDay ? `Your school classes, day by day, up to ${formatDay(lastDay)}.` : 'No school classes from today on.'} When next month's
          timetable comes out, add it here (or send the screenshots to get it added in one go).
        </p>
        {days.slice(0, 5).map(dayGroup)}
        {days.length > 5 && (
          <details className="details">
            <summary>Later days ({days.length - 5})</summary>
            {days.slice(5).map(dayGroup)}
          </details>
        )}
      </Panel>
      <div className="stack">
        <Panel title="Add a class" icon="plus">
          <form className="form" onSubmit={add}>
            <Segmented
              label="How often"
              value={form.repeat ? 'weekly' : 'once'}
              onChange={(v) => setForm({ ...form, repeat: v === 'weekly' })}
              options={[
                { value: 'once', label: 'One date' },
                { value: 'weekly', label: 'Every week' },
              ]}
            />
            {form.repeat ? (
              <Field label="Day">
                <select className="input" value={form.day} onChange={(e) => setForm({ ...form, day: Number(e.target.value) as Weekday })}>
                  {WEEKDAYS_LONG.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Date">
                <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
            )}
            <div className="form__row">
              <Field label="Start" className="grow">
                <input className="input" type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
              </Field>
              <Field label="End" className="grow">
                <input className="input" type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
              </Field>
            </div>
            <Field label="Class">
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Physics" />
            </Field>
            <div className="form__row">
              <Field label="Room" className="grow">
                <input className="input" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="e.g. Room 2.14" />
              </Field>
              {!form.repeat && (
                <Field label="Teacher" className="grow">
                  <input className="input" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} />
                </Field>
              )}
            </div>
            <button type="submit" className="btn btn--primary">
              Add class
            </button>
          </form>
        </Panel>
        {data.timetable.length > 0 && (
          <Panel title="Repeating classes" icon="clock">
            <ul className="list">
              {[...data.timetable]
                .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
                .map((c) => (
                  <li key={c.id} className="list__item">
                    <div className="list__main">
                      <span className="time-tag">
                        {WEEKDAYS[c.day]} {c.start}
                      </span>
                      <span className="list__text">
                        <span>{c.name}</span>
                        {c.room && <small className="muted">{c.room}</small>}
                      </span>
                    </div>
                    <button type="button" className="icon-btn" onClick={() => removeWeekly(c.id, c.name)} aria-label={`Remove ${c.name}`}>
                      <PixelIcon name="trash" size={16} />
                    </button>
                  </li>
                ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}
