/**
 * 🔥 The Friday campfire: a 5-minute weekly review. Bek and Simba sit by the
 * fire, look at the week in numbers, name one win, and pick ONE focus for next
 * week. The week is saved as a little postcard. Next week's focus then shows on
 * Home and in the morning briefing.
 */
import { useState } from 'react';
import { addDays, formatDay, startOfWeek, UK_TZ, weekdayOf, zonedParts } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { potStatus, spendByDay } from '../lib/pot';
import { PRAYERS } from '../lib/prayer';
import { sfx } from '../lib/sound';
import type { AppData } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Panel } from '../ui/kit';

const CAMPFIRE_XP = 40;

/** The week being reviewed: Monday → today (or the whole week on the weekend). */
function weekNumbers(d: AppData, monday: string, today: string) {
  const last = addDays(monday, 6) < today ? addDays(monday, 6) : today;
  const days: string[] = [];
  for (let x = monday; x <= last; x = addDays(x, 1)) days.push(x);
  const lanterns = days.reduce((a, day) => a + PRAYERS.filter((p) => d.prayers[day]?.includes(p)).length, 0);
  const minutes = d.studyLog.filter((s) => s.date >= monday && s.date <= last).reduce((a, s) => a + s.minutes, 0);
  const stars = days.filter((day) => d.nightLogs[day]?.rewarded).length;
  const moods = days.map((day) => d.moods[day]).filter(Boolean) as number[];
  let saved: number | null = null;
  if (d.pot) {
    const daily = potStatus(d.pot, [], d.pot.start).daily;
    const spent = spendByDay(d.expenses, d.pot.start, last);
    const planDays = days.filter((day) => day >= d.pot!.start);
    saved = planDays.length ? Math.round(planDays.reduce((a, day) => a + daily - (spent.get(day) ?? 0), 0) * 100) / 100 : null;
  }
  return { days: days.length, lanterns, minutes, stars, mood: moods.length ? moods.reduce((a, m) => a + m, 0) / moods.length : null, saved };
}

/** Focus ideas, picked from where the week was weakest. */
function focusIdeas(n: ReturnType<typeof weekNumbers>): string[] {
  const ideas: string[] = [];
  if (n.lanterns < n.days * 5) ideas.push('Pray all five, Fajr included, every day');
  if (n.minutes < n.days * 40) ideas.push('One Pomodoro every weekday before dinner');
  if (n.saved !== null && n.saved < 0) ideas.push('Cook at home 4 days and stay under my allowance');
  if (n.stars < n.days - 1) ideas.push('Light a star every night before sleeping');
  ideas.push('In bed by 23:30 on school nights', 'Call home twice this week', 'Read 4 pages of Qur’an a day');
  return ideas.slice(0, 5);
}

/** This week's focus (chosen at last week's campfire). */
export function weekFocus(d: AppData, today: string): string | null {
  return d.campfires[addDays(startOfWeek(today), -7)]?.focus || null;
}

/** It's campfire time: Friday from 16:00, or the weekend, and not done this week. */
export function campfireDue(d: AppData, today: string): boolean {
  const wd = weekdayOf(today);
  const evening = wd === 4 && zonedParts(new Date(), UK_TZ).hour >= 16;
  return (evening || wd >= 5) && !d.campfires[startOfWeek(today)];
}

/** Home card: "the campfire is lit" on Friday evening, otherwise this week's focus. */
export function CampfireCard() {
  const { data, today } = useStore();
  if (campfireDue(data, today)) {
    return (
      <Panel title="The campfire is lit" icon="flame" className="campfire-card">
        <p>Friday evening. Sit by the fire with Simba for 5 minutes: look back at your week and pick one thing to focus on next.</p>
        <a href="#/campfire" className="btn btn--primary">
          <PixelIcon name="flame" size={16} /> Sit by the fire
        </a>
      </Panel>
    );
  }
  const focus = weekFocus(data, today);
  if (!focus) return null;
  return (
    <Panel title="This week's focus" icon="flame" className="campfire-card">
      <p className="campfire-card__focus">“{focus}”</p>
      <p className="muted small">You chose this by the campfire. Just this one thing.</p>
    </Panel>
  );
}

export default function Campfire() {
  const { data, update, today, gainXp } = useStore();
  const monday = startOfWeek(today);
  const saved = data.campfires[monday];
  const n = weekNumbers(data, monday, today);
  const [step, setStep] = useState(saved ? 3 : 0);
  const [win, setWin] = useState(saved?.win ?? data.reflections[monday]?.wentWell ?? '');
  const [focus, setFocus] = useState(saved?.focus ?? '');
  const ideas = focusIdeas(n);
  const postcards = Object.entries(data.campfires)
    .filter(([w]) => w !== monday)
    .sort(([a], [b]) => b.localeCompare(a));

  const finish = () => {
    update((d) => void (d.campfires[monday] = { win: win.trim(), focus: focus.trim(), date: today }));
    if (!saved) gainXp(CAMPFIRE_XP, 'a week by the campfire');
    sfx('twinkle');
    setStep(3);
  };

  const moodWord = n.mood === null ? '—' : n.mood >= 4.5 ? 'great' : n.mood >= 3.5 ? 'good' : n.mood >= 2.5 ? 'okay' : 'hard';
  const numbers = (
    <ul className="campfire-stats">
      <li>
        <PixelIcon name="lantern" size={22} /> <strong>{n.lanterns}</strong>/{n.days * 5} lanterns lit
      </li>
      <li>
        <PixelIcon name="clock" size={22} /> <strong>{Math.round((n.minutes / 60) * 10) / 10}h</strong> studied
      </li>
      {n.saved !== null && (
        <li>
          <PixelIcon name="coin" size={22} /> <strong>{formatMoney(Math.abs(n.saved))}</strong> {n.saved >= 0 ? 'saved' : 'over plan'}
        </li>
      )}
      <li>
        <PixelIcon name="star" size={22} /> <strong>{n.stars}</strong> star{n.stars === 1 ? '' : 's'} lit
      </li>
      <li>
        <PixelIcon name="heart" size={22} /> mood: <strong>{moodWord}</strong>
      </li>
    </ul>
  );

  return (
    <div className="campfire">
      <div className="campfire__sky" aria-hidden="true">
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i} className="campfire__star" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 23) % 60}%`, animationDelay: `${(i % 7) * 0.4}s` }} />
        ))}
      </div>
      <div className="campfire__fire" aria-hidden="true">
        <span className="campfire__flame campfire__flame--1" />
        <span className="campfire__flame campfire__flame--2" />
        <span className="campfire__flame campfire__flame--3" />
        <span className="campfire__logs" />
      </div>
      <div className="campfire__card">
        <p className="campfire__week">Week of {formatDay(monday)}</p>
        {step === 0 && (
          <>
            <h1 className="campfire__title">Your week, by the fire</h1>
            {numbers}
            <p className="campfire__simba">
              <PixelIcon name="cat" size={20} /> Simba: “Not bad, Bek. Let’s talk about it.”
            </p>
            <button type="button" className="btn btn--primary btn--wide" onClick={() => setStep(1)}>
              Next
            </button>
          </>
        )}
        {step === 1 && (
          <>
            <h1 className="campfire__title">One win</h1>
            <p>What are you proud of this week? Big or small.</p>
            <textarea className="input" rows={3} value={win} onChange={(e) => setWin(e.target.value)} placeholder="e.g. I didn't skip Fajr once / I finally understood SUVAT" autoFocus />
            <div className="form__actions">
              <button type="button" className="btn" onClick={() => setStep(0)}>
                Back
              </button>
              <button type="button" className="btn btn--primary grow" onClick={() => setStep(2)} disabled={!win.trim()}>
                Next
              </button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="campfire__title">One focus</h1>
            <p>Just ONE thing for next week. Small and clear beats big and vague.</p>
            <div className="chips">
              {ideas.map((idea) => (
                <button key={idea} type="button" className={`chip ${focus === idea ? 'is-on' : ''}`} onClick={() => setFocus(idea)}>
                  {idea}
                </button>
              ))}
            </div>
            <input className="input" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="…or write your own" aria-label="Your focus for next week" />
            <div className="form__actions">
              <button type="button" className="btn" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="button" className="btn btn--primary grow" onClick={finish} disabled={!focus.trim()}>
                Save my postcard
              </button>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h1 className="campfire__title">This week's postcard</h1>
            <div className="postcard">
              <p className="postcard__label">Win</p>
              <p className="postcard__text">{win}</p>
              <p className="postcard__label">Next week I'll focus on</p>
              <p className="postcard__text postcard__text--focus">{focus}</p>
              {numbers}
            </div>
            <div className="form__actions">
              <button type="button" className="btn" onClick={() => setStep(1)}>
                Edit
              </button>
              <a href="#/home" className="btn btn--primary grow">
                Back to the cabin
              </a>
            </div>
          </>
        )}
      </div>
      {postcards.length > 0 && (
        <details className="details campfire__old">
          <summary>Old postcards ({postcards.length})</summary>
          <ul className="list">
            {postcards.map(([w, c]) => (
              <li key={w} className="postcard postcard--small">
                <p className="postcard__label">Week of {formatDay(w)}</p>
                <p>
                  <strong>Win:</strong> {c.win}
                </p>
                <p>
                  <strong>Focus:</strong> {c.focus}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
