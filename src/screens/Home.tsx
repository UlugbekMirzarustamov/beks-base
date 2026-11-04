/**
 * 🏠 HOME — the cabin, plus everything important at a glance.
 */
import { addDays, daysBetween, formatDay, startOfWeek, toMinutes, UK_TZ, weekdayOf, zonedParts } from '../lib/dates';
import { minsToWait } from '../lib/prayer';
import { levelInfo } from '../lib/xp';
import { Cabin } from '../scene/Cabin';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Bar, Empty, Panel } from '../ui/kit';
import { Clocks, MoodCheckIn } from './Extras';
import { InstallCard } from '../ui/AppFeel';
import { OnePercent, WindDown } from './Daily';
import { openJar } from './Calm';
import { BadgeSummary } from './Badges';
import { coins } from '../lib/shop';
import { potStatus } from '../lib/pot';
import { SafeToSpendCard, SavingsMini } from './Money';
import { classesOn, TaskRow, TopThree } from './Planner';
import { PrayerLanterns, usePrayer } from './Prayer';
import { useWeather, WeatherCard, windowWeather } from '../ui/Weather';
import { useMemo, useState, useEffect, useRef } from 'react';
import { nextUnlock, pick, seasonOf, simbaMood, SIMBA_LINES, SIMBA_PETS, streak, UNLOCKS } from '../lib/cabin';
import { barLevel, formatMoney, safeToSpend, spentInMonth } from '../lib/money';
import { buzz, sfx } from '../lib/sound';
import { PRAYER_INFO, PRAYERS } from '../lib/prayer';
import { monthOf } from '../lib/dates';
import { useTimer } from '../state/store';
import { skyAt, type CabinScene } from '../scene/Cabin';
import { daysLeftLabel } from './Study';

function greeting(): string {
  const h = zonedParts(new Date(), UK_TZ).hour;
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const { data, today } = useStore();
  const { scene, bubble, petSimba, bekLine, tapBek } = useCabinScene();
  const lvl = levelInfo(data.xp);
  const upcoming = data.tests.filter((t) => t.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const nextTest = upcoming[0];
  const soonLimit = addDays(today, 7);
  const dueSoon = data.tasks.filter((t) => !t.done && t.due && t.due <= soonLimit).sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''));
  const studiedToday = data.studyLog.filter((s) => s.date === today).reduce((a, s) => a + s.minutes, 0);

  return (
    <div className="screen home">
      <h1 className="visually-hidden">Bek's Base — Home</h1>
      <PrayerLanterns />
      <div className="home__top">
        <div className="home__scene">
          <Cabin scene={scene} bubble={bubble} onPetSimba={petSimba} bekBubble={bekLine} onTapBek={tapBek} onOpenJar={openJar} />
        </div>
        <div className="greeting-row">
          <p className="greeting">
            {greeting()}, Bek! <span className="muted">· {formatDay(today)}</span>
          </p>
          <div className="greeting-row__buttons">
            <button type="button" className="btn btn--small" onClick={() => window.dispatchEvent(new Event('beks:briefing'))}>
              <PixelIcon name="sun" size={16} /> Today's briefing
            </button>
            <a href="#/calm" className="btn btn--small">
              <PixelIcon name="lantern" size={16} /> I need a minute
            </a>
          </div>
        </div>
        <Clocks />
        <InstallCard compact />
      </div>
      <WindDown />
      <div className="grid grid--home">
        <OnePercent />
        <TodayClasses />
        <SafeToSpendCard />
        <WeatherCard />
        <SavingsMini />

        <Panel title="Next test" icon="calendar">
          {nextTest ? (
            <a href="#/study/tests" className="next-test">
              <span className="big-number">{daysBetween(today, nextTest.date)}</span>
              <span>
                <strong>{daysLeftLabel(daysBetween(today, nextTest.date))}</strong>
                <br />
                {nextTest.name}
                <br />
                <small className="muted">{formatDay(nextTest.date)}</small>
              </span>
            </a>
          ) : (
            <Empty>
              No tests coming up. <a href="#/study/tests">Add one →</a>
            </Empty>
          )}
          {upcoming.length > 1 && (
            <ul className="mini-list">
              {upcoming.slice(1, 3).map((t) => (
                <li key={t.id}>
                  {t.name} — <strong>{daysLeftLabel(daysBetween(today, t.date))}</strong>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Today's top 3" icon="star">
          <TopThree />
        </Panel>

        <Panel title="Due soon" icon="check">
          {dueSoon.length === 0 ? (
            <Empty>Nothing due in the next 7 days.</Empty>
          ) : (
            <ul className="tasks">
              {dueSoon.slice(0, 5).map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </ul>
          )}
          <a href="#/planner/today" className="more-link">
            All tasks →
          </a>
        </Panel>

        <Panel title="How are you today?" icon="heart">
          <MoodCheckIn />
          <a href="#/more/mood" className="more-link">
            This week →
          </a>
        </Panel>

        {weekdayOf(today) >= 4 && !data.reflections[startOfWeek(today)]?.wentWell && (
          <Panel title="Week's nearly done" icon="scroll">
            <p>Take 3 minutes to look back: what went well, what was hard, what to try next week.</p>
            <a href="#/reflect/week" className="btn btn--primary">
              Reflect on my week
            </a>
          </Panel>
        )}

        <Panel title={`Level ${lvl.level}`} icon="star" className="level-card">
          <Bar value={lvl.into} max={lvl.needed} label="XP towards next level" color="var(--xp)" />
          <p className="bar-caption">
            {lvl.into} / {lvl.needed} XP to level {lvl.level + 1}
          </p>
          <p className="muted small">
            <PixelIcon name="clock" size={14} /> {studiedToday} min studied today · Tasks +10 · Top 3 +15 · Pomodoro +25 · Prayer +15
          </p>
          <CabinUnlocks level={lvl.level} />
          <div className="level-links">
            <BadgeSummary />
            <a href="#/more/shop" className="badge-summary">
              <PixelIcon name="coin" size={16} /> {coins(data)} coins · Cabin shop →
            </a>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/** Today's school classes, with what's on now and what's next. Shows the next school day when today is free or finished. */
function TodayClasses() {
  const { data, today } = useStore();
  const p = zonedParts(new Date(), UK_TZ);
  const now = p.hour * 60 + p.minute;
  const todays = classesOn(data, today);
  const allDone = todays.length > 0 && todays.every((c) => toMinutes(c.end) <= now);

  // The next day (within 2 weeks) that has classes, for when today is free or finished.
  let nextDay: string | null = null;
  for (let i = 1; i <= 14 && !nextDay; i++) if (classesOn(data, addDays(today, i)).length) nextDay = addDays(today, i);
  const showNext = (todays.length === 0 || allDone) && nextDay;
  const list = showNext ? classesOn(data, nextDay!) : todays;
  const nextUp = !showNext ? todays.find((c) => toMinutes(c.start) > now) : undefined;

  return (
    <Panel title={showNext ? `Classes · ${daysBetween(today, nextDay!) === 1 ? 'tomorrow' : formatDay(nextDay!)}` : "Today's classes"} icon="clock">
      {todays.length === 0 && !nextDay && <Empty>No classes coming up. Enjoy the free time!</Empty>}
      {showNext && <p className="muted small">{todays.length === 0 ? 'No classes today 🎉 Here is the next school day:' : 'All done for today! Coming up next:'}</p>}
      <ul className="class-list">
        {list.map((c) => {
          const start = toMinutes(c.start);
          const end = toMinutes(c.end);
          const live = !showNext && start <= now && now < end;
          const done = !showNext && end <= now;
          const isNext = c === nextUp;
          return (
            <li key={c.id} className={`class-row ${live ? 'is-live' : ''} ${done ? 'is-done' : ''}`}>
              <span className="class-row__time">
                {c.start}
                <small>{c.end}</small>
              </span>
              <span className="class-row__info">
                <strong>{c.name}</strong>
                <small className="muted">{[c.room, c.teacher].filter(Boolean).join(' · ')}</small>
              </span>
              {live && <span className="class-row__tag class-row__tag--live">NOW · {minsToWait(end - now)} left</span>}
              {isNext && <span className="class-row__tag">in {minsToWait(start - now)}</span>}
            </li>
          );
        })}
      </ul>
      <a href="#/planner/week" className="more-link">
        Whole week →
      </a>
    </Panel>
  );
}

/**
 * Works out everything the cabin shows: Simba's mood, streaks, unlocks, season
 * and real weather. Also handles petting Simba (a purr + something cute).
 */
function useCabinScene() {
  const { data, today } = useStore();
  const prayer = usePrayer();
  const { running, timer } = useTimer();
  const weather = useWeather();

  const month = monthOf(today);
  const pot = data.pot ? potStatus(data.pot, data.expenses, today) : null;
  const overBudget =
    (pot ? pot.leftToday < 0 || pot.fund < 0 : safeToSpend(data.monthlyBudget, data.expenses, today).left < 0) ||
    data.categories.some((c) => c.limit > 0 && barLevel(spentInMonth(data.expenses, month, c.id), c.limit) === 'over');
  const studyStreak = streak((d) => data.studyLog.some((s) => s.date === d), today);
  const mood = simbaMood({
    prayerDue: Boolean(prayer.dueNow),
    studying: running && timer.mode === 'work',
    overBudget,
    starLit: Boolean(data.nightLogs[today]?.rewarded),
    night: skyAt(new Date()).phase === 'night',
  });
  const level = levelInfo(data.xp).level;
  const kind = windowWeather(weather);
  const goodThings = Object.values(data.nightLogs).reduce((n, l) => n + l.good.filter((g) => g.trim()).length, 0);

  // Memoised so the cabin animation isn't restarted on every re-render.
  const scene = useMemo<CabinScene>(
    () => ({ mix: data.settings.mixer, level, prayerStreak: prayer.streak, studyStreak, simba: mood, season: seasonOf(today), weather: kind, avatar: data.settings.avatar, decor: data.shop.placed, flowers: data.studyLog.length, jarNotes: goodThings }),
    [data.settings.mixer, level, prayer.streak, studyStreak, mood, today, kind, data.settings.avatar, data.shop.placed, data.studyLog.length, goodThings],
  );

  // Simba speaks up on his own for important moods (once per mood change).
  const prayerName = prayer.dueNow ? PRAYER_INFO[prayer.dueNow.name].name : '';
  const autoLine = useMemo(
    () => (mood === 'prayer' || mood === 'study' || mood === 'worried' ? pick(SIMBA_LINES[mood]).replace('{prayer}', prayerName) : null),
    [mood, prayerName],
  );
  const [petLine, setPetLine] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timerRef.current), []);
  const petSimba = () => {
    sfx('purr');
    buzz([10, 30, 10]);
    const yarn = data.shop.placed.toy === 'yarn' ? ['*bats the yarn ball across the floor*', 'Thank you for the yarn ball!'] : [];
    const pool = [...(mood === 'cosy' || mood === 'sleep' ? [...SIMBA_PETS, ...SIMBA_LINES[mood]] : SIMBA_PETS), ...yarn];
    setPetLine(pick(pool));
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPetLine(null), 3500);
  };

  // Tap Bek → a quick, honest "how's my day" line (rotates through a few).
  const [bekLine, setBekLine] = useState<string | null>(null);
  const bekTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const bekTurn = useRef(0);
  useEffect(() => () => clearTimeout(bekTimer.current), []);
  const tapBek = () => {
    sfx('tick');
    const lit = PRAYERS.filter((p) => data.prayers[today]?.includes(p)).length;
    const nowMins = zonedParts(new Date(), UK_TZ).hour * 60 + zonedParts(new Date(), UK_TZ).minute;
    const nextClass = classesOn(data, today).find((c) => toMinutes(c.start) > nowMins);
    const lines = [
      `${lit}/5 lanterns lit today. ${lit === 5 ? 'Alhamdulillah!' : 'Keep going!'}`,
      data.pot
        ? `${formatMoney(potStatus(data.pot, data.expenses, today).leftToday)} left today · wish fund ${formatMoney(potStatus(data.pot, data.expenses, today).fund)}.`
        : `${formatMoney(safeToSpend(data.monthlyBudget, data.expenses, today).perDay)} safe to spend today.`,
      nextClass ? `Next: ${nextClass.name} at ${nextClass.start}${nextClass.room ? ` in ${nextClass.room}` : ''}.` : 'No more classes today!',
      pick(['Bismillah, let’s do this.', 'Small steps every day.', 'Far from home, but doing great.', 'One Pomodoro, then tea?']),
    ];
    setBekLine(lines[bekTurn.current++ % lines.length]);
    clearTimeout(bekTimer.current);
    bekTimer.current = setTimeout(() => setBekLine(null), 4000);
  };

  return { scene, bubble: petLine ?? autoLine, petSimba, bekLine, tapBek };
}

/** What you've unlocked in the cabin, and what's next. */
function CabinUnlocks({ level }: { level: number }) {
  const next = nextUnlock(level);
  const got = UNLOCKS.filter((u) => u.level <= level);
  return (
    <div className="unlocks">
      <p className="field__label">
        Cabin: {got.length}/{UNLOCKS.length} unlocked
      </p>
      {got.length > 0 && (
        <ul className="unlocks__got">
          {got.map((u) => (
            <li key={u.id} title={u.description}>
              {u.name}
            </li>
          ))}
        </ul>
      )}
      {next && (
        <p className="small">
          Next at <strong>Lv {next.level}</strong>: {next.name} — <span className="muted">{next.description}</span>
        </p>
      )}
    </div>
  );
}
