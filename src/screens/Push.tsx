/**
 * Fajr rise: tap "I'm up" each morning. Sleep through Fajr and you get the
 * wake-up call (OversleptCall). (Promise to Simba, the ghost race, hard mode and the vision board
 * were removed at Bek's request; their saved data is untouched.)
 */
import { useState } from 'react';
import { formatDay, UK_TZ, zonedParts } from '../lib/dates';
import { minsToClock, prayerTimes } from '../lib/prayer';
import {
  brutalLine,
  oversleptRecently,
  riseOnTime,
  riseStreak,
} from '../lib/push';
import { buzz, sfx } from '../lib/sound';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Panel } from '../ui/kit';

const RISE_XP = 15;
const ukNow = () => {
  const p = zonedParts(new Date(), UK_TZ);
  return { mins: p.hour * 60 + p.minute, hhmm: `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}` };
};

// ---------------------------------------------------------------- Fajr rise
/** Home card in the morning (from Fajr until noon) until you say when you got up. */
export function FajrRise() {
  const { data, update, today, gainXp, toast } = useStore();
  const t = prayerTimes(today, data.settings.prayer);
  const now = ukNow();
  const streak = riseStreak(data, today);
  if (data.rise[today] || now.mins < t.fajr || now.mins >= 12 * 60) return null;

  const up = (wasUpForFajr: boolean) => {
    const onTime = wasUpForFajr || riseOnTime(now.hhmm, t.sunrise);
    update((d) => void (d.rise[today] = { time: now.hhmm, onTime }));
    if (onTime) {
      sfx('bell');
      buzz(20);
      gainXp(RISE_XP, 'up for Fajr');
      toast(streak > 0 ? `Up for Fajr, ${streak + 1} mornings in a row. That's discipline.` : 'Up for Fajr. That’s how winners start.', 'level');
    }
  };

  if (now.mins < t.sunrise) {
    return (
      <Panel title="Fajr rise" icon="sun" className="rise-card">
        <p>
          Fajr is now, until sunrise at <strong>{minsToClock(t.sunrise)}</strong>. Get up, make wudu, pray.
        </p>
        <button type="button" className="btn btn--primary btn--wide" onClick={() => up(false)}>
          <PixelIcon name="sun" size={18} /> I'm up!
        </button>
        {streak > 0 && <p className="muted small">{streak} morning{streak === 1 ? '' : 's'} in a row. Don't break it.</p>}
      </Panel>
    );
  }
  return (
    <Panel title="Fajr rise" icon="sun" className="rise-card is-late">
      <p>
        The sun rose at <strong>{minsToClock(t.sunrise)}</strong>. Were you up for Fajr at {minsToClock(t.fajr)}? Be honest.
      </p>
      <div className="form__actions">
        <button type="button" className="btn grow" onClick={() => up(true)}>
          I was up, forgot to tap
        </button>
        <button type="button" className="btn btn--danger grow" onClick={() => up(false)}>
          I overslept
        </button>
      </div>
    </Panel>
  );
}

const SEEN_KEY = 'beks-overslept-seen';

/** Full screen, red, no softening: shown once on a day you slept through Fajr. */
export function OversleptCall() {
  const { data, today } = useStore();
  const [, setTick] = useState(0);
  const rise = data.rise[today];
  let seen = false;
  try {
    seen = localStorage.getItem(SEEN_KEY) === today;
  } catch {
    /* storage blocked: show it */
  }
  if (!rise || rise.onTime || seen) return null;

  const t = prayerTimes(today, data.settings.prayer);
  const fajr = minsToClock(t.fajr);
  const sunrise = minsToClock(t.sunrise);
  const times = oversleptRecently(data, today);
  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, today);
    } catch {
      /* ignore */
    }
    setTick((n) => n + 1);
  };
  return (
    <div className="overslept" role="alertdialog" aria-modal="true" aria-labelledby="overslept-title">
      <p className="overslept__label">{formatDay(today)}</p>
      <h2 id="overslept-title" className="overslept__title">
        You slept through Fajr.
      </h2>
      <p className="overslept__line">{brutalLine(today, fajr, sunrise)}</p>
      <ul className="overslept__facts">
        <li>Fajr {fajr}</li>
        <li>Sunrise {sunrise}</li>
        <li>You got up {rise.time}</li>
        <li>
          {times}× in 30 days
        </li>
      </ul>
      <div className="overslept__now">
        <p>
          <strong>Now fix it:</strong>
        </p>
        <ol>
          <li>Pray Fajr now as qada. Before anything else.</li>
          <li>Tonight: phone across the room, in bed by 23:30.</li>
          <li>Two alarms: one at Fajr, one 5 minutes later.</li>
        </ol>
      </div>
      <button type="button" className="btn btn--primary btn--wide" onClick={close} autoFocus>
        I'll pray it now. Tomorrow I'm up.
      </button>
    </div>
  );
}


