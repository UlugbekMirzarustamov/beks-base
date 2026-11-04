/**
 * 🕌 PRAYER — five lanterns a day.
 *
 * Prayer is built into the whole app, not hidden in a corner:
 *  - <PrayerBar>      a glowing strip under the top bar on EVERY screen: the
 *                     prayer that's due now (with a one-tap "Prayed") or a countdown to the next.
 *  - <PrayerCall>     when you open the app during a prayer you haven't marked
 *                     yet, a calm full-screen call: "It's time for Asr".
 *  - <PrayerLanterns> five lanterns at the top of Home that light up as you pray.
 *  - Prayer page      today's times, your week, streak, qibla compass, settings.
 * Times are worked out for Sheffield on the device (see lib/prayer.ts).
 */
import { useEffect, useMemo, useState } from 'react';
import { addDays, formatDay, UK_TZ, WEEKDAYS, weekdayOf, zonedParts } from '../lib/dates';
import { daySlots, minsToClock, minsToWait, PRAYER_INFO, PRAYERS, prayerNow, prayerTimes, qiblaBearing } from '../lib/prayer';
import { buzz, sfx } from '../lib/sound';
import type { PrayerName } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Field, Panel, Segmented, Tabs, useConfirm, useSubRoute } from '../ui/kit';
import { Quran, Tasbih } from './Devotion';

const PRAYER_XP = 15;
const FULL_DAY_XP = 25;

/** Short, gentle reminders shown with the call and on the lanterns. */
const REMINDERS = [
  '“Indeed, prayer has been decreed upon the believers at specified times.” — Qur’an 4:103',
  '“Seek help through patience and prayer.” — Qur’an 2:45',
  '“The coolness of my eyes is in prayer.” — the Prophet ﷺ',
  'Five minutes on the mat, then back to the books — calmer and clearer.',
  'Your studies can wait five minutes. This moment is for Allah.',
  'Far from home, but never far from Him. Go and pray.',
];

// ---------------------------------------------------------------- shared state
/** Minutes after midnight in the UK, refreshed every 20 seconds. */
function useUkMinutes(): number {
  const read = () => {
    const p = zonedParts(new Date(), UK_TZ);
    return p.hour * 60 + p.minute;
  };
  const [mins, setMins] = useState(read);
  useEffect(() => {
    const id = setInterval(() => setMins(read()), 20_000);
    const onShow = () => setMins(read());
    document.addEventListener('visibilitychange', onShow);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, []);
  return mins;
}

/** Everything the prayer UI needs: times, what's due, what's done, and actions. */
export function usePrayer() {
  const { data, update, today, gainXp, toast } = useStore();
  const settings = data.settings.prayer;
  const nowMins = useUkMinutes();
  const state = useMemo(() => prayerNow(today, nowMins, settings), [today, nowMins, settings]);
  const prayed = (name: PrayerName, date = today) => data.prayers[date]?.includes(name) ?? false;

  const mark = (name: PrayerName, date = today) => {
    if (prayed(name, date)) return;
    const after = [...(data.prayers[date] ?? []), name];
    update((d) => {
      d.prayers[date] = after;
    });
    sfx('bell');
    buzz(15);
    gainXp(PRAYER_XP, `${PRAYER_INFO[name].name} prayed`);
    if (PRAYERS.every((p) => after.includes(p))) {
      gainXp(FULL_DAY_XP, 'all five prayers');
      toast('All five lanterns lit today. MashaAllah!', 'level');
    }
  };
  const unmark = (name: PrayerName, date = today) => {
    if (!prayed(name, date)) return;
    const wasFull = PRAYERS.every((p) => prayed(p, date));
    update((d) => {
      d.prayers[date] = (d.prayers[date] ?? []).filter((p) => p !== name);
    });
    gainXp(-(PRAYER_XP + (wasFull ? FULL_DAY_XP : 0)));
  };

  /** Days in a row (ending yesterday, or today if complete) with all five prayers. */
  const streak = (() => {
    const full = (d: string) => PRAYERS.every((p) => data.prayers[d]?.includes(p));
    let day = full(today) ? today : addDays(today, -1);
    let n = 0;
    while (full(day) && n < 3650) {
      n++;
      day = addDays(day, -1);
    }
    return n;
  })();

  const dueNow = state.current && !prayed(state.current.name, state.current.date) ? state.current : null;
  return { ...state, nowMins, today, settings, prayed, mark, unmark, streak, dueNow };
}

// ---------------------------------------------------------------- the strip on every screen
export function PrayerBar() {
  const { dueNow, next, mark, prayed, today } = usePrayer();
  const done = PRAYERS.filter((p) => prayed(p, today)).length;

  return (
    <div className={`prayer-bar ${dueNow ? 'is-due' : ''}`} role="region" aria-label="Prayer">
      <a href="#/prayer" className="prayer-bar__main">
        <PixelIcon name="lantern" size={22} />
        {dueNow ? (
          <span>
            <strong>{PRAYER_INFO[dueNow.name].name} now</strong> · {minsToWait(dueNow.minsLeft)} left
          </span>
        ) : (
          <span>
            <strong>{PRAYER_INFO[next.name].name}</strong> {minsToClock(next.start)} · in {minsToWait(next.minsUntil)}
          </span>
        )}
      </a>
      <span className="prayer-bar__dots" aria-label={`${done} of 5 prayers today`}>
        {PRAYERS.map((p) => (
          <span key={p} className={`prayer-dot ${prayed(p, today) ? 'is-on' : ''}`} />
        ))}
      </span>
      {dueNow && (
        <button type="button" className="btn btn--small prayer-bar__btn" onClick={() => mark(dueNow.name, dueNow.date)}>
          Prayed ✓
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- the full-screen call
const SNOOZE_KEY = 'beks-prayer-snooze';

/**
 * Shown when you open (or come back to) the app during a prayer you haven't
 * marked. "I'll pray now" / "Later" hide it for a while; it never nags more than that.
 */
export function PrayerCall() {
  const { dueNow, mark, settings } = usePrayer();
  const [snoozeTick, setSnoozeTick] = useState(0);
  const [reminder] = useState(() => REMINDERS[Math.floor(Math.random() * REMINDERS.length)]);

  const key = dueNow ? `${dueNow.date}-${dueNow.name}` : '';
  const snoozedUntil = (() => {
    try {
      const s = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? '{}') as { key?: string; until?: number };
      return s.key === key ? (s.until ?? 0) : 0;
    } catch {
      return 0;
    }
  })();
  void snoozeTick; // re-read the snooze after a button press

  const show = Boolean(settings.call && dueNow && Date.now() > snoozedUntil);
  const snooze = (minutes: number) => {
    try {
      localStorage.setItem(SNOOZE_KEY, JSON.stringify({ key, until: Date.now() + minutes * 60_000 }));
    } catch {
      /* storage blocked: it just closes for now */
    }
    setSnoozeTick((t) => t + 1);
  };

  useEffect(() => {
    if (!show) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && snooze(30);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!show || !dueNow) return null;
  const info = PRAYER_INFO[dueNow.name];
  return (
    <div className="prayer-call" role="dialog" aria-modal="true" aria-labelledby="prayer-call-title">
      <div className="prayer-call__sky" aria-hidden="true">
        <span className="prayer-call__moon" />
        <span className="prayer-call__lanterns">
          {PRAYERS.map((p) => (
            <span key={p} className={`big-lantern big-lantern--small ${p === dueNow.name ? 'is-now' : ''}`} />
          ))}
        </span>
      </div>
      <p className="prayer-call__arabic" lang="ar">
        {info.arabic}
      </p>
      <h2 id="prayer-call-title" className="prayer-call__title">
        It's time for {info.name}
      </h2>
      <p className="prayer-call__time">
        Until {minsToClock(dueNow.end)} · {minsToWait(dueNow.minsLeft)} left
      </p>
      <p className="prayer-call__reminder">{reminder}</p>
      <div className="prayer-call__actions">
        <button type="button" className="btn btn--primary" onClick={() => mark(dueNow.name, dueNow.date)} autoFocus>
          I've prayed ✓
        </button>
        <button type="button" className="btn" onClick={() => snooze(15)}>
          Going to pray now
        </button>
        <button type="button" className="btn btn--ghost prayer-call__later" onClick={() => snooze(30)}>
          Remind me in 30 min
        </button>
      </div>
      <small className="prayer-call__note">{info.rakat}</small>
    </div>
  );
}

// ---------------------------------------------------------------- five lanterns (Home)
export function PrayerLanterns() {
  const { slots, current, nowMins, prayed, mark, unmark, today, streak } = usePrayer();
  const ask = useConfirm();
  const done = PRAYERS.filter((p) => prayed(p, today)).length;
  const [reminder] = useState(() => REMINDERS[Math.floor(Math.random() * REMINDERS.length)]);

  const tap = async (name: PrayerName, upcoming: boolean) => {
    if (prayed(name)) {
      if (await ask(`Unmark ${PRAYER_INFO[name].name} as prayed?`, { ok: 'Unmark' })) unmark(name);
    } else if (upcoming) {
      // Not time yet — nothing to mark.
    } else mark(name);
  };

  return (
    <section className="lanterns" aria-label="Today's prayers">
      <div className="lanterns__row">
        {slots.map((s) => {
          const isPrayed = prayed(s.name);
          const isNow = current?.name === s.name && current.date === today;
          const upcoming = s.start > nowMins;
          const missed = !isPrayed && !isNow && !upcoming;
          const state = isPrayed ? 'lit' : isNow ? 'now' : missed ? 'missed' : 'waiting';
          return (
            <button
              key={s.name}
              type="button"
              className={`lantern-slot lantern-slot--${state}`}
              onClick={() => tap(s.name, upcoming)}
              aria-pressed={isPrayed}
              aria-label={`${PRAYER_INFO[s.name].name} at ${minsToClock(s.start)}: ${isPrayed ? 'prayed' : isNow ? 'time now, tap when prayed' : missed ? 'not marked, tap if you prayed it' : 'later today'}`}
            >
              <span className="big-lantern" aria-hidden="true" />
              <span className="lantern-slot__name">{PRAYER_INFO[s.name].name}</span>
              <span className="lantern-slot__time">{minsToClock(s.start)}</span>
              {isNow && !isPrayed && <span className="lantern-slot__tag">NOW</span>}
            </button>
          );
        })}
      </div>
      <p className="lanterns__foot">
        <strong>{done}/5</strong> lit today
        {streak > 0 && (
          <>
            {' '}
            · <strong>{streak}</strong>-day streak of all five
          </>
        )}{' '}
        · <span className="muted">{reminder}</span>
      </p>
    </section>
  );
}

// ---------------------------------------------------------------- the Prayer page
const PAGE_TABS = ['today', 'tasbih', 'quran'] as const;
type PageTab = (typeof PAGE_TABS)[number];

export default function PrayerPage({ sub }: { sub?: string }) {
  const [tab, setTab] = useSubRoute<PageTab>('prayer', sub, PAGE_TABS);
  return (
    <div className="screen">
      <h1 className="screen__title">
        <PixelIcon name="mat" size={28} /> The Prayer Mat
      </h1>
      <Tabs<PageTab>
        label="Prayer sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'today', label: 'Prayers', icon: 'lantern' },
          { id: 'tasbih', label: 'Tasbih', icon: 'bead' },
          { id: 'quran', label: "Qur'an", icon: 'quran' },
        ]}
      />
      {tab === 'today' && <PrayersToday />}
      {tab === 'tasbih' && <Tasbih />}
      {tab === 'quran' && <Quran />}
    </div>
  );
}

function PrayersToday() {
  const { data, update } = useStore();
  const p = usePrayer();
  const ask = useConfirm();
  const times = prayerTimes(p.today, p.settings);
  const week = Array.from({ length: 7 }, (_, i) => addDays(p.today, i - 6));
  const qibla = Math.round(qiblaBearing());

  const setOffset = (name: PrayerName, v: number) =>
    update((d) => {
      d.settings.prayer.offsets[name] = Math.max(-60, Math.min(60, Math.round(v) || 0));
    });

  const toggle = async (name: PrayerName, date: string) => {
    if (p.prayed(name, date)) {
      if (await ask(`Unmark ${PRAYER_INFO[name].name} on ${formatDay(date)}?`, { ok: 'Unmark' })) p.unmark(name, date);
    } else p.mark(name, date);
  };

  return (
    <>
      <PrayerLanterns />
      <div className="grid grid--2">
        <Panel title={`Today · ${formatDay(p.today)}`} icon="lantern">
          <ul className="prayer-times">
            {daySlots(p.today, p.settings).map((s, i) => (
              <li key={s.name} className={p.current?.name === s.name && p.current.date === p.today ? 'is-now' : ''}>
                <span className="prayer-times__name">
                  {PRAYER_INFO[s.name].name} <span lang="ar">{PRAYER_INFO[s.name].arabic}</span>
                </span>
                <span className="prayer-times__clock">{minsToClock(s.start)}</span>
                <input type="checkbox" className="pixel-check" checked={p.prayed(s.name)} onChange={() => toggle(s.name, p.today)} aria-label={`Prayed ${PRAYER_INFO[s.name].name}`} />
                {i === 0 && (
                  <small className="prayer-times__sunrise muted">Sunrise {minsToClock(times.sunrise)} (Fajr ends)</small>
                )}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="This week" icon="calendar">
          <div className="prayer-week" role="table" aria-label="Prayers over the last 7 days">
            {week.map((d) => (
              <div key={d} className={`prayer-week__day ${d === p.today ? 'is-today' : ''}`} role="row">
                <span className="prayer-week__label" role="rowheader">
                  {WEEKDAYS[weekdayOf(d)]}
                </span>
                {PRAYERS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    role="cell"
                    className={`mini-lantern ${p.prayed(name, d) ? 'is-on' : ''}`}
                    aria-pressed={p.prayed(name, d)}
                    aria-label={`${PRAYER_INFO[name].name} on ${formatDay(d)}`}
                    onClick={() => (d === p.today && daySlots(d, p.settings).find((s) => s.name === name)!.start > p.nowMins ? undefined : toggle(name, d))}
                  />
                ))}
              </div>
            ))}
          </div>
          <p className="muted small">Forgot to tick one you prayed? Tap it here. Each prayer +{PRAYER_XP} XP, all five in a day +{FULL_DAY_XP}.</p>
        </Panel>

        <Panel title="Qibla" icon="globe">
          <div className="qibla">
            <div className="qibla__dial" aria-hidden="true">
              <span className="qibla__n">N</span>
              <span className="qibla__needle" style={{ transform: `rotate(${qibla}deg)` }} />
            </div>
            <p>
              From Sheffield the Kaaba is <strong>{qibla}°</strong> from north — roughly <strong>south-east</strong>. Stand facing north, then turn a
              bit more than a third of the way round to your right.
            </p>
          </div>
        </Panel>

        <Panel title="Prayer settings" icon="gear">
          <p className="field__label">Asr time</p>
          <Segmented
            label="Asr method"
            value={p.settings.asr}
            onChange={(v) => update((d) => void (d.settings.prayer.asr = v))}
            options={[
              { value: 'hanafi', label: 'Hanafi (later)' },
              { value: 'standard', label: 'Shafi’i / standard' },
            ]}
          />
          <p className="muted small">
            Times are calculated for Sheffield. If your mosque's timetable is a few minutes different, nudge each prayer here (minutes, + or −).
          </p>
          <div className="offsets">
            {PRAYERS.map((name) => (
              <Field key={name} label={PRAYER_INFO[name].name}>
                <input className="input" type="number" min={-60} max={60} value={p.settings.offsets[name]} onChange={(e) => setOffset(name, Number(e.target.value))} />
              </Field>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={data.settings.prayer.call} onChange={(e) => update((d) => void (d.settings.prayer.call = e.target.checked))} />
            <span>Show the full-screen "time to pray" call when I open the app</span>
          </label>
        </Panel>
      </div>
    </>
  );
}
