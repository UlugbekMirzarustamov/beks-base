/**
 * Home's "Today's 1%" panel (quest · word of the day · morning recall), the
 * night-time wind-down card, "Simba needs you" (meals, water, sleep) and the
 * Sunday backup card.
 */
import { useState } from 'react';
import { backupFileName, exportJson, type Photo } from '../lib/backup';
import { careStatus, MEAL_GOAL, WATER_GOAL } from '../lib/care';
import type { AppData } from '../lib/types';
import { usePhotos } from './Photos';
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

// ---------------------------------------------------------------- Simba needs you
export function SimbaNeeds() {
  const { data, update, today, gainXp, toast } = useStore();
  const hour = zonedParts(new Date(), UK_TZ).hour;
  const c = careStatus(data, today, hour);
  const add = (key: 'meals' | 'water') => {
    const max = key === 'meals' ? MEAL_GOAL + 1 : WATER_GOAL;
    if (c[key] >= max) return;
    update((d) => {
      const now = d.care[today] ?? { meals: 0, water: 0 };
      d.care[today] = { ...now, [key]: now[key] + 1 };
    });
    sfx(key === 'meals' ? 'pop' : 'bead');
    buzz(10);
    if (key === 'meals' && c.meals < MEAL_GOAL) gainXp(3, 'a proper meal');
    if (key === 'meals' && c.meals === 0) toast('Simba: "Finally! My bowl is full too."', 'info');
    if (key === 'water' && c.water + 1 === WATER_GOAL) gainXp(5, '8 glasses of water');
  };
  const line =
    c.hungry
      ? 'Mrow… no meal yet today. Eat something proper, Bek, then I can eat too.'
      : c.slept === false
        ? 'You went to bed late last night. Early night tonight? I’ll sleep on your feet.'
        : c.hearts === 3
          ? 'Purrr… you’re looking after yourself today. I’m a happy cat.'
          : c.water < 3 && hour >= 12
            ? 'Have a glass of water. Brains are mostly water, you know.'
            : 'I’m fine if you’re fine. Eat, drink, sleep on time.';
  return (
    <Panel title="Simba needs you" icon="cat" className="simba-needs">
      <p className="simba-needs__hearts" aria-label={`${c.hearts} of 3 hearts`}>
        {[0, 1, 2].map((i) => (
          <PixelIcon key={i} name="heart" size={22} className={i < c.hearts ? '' : 'is-empty'} />
        ))}
      </p>
      <p className="simba-needs__line">{line}</p>
      <div className="simba-needs__rows">
        <button type="button" className="btn" onClick={() => add('meals')}>
          <PixelIcon name="apple" size={16} /> Ate a meal <strong>{c.meals}/{MEAL_GOAL}</strong>
        </button>
        <button type="button" className="btn" onClick={() => add('water')}>
          <PixelIcon name="rain" size={16} /> Glass of water <strong>{c.water}/{WATER_GOAL}</strong>
        </button>
      </div>
      <p className="muted small">
        <PixelIcon name="moon" size={14} /> Last night:{' '}
        {c.slept === null ? 'not logged (tap “I’m going to sleep now” tonight)' : c.slept ? 'in bed on time ✓' : 'late night'}
      </p>
    </Panel>
  );
}

// ---------------------------------------------------------------- backups
const BACKUP_KEY = 'beks-last-backup';
export const lastBackup = (): string | null => {
  try {
    return localStorage.getItem(BACKUP_KEY);
  } catch {
    return null;
  }
};

/**
 * Save a backup file. On phones this opens the share sheet, so you can
 * AirDrop it to your laptop, save it to Files / Google Drive, or send it to
 * yourself on Telegram. Elsewhere it simply downloads.
 */
export async function shareBackup(data: AppData, photos: Photo[], today: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const name = backupFileName(today);
  const file = new File([exportJson(data, new Date(), photos)], name, { type: 'application/json' });
  const remember = () => {
    try {
      localStorage.setItem(BACKUP_KEY, today);
    } catch {
      /* ignore */
    }
  };
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Bek's Base backup" });
      remember();
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  remember();
  return 'downloaded';
}

/** On Sundays (or after a week without one), a gentle "back up your cabin" card. */
export function BackupCard() {
  const { data, today, toast } = useStore();
  const photos = usePhotos();
  const [, setTick] = useState(0);
  const last = lastBackup();
  const due = !last || (last < addDays(today, -6) && (new Date(`${today}T12:00:00Z`).getUTCDay() === 0 || last < addDays(today, -9)));
  if (!due) return null;
  const go = async () => {
    const r = await shareBackup(data, photos, today);
    if (r !== 'cancelled') toast('Cabin backed up. Keep that file safe!', 'pop');
    setTick((t) => t + 1);
  };
  return (
    <Panel title="Back up your cabin" icon="chest" className="backup-card">
      <p>
        Everything lives only on this phone{photos.length ? `, including your ${photos.length} family photo${photos.length === 1 ? '' : 's'}` : ''}. One tap saves a copy you can keep in Files,
        Google Drive or Telegram.
      </p>
      <p className="muted small">{last ? `Last backup: ${formatDay(last)}` : 'No backup yet.'}</p>
      <button type="button" className="btn btn--primary" onClick={go}>
        <PixelIcon name="arrowR" size={16} /> Back up now
      </button>
    </Panel>
  );
}
