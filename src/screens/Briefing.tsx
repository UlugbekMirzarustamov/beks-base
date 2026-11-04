/**
 * The morning briefing: the first time you open the app each day, one cosy
 * card with today at a glance — weather, classes, prayers, money, tests,
 * your top 3, Qur'an goal, and a word from Simba. Also opens from Home.
 */
import { useEffect, useState } from 'react';
import { pick } from '../lib/cabin';
import { daysBetween, formatDay, UK_TZ, zonedParts } from '../lib/dates';
import { formatMoney, safeToSpend } from '../lib/money';
import { minsToClock, PRAYER_INFO } from '../lib/prayer';
import { WEATHER_INFO, weatherKind } from '../lib/weather';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { useWeather } from '../ui/Weather';
import { classesOn } from './Planner';
import { usePrayer } from './Prayer';

const SEEN_KEY = 'beks-briefing-day';

const SIMBA_MORNING = [
  'Simba says: "Breakfast first. Then conquer the day."',
  'Simba says: "I already napped twice. Your turn to be productive."',
  'Simba says: "Don’t forget your umbrella. Sheffield is Sheffield."',
  'Simba says: "Proud of you for being here, so far from home."',
  'Simba says: "One small win today is enough."',
];

function seenToday(today: string) {
  try {
    return localStorage.getItem(SEEN_KEY) === today;
  } catch {
    return true; // can't remember → don't nag
  }
}

export function MorningBriefing() {
  const { data, today } = useStore();
  const [open, setOpen] = useState(() => !seenToday(today));
  const weather = useWeather();
  const prayer = usePrayer();
  const [simba] = useState(() => pick(SIMBA_MORNING));

  // A new day while the app is open → show it again; "Today's briefing" button → open it.
  useEffect(() => {
    if (!seenToday(today)) setOpen(true);
  }, [today]);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('beks:briefing', show);
    return () => window.removeEventListener('beks:briefing', show);
  }, []);

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, today);
    } catch {
      /* ignore */
    }
    setOpen(false);
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!open) return null;

  const h = zonedParts(new Date(), UK_TZ).hour;
  const hello = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const classes = classesOn(data, today);
  const day = weather?.daily.find((d) => d.date === today);
  const dayInfo = day ? WEATHER_INFO[weatherKind(day.code)] : null;
  const money = safeToSpend(data.monthlyBudget, data.expenses, today);
  const test = data.tests.filter((t) => t.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const top = data.priorities.items.filter((x) => x.trim());
  const prayedToday = Object.keys(PRAYER_INFO).filter((p) => data.prayers[today]?.includes(p as never)).length;

  return (
    <div className="briefing" role="dialog" aria-modal="true" aria-labelledby="briefing-title">
      <div className="briefing__card">
        <p className="briefing__date">{formatDay(today)}</p>
        <h2 id="briefing-title" className="briefing__title">
          {hello}, Bek!
        </h2>

        <ul className="briefing__list">
          <li>
            <PixelIcon name={dayInfo?.icon ?? 'cloud'} size={26} />
            <span>
              {day && dayInfo ? (
                <>
                  <strong>{dayInfo.label}</strong>, {day.max}° / {day.min}° · {day.rain}% chance of rain
                  {day.rain >= 60 && ' — take an umbrella!'}
                </>
              ) : (
                'Weather loads when you’re online.'
              )}
            </span>
          </li>
          <li>
            <PixelIcon name="clock" size={26} />
            <span>
              {classes.length ? (
                <>
                  <strong>
                    {classes.length} class{classes.length === 1 ? '' : 'es'}
                  </strong>
                  : {classes.map((c) => `${c.start} ${c.name}${c.room ? ` (${c.room})` : ''}`).join(' · ')}
                </>
              ) : (
                <strong>No classes today.</strong>
              )}
            </span>
          </li>
          <li>
            <PixelIcon name="lantern" size={26} />
            <span>
              <strong>{PRAYER_INFO[prayer.next.name].name}</strong> at {minsToClock(prayer.next.start)}
              {prayer.dueNow && (
                <>
                  {' '}
                  · <strong>{PRAYER_INFO[prayer.dueNow.name].name}</strong> is due now
                </>
              )}{' '}
              · {prayedToday}/5 lanterns lit
            </span>
          </li>
          <li>
            <PixelIcon name="coin" size={26} />
            <span>
              Safe to spend today: <strong>{formatMoney(money.perDay)}</strong>
            </span>
          </li>
          {test && daysBetween(today, test.date) <= 21 && (
            <li>
              <PixelIcon name="calendar" size={26} />
              <span>
                <strong>{test.name}</strong> in {daysBetween(today, test.date)} day{daysBetween(today, test.date) === 1 ? '' : 's'}
              </span>
            </li>
          )}
          <li>
            <PixelIcon name="star" size={26} />
            <span>{top.length ? <>Top {top.length}: {top.join(' · ')}</> : <a href="#/planner/today" onClick={close}>Pick today's top 3 →</a>}</span>
          </li>
          <li>
            <PixelIcon name="quran" size={26} />
            <span>
              Qur'an: {data.quran.log[today] ?? 0}/{data.quran.dailyGoal} pages today
            </span>
          </li>
        </ul>

        <p className="briefing__simba">
          <PixelIcon name="cat" size={22} /> {simba}
        </p>
        <button type="button" className="btn btn--primary btn--wide" onClick={close} autoFocus>
          Let's go!
        </button>
      </div>
    </div>
  );
}
