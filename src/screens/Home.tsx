/**
 * 🏠 HOME — the cabin, plus everything important at a glance.
 */
import { addDays, daysBetween, formatDay, startOfWeek, UK_TZ, weekdayOf, zonedParts } from '../lib/dates';
import { levelInfo } from '../lib/xp';
import { Cabin } from '../scene/Cabin';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Bar, Empty, Panel } from '../ui/kit';
import { Clocks, MoodCheckIn } from './Extras';
import { SafeToSpendCard } from './Money';
import { TaskRow, TopThree } from './Planner';
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
  const lvl = levelInfo(data.xp);
  const upcoming = data.tests.filter((t) => t.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const nextTest = upcoming[0];
  const soonLimit = addDays(today, 7);
  const dueSoon = data.tasks.filter((t) => !t.done && t.due && t.due <= soonLimit).sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''));
  const studiedToday = data.studyLog.filter((s) => s.date === today).reduce((a, s) => a + s.minutes, 0);

  return (
    <div className="screen home">
      <h1 className="visually-hidden">Bek's Base — Home</h1>
      <div className="home__top">
        <div className="home__scene">
          <Cabin rain={data.settings.sound === 'rain'} />
        </div>
        <p className="greeting">
          {greeting()}, Bek! <span className="muted">· {formatDay(today)}</span>
        </p>
        <Clocks />
      </div>
      <div className="grid grid--home">
        <SafeToSpendCard />

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
            <PixelIcon name="clock" size={14} /> {studiedToday} min studied today · Tasks +10 · Top 3 +15 · Pomodoro +25
          </p>
        </Panel>
      </div>
    </div>
  );
}
