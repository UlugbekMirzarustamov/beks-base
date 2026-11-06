/**
 * 🏠 HOME — the cabin, plus everything important at a glance.
 */
import { addDays, daysBetween, formatDay, relativeDays, startOfWeek, toMinutes, UK_TZ, weekdayOf, zonedParts } from '../lib/dates';
import { minsToWait } from '../lib/prayer';
import { levelInfo } from '../lib/xp';
import { Cabin } from '../scene/Cabin';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Bar, Empty, Panel, Segmented, Sheet } from '../ui/kit';
import { cardsIn, discoverTips, HOME_CARDS, type CardId } from '../lib/home';
import { Clocks, MoodCheckIn } from './Extras';
import { InstallCard } from '../ui/AppFeel';
import { BackupCard, OnePercent, SimbaNeeds, TodayCard, WindDown } from './Daily';
import { CampfireCard } from './Campfire';
import { FajrRise, GhostRace, MorningPromise } from './Push';
import { InboxPanel, QuickCapture } from './Capture';
import { RamadanCard, useRamadan } from './Ramadan';
import { openPhotos, photoOfTheDay, usePhotos } from './Photos';
import { BossMini } from './Study';
import { careStatus } from '../lib/care';
import { conflicts, dateReminders, itemsOn, KIND_INFO, upcoming } from '../lib/calendar';
import { freshness, toUseSoon } from '../lib/kitchen';
import { adminReminders, progress } from '../lib/admin';
import { FRIDAY_STEPS, hijriLabel, isFriday } from '../lib/islamic';
import { openJar } from './Calm';
import { BadgeSummary } from './Badges';
import { coins } from '../lib/shop';
import { potStatus } from '../lib/pot';
import { SafeToSpendCard, SavingsMini } from './Money';
import { classesOn, TaskRow, TopThree } from './Planner';
import { PrayerLanterns, usePrayer } from './Prayer';
import { useWeather, WeatherCard, windowWeather } from '../ui/Weather';
import { Fragment, useMemo, useState, useEffect, useRef, type ReactNode } from 'react';
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
  const { data } = useStore();
  const { scene, bubble, petSimba, bekLine, tapBek, toggleRadio } = useCabinScene();
  const { today } = useStore();
  const hour = zonedParts(new Date(), UK_TZ).hour;
  const home = data.settings.home;
  const [moreOpen, setMoreOpen] = useState(() => {
    try {
      return localStorage.getItem(MORE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [arranging, setArranging] = useState(false);
  const toggleMore = (open: boolean) => {
    setMoreOpen(open);
    try {
      localStorage.setItem(MORE_KEY, open ? '1' : '0');
    } catch {
      /* not remembered in private mode */
    }
  };

  return (
    <div className="screen home">
      <h1 className="visually-hidden">Bek's Base — Home</h1>
      <PrayerLanterns />
      <div className="home__top">
        <div className="home__scene">
          <Cabin scene={scene} bubble={bubble} onPetSimba={petSimba} bekBubble={bekLine} onTapBek={tapBek} onOpenJar={openJar} onOpenPhotos={openPhotos} onToggleRadio={toggleRadio} />
        </div>
        <div className="greeting-row">
          <p className="greeting">
            {greeting()}, Bek! <span className="muted">· {formatDay(today)} · {hijriLabel(today)}</span>
          </p>
          <nav className="home-places" aria-label="Places">
            <button type="button" className="home-place" onClick={() => window.dispatchEvent(new Event('beks:briefing'))}>
              <PixelIcon name="sun" size={18} /> Briefing
            </button>
            <a href="#/rooms" className="home-place">
              <PixelIcon name="house" size={18} /> Rooms
            </a>
            <a href="#/kitchen" className="home-place">
              <PixelIcon name="apple" size={18} /> Kitchen
            </a>
            <a href="#/calm" className="home-place">
              <PixelIcon name="lantern" size={18} /> A minute
            </a>
          </nav>
        </div>
        <InstallCard compact />
      </div>
      <QuickCapture />
      <WindDown />
      <div className="grid grid--home">
        {cardsIn('now', home, hour).map((id) => (
          <Fragment key={id}>{renderCard(id)}</Fragment>
        ))}
      </div>
      <details className="home-more" open={moreOpen} onToggle={(e) => toggleMore((e.currentTarget as HTMLDetailsElement).open)}>
        <summary>More for today</summary>
        {moreOpen && (
          <div className="grid grid--home">
            {cardsIn('more', home, hour).map((id) => (
              <Fragment key={id}>{renderCard(id)}</Fragment>
            ))}
          </div>
        )}
      </details>
      <Discover />
      <p className="center">
        <button type="button" className="btn btn--small btn--ghost" onClick={() => setArranging(true)}>
          <PixelIcon name="gear" size={14} /> Arrange Home
        </button>
      </p>
      <Sheet open={arranging} onClose={() => setArranging(false)} title="Arrange Home">
        <ArrangeHome />
      </Sheet>
    </div>
  );
}

const MORE_KEY = 'beks:home-more';

/** One Home card by id (each hides itself when there's nothing to say). */
function renderCard(id: CardId): ReactNode {
  switch (id) {
    case 'today':
      return <TodayCard />;
    case 'quest':
      return <OnePercent />;
    case 'dates':
      return <ImportantDates />;
    case 'friday':
      return <FridayCard />;
    case 'fajr':
      return <FajrRise />;
    case 'ramadan':
      return <RamadanCard />;
    case 'promise':
      return <MorningPromise />;
    case 'campfire':
      return <CampfireCard />;
    case 'week':
      return <WeekCard />;
    case 'backup':
      return <BackupCard />;
    case 'classes':
      return <TodayClasses />;
    case 'coming':
      return <ComingUp />;
    case 'test':
      return <NextTestCard />;
    case 'top3':
      return (
        <Panel title="Today's top 3" icon="star">
          <TopThree />
        </Panel>
      );
    case 'due':
      return <DueCard />;
    case 'kitchen':
      return <KitchenCard />;
    case 'inbox':
      return <InboxPanel compact />;
    case 'money':
      return <SafeToSpendCard />;
    case 'savings':
      return <SavingsMini />;
    case 'mood':
      return (
        <Panel title="How are you today?" icon="heart">
          <MoodCheckIn />
          <a href="#/more/mood" className="more-link">
            This week →
          </a>
        </Panel>
      );
    case 'simba':
      return <SimbaNeeds />;
    case 'ghost':
      return <GhostRace />;
    case 'weather':
      return <WeatherCard />;
    case 'clocks':
      return <Clocks />;
    case 'level':
      return <LevelCard />;
  }
}

function NextTestCard() {
  const { data, today } = useStore();
  const upcoming = data.tests.filter((t) => t.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const nextTest = upcoming[0];
  if (!nextTest) return null;
  return (
    <Panel title="Next test" icon="calendar">
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
      <BossMini test={nextTest} />
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
  );
}

function DueCard() {
  const { data, today } = useStore();
  const soonLimit = addDays(today, 7);
  const dueSoon = data.tasks.filter((t) => !t.done && t.due && t.due <= soonLimit).sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''));
  if (!dueSoon.length) return null;
  return (
    <Panel title="Due soon" icon="check">
      <ul className="tasks">
        {dueSoon.slice(0, 5).map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
      </ul>
      <a href="#/planner/today" className="more-link">
        All tasks →
      </a>
    </Panel>
  );
}

function WeekCard() {
  const { data, today } = useStore();
  if (weekdayOf(today) < 4 || data.reflections[startOfWeek(today)]?.wentWell) return null;
  return (
    <Panel title="Week's nearly done" icon="scroll">
      <p>Take 3 minutes to look back: what went well, what was hard, what to try next week.</p>
      <a href="#/reflect/week" className="btn btn--primary">
        Reflect on my week
      </a>
    </Panel>
  );
}

function LevelCard() {
  const { data, today } = useStore();
  const lvl = levelInfo(data.xp);
  const studiedToday = data.studyLog.filter((x) => x.date === today).reduce((a, x) => a + x.minutes, 0);
  return (
    <Panel title={`Level ${lvl.level}`} icon="star" className="level-card">
      <Bar value={lvl.into} max={lvl.needed} label="XP towards next level" color="var(--xp)" />
      <p className="bar-caption">
        {lvl.into} / {lvl.needed} XP to level {lvl.level + 1}
      </p>
      <p className="muted small">
        <PixelIcon name="clock" size={14} /> {studiedToday} min studied today · Tasks +10 · Top 3 +15 · Pomodoro +25
      </p>
      <CabinUnlocks level={lvl.level} />
      <div className="level-links">
        <BadgeSummary />
        <a href="#/more/shop" className="badge-summary">
          <PixelIcon name="coin" size={16} /> {coins(data)} coins · Cabin shop →
        </a>
      </div>
    </Panel>
  );
}

/** Features you haven't tried yet, a few at a time. They leave once you use them (or tap "Not now"). */
function Discover() {
  const { data, update } = useStore();
  const tips = discoverTips(data);
  if (!tips.length) return null;
  return (
    <section className="discover" aria-label="Discover">
      <p className="discover__title">Discover</p>
      <ul className="discover__list">
        {tips.map((t) => (
          <li key={t.id} className="discover__tip">
            <PixelIcon name={t.icon} size={22} />
            <span className="grow">
              <strong>{t.title}</strong>
              <small>{t.pitch}</small>
            </span>
            <a href={t.href} className="btn btn--small btn--primary">
              Open
            </a>
            <button type="button" className="icon-btn" onClick={() => update((d) => void d.settings.home.dismissed.push(t.id))} aria-label={`Not now: ${t.title}`}>
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Pin cards to the top of Home, or hide them. Nothing is deleted. */
function ArrangeHome() {
  const { data, update } = useStore();
  const home = data.settings.home;
  const set = (id: CardId, mode: 'pin' | 'auto' | 'hide') =>
    update((d) => {
      const h = d.settings.home;
      h.pinned = h.pinned.filter((x) => x !== id);
      h.hidden = h.hidden.filter((x) => x !== id);
      if (mode === 'pin') h.pinned.push(id);
      if (mode === 'hide') h.hidden.push(id);
    });
  return (
    <div className="form">
      <p className="muted small">Pinned cards always sit at the top. "Auto" cards show when they matter (or in More for today). Hidden cards stay in their station — nothing is deleted.</p>
      <ul className="arrange-list">
        {HOME_CARDS.map((c) => {
          const mode = home.pinned.includes(c.id) ? 'pin' : home.hidden.includes(c.id) ? 'hide' : 'auto';
          return (
            <li key={c.id} className="arrange-row">
              <span className="grow">{c.name}</span>
              <Segmented<'pin' | 'auto' | 'hide'>
                label={c.name}
                value={mode}
                onChange={(v) => set(c.id, v)}
                options={[
                  { value: 'pin', label: 'Pin' },
                  { value: 'auto', label: 'Auto' },
                  { value: 'hide', label: 'Hide' },
                ]}
              />
            </li>
          );
        })}
      </ul>
      {home.dismissed.length > 0 && (
        <button type="button" className="btn btn--small" onClick={() => update((d) => void (d.settings.home.dismissed = []))}>
          Show Discover tips again
        </button>
      )}
    </div>
  );
}

/** Birthdays and important dates coming soon (each event's "remind me" setting, with its notes, e.g. gift ideas) and admin due soon. */
function ImportantDates() {
  const { data, today } = useStore();
  const soon = useMemo(() => dateReminders(data, today), [data, today]);
  const admin = useMemo(() => adminReminders(data.admin, today), [data.admin, today]);
  if (!soon.length && !admin.length) return null;
  return (
    <Panel title="Important dates" icon="gift">
      <ul className="mini-list coming-up">
        {admin.map(({ item, daysLeft }) => {
          const p = progress(item);
          return (
            <li key={item.id}>
              <span className="cal-dot" style={{ background: KIND_INFO.admin.colour }} aria-hidden="true" />
              <span className="coming-up__text">
                <a href="#/planner/admin">
                  <strong>{item.title}</strong>
                </a>{' '}
                <small className={daysLeft < 0 ? 'pantry-warn' : 'muted'}>
                  · {item.dateLabel.toLowerCase()} {daysLeft < 0 ? `${-daysLeft} days ago` : daysLeft === 0 ? 'today!' : relativeDays(daysLeft)}
                  {p.total ? ` · ${p.done}/${p.total} steps` : ''}
                </small>
              </span>
            </li>
          );
        })}
        {soon.map(({ event, date, daysLeft }) => (
          <li key={event.id}>
            <span className="cal-dot" style={{ background: KIND_INFO[event.kind].colour }} aria-hidden="true" />
            <span className="coming-up__text">
              <strong>{event.title}</strong>{' '}
              <small className="muted">· {daysLeft === 0 ? 'today!' : `${relativeDays(daysLeft)} (${formatDay(date)})`}</small>
              {event.notes && (
                <>
                  <br />
                  <small className="muted">{event.notes}</small>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
      <a href="#/planner/calendar" className="more-link">
        Calendar →
      </a>
    </Panel>
  );
}

/** On Fridays: the Jumu'ah checklist (private, never scored); hidden on other days and once all is ticked. */
function FridayCard() {
  const { data, update, today } = useStore();
  if (!isFriday(today)) return null;
  const done = data.friday[today] ?? [];
  const left = FRIDAY_STEPS.filter((s) => !done.includes(s.id));
  if (!left.length) return null;
  const tick = (id: string) => update((d) => void (d.friday[today] = [...(d.friday[today] ?? []), id]));
  return (
    <Panel title="Jumu'ah Mubarak" icon="mat">
      <ul className="tasks">
        {left.slice(0, 3).map((s) => (
          <li key={s.id} className="task">
            <input type="checkbox" className="pixel-check" checked={false} onChange={() => tick(s.id)} aria-label={s.text} />
            <span className="task__title grow">{s.text}</span>
          </li>
        ))}
      </ul>
      <a href="#/prayer/friday" className="more-link">
        {data.settings.prayer.jumuah ? `Khutbah ${data.settings.prayer.jumuah} · ` : ''}Friday checklist →
      </a>
    </Panel>
  );
}

const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
] as const;

/** Today's planned meals and food to use up soon. Hidden when there's nothing to say. */
function KitchenCard() {
  const { data, today } = useStore();
  const meals = MEAL_SLOTS.flatMap((s) => {
    const m = data.meals[today]?.[s.id];
    return m ? [{ label: s.label, text: m.text }] : [];
  });
  const soon = toUseSoon(data.pantry, today, 2);
  const toBuy = data.groceries.filter((g) => !g.done).length;
  if (!meals.length && !soon.length) return null;
  return (
    <Panel title="Kitchen" icon="apple">
      {meals.length > 0 && (
        <ul className="mini-list">
          {meals.map((m) => (
            <li key={m.label}>
              <small className="muted">{m.label}:</small> <strong>{m.text}</strong>
            </li>
          ))}
        </ul>
      )}
      {soon.length > 0 && (
        <p className="small">
          Use soon: {soon.map((p) => `${p.name} (${freshness(p, today) === 'expired' ? 'past its date' : relativeDays(daysBetween(today, p.expires))})`).join(', ')}
        </p>
      )}
      <a href={toBuy ? '#/kitchen/groceries' : '#/kitchen/meals'} className="more-link">
        {toBuy ? `Shopping list (${toBuy}) →` : 'Kitchen →'}
      </a>
    </Panel>
  );
}

/** The next important dates from the calendar (exams, deadlines, trips, birthdays…) and today's overlaps. */
function ComingUp() {
  const { data, today } = useStore();
  // Dates already shown by the Important dates card aren't repeated here.
  const reminded = new Set([...dateReminders(data, today).map((r) => `event-${r.event.id}`), ...adminReminders(data.admin, today).map((r) => `admin-${r.item.id}`)]);
  const next = upcoming(data, today, 14).filter((i) => !reminded.has(i.key)).slice(0, 5);
  const clashes = conflicts(itemsOn(data, today));
  if (!next.length && !clashes.length) return null;
  return (
    <Panel title="Coming up" icon="calendar">
      {clashes.length > 0 && (
        <p className="alert cal-warn">
          ⚠ Today: {clashes.map(([a, b]) => `${a.title} overlaps ${b.title}`).join('; ')}
        </p>
      )}
      <ul className="mini-list coming-up">
        {next.map((i) => (
          <li key={`${i.date}-${i.key}`}>
            <span className="cal-dot" style={{ background: KIND_INFO[i.kind].colour }} aria-hidden="true" />
            <strong>{i.title}</strong> <small className="muted">· {KIND_INFO[i.kind].label} · {i.date === today ? 'today' : formatDay(i.date)}{i.start ? ` ${i.start}` : ''}</small>
          </li>
        ))}
      </ul>
      <a href="#/planner/calendar" className="more-link">
        Calendar →
      </a>
    </Panel>
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
/** Remember the last day it snowed, so the hills stay white for a few days. */
const SNOW_KEY = 'beks-last-snow';
function lastSnowDay(): string | null {
  try {
    return localStorage.getItem(SNOW_KEY);
  } catch {
    return null;
  }
}

function useCabinScene() {
  const { data, today, update, toast } = useStore();
  const ramadan = useRamadan();
  const photos = usePhotos();
  const prayer = usePrayer();
  const { running, timer } = useTimer();
  const weather = useWeather();

  const month = monthOf(today);
  const pot = data.pot ? potStatus(data.pot, data.expenses, today) : null;
  const overBudget =
    (pot ? pot.leftToday < 0 || pot.fund < 0 : safeToSpend(data.monthlyBudget, data.expenses, today).left < 0) ||
    data.categories.some((c) => c.limit > 0 && barLevel(spentInMonth(data.expenses, month, c.id), c.limit) === 'over');
  const studyStreak = streak((d) => data.studyLog.some((s) => s.date === d), today);
  const care = careStatus(data, today, zonedParts(new Date(), UK_TZ).hour);
  const mood = simbaMood({
    hungry: care.hungry,
    prayerDue: Boolean(prayer.dueNow),
    studying: running && timer.mode === 'work',
    overBudget,
    starLit: Boolean(data.nightLogs[today]?.rewarded),
    night: skyAt(new Date()).phase === 'night',
  });
  const level = levelInfo(data.xp).level;
  const kind = windowWeather(weather);
  // Real winter: snow in Sheffield now (or in the last 3 days) and near-freezing temperatures.
  const snowingNow = kind === 'snow';
  useEffect(() => {
    if (!snowingNow) return;
    const before = lastSnowDay();
    try {
      localStorage.setItem(SNOW_KEY, today);
    } catch {
      /* ignore */
    }
    // First snow of this winter → a little celebration.
    const winterStart = `${Number(today.slice(5, 7)) >= 7 ? today.slice(0, 4) : Number(today.slice(0, 4)) - 1}-07-01`;
    if (!before || before < winterStart) toast('❄ First snow in Sheffield this winter! Hot chocolate time.', 'level');
  }, [snowingNow, today, toast]);
  const lastSnow = lastSnowDay();
  const snowy = snowingNow || Boolean(lastSnow && daysBetween(lastSnow, today) <= 3);
  const cold = Boolean(weather && windowWeather(weather) !== null && weather.current.temp <= 3);
  const photo = photoOfTheDay(photos, today)?.src ?? null;
  const fed = care.meals > 0;

  const goodThings = Object.values(data.nightLogs).reduce((n, l) => n + l.good.filter((g) => g.trim()).length, 0);

  // Memoised so the cabin animation isn't restarted on every re-render.
  const scene = useMemo<CabinScene>(
    () => ({
      mix: data.settings.mixer,
      level,
      prayerStreak: prayer.streak,
      studyStreak,
      simba: mood,
      season: seasonOf(today),
      weather: kind,
      avatar: data.settings.avatar,
      decor: data.shop.placed,
      flowers: data.studyLog.length,
      jarNotes: goodThings,
      photo,
      ramadan: ramadan.now,
      snowy,
      cold,
      fed,
    }),
    [data.settings.mixer, level, prayer.streak, studyStreak, mood, today, kind, data.settings.avatar, data.shop.placed, data.studyLog.length, goodThings, photo, ramadan.now, snowy, cold, fed],
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

  // The radio on the hearth: tap to play / stop lo-fi.
  const toggleRadio = () => {
    const on = data.settings.mixer.lofi > 0;
    update((d) => void (d.settings.mixer = { ...d.settings.mixer, lofi: on ? 0 : 4 }));
    sfx('tick');
    toast(on ? 'Radio off' : 'Lo-fi radio on · change the volume with the sound button', 'info');
  };

  return { scene, bubble: petLine ?? autoLine, petSimba, bekLine, tapBek, toggleRadio };
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
