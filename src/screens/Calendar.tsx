/**
 * 📅 The universal calendar (Planner → Calendar): Day, Week and Month views of
 * everything dated — your own events plus classes, exams, deadlines and study
 * blocks from the rest of the app (see lib/calendar.ts). Overlaps are flagged.
 *
 * Adding an "Exam" creates a test (so its boss works) and a "Deadline" creates a
 * task — one source of truth for each, never a copy.
 */
import { useState, type FormEvent } from 'react';
import { conflicts, itemsBetween, itemsOn, KIND_INFO, newEvent, type CalItem } from '../lib/calendar';
import { addDays, addMonths, daysInMonth, formatDay, formatMonth, monthOf, startOfWeek, toMinutes, WEEKDAYS } from '../lib/dates';
import { uid } from '../lib/id';
import { sfx } from '../lib/sound';
import type { CalEvent, CalKind } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Empty, Field, Panel, Segmented, Sheet, useConfirm } from '../ui/kit';

type View = 'day' | 'week' | 'month';
type FormKind = CalKind | 'exam' | 'deadline';
type Draft = Omit<CalEvent, 'id'> & { id?: string };

const FORM_KINDS: { value: FormKind; label: string }[] = [
  { value: 'event', label: 'Event' },
  { value: 'class', label: 'Class' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'travel', label: 'Travel' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'exam', label: 'Exam (goes to Study → Tests)' },
  { value: 'deadline', label: 'Deadline (goes to your tasks)' },
];

/** Where to edit items that belong to another part of the app. */
const SOURCE_LINK: Record<Exclude<CalItem['source'], 'event'>, { href: string; label: string }> = {
  session: { href: '#/planner/timetable', label: 'School timetable' },
  timetable: { href: '#/planner/timetable', label: 'Weekly timetable' },
  test: { href: '#/study/tests', label: 'Study → Tests' },
  task: { href: '#/planner/today', label: 'Tasks' },
  assignment: { href: '#/study/assignments', label: 'Study → Assignments' },
  study: { href: '#/planner/week', label: 'Week plan' },
  bill: { href: '#/money/bills', label: 'Money → Bills' },
};

const Dot = ({ kind }: { kind: CalItem['kind'] }) => <span className="cal-dot" style={{ background: KIND_INFO[kind].colour }} aria-hidden="true" />;

function ItemRow({ item, clash, onOpen }: { item: CalItem; clash?: string; onOpen: (i: CalItem) => void }) {
  return (
    <li className={`cal-item ${item.done ? 'is-done' : ''} ${clash ? 'is-clash' : ''}`}>
      <button type="button" className="cal-item__btn" onClick={() => onOpen(item)}>
        <span className="cal-item__time">{item.start ? `${item.start}${item.end ? `–${item.end}` : ''}` : 'All day'}</span>
        <Dot kind={item.kind} />
        <span className="cal-item__text">
          <strong>{item.title}</strong>
          <small className="muted">
            {KIND_INFO[item.kind].label}
            {item.location ? ` · ${item.location}` : ''}
          </small>
          {clash && <small className="cal-item__clash">⚠ Overlaps with {clash}</small>}
        </span>
      </button>
    </li>
  );
}

/** Overlap partners for each timed item on a day. */
function clashMap(items: CalItem[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const [a, b] of conflicts(items)) {
    out.set(a.key, out.has(a.key) ? `${out.get(a.key)}, ${b.title}` : b.title);
    out.set(b.key, out.has(b.key) ? `${out.get(b.key)}, ${a.title}` : a.title);
  }
  return out;
}

export default function CalendarTab() {
  const { data, today } = useStore();
  const [view, setView] = useState<View>('week');
  const [cursor, setCursor] = useState(today);
  const [editing, setEditing] = useState<{ event: Draft; kind: FormKind } | null>(null);
  const [info, setInfo] = useState<CalItem | null>(null);

  const step = (n: number) => {
    if (view === 'day') setCursor(addDays(cursor, n));
    else if (view === 'week') setCursor(addDays(cursor, 7 * n));
    else setCursor(`${addMonths(monthOf(cursor), n)}-01`);
  };
  const open = (item: CalItem) => {
    if (item.source === 'event') {
      const e = data.events.find((x) => x.id === item.id);
      if (e) setEditing({ event: { ...e }, kind: e.kind });
    } else setInfo(item);
  };
  const add = (date = cursor) => setEditing({ event: newEvent(date), kind: 'event' });

  const monday = startOfWeek(cursor);
  const label = view === 'day' ? formatDay(cursor) : view === 'week' ? `${formatDay(monday)} – ${formatDay(addDays(monday, 6))}` : formatMonth(monthOf(cursor));

  return (
    <div className="calendar">
      <div className="cal-head">
        <Segmented<View>
          label="Calendar view"
          value={view}
          onChange={setView}
          options={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
        />
        <div className="cal-head__nav">
          <button type="button" className="btn btn--small" onClick={() => step(-1)} aria-label={`Previous ${view}`}>
            <PixelIcon name="arrowL" size={16} />
          </button>
          <button type="button" className="btn btn--small" onClick={() => setCursor(today)} disabled={cursor === today}>
            Today
          </button>
          <button type="button" className="btn btn--small" onClick={() => step(1)} aria-label={`Next ${view}`}>
            <PixelIcon name="arrowR" size={16} />
          </button>
          <button type="button" className="btn btn--small btn--primary" onClick={() => add()}>
            <PixelIcon name="plus" size={14} /> Add
          </button>
        </div>
        <p className="cal-head__label" aria-live="polite">
          {label}
        </p>
      </div>

      {view === 'month' && (
        <MonthView
          cursor={cursor}
          today={today}
          onPick={(d) => {
            setCursor(d);
            setView('day');
          }}
        />
      )}
      {view === 'week' && <WeekView monday={monday} today={today} onOpen={open} onAdd={add} />}
      {view === 'day' && <DayView date={cursor} onOpen={open} onAdd={add} />}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing?.event.id ? 'Edit event' : 'Add to calendar'}>
        {editing && <EventForm key={editing.event.id ?? 'new'} initial={editing.event} initialKind={editing.kind} onDone={() => setEditing(null)} />}
      </Sheet>
      <Sheet open={info !== null} onClose={() => setInfo(null)} title={info?.title ?? ''}>
        {info && info.source !== 'event' && (
          <div className="form">
            <p>
              <Dot kind={info.kind} /> {KIND_INFO[info.kind].label} · {formatDay(info.date)}
              {info.start ? ` · ${info.start}${info.end ? `–${info.end}` : ''}` : ''}
              {info.location ? ` · ${info.location}` : ''}
            </p>
            <p className="muted small">This comes from {SOURCE_LINK[info.source].label}. Change it there, so there's only ever one copy.</p>
            <a href={SOURCE_LINK[info.source].href} className="btn btn--primary" onClick={() => setInfo(null)}>
              Open {SOURCE_LINK[info.source].label}
            </a>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function DayView({ date, onOpen, onAdd }: { date: string; onOpen: (i: CalItem) => void; onAdd: (d: string) => void }) {
  const { data } = useStore();
  const items = itemsOn(data, date);
  const clashes = clashMap(items);
  return (
    <Panel title={formatDay(date)} icon="calendar">
      {clashes.size > 0 && <p className="alert cal-warn">⚠ Some things overlap — check the times below.</p>}
      {items.length === 0 ? (
        <Empty>
          Nothing planned.{' '}
          <button type="button" className="btn btn--small" onClick={() => onAdd(date)}>
            Add something
          </button>
        </Empty>
      ) : (
        <ul className="cal-list">
          {items.map((i) => (
            <ItemRow key={i.key} item={i} clash={clashes.get(i.key)} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function WeekView({ monday, today, onOpen, onAdd }: { monday: string; today: string; onOpen: (i: CalItem) => void; onAdd: (d: string) => void }) {
  const { data } = useStore();
  const days = itemsBetween(data, monday, addDays(monday, 6));
  return (
    <ol className="cal-week">
      {[...days].map(([date, items], i) => {
        const clashes = clashMap(items);
        return (
          <li key={date} className={`cal-week__day ${date === today ? 'is-today' : ''}`}>
            <div className="cal-week__head">
              <strong>
                {WEEKDAYS[i]} {Number(date.slice(8))}
              </strong>
              {clashes.size > 0 && <small className="cal-item__clash">⚠ overlap</small>}
              <button type="button" className="icon-btn" onClick={() => onAdd(date)} aria-label={`Add to ${formatDay(date)}`}>
                <PixelIcon name="plus" size={14} />
              </button>
            </div>
            {items.length === 0 ? (
              <p className="muted small cal-week__free">Free</p>
            ) : (
              <ul className="cal-list">
                {items.map((it) => (
                  <ItemRow key={it.key} item={it} clash={clashes.get(it.key)} onOpen={onOpen} />
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function MonthView({ cursor, today, onPick }: { cursor: string; today: string; onPick: (d: string) => void }) {
  const { data } = useStore();
  const ym = monthOf(cursor);
  const last = `${ym}-${String(daysInMonth(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)))).padStart(2, '0')}`;
  const days = itemsBetween(data, startOfWeek(`${ym}-01`), addDays(startOfWeek(last), 6));
  return (
    <div className="cal-month" role="grid" aria-label={formatMonth(ym)}>
      {WEEKDAYS.map((w) => (
        <span key={w} className="cal-month__head" role="columnheader">
          {w}
        </span>
      ))}
      {[...days].map(([date, items]) => (
        <button
          key={date}
          type="button"
          role="gridcell"
          className={`cal-month__cell ${monthOf(date) !== ym ? 'is-other' : ''} ${date === today ? 'is-today' : ''}`}
          onClick={() => onPick(date)}
          aria-label={`${formatDay(date)}: ${items.length ? `${items.length} item${items.length === 1 ? '' : 's'}` : 'nothing'}`}
        >
          <span className="cal-month__num">{Number(date.slice(8))}</span>
          <span className="cal-month__dots">
            {[...new Set(items.map((i) => i.kind))].slice(0, 4).map((k) => (
              <Dot key={k} kind={k} />
            ))}
          </span>
          {conflicts(items).length > 0 && <span className="cal-month__clash">!</span>}
        </button>
      ))}
    </div>
  );
}

/** Add or edit a calendar event (or create an exam / deadline in their own lists). */
function EventForm({ initial, initialKind, onDone }: { initial: Draft; initialKind: FormKind; onDone: () => void }) {
  const { data, update, toast } = useStore();
  const ask = useConfirm();
  const [f, setF] = useState(initial);
  const [kind, setKind] = useState<FormKind>(initialKind);
  const [allDay, setAllDay] = useState(!initial.start);
  const set = (patch: Partial<CalEvent>) => setF((x) => ({ ...x, ...patch }));
  const isEvent = kind !== 'exam' && kind !== 'deadline';

  const save = (e: FormEvent) => {
    e.preventDefault();
    const title = f.title.trim();
    const start = allDay ? '' : f.start;
    const end = allDay ? '' : f.end;
    const problem = !title || !f.date
      ? 'Give it a name and a date'
      : start && end && toMinutes(end) <= toMinutes(start)
        ? 'The end time must be after the start time'
        : isEvent && f.repeat === 'none' && f.endDate && f.endDate < f.date
          ? 'The last day must be on or after the first day'
          : isEvent && f.repeat !== 'none' && f.until && f.until < f.date
            ? '"Until" must be on or after the first day'
            : '';
    if (problem) {
      toast(problem, 'error');
      return;
    }

    if (kind === 'exam') {
      update((d) => void d.tests.push({ id: uid(), name: title, date: f.date, subjectId: null }));
      toast('Exam added to Study → Tests (pick its subject there to get its boss)', 'pop');
    } else if (kind === 'deadline') {
      update((d) => void d.tasks.push({ id: uid(), title, due: f.date, done: false }));
      toast('Deadline added to your tasks', 'pop');
    } else {
      const value: CalEvent = {
        ...f,
        id: f.id ?? uid(),
        kind,
        title,
        start,
        end,
        endDate: f.repeat === 'none' ? f.endDate : '',
        until: f.repeat === 'none' ? '' : f.until,
        location: f.location.trim(),
        notes: f.notes.trim(),
      };
      // Heads-up if it clashes with something already on that day (it still saves).
      const sameDay = itemsOn({ ...data, events: [...data.events.filter((x) => x.id !== value.id), value] }, value.date);
      const clash = conflicts(sameDay).find(([a, b]) => a.id === value.id || b.id === value.id);
      update((d) => {
        const i = d.events.findIndex((x) => x.id === value.id);
        if (i >= 0) d.events[i] = value;
        else d.events.push(value);
      });
      sfx('pop');
      if (clash) toast(`Saved. Heads up: it overlaps with ${(clash[0].id === value.id ? clash[1] : clash[0]).title}`, 'warn');
      else toast(f.id ? 'Event updated' : 'Added to the calendar', 'pop');
    }
    onDone();
  };

  const remove = async () => {
    if (!f.id || !(await ask(`Delete "${f.title}"${f.repeat !== 'none' ? ' (every repeat)' : ''}?`))) return;
    update((d) => void (d.events = d.events.filter((x) => x.id !== f.id)));
    toast('Deleted', 'info');
    onDone();
  };

  return (
    <form className="form" onSubmit={save}>
      <Field label="What">
        <input className="input" value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Dentist, Mum's birthday, Flight home" data-autofocus maxLength={80} />
      </Field>
      <Field label="Kind">
        <select
          className="input"
          value={kind}
          disabled={Boolean(f.id)}
          onChange={(e) => {
            const k = e.target.value as FormKind;
            setKind(k);
            if (k === 'birthday') {
              set({ repeat: 'yearly' });
              setAllDay(true);
            }
          }}
        >
          {FORM_KINDS.filter((k) => !f.id || (k.value !== 'exam' && k.value !== 'deadline')).map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="form__row">
        <Field label={kind === 'travel' ? 'From' : 'Date'} className="grow">
          <input className="input" type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
        </Field>
        {isEvent && f.repeat === 'none' && (
          <Field label={kind === 'travel' ? 'Until (last day)' : 'Last day (optional)'} className="grow">
            <input className="input" type="date" value={f.endDate} min={f.date} onChange={(e) => set({ endDate: e.target.value })} />
          </Field>
        )}
      </div>
      {isEvent && (
        <>
          <label className="check">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            <span>All day</span>
          </label>
          {!allDay && (
            <div className="form__row">
              <Field label="Starts" className="grow">
                <input className="input" type="time" value={f.start} onChange={(e) => set({ start: e.target.value })} />
              </Field>
              <Field label="Ends" className="grow">
                <input className="input" type="time" value={f.end} onChange={(e) => set({ end: e.target.value })} />
              </Field>
            </div>
          )}
          <div className="form__row">
            <Field label="Repeats" className="grow">
              <select className="input" value={f.repeat} onChange={(e) => set({ repeat: e.target.value as CalEvent['repeat'] })}>
                <option value="none">Doesn't repeat</option>
                <option value="daily">Every day</option>
                <option value="weekly">Every week</option>
                <option value="monthly">Every month</option>
                <option value="yearly">Every year</option>
              </select>
            </Field>
            {f.repeat !== 'none' && (
              <Field label="Until (optional)" className="grow">
                <input className="input" type="date" value={f.until} min={f.date} onChange={(e) => set({ until: e.target.value })} />
              </Field>
            )}
          </div>
          <Field label="Where (optional)">
            <input className="input" value={f.location} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Room 2.14, the GP, the airport" maxLength={80} />
          </Field>
          <Field label="Notes (optional)">
            <textarea className="input" rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </>
      )}
      <div className="form__actions">
        {f.id && (
          <button type="button" className="btn btn--danger" onClick={remove}>
            <PixelIcon name="trash" size={16} /> Delete
          </button>
        )}
        <button type="submit" className="btn btn--primary grow">
          {f.id ? 'Save' : 'Add'}
        </button>
      </div>
    </form>
  );
}
