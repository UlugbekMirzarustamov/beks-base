/**
 * 🔭 REFLECT — "the Telescope".
 * Tabs:
 *  - Tonight  a 1-minute nightly log. Each night you log lights a star.
 *  - Week     the weekly look back (with that week's real numbers).
 *  - Sky      your own night sky: every logged night is a star, nights in a
 *             row join into constellations. Tap a star to re-read that night.
 *  - Year     year in pixels: one square per day, coloured by mood / prayers / money / study.
 *  - Vision   your vision board: big goals with a picture and a why.
 *  - Letters  sealed letters to future you that only open on a chosen date.
 */
import { useState, type FormEvent } from 'react';
import { addDays, daysBetween, formatDay, relativeDays } from '../lib/dates';
import { uid } from '../lib/id';
import { sfx } from '../lib/sound';
import type { Letter, NightLog } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Empty, Field, Panel, Segmented, Tabs, useConfirm, useSubRoute } from '../ui/kit';
import { WeekReflect } from './Extras';
import { VisionBoard } from './Push';
import { pixelLevel, type PixelKind } from '../lib/pixels';
import { spendByDay } from '../lib/pot';

const TABS = ['tonight', 'week', 'sky', 'year', 'vision', 'letters'] as const;
type Tab = (typeof TABS)[number];

/** XP for lighting a star (logging a night). */
const STAR_XP = 10;

export default function Reflect({ sub }: { sub?: string }) {
  const [tab, setTab] = useSubRoute<Tab>('reflect', sub, TABS);
  return (
    <div className="screen">
      <h1 className="screen__title">
        <PixelIcon name="telescope" size={28} /> The Telescope
      </h1>
      <Tabs<Tab>
        label="Reflect sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'tonight', label: 'Tonight', icon: 'moon' },
          { id: 'week', label: 'Week', icon: 'calendar' },
          { id: 'sky', label: 'My sky', icon: 'star' },
          { id: 'year', label: 'Year', icon: 'calendar' },
          { id: 'vision', label: 'Vision', icon: 'photo' },
          { id: 'letters', label: 'Letters', icon: 'letter' },
        ]}
      />
      {tab === 'tonight' && <Tonight onLit={() => setTab('sky')} />}
      {tab === 'week' && <WeekReflect />}
      {tab === 'sky' && <Sky />}
      {tab === 'year' && <YearPixels />}
      {tab === 'vision' && <VisionBoard />}
      {tab === 'letters' && <Letters />}
    </div>
  );
}

// ---------------------------------------------------------------- Tonight
const emptyLog = (): NightLog => ({ line: '', good: ['', '', ''], tomorrow: '' });

function Tonight({ onLit }: { onLit: () => void }) {
  const { data, update, today, gainXp, toast } = useStore();
  const log = data.nightLogs[today] ?? emptyLog();
  const yesterday = data.nightLogs[addDays(today, -1)];
  const ready = log.line.trim().length > 0;

  const edit = (change: Partial<NightLog>) =>
    update((d) => {
      d.nightLogs[today] = { ...(d.nightLogs[today] ?? emptyLog()), ...change };
    });

  const light = () => {
    if (!ready) {
      toast('Write today in one sentence first', 'error');
      return;
    }
    if (!log.rewarded) {
      sfx('twinkle');
      edit({ rewarded: true });
      gainXp(STAR_XP, 'a new star in your sky');
    }
    onLit();
  };

  return (
    <div className="grid grid--2">
      <Panel title={`Tonight · ${formatDay(today)}`} icon="moon" className="tonight">
        <p className="muted small">One minute before bed. No essays — just honest notes. Saved automatically.</p>
        {yesterday?.tomorrow && (
          <p className="tonight__echo">
            <PixelIcon name="scroll" size={16} /> Last night you planned: <strong>“{yesterday.tomorrow}”</strong>. Did you?
          </p>
        )}
        <Field label="Today in one sentence">
          <textarea className="input" rows={2} value={log.line} onChange={(e) => edit({ line: e.target.value })} placeholder="e.g. Hard physics day, but I finally got momentum." />
        </Field>
        <fieldset className="field">
          <legend className="field__label">Three good things (tiny ones count)</legend>
          <div className="good-things">
            {log.good.map((g, i) => (
              <label key={i} className="good-thing">
                <PixelIcon name="star" size={18} />
                <input
                  className="input"
                  aria-label={`Good thing ${i + 1}`}
                  value={g}
                  placeholder={['Nice chat with a classmate', 'Cooked plov', 'Sunny walk to class'][i]}
                  onChange={(e) => edit({ good: log.good.map((x, j) => (j === i ? e.target.value : x)) })}
                />
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Tomorrow I will…">
          <input className="input" value={log.tomorrow} onChange={(e) => edit({ tomorrow: e.target.value })} placeholder="e.g. Do 2 Pomodoros of Maths before lunch" />
        </Field>
        <button type="button" className={`btn ${log.rewarded ? '' : 'btn--primary'} btn--wide`} onClick={light}>
          <PixelIcon name="star" size={18} /> {log.rewarded ? 'Star lit — see my sky' : `Light tonight's star (+${STAR_XP} XP)`}
        </button>
      </Panel>
      <Panel title="Why bother?" icon="telescope">
        <p>
          Looking back for one minute a day helps you notice what's working, catch stress early, and remember the good bits of a busy year
          far from home.
        </p>
        <p className="muted small">
          Every night you log becomes a star in <a href="#/reflect/sky">your sky</a>. Nights in a row join up into constellations — try not
          to break the chain.
        </p>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- Sky
const SKY_DAYS = 56; // the last 8 weeks

/** A repeatable height (in %) for each date, so a star always sits in the same place. */
function starHeight(date: string): number {
  let h = 0;
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  const x = Math.sin(h) * 10000;
  return 18 + (x - Math.floor(x)) * 64;
}

function Sky() {
  const { data, today } = useStore();
  const days = Array.from({ length: SKY_DAYS }, (_, i) => addDays(today, i - SKY_DAYS + 1));
  const lit = (d: string) => Boolean(data.nightLogs[d]?.line.trim());
  // x runs from 5% (8 weeks ago) to 92% (tonight), leaving room at the edges and for the moon.
  const stars = days.map((d, i) => ({ date: d, x: 5 + (i / (SKY_DAYS - 1)) * 87, y: starHeight(d), on: lit(d) }));
  const [picked, setPicked] = useState<string | null>(() => [...stars].reverse().find((s) => s.on)?.date ?? null);
  const count = stars.filter((s) => s.on).length;

  // Longest run of nights in a row, and the current one.
  let best = 0;
  let run = 0;
  for (const s of stars) {
    run = s.on ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const current = lit(today) ? run : lit(addDays(today, -1)) ? run : 0;
  const pickedLog = picked ? data.nightLogs[picked] : null;

  return (
    <div className="grid grid--2">
      <Panel title={`My sky · ${count} star${count === 1 ? '' : 's'}`} icon="star" className="sky-panel">
        <div className="sky" role="group" aria-label="Your night sky. Each star is a night you reflected.">
          <svg className="sky__lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {stars.slice(1).map((s, i) =>
              s.on && stars[i].on ? <line key={s.date} x1={stars[i].x} y1={stars[i].y} x2={s.x} y2={s.y} vectorEffect="non-scaling-stroke" /> : null,
            )}
          </svg>
          <span className="sky__moon" aria-hidden="true" />
          {stars.map((s) =>
            s.on ? (
              <button
                key={s.date}
                type="button"
                className={`sky__star ${s.date === picked ? 'is-picked' : ''} ${data.reflections[s.date] ? 'is-big' : ''}`}
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
                onClick={() => setPicked(s.date)}
                aria-label={`${formatDay(s.date)}: ${data.nightLogs[s.date].line}`}
                aria-pressed={s.date === picked}
              />
            ) : (
              <span key={s.date} className="sky__dust" style={{ left: `${s.x}%`, top: `${s.y}%` }} aria-hidden="true" />
            ),
          )}
          {count === 0 && <p className="sky__empty">Your sky is dark… for now. Log tonight to light your first star.</p>}
        </div>
        <div className="sky__stats">
          <span>
            <strong>{current}</strong> night streak
          </span>
          <span>
            <strong>{best}</strong> longest constellation
          </span>
          <span className="muted">last 8 weeks</span>
        </div>
      </Panel>
      <Panel title={picked ? formatDay(picked) : 'Pick a star'} icon="scroll">
        {pickedLog ? (
          <div className="night-read">
            <p className="night-read__line">“{pickedLog.line}”</p>
            {pickedLog.good.some((g) => g.trim()) && (
              <ul className="night-read__good">
                {pickedLog.good
                  .filter((g) => g.trim())
                  .map((g, i) => (
                    <li key={i}>
                      <PixelIcon name="star" size={14} /> {g}
                    </li>
                  ))}
              </ul>
            )}
            {pickedLog.tomorrow && (
              <p className="muted">
                Planned for the next day: <em>{pickedLog.tomorrow}</em>
              </p>
            )}
          </div>
        ) : (
          <Empty>
            Tap a star to read that night. <a href="#/reflect/tonight">Write tonight's log →</a>
          </Empty>
        )}
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- Letters to future you
function Letters() {
  const { data, update, today, toast } = useStore();
  const ask = useConfirm();
  const nextTest = data.tests.filter((t) => t.date > today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const [form, setForm] = useState({ title: '', body: '', openOn: addDays(today, 30) });

  const quick: { label: string; date: string }[] = [
    { label: 'In 1 week', date: addDays(today, 7) },
    { label: 'In 1 month', date: addDays(today, 30) },
    ...(nextTest && daysBetween(today, nextTest.date) > 1 ? [{ label: `Day before ${nextTest.name}`, date: addDays(nextTest.date, -1) }] : []),
    { label: 'In 6 months', date: addDays(today, 182) },
  ];

  const seal = (e: FormEvent) => {
    e.preventDefault();
    if (!form.body.trim()) {
      toast('Write something to future you first', 'error');
      return;
    }
    if (form.openOn <= today) {
      toast('Pick a date in the future', 'error');
      return;
    }
    update((d) => {
      d.letters.push({ id: uid(), title: form.title.trim() || 'To future Bek', body: form.body.trim(), written: today, openOn: form.openOn, opened: false });
    });
    toast(`Letter sealed! It opens ${relativeDays(daysBetween(today, form.openOn))}.`, 'pop');
    setForm({ title: '', body: '', openOn: addDays(today, 30) });
  };

  const open = (l: Letter) =>
    update((d) => {
      const item = d.letters.find((x) => x.id === l.id);
      if (item) item.opened = true;
    });
  const remove = async (l: Letter) => {
    if (!(await ask(`Throw away "${l.title}"?`, { ok: 'Throw away' }))) return;
    update((d) => {
      d.letters = d.letters.filter((x) => x.id !== l.id);
    });
  };

  const sorted = [...data.letters].sort((a, b) => a.openOn.localeCompare(b.openOn));

  return (
    <div className="grid grid--2">
      <Panel title="Letters to future me" icon="letter">
        {sorted.length === 0 && <Empty>No letters yet. Write one to the Bek of next month →</Empty>}
        <ul className="letters">
          {sorted.map((l) => {
            const wait = daysBetween(today, l.openOn);
            const state = l.opened ? 'opened' : wait <= 0 ? 'ready' : 'sealed';
            return (
              <li key={l.id} className={`letter letter--${state}`}>
                <div className="letter__head">
                  <PixelIcon name="letter" size={28} />
                  <div className="grow">
                    <strong>{l.title}</strong>
                    <small className="muted">
                      Written {formatDay(l.written)} ·{' '}
                      {state === 'sealed' ? `opens ${relativeDays(wait)} (${formatDay(l.openOn)})` : state === 'ready' ? 'ready to open!' : `opened`}
                    </small>
                  </div>
                  <button type="button" className="icon-btn" onClick={() => remove(l)} aria-label={`Throw away ${l.title}`}>
                    <PixelIcon name="trash" size={16} />
                  </button>
                </div>
                {state === 'sealed' && <p className="letter__seal">Sealed with wax. No peeking — {wait} day{wait === 1 ? '' : 's'} to go.</p>}
                {state === 'ready' && (
                  <button type="button" className="btn btn--primary" onClick={() => open(l)}>
                    Break the seal
                  </button>
                )}
                {state === 'opened' && <p className="letter__body">{l.body}</p>}
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel title="Write a letter" icon="pencil">
        <form className="form" onSubmit={seal}>
          <Field label="To">
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="To future Bek" />
          </Field>
          <Field label="Letter">
            <textarea
              className="input"
              rows={6}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="What are you worried about right now? What do you hope has happened by then? A reminder you'll need?"
            />
          </Field>
          <p className="field__label">Opens on</p>
          <div className="segmented">
            {quick.map((q) => (
              <button key={q.label} type="button" className="segmented__btn" aria-pressed={form.openOn === q.date} onClick={() => setForm({ ...form, openOn: q.date })}>
                {q.label}
              </button>
            ))}
          </div>
          <input className="input" type="date" aria-label="Open date" min={addDays(today, 1)} value={form.openOn} onChange={(e) => setForm({ ...form, openOn: e.target.value })} />
          <button type="submit" className="btn btn--primary">
            <PixelIcon name="letter" size={18} /> Seal the letter
          </button>
          <p className="muted small">Once sealed you can't read it until the date — that's the fun.</p>
        </form>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- Year in pixels
const PIXEL_KINDS: { value: PixelKind; label: string; legend: string[] }[] = [
  { value: 'mood', label: 'Mood', legend: ['Awful', 'Bad', 'Okay', 'Good', 'Great'] },
  { value: 'prayer', label: 'Prayers', legend: ['1 prayer', '2', '3', '4', 'All 5'] },
  { value: 'money', label: 'Money', legend: ['Way over', 'A bit over', 'Within', 'Under half', 'Spent $0'] },
  { value: 'study', label: 'Study', legend: ['', '< 50 min', '50 min+', '100 min+', '150 min+'] },
];
const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function YearPixels() {
  const { data, today } = useStore();
  const [kind, setKind] = useState<PixelKind>('mood');
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const info = PIXEL_KINDS.find((k) => k.value === kind)!;
  const spent = data.pot ? spendByDay(data.expenses, data.pot.start, today) : undefined;
  return (
    <div className="grid grid--2">
      <Panel
        title={`${year} in pixels`}
        icon="calendar"
        actions={
          <div className="month-picker">
            <button type="button" className="btn btn--small" onClick={() => setYear(year - 1)} aria-label="Previous year">
              <PixelIcon name="arrowL" size={16} />
            </button>
            <button type="button" className="btn btn--small" onClick={() => setYear(year + 1)} aria-label="Next year" disabled={year >= Number(today.slice(0, 4))}>
              <PixelIcon name="arrowR" size={16} />
            </button>
          </div>
        }
      >
        <Segmented<PixelKind> label="Colour days by" value={kind} onChange={setKind} options={PIXEL_KINDS.map((k) => ({ value: k.value, label: k.label }))} />
        <div className="year-grid" role="img" aria-label={`Every day of ${year}, coloured by ${info.label.toLowerCase()}`}>
          <span />
          {MONTH_LETTERS.map((m, i) => (
            <span key={i} className="year-grid__head">
              {m}
            </span>
          ))}
          {Array.from({ length: 31 }, (_, d) => (
            <YearRow key={d} day={d + 1} year={year} kind={kind} spent={spent} today={today} />
          ))}
        </div>
        <ul className="year-legend">
          {info.legend.map((l, i) =>
            l ? (
              <li key={i}>
                <span className={`year-px year-px--${kind} lv${i + 1}`} /> {l}
              </li>
            ) : null,
          )}
        </ul>
      </Panel>
      <Panel title="Why squares?" icon="star">
        <p>One square per day. After a few months you can see patterns no single day shows: which weeks were heavy, when prayers slipped, how exam weeks felt.</p>
        <p className="muted small">Mood comes from Home's check-in, prayers from your lanterns, money from your daily allowance, study from Pomodoros. Empty squares are days with nothing logged.</p>
      </Panel>
    </div>
  );
}

function YearRow({ day, year, kind, spent, today }: { day: number; year: number; kind: PixelKind; spent?: Map<string, number>; today: string }) {
  const { data } = useStore();
  return (
    <>
      <span className="year-grid__day">{day % 5 === 0 || day === 1 ? day : ''}</span>
      {MONTH_LETTERS.map((_, m) => {
        const date = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const exists = new Date(`${date}T12:00:00Z`).getUTCDate() === day;
        if (!exists) return <span key={m} className="year-px year-px--none" />;
        const level = date <= today ? pixelLevel(data, kind, date, spent) : null;
        return <span key={m} className={`year-px year-px--${kind} ${level ? `lv${level}` : ''} ${date === today ? 'is-today' : ''}`} title={date} />;
      })}
    </>
  );
}
