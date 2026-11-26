/**
 * <WeekReflect>: the weekly look back, with that week's numbers (Reflect → Week).
 * (Clocks, mood, habits, words and the old journal were removed at Bek's request; their data is kept.)
 */
import { useState } from 'react';
import { addDays, clockIn, formatDay, startOfWeek, UK_TZ } from '../lib/dates';
import { weekInWords } from '../lib/dayDoor';
import { formatMoney } from '../lib/money';
import { uid } from '../lib/id';
import type { Mood, Reflection } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon, type IconName } from '../ui/icons';
import { Empty, Field, Panel, useConfirm } from '../ui/kit';



// ---------------------------------------------------------------- Mood
const MOODS: { value: Mood; label: string; color: string; icon: IconName }[] = [
  { value: 1, label: 'Awful', color: '#e0564f', icon: 'face1' },
  { value: 2, label: 'Low', color: '#f0a020', icon: 'face2' },
  { value: 3, label: 'Okay', color: '#ffd93b', icon: 'face3' },
  { value: 4, label: 'Good', color: '#9be36a', icon: 'face4' },
  { value: 5, label: 'Great', color: '#5fa83b', icon: 'face5' },
];





// ---------------------------------------------------------------- Vocabulary

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
                <small className="muted">{formatDay(n.updated.slice(0, 10))} · {clockIn(UK_TZ, new Date(n.updated))}</small>
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
  const words = weekInWords(data, monday, today);
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
        {words.goalsSet > 0 && (
          <p>
            Top 3 goals done: <strong>{words.goalsDone} of {words.goalsSet}</strong>
          </p>
        )}
        {words.days.length > 0 && (
          <>
            <p className="field__label">What you wrote each evening</p>
            <ul className="list">
              {words.days.map((w) => (
                <li key={w.date} className="week-word">
                  <small className="muted">
                    {formatDay(w.date)}
                    {w.mood ? ` · ${MOODS[w.mood - 1].label}` : ''}
                  </small>
                  <span>{w.line || 'No words that day'}</span>
                </li>
              ))}
            </ul>
          </>
        )}
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
