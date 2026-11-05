/**
 * 🌙 Ramadan mode. Switches itself on when Ramadan starts (from the Islamic
 * calendar): lanterns in the cabin, Sheffield suhoor & iftar times with a
 * countdown, a fasting tracker (30 lanterns), taraweeh, and a juz a day.
 * Before Ramadan it counts down and helps you get ready. You can also preview it.
 */
import { useEffect, useState } from 'react';
import { addDays, daysBetween, formatDay } from '../lib/dates';
import { minsToClock, minsToWait, prayerTimes } from '../lib/prayer';
import { QURAN_PAGES } from '../lib/quran';
import { ramadanInfo, type RamadanInfo } from '../lib/ramadan';
import { buzz, sfx } from '../lib/sound';
import type { FastDay } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Panel } from '../ui/kit';
import { useUkMinutes } from './Prayer';

const PREVIEW_KEY = 'beks-ramadan-preview';

const readPreview = () => {
  try {
    return sessionStorage.getItem(PREVIEW_KEY) === '1';
  } catch {
    return false;
  }
};
let preview = readPreview();
const previewListeners = new Set<(on: boolean) => void>();
export function setRamadanPreview(on: boolean) {
  preview = on;
  try {
    if (on) sessionStorage.setItem(PREVIEW_KEY, '1');
    else sessionStorage.removeItem(PREVIEW_KEY);
  } catch {
    /* fine: preview just lasts until reload */
  }
  previewListeners.forEach((l) => l(on));
}

/** Ramadan right now (or a pretend "day 5" while previewing). */
export function useRamadan(): RamadanInfo & { preview: boolean } {
  const { today } = useStore();
  const [on, setOn] = useState(preview);
  useEffect(() => {
    previewListeners.add(setOn);
    return () => void previewListeners.delete(setOn);
  }, []);
  const real = ramadanInfo(today);
  if (on && !real.now) return { now: true, day: 5, start: addDays(today, -4), end: addDays(today, 25), daysUntil: 0, preview: true };
  return { ...real, preview: false };
}

/** Today's fast: tick it off, and taraweeh. */
function useFast() {
  const { data, update, today, toast } = useStore();
  const fast: FastDay = data.fasts[today] ?? { fasted: false, taraweeh: false };
  const set = (key: keyof FastDay) => {
    const value = !fast[key];
    update((d) => void (d.fasts[today] = { ...fast, [key]: value }));
    if (value) {
      // A private record — fasting and taraweeh are never scored.
      sfx('bell');
      buzz(15);
      if (key === 'fasted') toast('May Allah accept your fast.', 'pop');
    }
  };
  return { fast, set };
}

/** Suhoor & iftar times and what's next, for today in Sheffield. */
function useFastTimes() {
  const { data, today } = useStore();
  const now = useUkMinutes();
  const t = prayerTimes(today, data.settings.prayer);
  const tomorrow = prayerTimes(addDays(today, 1), data.settings.prayer);
  return {
    suhoor: t.fajr,
    iftar: t.maghrib,
    tomorrowSuhoor: tomorrow.fajr,
    now,
    beforeSuhoorEnds: now < t.fajr,
    fasting: now >= t.fajr && now < t.maghrib,
  };
}

const IFTAR_DUA = {
  arabic: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ',
  latin: 'Dhahaba al-zama’ wabtallatil-‘urooq wa thabatal-ajru in sha Allah',
  meaning: 'The thirst has gone, the veins are moist, and the reward is certain, if Allah wills.',
};

/** The card on Home during Ramadan (and a countdown in the last month before it). */
export function RamadanCard() {
  const r = useRamadan();
  const { fast, set } = useFast();
  const t = useFastTimes();
  if (!r.now) {
    if (r.daysUntil > 30) return null;
    return (
      <Panel title="Ramadan is coming" icon="moon" className="ramadan-card">
        <p className="ramadan-card__big">
          <span className="big-number">{r.daysUntil}</span> days to go
        </p>
        <p className="muted small">Starts about {formatDay(r.start)} (depends on the moon).</p>
        <a href="#/prayer/ramadan" className="more-link">
          Get ready →
        </a>
      </Panel>
    );
  }
  return (
    <Panel title={`Ramadan · day ${r.day}${r.preview ? ' (preview)' : ''}`} icon="moon" className="ramadan-card">
      <div className="ramadan-times">
        <span>
          <small>Suhoor ends</small>
          <strong>{minsToClock(t.beforeSuhoorEnds ? t.suhoor : t.tomorrowSuhoor)}</strong>
        </span>
        <span className={t.fasting ? 'is-next' : ''}>
          <small>Iftar</small>
          <strong>{minsToClock(t.iftar)}</strong>
        </span>
      </div>
      <p className="ramadan-card__count">
        {t.fasting ? (
          <>
            Iftar in <strong>{minsToWait(t.iftar - t.now)}</strong>. You can do this!
          </>
        ) : t.beforeSuhoorEnds ? (
          <>
            Suhoor ends in <strong>{minsToWait(t.suhoor - t.now)}</strong>. Eat, drink water, make your intention.
          </>
        ) : (
          <>Iftar time has passed. Alhamdulillah for today's fast.</>
        )}
      </p>
      <div className="form__actions">
        <button type="button" className={`btn grow ${fast.fasted ? 'btn--primary' : ''}`} onClick={() => set('fasted')} aria-pressed={fast.fasted}>
          <PixelIcon name="lantern" size={16} /> {fast.fasted ? 'Fasting today ✓' : "I'm fasting today"}
        </button>
        <button type="button" className={`btn grow ${fast.taraweeh ? 'btn--primary' : ''}`} onClick={() => set('taraweeh')} aria-pressed={fast.taraweeh}>
          <PixelIcon name="mat" size={16} /> {fast.taraweeh ? 'Taraweeh ✓' : 'Taraweeh'}
        </button>
      </div>
      <a href="#/prayer/ramadan" className="more-link">
        All of Ramadan →
      </a>
    </Panel>
  );
}

/** Prayer mat → Ramadan tab. */
export function RamadanTab() {
  const r = useRamadan();
  const { data, update, today } = useStore();
  const t = useFastTimes();

  if (!r.now) {
    return (
      <div className="grid grid--2">
        <Panel title="Ramadan is coming" icon="moon">
          <p className="ramadan-count">
            <span className="big-number">{r.daysUntil}</span> days
          </p>
          <p>
            Ramadan starts about <strong>{formatDay(r.start)}</strong> and ends about {formatDay(r.end)}. The exact day depends on the moon sighting, so follow your
            local mosque.
          </p>
          <p className="muted small">When it starts, the cabin fills with lanterns and Home shows your suhoor & iftar times.</p>
          <button type="button" className="btn" onClick={() => setRamadanPreview(true)}>
            <PixelIcon name="lantern" size={16} /> Preview Ramadan mode
          </button>
        </Panel>
        <Panel title="Get ready" icon="check">
          <ul className="ready-list">
            <li>
              <strong>Practise fasting:</strong> try a Monday or Thursday fast before Ramadan. It's a Sunnah, and it gets your body used to it.
            </li>
            <li>
              <strong>Qur'an plan:</strong> to finish it in Ramadan, read <strong>20 pages a day</strong> (one juz). Set it as your goal on the Qur'an tab.
            </li>
            <li>
              <strong>Money:</strong> suhoor and iftar food from the shop (dates, eggs, oats, soup) is much cheaper than eating out. Your daily allowance can cover it.
            </li>
            <li>
              <strong>Classes & tests:</strong> plan study for after iftar or after suhoor, when your head is clear.
            </li>
            <li>
              <strong>Call home</strong> and plan a video-call iftar with your family.
            </li>
          </ul>
        </Panel>
      </div>
    );
  }

  const days = Array.from({ length: daysBetween(r.start, r.end) + 1 }, (_, i) => addDays(r.start, i));
  const fasted = days.filter((d) => data.fasts[d]?.fasted).length;
  const taraweeh = days.filter((d) => data.fasts[d]?.taraweeh).length;
  const pagesToday = data.quran.log[today] ?? 0;

  return (
    <div className="grid grid--2">
      {r.preview && (
        <p className="alert ramadan-preview">
          This is a preview of Ramadan mode.{' '}
          <button type="button" className="btn btn--small" onClick={() => setRamadanPreview(false)}>
            End preview
          </button>
        </p>
      )}
      <RamadanCard />
      <Panel title={`Your fasts · ${fasted}/${days.length}`} icon="lantern">
        <ol className="fast-grid" aria-label="Fasting days">
          {days.map((d, i) => {
            const f = data.fasts[d];
            return (
              <li key={d} className={`fast-grid__day ${f?.fasted ? 'is-lit' : ''} ${i === r.day - 1 ? 'is-today' : ''}`} title={formatDay(d)}>
                <span className="fast-grid__lantern" aria-hidden="true" />
                <small>{i + 1}</small>
                <span className="visually-hidden">
                  Day {i + 1}: {f?.fasted ? 'fasted' : 'not marked'}
                  {f?.taraweeh ? ', taraweeh' : ''}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="muted small">
          {taraweeh} night{taraweeh === 1 ? '' : 's'} of taraweeh. Missed a fast for a good reason? You can make it up after Ramadan.
        </p>
      </Panel>
      <Panel title="A juz a day" icon="quran">
        <p>
          Today: <strong>{pagesToday}</strong> / 20 pages · page {data.quran.page} of {QURAN_PAGES}.
        </p>
        {data.quran.dailyGoal < 20 && (
          <button type="button" className="btn" onClick={() => update((d) => void (d.quran.dailyGoal = 20))}>
            Set my daily goal to 20 pages
          </button>
        )}
        <a href="#/prayer/quran" className="more-link">
          Log pages →
        </a>
      </Panel>
      <Panel title="Dua for breaking the fast" icon="mat">
        <p className="duas__arabic" lang="ar">
          {IFTAR_DUA.arabic}
        </p>
        <p>
          <strong>{IFTAR_DUA.latin}</strong>
        </p>
        <p className="muted">{IFTAR_DUA.meaning}</p>
        <p className="muted small">Iftar today at {minsToClock(t.iftar)} (Maghrib in Sheffield).</p>
      </Panel>
    </div>
  );
}
