/**
 * Home's "Today's 1%" panel (quest · word of the day · morning recall) and the
 * night-time wind-down card.
 */
import { useState } from 'react';
import { recallPick, todaysQuest, wordOfTheDay } from '../lib/daily';
import { addDays, formatDay, fromMinutes, toMinutes, UK_TZ, zonedParts } from '../lib/dates';
import { minsToClock, prayerTimes } from '../lib/prayer';
import { buzz, sfx } from '../lib/sound';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Panel } from '../ui/kit';
import { classesOn } from './Planner';

const QUEST_XP = 20;

export function OnePercent() {
  const { data, update, today, gainXp } = useStore();
  const quest = todaysQuest(data, today);
  const done = data.quests[today]?.done ?? false;
  const word = wordOfTheDay(data, today);
  const mistake = recallPick(data, today);
  const recallResult = data.recall[today]?.result;
  const [showWord, setShowWord] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const toggleQuest = () => {
    update((d) => void (d.quests[today] = { id: quest.id, done: !done }));
    if (!done) {
      sfx('twinkle');
      buzz(15);
    }
    gainXp(done ? -QUEST_XP : QUEST_XP, done ? undefined : "today's 1%");
  };
  const recall = (result: 'got' | 'again') => {
    if (!mistake) return;
    update((d) => {
      d.recall[today] = { id: mistake.id, result };
      const m = d.mistakes.find((x) => x.id === mistake.id);
      if (m) m.reviewAgain = result === 'again';
    });
    if (result === 'got') gainXp(5, 'remembered it');
  };

  return (
    <Panel title="Today's 1%" icon="star" className="one-percent">
      <div className={`quest ${done ? 'is-done' : ''}`}>
        <p className="field__label">Today's quest</p>
        <p className="quest__text">{quest.text}</p>
        <button type="button" className={`btn btn--small ${done ? '' : 'btn--primary'}`} onClick={toggleQuest} aria-pressed={done}>
          {done ? 'Done ✓ (tap to undo)' : `I did it (+${QUEST_XP} XP)`}
        </button>
      </div>

      <div className="daily-row">
        <p className="field__label">Word of the day</p>
        {word ? (
          <>
            <p>
              <strong className="daily-word">{word.word.replace(' (example)', '')}</strong> — do you remember what it means?
            </p>
            {showWord ? (
              <p className="daily-reveal">
                {word.meaning}
                {word.sentence && <em className="muted"> “{word.sentence}”</em>}
              </p>
            ) : (
              <button type="button" className="btn btn--small" onClick={() => setShowWord(true)}>
                Show meaning
              </button>
            )}
          </>
        ) : (
          <p className="muted small">
            Add physics/maths words in <a href="#/more/words">More → Words</a> and one will show up here each day.
          </p>
        )}
      </div>

      <div className="daily-row">
        <p className="field__label">Morning recall</p>
        {mistake ? (
          <>
            <p>
              <strong>Q:</strong> {mistake.question}
            </p>
            {recallResult ? (
              <p className="muted small">{recallResult === 'got' ? 'Remembered ✓ — it’s off your review list.' : 'Still tricky — it will come back another day.'}</p>
            ) : showAnswer ? (
              <>
                <p className="daily-reveal">
                  <PixelIcon name="check" size={14} /> {mistake.correctAnswer || '—'}
                  {mistake.why && <span className="muted"> · {mistake.why}</span>}
                </p>
                <div className="form__actions">
                  <button type="button" className="btn btn--small btn--primary" onClick={() => recall('got')}>
                    I got it right
                  </button>
                  <button type="button" className="btn btn--small" onClick={() => recall('again')}>
                    Still tricky
                  </button>
                </div>
              </>
            ) : (
              <button type="button" className="btn btn--small" onClick={() => setShowAnswer(true)}>
                Answer it in your head, then show
              </button>
            )}
          </>
        ) : (
          <p className="muted small">
            Log mistakes in <a href="#/study/mistakes">Study → Mistakes</a>; each morning one comes back for a quick recall.
          </p>
        )}
      </div>
    </Panel>
  );
}

/** From 22:00 to 03:00: tomorrow at a glance, a suggested bedtime, and "going to sleep". */
export function WindDown() {
  const { data, update, today, toast } = useStore();
  const p = zonedParts(new Date(), UK_TZ);
  if (!(p.hour >= 22 || p.hour < 3)) return null;
  const evening = p.hour < 3 ? addDays(today, -1) : today;
  if (data.sleepLog[evening]) return null;

  const tomorrow = addDays(evening, 1);
  const first = classesOn(data, tomorrow)[0];
  const fajr = prayerTimes(tomorrow, data.settings.prayer).fajr;
  // Wake an hour before the first class (or 08:00 on free days), aiming for 7½ hours of sleep.
  const wake = first ? toMinutes(first.start) - 60 : 8 * 60;
  const bedtime = fromMinutes((((wake - 450) % 1440) + 1440) % 1440);
  const lastNights = Array.from({ length: 7 }, (_, i) => addDays(evening, i - 7)).filter((d) => data.sleepLog[d]);

  const sleepNow = () => {
    const now = `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
    update((d) => void (d.sleepLog[evening] = now));
    toast('Good night, Bek. Simba is already asleep.', 'info');
  };

  return (
    <Panel title="Time to wind down" icon="moon" className="wind-down">
      <ul className="wind-down__list">
        <li>
          <PixelIcon name="lantern" size={18} /> Fajr tomorrow at <strong>{minsToClock(fajr)}</strong>
        </li>
        <li>
          <PixelIcon name="clock" size={18} /> {first ? (
            <>
              First class tomorrow: <strong>{first.start}</strong> {first.name}
              {first.room ? ` (${first.room})` : ''}
            </>
          ) : (
            <>No classes tomorrow ({formatDay(tomorrow)})</>
          )}
        </li>
        <li>
          <PixelIcon name="moon" size={18} /> For about 7½ hours of sleep, aim to be asleep by <strong>{bedtime}</strong>.
        </li>
      </ul>
      <p className="muted small">Phone on charge across the room, a sip of water, a short dua — and rest.</p>
      <button type="button" className="btn btn--primary" onClick={sleepNow}>
        <PixelIcon name="moon" size={16} /> I'm going to sleep now
      </button>
      {lastNights.length > 0 && (
        <p className="muted small">
          Recent bedtimes: {lastNights.map((d) => `${formatDay(d).slice(0, 3)} ${data.sleepLog[d]}`).join(' · ')}
        </p>
      )}
    </Panel>
  );
}
