/**
 * PHASE 2 extras:
 *  - <Clocks>        UK time + Tashkent time (Home)
 *  - <MoodCheckIn>   one-tap daily mood (Home) and <MoodWeek> weekly view
 *  - <Habits>        sleep / exercise / calling family tracker
 *  - <Vocab>         English words for physics & maths, in your own words
 *  - <Journal>       notes / journal
 *  - <WeekReflect>   weekly look back, with that week's numbers (Reflect → Week)
 */
import { useEffect, useState, type FormEvent } from 'react';
import { addDays, clockIn, formatDay, startOfWeek, TASHKENT_TZ, UK_TZ, weekdayOf, WEEKDAYS, zonedParts } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { uid } from '../lib/id';
import type { Habit, Mood, Reflection, VocabWord } from '../lib/types';
import { XP } from '../lib/xp';
import { useStore } from '../state/store';
import { PixelIcon, type IconName } from '../ui/icons';
import { Empty, Field, Panel, useConfirm } from '../ui/kit';

// ---------------------------------------------------------------- Clocks
function useNow(everyMs: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

/** Sheffield and Tashkent side by side, so you know if it's a good time to call home. */
export function Clocks() {
  const now = useNow(15_000);
  const zone = (label: string, tz: string) => {
    const h = zonedParts(now, tz).hour;
    const night = h >= 22 || h < 7;
    return (
      <div className="clock">
        <PixelIcon name={h >= 7 && h < 19 ? 'sun' : 'moon'} size={20} />
        <span className="clock__label">{label}</span>
        <span className="clock__time">{clockIn(tz, now)}</span>
        {tz === TASHKENT_TZ && <small className="muted">{night ? 'sleeping time' : 'ok to call'}</small>}
      </div>
    );
  };
  return (
    <div className="clocks" aria-label="Clocks">
      {zone('Sheffield', UK_TZ)}
      {zone('Tashkent', TASHKENT_TZ)}
    </div>
  );
}

// ---------------------------------------------------------------- Mood
const MOODS: { value: Mood; label: string; color: string; icon: IconName }[] = [
  { value: 1, label: 'Awful', color: '#e0564f', icon: 'face1' },
  { value: 2, label: 'Low', color: '#f0a020', icon: 'face2' },
  { value: 3, label: 'Okay', color: '#ffd93b', icon: 'face3' },
  { value: 4, label: 'Good', color: '#9be36a', icon: 'face4' },
  { value: 5, label: 'Great', color: '#5fa83b', icon: 'face5' },
];

/** One tap: how do you feel today? */
export function MoodCheckIn() {
  const { data, update, today, toast } = useStore();
  const current = data.moods[today];
  const pick = (m: Mood) => {
    update((d) => {
      d.moods[today] = m;
    });
    if (!current) toast(`Mood saved: ${MOODS[m - 1].label}`, 'pop');
  };
  return (
    <>
    <div className="moods" role="radiogroup" aria-label="How do you feel today?">
      {MOODS.map((m) => (
        <button key={m.value} type="button" role="radio" aria-checked={current === m.value} className="mood-btn" onClick={() => pick(m.value)}>
          <PixelIcon name={m.icon} fill={m.color} size={36} />
          <span>{m.label}</span>
        </button>
      ))}
    </div>
    {current && current <= 2 && (
      <a href="#/calm" className="mood-calm">
        <PixelIcon name="lantern" size={16} /> Rough day? Take a minute in the calm corner →
      </a>
    )}
    </>
  );
}

/** The last 7 days of moods, with a gentle burnout warning. */
export function MoodWeek() {
  const { data, today } = useStore();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const lowDays = days.filter((d) => (data.moods[d] ?? 5) <= 2).length;
  return (
    <>
      <ol className="mood-week" aria-label="Mood over the last 7 days">
        {days.map((d) => {
          const m = data.moods[d];
          const info = m ? MOODS[m - 1] : null;
          return (
            <li key={d} className={`mood-week__day ${d === today ? 'is-today' : ''}`}>
              <span className="mood-week__name">{WEEKDAYS[weekdayOf(d)]}</span>
              {info ? <PixelIcon name={info.icon} fill={info.color} size={30} title={`${formatDay(d)}: ${info.label}`} /> : <span className="mood-week__empty" aria-label={`${formatDay(d)}: no check-in`} />}
            </li>
          );
        })}
      </ol>
      {lowDays >= 3 && (
        <p className="alert alert--warn" role="status">
          {lowDays} low days this week. That's a burnout warning sign. Sleep, eat properly, call home, and think about talking to USIC student support — you don't
          have to push through alone.
        </p>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Habits
/** How many days in a row (ending today, or yesterday if today isn't ticked yet). */
function streak(log: Record<string, string[]>, habitId: string, today: string): number {
  let day = log[today]?.includes(habitId) ? today : addDays(today, -1);
  let count = 0;
  while (log[day]?.includes(habitId)) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}

export function Habits() {
  const ask = useConfirm();
  const { data, update, today, gainXp } = useStore();
  const [name, setName] = useState('');
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  const toggle = (h: Habit, day: string) => {
    const done = data.habitLog[day]?.includes(h.id) ?? false;
    update((d) => {
      const list = d.habitLog[day] ?? [];
      d.habitLog[day] = done ? list.filter((id) => id !== h.id) : [...list, h.id];
    });
    gainXp(done ? -XP.habit : XP.habit, done ? undefined : h.name);
  };
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    update((d) => {
      d.habits.push({ id: uid(), name: name.trim(), icon: 'check' });
    });
    setName('');
  };
  const remove = async (h: Habit) => {
    if (!(await ask(`Stop tracking "${h.name}"?`, { ok: 'Stop tracking' }))) return;
    update((d) => {
      d.habits = d.habits.filter((x) => x.id !== h.id);
    });
  };

  return (
    <Panel title="Habits" icon="check">
      <p className="muted small">Tick each day you did it. Small streaks add up!</p>
      <div className="habits" role="table" aria-label="Habits over the last 7 days">
        <div className="habits__row habits__row--head" role="row">
          <span role="columnheader" className="habits__name">
            Habit
          </span>
          {days.map((d) => (
            <span key={d} role="columnheader" className={`habits__day ${d === today ? 'is-today' : ''}`}>
              {WEEKDAYS[weekdayOf(d)].slice(0, 2)}
            </span>
          ))}
        </div>
        {data.habits.map((h) => (
          <div key={h.id} className="habits__row" role="row">
            <span role="rowheader" className="habits__name">
              <PixelIcon name={h.icon} size={18} />
              <span>
                {h.name}
                <small className="muted"> · {streak(data.habitLog, h.id, today)}-day streak</small>
              </span>
              <button type="button" className="icon-btn icon-btn--tiny" onClick={() => remove(h)} aria-label={`Remove habit ${h.name}`}>
                <PixelIcon name="trash" size={14} />
              </button>
            </span>
            {days.map((d) => {
              const done = data.habitLog[d]?.includes(h.id) ?? false;
              return (
                <span key={d} role="cell" className="habits__cell">
                  <button type="button" className={`habit-box ${done ? 'is-done' : ''}`} aria-pressed={done} aria-label={`${h.name} on ${formatDay(d)}`} onClick={() => toggle(h, d)} />
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <form className="form__row" onSubmit={add}>
        <input className="input grow" aria-label="New habit" placeholder="Add a habit… (e.g. Drink water)" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn">
          Add
        </button>
      </form>
    </Panel>
  );
}

// ---------------------------------------------------------------- Vocabulary
export function Vocab() {
  const ask = useConfirm();
  const { data, update, toast } = useStore();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<VocabWord | null>(null);
  const [form, setForm] = useState({ word: '', meaning: '', sentence: '', subjectId: '' });

  const q = query.trim().toLowerCase();
  const words = data.vocab
    .filter((w) => !q || w.word.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q))
    .sort((a, b) => a.word.localeCompare(b.word));

  const startEdit = (w: VocabWord) => {
    setEditing(w);
    setForm({ word: w.word, meaning: w.meaning, sentence: w.sentence, subjectId: w.subjectId ?? '' });
  };
  const clear = () => {
    setEditing(null);
    setForm({ word: '', meaning: '', sentence: '', subjectId: '' });
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!form.word.trim() || !form.meaning.trim()) {
      toast('Add the word and its meaning', 'error');
      return;
    }
    const value = { word: form.word.trim(), meaning: form.meaning.trim(), sentence: form.sentence.trim(), subjectId: form.subjectId || null };
    update((d) => {
      if (editing) Object.assign(d.vocab.find((w) => w.id === editing.id) ?? {}, value);
      else d.vocab.push({ id: uid(), ...value });
    });
    toast(editing ? 'Word updated' : `Learned a new word: ${value.word}`, 'pop');
    clear();
  };
  const remove = async (w: VocabWord) => {
    if (!(await ask(`Delete "${w.word}"?`))) return;
    update((d) => {
      d.vocab = d.vocab.filter((x) => x.id !== w.id);
    });
  };

  return (
    <div className="grid grid--2">
      <Panel title={`Word list (${data.vocab.length})`} icon="book">
        <input className="input" type="search" aria-label="Search words" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {words.length === 0 && <Empty>{q ? 'No match.' : 'No words yet. Add new physics/maths words as you meet them.'}</Empty>}
        <ul className="list">
          {words.map((w) => (
            <li key={w.id} className="word">
              <div className="word__head">
                <strong>{w.word}</strong>
                {w.subjectId && <span className="rag-pill">{data.subjects.find((s) => s.id === w.subjectId)?.name}</span>}
                <span className="grow" />
                <button type="button" className="icon-btn" onClick={() => startEdit(w)} aria-label={`Edit ${w.word}`}>
                  <PixelIcon name="pencil" size={16} />
                </button>
                <button type="button" className="icon-btn" onClick={() => remove(w)} aria-label={`Delete ${w.word}`}>
                  <PixelIcon name="trash" size={16} />
                </button>
              </div>
              <p>{w.meaning}</p>
              {w.sentence && <p className="muted small">“{w.sentence}”</p>}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title={editing ? 'Edit word' : 'Add a word'} icon="plus">
        <form className="form" onSubmit={save}>
          <Field label="Word">
            <input className="input" value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} placeholder="e.g. Displacement" />
          </Field>
          <Field label="Meaning (in my own words)">
            <textarea className="input" rows={2} value={form.meaning} onChange={(e) => setForm({ ...form, meaning: e.target.value })} />
          </Field>
          <Field label="Example sentence (optional)">
            <input className="input" value={form.sentence} onChange={(e) => setForm({ ...form, sentence: e.target.value })} />
          </Field>
          <Field label="Subject">
            <select className="input" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">—</option>
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="form__actions">
            {editing && (
              <button type="button" className="btn" onClick={clear}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn--primary grow">
              {editing ? 'Save changes' : 'Add word'}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- Journal
export function Journal() {
  const ask = useConfirm();
  const { data, update } = useStore();
  const notes = [...data.notes].sort((a, b) => b.updated.localeCompare(a.updated));
  const [openId, setOpenId] = useState<string | null>(notes[0]?.id ?? null);
  const note = data.notes.find((n) => n.id === openId) ?? null;

  const create = () => {
    const id = uid();
    update((d) => {
      d.notes.push({ id, title: '', body: '', updated: new Date().toISOString() });
    });
    setOpenId(id);
  };
  const edit = (change: { title?: string; body?: string }) =>
    update((d) => {
      const n = d.notes.find((x) => x.id === openId);
      if (n) Object.assign(n, change, { updated: new Date().toISOString() });
    });
  const remove = async () => {
    if (!note || !(await ask(`Delete "${note.title || 'Untitled'}"?`))) return;
    update((d) => {
      d.notes = d.notes.filter((x) => x.id !== note.id);
    });
    setOpenId(notes.find((n) => n.id !== note.id)?.id ?? null);
  };

  return (
    <div className="grid grid--journal">
      <Panel
        title="Journal"
        icon="scroll"
        actions={
          <button type="button" className="btn btn--primary btn--small" onClick={create}>
            + New
          </button>
        }
      >
        {notes.length === 0 && <Empty>No notes yet.</Empty>}
        <ul className="list">
          {notes.map((n) => (
            <li key={n.id}>
              <button type="button" className={`note-link ${n.id === openId ? 'is-open' : ''}`} onClick={() => setOpenId(n.id)} aria-current={n.id === openId}>
                <strong>{n.title || 'Untitled'}</strong>
                <small className="muted">{formatDay(n.updated.slice(0, 10))}</small>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title={note ? 'Writing' : 'Pick a note'} icon="pencil">
        {note ? (
          <>
            <input className="input input--title" aria-label="Title" placeholder="Title" value={note.title} onChange={(e) => edit({ title: e.target.value })} />
            <textarea
              className="input journal-body"
              aria-label="Note"
              placeholder="How was today? What did you learn? What's worrying you?"
              value={note.body}
              onChange={(e) => edit({ body: e.target.value })}
            />
            <div className="toolbar">
              <small className="muted">Saved automatically · only on this device</small>
              <button type="button" className="btn btn--small btn--danger" onClick={remove}>
                Delete
              </button>
            </div>
          </>
        ) : (
          <Empty>Tap "+ New" to start writing.</Empty>
        )}
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- Weekly reflection
const PROMPTS: { key: keyof Omit<Reflection, 'updated'>; label: string; placeholder: string }[] = [
  { key: 'wentWell', label: 'What went well this week?', placeholder: 'e.g. Finished all my SUVAT questions' },
  { key: 'hard', label: 'What was hard?', placeholder: 'e.g. Felt homesick on Wednesday' },
  { key: 'learned', label: 'What did I learn?', placeholder: 'e.g. Along the slope = sin, into = cos' },
  { key: 'next', label: 'One thing to do better next week', placeholder: 'e.g. Start homework the day it is set' },
];

/** Numbers for one week (Monday → Sunday), so the reflection isn't from memory alone. */
function weekStats(data: ReturnType<typeof useStore>['data'], monday: string) {
  const sunday = addDays(monday, 6);
  const inWeek = (d: string) => d >= monday && d <= sunday;
  const spent = data.expenses.filter((e) => inWeek(e.date)).reduce((a, e) => a + e.amount, 0);
  const sessions = data.studyLog.filter((s) => inWeek(s.date));
  const moods = Object.entries(data.moods).filter(([d]) => inWeek(d)).map(([, m]) => m);
  const habitTicks = Object.entries(data.habitLog).filter(([d]) => inWeek(d)).reduce((a, [, ids]) => a + ids.length, 0);
  return {
    spent: Math.round(spent * 100) / 100,
    minutes: sessions.reduce((a, s) => a + s.minutes, 0),
    pomodoros: sessions.length,
    mistakes: data.mistakes.filter((m) => inWeek(m.date)).length,
    habitTicks,
    mood: moods.length ? Math.round(moods.reduce((a, m) => a + m, 0) / moods.length) : null,
  };
}

export function WeekReflect() {
  const { data, update, today } = useStore();
  const thisMonday = startOfWeek(today);
  const [monday, setMonday] = useState(thisMonday);
  const saved = data.reflections[monday];
  const stats = weekStats(data, monday);
  const pastWeeks = Object.keys(data.reflections)
    .filter((w) => w !== monday)
    .sort()
    .reverse();

  const edit = (key: keyof Omit<Reflection, 'updated'>, value: string) =>
    update((d) => {
      const r = d.reflections[monday] ?? { wentWell: '', hard: '', learned: '', next: '', updated: '' };
      d.reflections[monday] = { ...r, [key]: value, updated: new Date().toISOString() };
    });

  const moodInfo = stats.mood ? MOODS[stats.mood - 1] : null;
  const weekLabel = monday === thisMonday ? 'This week' : `Week of ${formatDay(monday)}`;

  return (
    <div className="grid grid--2">
      <Panel
        title={weekLabel}
        icon="star"
        actions={
          <div className="month-picker">
            <button type="button" className="btn btn--small" onClick={() => setMonday(addDays(monday, -7))} aria-label="Previous week">
              <PixelIcon name="arrowL" size={16} />
            </button>
            <button type="button" className="btn btn--small" onClick={() => setMonday(addDays(monday, 7))} aria-label="Next week" disabled={monday >= thisMonday}>
              <PixelIcon name="arrowR" size={16} />
            </button>
          </div>
        }
      >
        <p className="muted small">
          {formatDay(monday)} – {formatDay(addDays(monday, 6))}
        </p>
        <ul className="week-stats">
          <li>
            <PixelIcon name="coin" size={20} />
            <span className="week-stats__num">{formatMoney(stats.spent)}</span>
            <span>spent</span>
          </li>
          <li>
            <PixelIcon name="clock" size={20} />
            <span className="week-stats__num">{stats.minutes}</span>
            <span>min studied ({stats.pomodoros} Pomodoro{stats.pomodoros === 1 ? '' : 's'})</span>
          </li>
          <li>
            <PixelIcon name="check" size={20} />
            <span className="week-stats__num">{stats.habitTicks}</span>
            <span>habit ticks</span>
          </li>
          <li>
            <PixelIcon name="cross" size={20} />
            <span className="week-stats__num">{stats.mistakes}</span>
            <span>mistakes logged (that's learning!)</span>
          </li>
          <li>
            {moodInfo ? <PixelIcon name={moodInfo.icon} fill={moodInfo.color} size={20} /> : <PixelIcon name="heart" size={20} />}
            <span className="week-stats__num">{moodInfo ? moodInfo.label : '—'}</span>
            <span>average mood</span>
          </li>
        </ul>
        {pastWeeks.length > 0 && (
          <details className="details">
            <summary>Past reflections ({pastWeeks.length})</summary>
            <ul className="list">
              {pastWeeks.map((w) => (
                <li key={w}>
                  <button type="button" className="note-link" onClick={() => setMonday(w)}>
                    <strong>Week of {formatDay(w)}</strong>
                    <small className="muted">{data.reflections[w].wentWell.slice(0, 60) || '…'}</small>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Panel>
      <Panel title="Look back" icon="scroll">
        <p className="muted small">A few honest lines each week help you spot what works. Saved automatically.</p>
        {PROMPTS.map((p) => (
          <Field key={p.key} label={p.label}>
            <textarea className="input" rows={2} placeholder={p.placeholder} value={saved?.[p.key] ?? ''} onChange={(e) => edit(p.key, e.target.value)} />
          </Field>
        ))}
      </Panel>
    </div>
  );
}
