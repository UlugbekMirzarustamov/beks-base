/**
 * Break reminders: after `settings.breakEvery` minutes with the app open and visible, a small card
 * suggests a short break (stretch, water, look far away). Pomodoro sessions have their own breaks, so
 * it waits while the timer runs; time away from the app counts as a break. Nothing is scored.
 */
import { useEffect, useRef, useState } from 'react';
import { BREAK_IDEAS, breakDue } from '../lib/rooms';
import { sfx } from '../lib/sound';
import { useStore, useTimer } from '../state/store';
import { PixelIcon } from './icons';

/** Away this long (minutes) counts as having had a break. */
const AWAY_RESET = 5;

export function BreakReminder() {
  const { data } = useStore();
  const timer = useTimer();
  const every = data.settings.breakEvery;
  const [minutes, setMinutes] = useState(0);
  const [show, setShow] = useState(false);
  const [idea, setIdea] = useState(BREAK_IDEAS[0]);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    if (!every) return;
    const tick = window.setInterval(() => {
      if (document.visibilityState === 'visible') setMinutes((m) => m + 1);
    }, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current >= AWAY_RESET * 60_000) {
        setMinutes(0);
        setShow(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [every]);

  useEffect(() => {
    if (!show && !timer.running && breakDue(minutes, every)) {
      setIdea(BREAK_IDEAS[Math.floor(Math.random() * BREAK_IDEAS.length)]);
      setShow(true);
      sfx('chime');
    }
  }, [minutes, every, show, timer.running]);

  if (!show) return null;
  return (
    <div className="break-card" role="dialog" aria-label="Time for a short break">
      <PixelIcon name="cat" size={32} />
      <div className="grow">
        <strong>Time for a short break</strong>
        <p className="small">
          {every} minutes on the screen. {idea}
        </p>
        <div className="form__row">
          <button
            type="button"
            className="btn btn--small btn--primary"
            onClick={() => {
              setShow(false);
              setMinutes(0);
            }}
          >
            Done
          </button>
          <button
            type="button"
            className="btn btn--small"
            onClick={() => {
              setShow(false);
              setMinutes(Math.max(0, every - 10));
            }}
          >
            In 10 min
          </button>
        </div>
      </div>
    </div>
  );
}

/** The break reminder setting (More → Settings and the Bedroom). */
export function BreakSetting() {
  const { data, update } = useStore();
  return (
    <label className="form__row">
      <span className="grow small">Remind me to take a short break after</span>
      <select className="input" value={data.settings.breakEvery} onChange={(e) => update((d) => void (d.settings.breakEvery = Number(e.target.value)))} aria-label="Break reminder">
        <option value={0}>Off</option>
        {[30, 45, 50, 60, 90].map((m) => (
          <option key={m} value={m}>
            {m} min
          </option>
        ))}
      </select>
    </label>
  );
}
