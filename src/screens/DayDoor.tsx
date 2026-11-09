/**
 * The two daily moments. <TopThreeDoor> replaces the whole app until today's top 3 are written.
 * <EveningCheckin> is a card from 7pm asking what you did and how you felt; it can wait, it never blocks.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { DOOR_FROM_HOUR, doorIsShut, eveningDue, isSunday, suggestTopThree } from '../lib/dayDoor';
import { UK_TZ, formatDay, zonedParts } from '../lib/dates';
import type { Mood, NightLog } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';

const MOOD_WORDS: { value: Mood; label: string }[] = [
  { value: 1, label: 'Awful' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
];
const LATER_KEY = 'beks:evening-later';
const hourNow = () => zonedParts(new Date(), UK_TZ).hour;

/** The UK hour, kept fresh so the door and the evening card appear without a reload. */
function useHour() {
  const [hour, setHour] = useState(hourNow);
  useEffect(() => {
    const t = window.setInterval(() => setHour(hourNow()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return hour;
}

export function useDoorShut() {
  const { data, today } = useStore();
  return doorIsShut(data.priorities, today, useHour());
}

export function TopThreeDoor() {
  const { data, update, today, toast } = useStore();
  const [items, setItems] = useState(() => (data.priorities.date === today ? data.priorities.items : ['', '', '']));
  const ready = items.every((t) => t.trim());

  const fill = () => {
    const ideas = suggestTopThree(data, today);
    if (!ideas.length) {
      toast('Nothing to suggest yet. Write your own three', 'info');
      return;
    }
    setItems((now) => {
      const left = [...ideas];
      return now.map((t) => (t.trim() ? t : (left.shift() ?? '')));
    });
  };
  const [opening, setOpening] = useState(false);
  const enter = (e: FormEvent) => {
    e.preventDefault();
    if (!ready || opening) return;
    const save = () =>
      update((d) => {
        const keep = d.priorities.date === today ? d.priorities.done : [false, false, false];
        d.priorities = { date: today, items: items.map((t) => t.trim()), done: keep, entered: true };
      });
    // Let the door swing open first (instantly for people who prefer less motion).
    const quick = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setOpening(true);
    if (quick) save();
    else window.setTimeout(save, 1100);
  };

  return (
    <main className={`day-door ${opening ? 'is-opening' : ''}`}>
      <div className="door-sign" aria-hidden="true">
        BEK'S BASE
      </div>
      <div className="door-frame">
        <div className="door-light" aria-hidden="true" />
      <form className="door-leaf" onSubmit={enter}>
        <span className="door-leaf__window" aria-hidden="true" />
        <span className="door-leaf__knob" aria-hidden="true" />
        <div className="door-note">
        <h1 className="day-door__title">Good to see you</h1>
        <p>{formatDay(today)}. What are your top 3 goals today? Write them to come in.</p>
        {items.map((t, i) => (
          <label key={i} className="day-door__goal">
            <span aria-hidden="true">{i + 1}</span>
            <input
              className="input"
              value={t}
              aria-label={`Goal ${i + 1}`}
              autoFocus={i === 0}
              onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))}
            />
          </label>
        ))}
        <button type="button" className="btn btn--wide" onClick={fill}>
          <PixelIcon name="star" size={16} /> Fill them for me
        </button>
        <button type="submit" className="btn btn--primary btn--wide" disabled={!ready}>
          {opening ? 'Opening…' : 'Open my day'}
        </button>
        <p className="muted small">The door opens again from {DOOR_FROM_HOUR}am each day.</p>
        </div>
      </form>
      </div>
    </main>
  );
}

const readLater = () => {
  try {
    return localStorage.getItem(LATER_KEY);
  } catch {
    return null;
  }
};

export function EveningCheckin() {
  const { data, update, today, toast } = useStore();
  const hour = useHour();
  const [later, setLater] = useState(readLater);
  const [line, setLine] = useState('');
  const [mood, setMood] = useState<Mood | null>(data.moods[today] ?? null);
  const [savedOn, setSavedOn] = useState('');

  if (savedOn === today && isSunday(today))
    return (
      <aside className="evening" aria-label="Weekly review">
        <p className="evening__title">It's Sunday. Time for an honest look at your week.</p>
        <div className="form__row">
          <a href="#/reflect/week" className="btn btn--primary grow" onClick={() => setSavedOn('')}>
            See my week
          </a>
          <button type="button" className="btn" onClick={() => setSavedOn('')}>
            Not now
          </button>
        </div>
      </aside>
    );
  if (!eveningDue(data, today, hour) || later === today) return null;

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!line.trim() || !mood) {
      toast(line.trim() ? 'Tap how you felt' : 'Write what you did today', 'error');
      return;
    }
    update((d) => {
      const empty: NightLog = { line: '', good: ['', '', ''], tomorrow: '' };
      d.nightLogs[today] = { ...(d.nightLogs[today] ?? empty), line: line.trim() };
      d.moods[today] = mood;
    });
    setSavedOn(today);
    toast('Saved. Well done today', 'pop');
  };
  const wait = () => {
    setLater(today);
    try {
      localStorage.setItem(LATER_KEY, today);
    } catch {
      // Without storage it just asks again next time the app opens.
    }
  };

  return (
    <form className="evening" onSubmit={save} aria-label="Evening check-in">
      <p className="evening__title">How did today go?</p>
      <textarea className="input" rows={2} value={line} onChange={(e) => setLine(e.target.value)} placeholder="What did you do today?" aria-label="What did you do today?" />
      <div className="evening__moods" role="group" aria-label="How did you feel about it?">
        {MOOD_WORDS.map((m) => (
          <button key={m.value} type="button" className={`btn btn--small ${mood === m.value ? 'btn--primary' : ''}`} aria-pressed={mood === m.value} onClick={() => setMood(m.value)}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="form__row">
        <button type="submit" className="btn btn--primary grow">
          Save
        </button>
        <button type="button" className="btn" onClick={wait}>
          Later
        </button>
      </div>
    </form>
  );
}
