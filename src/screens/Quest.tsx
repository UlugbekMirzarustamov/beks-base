/**
 * ⚔ BEK'S QUEST: real-life side quests instead of scrolling.
 *  - <QuestHome>      the card on Home: I'm bored / I'm about to scroll, this week's time, the next action
 *  - <QuestOverlays>  mounted once in App: the "I'm bored" picker, the scroll SOS, the "I did it" sheet
 *                     and the little celebration
 *  - default          the Quest screen: Today (dashboard), Projects, Journal
 * Logic lives in lib/quests.ts, the quests themselves in lib/questLibrary.ts.
 * No XP, levels or streaks: the reward is time away from the screen and a record of real things done.
 */
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { addMonths, formatDay, formatMonth, monthOf, UK_TZ, weekdayOf, zonedParts } from '../lib/dates';
import { uid } from '../lib/id';
import { CATEGORIES, PROJECTS, type Energy, type Place, type Quest, type QuestCategory } from '../lib/questLibrary';
import {
  acceptQuest,
  challengeProgress,
  completeQuest,
  dailyMissions,
  doneOn,
  dropActive,
  dropProject,
  emergencyQuest,
  hoursLabel,
  lifeStats,
  monthStats,
  nextAction,
  nextStep,
  pickQuest,
  projectsOf,
  projectTemplate,
  questById,
  questLog,
  removeEntry,
  startProject,
  stepsDone,
  swapMission,
  TIME_CHOICES,
  toggleStep,
  weekStats,
  type Ctx,
} from '../lib/quests';
import { sfx } from '../lib/sound';
import type { QuestFrom } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Bar, Empty, Panel, Sheet, Tabs, useConfirm, useSubRoute } from '../ui/kit';
import { useWeather, windowWeather } from '../ui/Weather';
import { openFocus } from './Growth';
import { setPhotos, shrink, usePhotos } from './Photos';

export const openBored = () => window.dispatchEvent(new Event('beks:bored'));
export const openScrollSos = () => window.dispatchEvent(new Event('beks:sos'));
const openDone = (questId: string, from: QuestFrom) => window.dispatchEvent(new CustomEvent('beks:quest-done', { detail: { questId, from } }));

const ENERGY_WORDS: Record<Energy, string> = { low: 'Low', medium: 'Medium', high: 'High' };
const PLACE_WORDS: Record<Place, string> = { indoors: 'Indoors', outdoors: 'Outdoors', anywhere: 'Anywhere' };
const DIFFICULTY_WORDS = { easy: 'Easy', steady: 'Steady', hard: 'Hard' } as const;

/** UK hour, weekday and rain, for picking a quest that makes sense right now. */
function useQuestCtx(): Ctx {
  const { today } = useStore();
  const weather = windowWeather(useWeather());
  return { hour: zonedParts(new Date(), UK_TZ).hour, weekday: weekdayOf(today), wet: weather === 'rain' || weather === 'storm' || weather === 'snow' };
}

// ---------------------------------------------------------------- one mission, drawn like a quest scroll
function MissionCard({ quest, children }: { quest: Quest; children?: ReactNode }) {
  const cat = CATEGORIES[quest.category];
  return (
    <article className={`mission mission--${quest.category}`}>
      <p className="mission__area">
        <PixelIcon name={cat.icon} size={16} /> {cat.name}
      </p>
      <h3 className="mission__title">{quest.title}</h3>
      <p>{quest.description}</p>
      <p className="mission__done">
        <strong>Done when:</strong> {quest.done}
      </p>
      <ul className="mission__meta" aria-label="About this quest">
        <li>
          <PixelIcon name="clock" size={14} /> {hoursLabel(quest.minutes)}
        </li>
        <li>{ENERGY_WORDS[quest.energy]} energy</li>
        <li>{DIFFICULTY_WORDS[quest.difficulty]}</li>
        <li>{PLACE_WORDS[quest.place]}</li>
      </ul>
      {children}
    </article>
  );
}

function Chips<T extends string | number>({ label, options, value, onChange, render }: { label: string; options: readonly T[]; value: T | null; onChange: (v: T) => void; render: (v: T) => string }) {
  return (
    <div className="quest-ask">
      <p className="quest-ask__label">{label}</p>
      <div className="quest-ask__chips" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={String(o)} type="button" role="radio" aria-checked={value === o} className={`chip ${value === o ? 'is-on' : ''}`} onClick={() => onChange(o)}>
            {render(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- I'm bored
function BoredSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, update, today, toast } = useStore();
  const ctx = useQuestCtx();
  const [minutes, setMinutes] = useState<number | null>(null);
  const [energy, setEnergy] = useState<Energy | null>(null);
  const [place, setPlace] = useState<Place>('anywhere');
  const [shown, setShown] = useState<string[]>([]);
  const [quest, setQuest] = useState<Quest | null | 'none'>(null);

  useEffect(() => {
    if (!open) return;
    setQuest(null);
    setShown([]);
  }, [open]);

  const roll = (skip: string[]) => {
    if (!minutes || !energy) return;
    const q = pickQuest(data, { minutes, energy, place }, ctx, today, Math.random, skip);
    setQuest(q ?? 'none');
    if (q) setShown([...skip, q.id]);
  };
  const accept = (q: Quest) => {
    update((d) => acceptQuest(d, q.id, 'bored', new Date().toISOString()));
    sfx('twinkle');
    toast('Mission accepted. Phone down, go.', 'pop');
    onClose();
  };
  const rerolls = Math.max(0, shown.length - 1);

  return (
    <Sheet open={open} onClose={onClose} title="I’m bored">
      {quest === null ? (
        <div className="quest-flow">
          <Chips label="How much time do you have?" options={TIME_CHOICES} value={minutes} onChange={setMinutes} render={(m) => hoursLabel(m)} />
          <Chips<Energy> label="Energy" options={['low', 'medium', 'high']} value={energy} onChange={setEnergy} render={(e) => ENERGY_WORDS[e]} />
          <Chips<Place> label="Where? (optional)" options={['anywhere', 'indoors', 'outdoors']} value={place} onChange={setPlace} render={(p) => PLACE_WORDS[p]} />
          <button type="button" className="btn btn--primary btn--wide" disabled={!minutes || !energy} onClick={() => roll([])}>
            <PixelIcon name="sword" size={18} /> Give me one mission
          </button>
        </div>
      ) : quest === 'none' ? (
        <div className="quest-flow">
          <p>Nothing fits that exactly. A little more time or energy opens more quests.</p>
          <button type="button" className="btn btn--wide" onClick={() => setQuest(null)}>
            Change my answers
          </button>
        </div>
      ) : (
        <MissionCard quest={quest}>
          <div className="mission__actions">
            <button type="button" className="btn btn--primary grow" onClick={() => accept(quest)}>
              Accept mission
            </button>
            {rerolls < 2 && (
              <button type="button" className="btn" onClick={() => roll(shown)}>
                Another one
              </button>
            )}
          </div>
          {rerolls >= 2 && <p className="muted small">That’s your mission. The best one is the one you start.</p>}
        </MissionCard>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------- I'm about to scroll
const SOS_LINES = [
  'That pull to scroll is normal. It passes in a few minutes if you give it something else to do.',
  'You noticed it before you opened the app. That is the hard part, and you just did it.',
  'Your brain wants something new. Let’s give it something real instead.',
  'Nothing wrong with you. Boredom is just energy without a direction yet.',
];

function ScrollSos({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, update, today, toast } = useStore();
  const ctx = useQuestCtx();
  const [minutes, setMinutes] = useState<number | null>(null);
  const [quest, setQuest] = useState<Quest | null>(null);
  const line = useMemo(() => (open ? SOS_LINES[Math.floor(Math.random() * SOS_LINES.length)] : ''), [open]);

  useEffect(() => {
    if (!open) return;
    setMinutes(null);
    setQuest(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;

  const choose = (m: number) => {
    setMinutes(m);
    setQuest(pickQuest(data, { minutes: m, energy: 'medium', place: 'anywhere' }, ctx, today) ?? emergencyQuest(data, ctx, today));
  };
  const emergency = () => {
    setMinutes(10);
    setQuest(emergencyQuest(data, ctx, today, Math.random, quest ? [quest.id] : []));
  };
  const accept = (q: Quest) => {
    update((d) => acceptQuest(d, q.id, 'sos', new Date().toISOString()));
    sfx('twinkle');
    toast('Go. The feed will still be there later, and just as boring.', 'pop');
    onClose();
  };

  return (
    <div className="sos" role="dialog" aria-modal="true" aria-label="I’m about to scroll">
      <div className="sos__box">
        <p className="sos__title">
          <PixelIcon name="lantern" size={22} /> Pause for a breath
        </p>
        <p className="sos__line">{line}</p>
        {!quest ? (
          <>
            <Chips label="How much free time do you have?" options={TIME_CHOICES} value={minutes} onChange={choose} render={(m) => hoursLabel(m)} />
            <button type="button" className="btn btn--primary btn--wide" onClick={emergency}>
              <PixelIcon name="flame" size={16} /> Just give me a 10-minute mission
            </button>
          </>
        ) : (
          <MissionCard quest={quest}>
            <div className="mission__actions">
              <button type="button" className="btn btn--primary grow" onClick={() => accept(quest)}>
                I’ll do this now
              </button>
              {!quest.emergency && (
                <button type="button" className="btn" onClick={emergency}>
                  10-minute one instead
                </button>
              )}
            </div>
          </MissionCard>
        )}
        <p className="sos__tip small">Tip: put the phone face down in another room while you do it.</p>
        <button type="button" className="btn btn--ghost btn--small" onClick={onClose}>
          I’m okay now
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- I did it
function DoneSheet({ job, onClose, onSaved }: { job: { questId: string; from: QuestFrom } | null; onClose: () => void; onSaved: (minutes: number, from: QuestFrom) => void }) {
  const { update, today, toast } = useStore();
  const photos = usePhotos();
  const quest = job ? questById(job.questId) : undefined;
  const [note, setNote] = useState('');
  const [minutes, setMinutes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNote('');
    setFile(null);
    setMinutes(quest ? String(quest.minutes) : '');
  }, [quest]);

  if (!job || !quest) return null;
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    let photoId: string | undefined;
    if (file) {
      try {
        const id = uid();
        setPhotos([...photos, { id, src: await shrink(file), caption: `${quest.title}${note.trim() ? `: ${note.trim()}` : ''}`, added: today }]);
        photoId = id;
      } catch {
        toast('The photo couldn’t be added, but the quest is saved', 'warn');
      }
    }
    const m = Number(minutes) > 0 ? Number(minutes) : quest.minutes;
    update((d) => void completeQuest(d, { id: uid(), questId: quest.id, date: today, minutes: m, note, from: job.from, photoId }));
    setBusy(false);
    onSaved(m, job.from);
  };

  return (
    <Sheet open onClose={onClose} title="Quest complete">
      <form className="form" onSubmit={save}>
        <p className="done-sheet__title">
          <PixelIcon name={CATEGORIES[quest.category].icon} size={18} /> {quest.title}
        </p>
        <p className="muted small">Done when: {quest.done}</p>
        <label className="field">
          <span className="field__label">One line for your journal (optional)</span>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} placeholder="What happened? What did you notice?" />
        </label>
        <label className="field">
          <span className="field__label">Minutes it took</span>
          <input className="input" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} />
        </label>
        <label className="field">
          <span className="field__label">A photo for the cabin wall (optional)</span>
          <input className="input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <button type="submit" className="btn btn--primary btn--wide" disabled={busy}>
          <PixelIcon name="check" size={16} /> Save to my journal
        </button>
      </form>
    </Sheet>
  );
}

/** A short, satisfying moment after a quest: the real time you got back. */
function Celebration({ minutes, from, onClose }: { minutes: number; from: QuestFrom; onClose: () => void }) {
  const { data, today } = useStore();
  const week = weekStats(data, today);
  useEffect(() => {
    sfx('levelup');
    const t = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(t);
  }, [onClose]);
  return (
    <div className="quest-win" role="status" onClick={onClose}>
      <div className="quest-win__burst" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} style={{ rotate: `${i * 30}deg` }} />
        ))}
      </div>
      <p className="quest-win__big">+{hoursLabel(minutes)}</p>
      <p className="quest-win__line">of real life. That’s yours.</p>
      <p className="quest-win__small">This week: {hoursLabel(week.minutes)} away from the screen.</p>
      {from === 'sos' && <p className="quest-win__small">A scroll moment, turned into something real.</p>}
    </div>
  );
}

/** Mounted once in App: listens for the buttons anywhere in the app. */
export function QuestOverlays() {
  const [bored, setBored] = useState(false);
  const [sos, setSos] = useState(false);
  const [job, setJob] = useState<{ questId: string; from: QuestFrom } | null>(null);
  const [win, setWin] = useState<{ minutes: number; from: QuestFrom } | null>(null);
  useEffect(() => {
    const b = () => setBored(true);
    const s = () => setSos(true);
    const d = (e: Event) => setJob((e as CustomEvent<{ questId: string; from: QuestFrom }>).detail);
    window.addEventListener('beks:bored', b);
    window.addEventListener('beks:sos', s);
    window.addEventListener('beks:quest-done', d);
    return () => {
      window.removeEventListener('beks:bored', b);
      window.removeEventListener('beks:sos', s);
      window.removeEventListener('beks:quest-done', d);
    };
  }, []);
  const closeSos = useMemo(() => () => setSos(false), []);
  const closeWin = useMemo(() => () => setWin(null), []);
  return (
    <>
      <BoredSheet open={bored} onClose={() => setBored(false)} />
      <ScrollSos open={sos} onClose={closeSos} />
      <DoneSheet
        job={job}
        onClose={() => setJob(null)}
        onSaved={(minutes, from) => {
          setJob(null);
          setWin({ minutes, from });
        }}
      />
      {win && <Celebration minutes={win.minutes} from={win.from} onClose={closeWin} />}
    </>
  );
}

// ---------------------------------------------------------------- the two big buttons
function BigButtons() {
  return (
    <div className="quest-buttons">
      <button type="button" className="quest-btn quest-btn--bored" onClick={openBored}>
        <PixelIcon name="sword" size={26} />
        <span>
          I’m bored
          <small>Give me one mission</small>
        </span>
      </button>
      <button type="button" className="quest-btn quest-btn--sos" onClick={openScrollSos}>
        <PixelIcon name="lantern" size={26} />
        <span>
          I’m about to scroll
          <small>Help me do something real</small>
        </span>
      </button>
    </div>
  );
}

/** The mission you accepted: finish it, or put it down without any penalty. */
function ActiveMission() {
  const { data, update, toast } = useStore();
  const active = data.quest.active;
  const quest = active ? questById(active.questId) : undefined;
  if (!active || !quest) return null;
  return (
    <section className="quest-active" aria-label="Your mission">
      <p className="quest-active__label">Your mission</p>
      <MissionCard quest={quest}>
        <div className="mission__actions">
          <button type="button" className="btn btn--primary grow" onClick={() => openDone(quest.id, active.from)}>
            <PixelIcon name="check" size={16} /> I did it
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              update(dropActive);
              toast('No problem. It’ll be there another day.', 'info');
            }}
          >
            Not now
          </button>
        </div>
      </MissionCard>
    </section>
  );
}

/** The ONE recommended next action. */
function NextUp() {
  const { data, update, today } = useStore();
  const hour = zonedParts(new Date(), UK_TZ).hour;
  const next = nextAction(data, today, hour);
  if (next.kind === 'active') return null; // the mission card already says it
  const start = (q: Quest) => update((d) => acceptQuest(d, q.id, 'daily', new Date().toISOString()));
  return (
    <div className="quest-next">
      <p className="quest-next__label">Next up</p>
      {next.kind === 'rest' && <p>It’s late. The best quest now is sleep: phone on charge, away from the bed.</p>}
      {next.kind === 'daily' && (
        <p>
          <strong>{next.quest.title}</strong> <span className="muted">· {hoursLabel(next.quest.minutes)}</span>{' '}
          <button type="button" className="btn btn--small btn--primary" onClick={() => start(next.quest)}>
            Start
          </button>
        </p>
      )}
      {next.kind === 'project' && (
        <p>
          Next step on <strong>{projectTemplate(next.project.templateId)!.title}</strong>: {next.step}. <a href="#/quest/projects">Open</a>
        </p>
      )}
      {next.kind === 'free' && <p>Today’s missions are done. Anything more is a bonus: press “I’m bored” if you want one.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Home card
export function QuestHome() {
  const { data, today } = useStore();
  const week = weekStats(data, today);
  const todayCount = questLog(data).filter((e) => e.date === today).length;
  return (
    <section className="quest-home" aria-label="Bek's Quest">
      <a href="#/quest" className="quest-home__head">
        <span className="quest-home__title">
          <PixelIcon name="sword" size={18} /> Bek’s Quest
        </span>
        <span className="quest-home__week">
          <strong>{hoursLabel(week.minutes)}</strong> away from the screen this week{todayCount ? ` · ${todayCount} today` : ''} →
        </span>
      </a>
      <BigButtons />
      <ActiveMission />
      <NextUp />
      <button type="button" className="btn btn--small btn--ghost quest-home__focus" onClick={openFocus}>
        <PixelIcon name="clock" size={14} /> Focus timer
      </button>
    </section>
  );
}

// ---------------------------------------------------------------- the Quest screen
const TABS = ['today', 'projects', 'journal'] as const;
type Tab = (typeof TABS)[number];

export default function QuestScreen({ sub }: { sub?: string }) {
  const [tab, setTab] = useSubRoute<Tab>('quest', sub, TABS);
  return (
    <div className="screen">
      <h1 className="screen__title">
        <PixelIcon name="sword" size={28} /> Bek’s Quest
      </h1>
      <Tabs<Tab>
        label="Quest sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'today', label: 'Today', icon: 'sun' },
          { id: 'projects', label: 'Projects', icon: 'scroll' },
          { id: 'journal', label: 'Journal', icon: 'book' },
        ]}
      />
      {tab === 'today' && <Today />}
      {tab === 'projects' && <Projects />}
      {tab === 'journal' && <Journal />}
    </div>
  );
}

function Today() {
  const { data, update, today, toast } = useStore();
  const week = weekStats(data, today);
  const month = monthStats(data, monthOf(today));
  const missions = dailyMissions(data, today);
  const left = missions.filter((q) => !doneOn(data, q.id, today));
  const todayLog = questLog(data).filter((e) => e.date === today);
  const ch = challengeProgress(data, today);
  const life = lifeStats(data);
  const show = (n: number) => (ch.challenge.measure === 'minutes' ? hoursLabel(n) : String(n));

  return (
    <div className="grid grid--2">
      <section className="quest-hero" aria-label="This week">
        <p className="quest-hero__big">{hoursLabel(week.minutes)}</p>
        <p className="quest-hero__label">away from the screen this week</p>
        <p className="quest-hero__row">
          <span>
            Today: <strong>{todayLog.length}</strong> quest{todayLog.length === 1 ? '' : 's'}
            {todayLog.length > 0 && ` · ${hoursLabel(todayLog.reduce((a, e) => a + e.minutes, 0))}`}
          </span>
          <span>
            This week: <strong>{week.count}</strong>
          </span>
        </p>
        <BigButtons />
      </section>

      <div className="quest-col">
        <ActiveMission />
        <NextUp />
      </div>

      <Panel title="Today’s missions" icon="star">
        <p className="muted small">{left.length ? `${left.length} left. Do one, all three, or none: nothing is lost either way.` : 'All three done today. That’s a real day.'}</p>
        <ul className="daily-missions">
          {missions.map((q) => {
            const done = doneOn(data, q.id, today);
            const active = data.quest.active?.questId === q.id;
            return (
              <li key={q.id} className={`daily-mission ${done ? 'is-done' : ''}`}>
                <PixelIcon name={CATEGORIES[q.category].icon} size={20} />
                <span className="grow">
                  <strong>{q.title}</strong>
                  <small className="muted">
                    {' '}
                    · {hoursLabel(q.minutes)} · {q.done}
                  </small>
                </span>
                {done ? (
                  <span className="daily-mission__tick" aria-label="Done">
                    ✓
                  </span>
                ) : (
                  <span className="daily-mission__btns">
                    <button type="button" className="btn btn--small btn--primary" onClick={() => openDone(q.id, 'daily')}>
                      Did it
                    </button>
                    {!active && (
                      <button type="button" className="btn btn--small" onClick={() => update((d) => acceptQuest(d, q.id, 'daily', new Date().toISOString()))}>
                        Start
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn--small btn--ghost"
                      aria-label={`Swap ${q.title}`}
                      onClick={() => {
                        update((d) => swapMission(d, today, q.id));
                        toast('Swapped for another one', 'info');
                      }}
                    >
                      Swap
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="This week’s challenge" icon="flame">
        <p>
          <strong>{ch.challenge.title}.</strong> {ch.challenge.text}
        </p>
        <Bar value={Math.min(ch.value, ch.challenge.target)} max={ch.challenge.target} label={ch.challenge.title} />
        <p className="small">{ch.done ? 'Done. Everything from here is extra.' : `${show(ch.value)} of ${show(ch.challenge.target)}. A new one comes every Monday; this one just ends, nothing is lost.`}</p>
      </Panel>

      <Panel title="Your real life, in numbers" icon="globe">
        <ul className="life-totals">
          {(Object.keys(CATEGORIES) as QuestCategory[]).map((c) => (
            <li key={c}>
              <PixelIcon name={CATEGORIES[c].icon} size={20} />
              <span>
                <strong>{CATEGORIES[c].name}</strong>
                <small>{c === 'spiritual' ? 'Between you and Allah: not counted' : `${life.byArea[c].count} done · ${hoursLabel(life.byArea[c].minutes)}`}</small>
              </span>
            </li>
          ))}
        </ul>
        <p className="small">
          This month: <strong>{hoursLabel(month.minutes)}</strong> of quests
          {month.fromScroll > 0 && (
            <>
              {' '}
              and <strong>{month.fromScroll}</strong> scroll moment{month.fromScroll === 1 ? '' : 's'} turned into something real
            </>
          )}
          .
        </p>
      </Panel>
    </div>
  );
}

function Projects() {
  const { data, update, today, toast } = useStore();
  const ask = useConfirm();
  const list = projectsOf(data);
  const going = list.filter((p) => !p.finished);
  const finished = list.filter((p) => p.finished);
  const available = PROJECTS.filter((t) => !going.some((p) => p.templateId === t.id));

  return (
    <div className="grid grid--2">
      {going.length === 0 && (
        <Panel title="Projects" icon="scroll">
          <Empty>Pick one project below. A project is a real result, built step by step: no points, just the thing itself.</Empty>
        </Panel>
      )}
      {going.map((p) => {
        const t = projectTemplate(p.templateId)!;
        const n = nextStep(p);
        return (
          <Panel
            key={p.id}
            title={t.title}
            icon={CATEGORIES[t.category].icon}
            className="project"
            actions={
              <button
                type="button"
                className="icon-btn"
                aria-label={`Stop ${t.title}`}
                onClick={async () => {
                  if (await ask(`Stop “${t.title}”? Your ticked steps are removed with it.`, { ok: 'Stop it' })) update((d) => dropProject(d, p.id));
                }}
              >
                <PixelIcon name="trash" size={16} />
              </button>
            }
          >
            <p className="muted small">{t.why}</p>
            <Bar value={stepsDone(p)} max={p.steps.length} label={`${t.title} progress`} />
            <p className="small">
              <strong>
                {stepsDone(p)} / {p.steps.length}
              </strong>
              {n >= 0 && ` · next: ${t.steps[n]}`}
            </p>
            <ul className="project__steps">
              {t.steps.map((s, i) => (
                <li key={s}>
                  <label>
                    <input
                      type="checkbox"
                      className="pixel-check"
                      checked={Boolean(p.steps[i])}
                      onChange={() => {
                        const finishing = !p.steps[i] && stepsDone(p) === p.steps.length - 1;
                        update((d) => toggleStep(d, p.id, i, today));
                        if (finishing) {
                          sfx('levelup');
                          toast(`Project done: ${t.title}. That’s real.`, 'pop');
                        }
                      }}
                    />
                    <span>{s}</span>
                    {p.steps[i] && <small className="muted">{formatDay(p.steps[i]!)}</small>}
                  </label>
                </li>
              ))}
            </ul>
          </Panel>
        );
      })}

      <Panel title="Start a project" icon="plus">
        <ul className="project-picks">
          {available.map((t) => (
            <li key={t.id}>
              <PixelIcon name={CATEGORIES[t.category].icon} size={20} />
              <span className="grow">
                <strong>{t.title}</strong>
                <small className="muted"> · {t.steps.length} steps</small>
              </span>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => {
                  update((d) => void startProject(d, t.id, today, uid()));
                  toast(`Started: ${t.title}`, 'pop');
                }}
              >
                Start
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      {finished.length > 0 && (
        <Panel title="Finished" icon="gift">
          <ul className="project-picks">
            {finished.map((p) => (
              <li key={p.id}>
                <PixelIcon name="check" size={18} />
                <span className="grow">
                  <strong>{projectTemplate(p.templateId)!.title}</strong>
                  <small className="muted"> · {formatDay(p.finished!)}</small>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

/** The field journal: one month at a time (no endless scrolling). */
function Journal() {
  const { data, update, today } = useStore();
  const ask = useConfirm();
  const photos = usePhotos();
  const [month, setMonth] = useState(monthOf(today));
  const entries = questLog(data)
    .filter((e) => monthOf(e.date) === month)
    .sort((a, b) => b.date.localeCompare(a.date));
  const s = monthStats(data, month);

  return (
    <Panel
      title={`Field journal · ${formatMonth(month)}`}
      icon="book"
      actions={
        <>
          <button type="button" className="btn btn--small" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">
            ←
          </button>
          <button type="button" className="btn btn--small" disabled={month >= monthOf(today)} onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
            →
          </button>
        </>
      }
    >
      <p className="small">
        <strong>{s.count}</strong> quest{s.count === 1 ? '' : 's'} · <strong>{hoursLabel(s.minutes)}</strong> away from the screen
      </p>
      {entries.length === 0 ? (
        <Empty>Nothing this month yet. Every quest you finish leaves a line here.</Empty>
      ) : (
        <ol className="journal-list">
          {entries.map((e) => {
            const q = questById(e.questId);
            const photo = e.photoId ? photos.find((p) => p.id === e.photoId) : undefined;
            return (
              <li key={e.id} className="journal-entry">
                <PixelIcon name={q ? CATEGORIES[q.category].icon : 'star'} size={20} />
                <div className="grow">
                  <p>
                    <strong>{q?.title ?? 'A quest'}</strong>{' '}
                    <small className="muted">
                      · {formatDay(e.date)} · {hoursLabel(e.minutes)}
                    </small>
                  </p>
                  {e.note && <p className="journal-entry__note">“{e.note}”</p>}
                  {photo && <img className="journal-entry__photo" src={photo.src} alt={photo.caption || q?.title || 'Quest photo'} loading="lazy" />}
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Remove this entry"
                  onClick={async () => {
                    if (await ask('Remove this journal entry? (Its photo stays on the photo wall.)', { ok: 'Remove' })) update((d) => removeEntry(d, e.id));
                  }}
                >
                  <PixelIcon name="trash" size={14} />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
