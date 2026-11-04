/**
 * Tasbih counter and Qur'an tracker (tabs on the Prayer page).
 */
import { useState } from 'react';
import { streak } from '../lib/cabin';
import { addDays, formatDay, weekdayOf, WEEKDAYS } from '../lib/dates';
import { juzOfPage, logReading, QURAN_PAGES } from '../lib/quran';
import { buzz, sfx } from '../lib/sound';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Bar, Field, Panel, Segmented } from '../ui/kit';

// ---------------------------------------------------------------- Tasbih
/** The tasbih after prayer: 33 + 33 + 34 = 100. */
const DHIKR = [
  { arabic: 'سُبْحَانَ ٱللَّٰهِ', latin: 'SubhanAllah', meaning: 'Glory be to Allah', target: 33 },
  { arabic: 'ٱلْحَمْدُ لِلَّٰهِ', latin: 'Alhamdulillah', meaning: 'All praise is for Allah', target: 33 },
  { arabic: 'ٱللَّٰهُ أَكْبَرُ', latin: 'Allahu Akbar', meaning: 'Allah is the Greatest', target: 34 },
];
const BEADS = 33;

export function Tasbih() {
  const { data, update, today, gainXp } = useStore();
  const [mode, setMode] = useState<'after-prayer' | 'free'>('after-prayer');
  const [phase, setPhase] = useState(0);
  const [count, setCount] = useState(0);
  const d = DHIKR[phase];
  const todayTotal = data.tasbih[today] ?? 0;
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const weekMax = Math.max(100, ...week.map((day) => data.tasbih[day] ?? 0));

  const tap = () => {
    const next = count + 1;
    update((x) => {
      x.tasbih[today] = (x.tasbih[today] ?? 0) + 1;
    });
    buzz(8);
    if (mode === 'after-prayer' && next >= d.target) {
      sfx('bell');
      if (phase === DHIKR.length - 1) {
        gainXp(5, 'tasbih complete');
        setPhase(0);
      } else setPhase(phase + 1);
      setCount(0);
    } else {
      sfx('bead');
      setCount(next);
    }
  };
  const reset = () => {
    setPhase(0);
    setCount(0);
  };

  // Light up beads: in after-prayer mode out of the phase target; in free mode it loops every 33.
  const lit = mode === 'after-prayer' ? Math.round((count / d.target) * BEADS) : count % BEADS;

  return (
    <div className="grid grid--2">
      <Panel title="Tasbih" icon="bead" className="tasbih">
        <Segmented
          label="Mode"
          value={mode}
          onChange={(m) => {
            setMode(m);
            reset();
          }}
          options={[
            { value: 'after-prayer', label: 'After prayer (33·33·34)' },
            { value: 'free', label: 'Free count' },
          ]}
        />
        {mode === 'after-prayer' && (
          <div className="tasbih__phrase">
            <p className="tasbih__arabic" lang="ar">
              {d.arabic}
            </p>
            <p>
              <strong>{d.latin}</strong> <span className="muted">— {d.meaning}</span>
            </p>
          </div>
        )}
        <div className="tasbih__ring">
          {Array.from({ length: BEADS }, (_, i) => (
            <span key={i} className={`tasbih__bead ${i < lit ? 'is-on' : ''}`} style={{ transform: `rotate(${(i * 360) / BEADS}deg) translateY(-118px)` }} />
          ))}
          <button type="button" className="tasbih__tap" onClick={tap} aria-label={`Count. ${mode === 'after-prayer' ? `${d.latin} ${count} of ${d.target}` : `${count}`}`}>
            <span className="tasbih__count">{count}</span>
            {mode === 'after-prayer' && <span className="tasbih__of">/ {d.target}</span>}
            <span className="tasbih__hint">tap</span>
          </button>
        </div>
        <div className="form__actions">
          {mode === 'after-prayer' && (
            <p className="muted small grow">
              Round {phase + 1} of 3 · {DHIKR.map((x) => x.latin).join(' → ')}
            </p>
          )}
          <button type="button" className="btn btn--small" onClick={reset}>
            Reset
          </button>
        </div>
      </Panel>
      <Panel title={`Today: ${todayTotal}`} icon="star">
        <p className="muted small">Every tap counts towards today's total.</p>
        <ul className="mini-bars">
          {week.map((day) => (
            <li key={day}>
              <span>{day === today ? 'Today' : WEEKDAYS[weekdayOf(day)]}</span>
              <Bar value={data.tasbih[day] ?? 0} max={weekMax} label={`Tasbih on ${formatDay(day)}`} color="var(--grass)" />
              <span className="mini-bars__n">{data.tasbih[day] ?? 0}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- Qur'an
export function Quran() {
  const { data, update, today, toast, gainXp } = useStore();
  const q = data.quran;
  const [pageInput, setPageInput] = useState('');
  const readToday = q.log[today] ?? 0;
  const readStreak = streak((d) => (q.log[d] ?? 0) > 0, today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const weekMax = Math.max(q.dailyGoal, ...week.map((d) => q.log[d] ?? 0));
  const left = QURAN_PAGES - q.page;
  const finishBy = q.dailyGoal > 0 ? addDays(today, Math.ceil(left / q.dailyGoal)) : null;

  const read = (pages: number) => {
    if (pages === 0) return;
    const before = readToday;
    const { quran, finished } = logReading(q, today, pages);
    update((d) => void (d.quran = quran));
    if (pages > 0) sfx('pop');
    if (finished) {
      sfx('bell');
      toast('Khatm complete! You finished the whole Qur’an. MashaAllah!', 'level');
      gainXp(100, 'khatm');
    } else if (before < q.dailyGoal && before + pages >= q.dailyGoal) {
      gainXp(10, "today's Qur'an goal");
    }
  };

  const jumpTo = () => {
    const page = Math.round(Number(pageInput));
    if (!(page >= 1 && page <= QURAN_PAGES)) {
      toast(`Type a page from 1 to ${QURAN_PAGES}`, 'error');
      return;
    }
    // Moving forward counts as reading; moving back just moves the bookmark.
    if (page > q.page) read(page - q.page);
    else update((d) => void (d.quran.page = page));
    setPageInput('');
  };

  return (
    <div className="grid grid--2">
      <Panel title="Qur'an" icon="quran">
        <div className="quran-now">
          <span className="big-number big-number--small">p. {q.page || '—'}</span>
          <span>
            Juz <strong>{q.page ? juzOfPage(q.page) : 1}</strong> of 30
            {q.khatms > 0 && <small className="muted"> · {q.khatms} khatm{q.khatms === 1 ? '' : 's'} completed</small>}
          </span>
        </div>
        <Bar value={q.page} max={QURAN_PAGES} label="Progress through the Qur'an" color="var(--grass)" />
        <p className="bar-caption">
          {q.page} / {QURAN_PAGES} pages · {Math.floor((q.page / QURAN_PAGES) * 100)}%
        </p>
        <p className="field__label">I just read…</p>
        <div className="form__actions">
          <button type="button" className="btn btn--primary" onClick={() => read(1)}>
            +1 page
          </button>
          <button type="button" className="btn btn--primary" onClick={() => read(2)}>
            +2
          </button>
          <button type="button" className="btn btn--primary" onClick={() => read(5)}>
            +5
          </button>
          <button type="button" className="btn" onClick={() => read(20)}>
            +1 juz
          </button>
          <button type="button" className="btn btn--small" onClick={() => read(-1)} disabled={readToday === 0} aria-label="Undo one page">
            Undo
          </button>
        </div>
        <div className="form__row">
          <Field label="Or: I'm now on page" className="grow">
            <input className="input" type="number" min={1} max={QURAN_PAGES} value={pageInput} onChange={(e) => setPageInput(e.target.value)} />
          </Field>
          <button type="button" className="btn" onClick={jumpTo}>
            Set
          </button>
        </div>
      </Panel>
      <Panel title={`Today: ${readToday} / ${q.dailyGoal} pages`} icon="star">
        <Bar value={readToday} max={q.dailyGoal} label="Today's pages" color="var(--gold)" />
        <p>
          <PixelIcon name="flame" size={14} /> <strong>{readStreak}</strong>-day reading streak
          {finishBy && (
            <>
              {' '}
              · at {q.dailyGoal} pages a day you'll finish around <strong>{formatDay(finishBy)}</strong>
            </>
          )}
        </p>
        <Field label="Daily goal (pages)">
          <input
            className="input"
            type="number"
            min={1}
            max={60}
            value={q.dailyGoal}
            onChange={(e) => update((d) => void (d.quran.dailyGoal = Math.max(1, Math.min(60, Math.round(Number(e.target.value)) || 1))))}
          />
        </Field>
        <p className="muted small">4 pages a day ≈ one khatm in 5 months. 20 pages a day = one juz a day = a khatm in a month (Ramadan pace).</p>
        <ul className="mini-bars">
          {week.map((day) => (
            <li key={day}>
              <span>{day === today ? 'Today' : WEEKDAYS[weekdayOf(day)]}</span>
              <Bar value={q.log[day] ?? 0} max={weekMax} label={`Pages on ${formatDay(day)}`} color="var(--grass)" />
              <span className="mini-bars__n">{q.log[day] ?? 0}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
