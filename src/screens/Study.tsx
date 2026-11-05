/**
 * 📚 STUDY — "the Bookshelf".
 * Tabs: Tests · Topics · Mistakes · Cards · Timer
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { daysBetween, formatDay, startOfWeek } from '../lib/dates';
import { uid } from '../lib/id';
import type { Confidence, Flashcard, Mistake, Test, Topic } from '../lib/types';
import { XP } from '../lib/xp';
import { useStore, useTimer } from '../state/store';
import { PixelArt, PixelIcon } from '../ui/icons';
import { bossFor, POMODORO_HIT, type Boss, type BossKind } from '../lib/boss';
import { Bar, Empty, Field, Panel, Segmented, Sheet, Tabs, useConfirm, useSubRoute } from '../ui/kit';

const TABS = ['tests', 'topics', 'mistakes', 'cards', 'timer'] as const;
type Tab = (typeof TABS)[number];

export default function Study({ sub }: { sub?: string }) {
  const [tab, setTab] = useSubRoute<Tab>('study', sub, TABS);
  return (
    <div className="screen">
      <h1 className="screen__title">
        <PixelIcon name="shelf" size={28} /> The Bookshelf
      </h1>
      <Tabs<Tab>
        label="Study sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'tests', label: 'Tests', icon: 'calendar' },
          { id: 'topics', label: 'Topics', icon: 'book' },
          { id: 'mistakes', label: 'Mistakes', icon: 'cross' },
          { id: 'cards', label: 'Formulas', icon: 'card' },
          { id: 'timer', label: 'Timer', icon: 'clock' },
        ]}
      />
      {tab === 'tests' && <Tests />}
      {tab === 'topics' && <Topics />}
      {tab === 'mistakes' && <Mistakes />}
      {tab === 'cards' && <Cards />}
      {tab === 'timer' && <Timer />}
    </div>
  );
}

// ---------------------------------------------------------------- Tests
/** "18 days left", "TOMORROW", "TODAY!", "done" */
export function daysLeftLabel(days: number): string {
  if (days < 0) return 'done';
  if (days === 0) return 'TODAY!';
  if (days === 1) return 'tomorrow';
  return `${days} days left`;
}

function Tests() {
  const ask = useConfirm();
  const { data, update, today, toast } = useStore();
  const [editing, setEditing] = useState<Test | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');

  const sorted = [...data.tests].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.filter((t) => t.date >= today);
  const past = sorted.filter((t) => t.date < today).reverse();

  const startEdit = (t: Test) => {
    setEditing(t);
    setName(t.name);
    setDate(t.date);
    setSubjectId(t.subjectId ?? '');
  };
  const clear = () => {
    setEditing(null);
    setName('');
    setDate('');
    setSubjectId('');
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) {
      toast('Give the test a name and a date', 'error');
      return;
    }
    update((d) => {
      const value = { name: name.trim(), date, subjectId: subjectId || null };
      if (editing) Object.assign(d.tests.find((t) => t.id === editing.id) ?? {}, value);
      else d.tests.push({ id: uid(), ...value });
    });
    toast(editing ? 'Test updated' : 'Test added', 'pop');
    clear();
  };
  const remove = async (t: Test) => {
    if (!(await ask(`Delete "${t.name}"?`))) return;
    update((d) => {
      d.tests = d.tests.filter((x) => x.id !== t.id);
    });
    if (editing?.id === t.id) clear();
  };

  const row = (t: Test) => {
    const days = daysBetween(today, t.date);
    return (
      <li key={t.id} className={`test-row ${days < 0 ? 'is-past' : days <= 7 ? 'is-soon' : ''}`}>
        <div className="test-row__days">
          <span className="test-row__num">{days < 0 ? '✓' : days}</span>
          <span className="test-row__unit">{days < 0 ? 'done' : days === 1 ? 'day' : 'days'}</span>
        </div>
        <div className="test-row__info">
          <strong>{t.name}</strong>
          <small className="muted">
            {formatDay(t.date)}
            {t.subjectId ? ` · ${data.subjects.find((s) => s.id === t.subjectId)?.name ?? ''}` : ''}
          </small>
        </div>
        <button type="button" className="icon-btn" onClick={() => startEdit(t)} aria-label={`Edit ${t.name}`}>
          <PixelIcon name="pencil" size={18} />
        </button>
        <button type="button" className="icon-btn" onClick={() => remove(t)} aria-label={`Delete ${t.name}`}>
          <PixelIcon name="trash" size={18} />
        </button>
      </li>
    );
  };

  return (
    <div className="grid grid--2">
      {upcoming.length > 0 && (
        <Panel title="Boss battles" icon="sword" className="bosses">
          <p className="muted small">Every test is a boss. Beat it before test day: turn its topics green and study for it.</p>
          <ul className="boss-list">
            {upcoming.slice(0, 3).map((t) => (
              <BossCard key={t.id} test={t} />
            ))}
          </ul>
        </Panel>
      )}
      <Panel title="Countdowns" icon="calendar">
        {upcoming.length === 0 && <Empty>No tests coming up. Add one →</Empty>}
        <ul className="test-list">{upcoming.map(row)}</ul>
        {past.length > 0 && (
          <details className="details">
            <summary>Past tests ({past.length})</summary>
            <ul className="test-list">{past.map(row)}</ul>
          </details>
        )}
      </Panel>
      <Panel title={editing ? 'Edit test' : 'Add a test'} icon="plus">
        <form className="form" onSubmit={save}>
          <Field label="Test name">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Physics mid-term" />
          </Field>
          <div className="form__row">
            <Field label="Date" className="grow">
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Subject" className="grow">
              <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">—</option>
                {data.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="form__actions">
            {editing && (
              <button type="button" className="btn" onClick={clear}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn--primary grow">
              {editing ? 'Save changes' : 'Add test'}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- Exam bosses
/** 12×12 boss sprites. a = body, b = shade, e = eyes, w = white, k = outline. */
const BOSS_ART: Record<BossKind, string[]> = {
  golem: ['...kkkkkk...', '..kaaaaaak..', '..kaeaaeak..', '..kaaaaaak..', 'kkkbbbbbbkkk', 'kaakaaaakaak', 'kaakaaaakaak', 'kbbkaaaakbbk', '.kkkbbbbkkk.', '...kaakaak..', '...kaakaak..', '..kkk..kkk..'],
  dragon: ['.k.......k..', 'kak.....kak.', 'kaakkkkkaak.', '.kaaaaaaak..', '.kaeaaaeak.k', '.kaaawaaakkb', '..kaaaaaakbk', '.kbkaaaakbk.', 'kbbkaaaakk..', '.k.kaaaak...', '...kak.kak..', '...kk...kk..'],
  slime: ['.....kk.....', '....kwwk....', '...kaaaak...', '..kaaaaaak..', '.kaeaaaaeak.', '.kaaaaaaaak.', 'kaaawwwwaaak', 'kaaaaaaaaaak', 'kbaaaaaaaabk', 'kbbaaaaaabbk', '.kbbbbbbbbk.', '..kkkkkkkk..'],
  knight: ['...kkkkkk...', '..kaaaaaak..', '..kakkkkak..', '..kaeaaeak..', '..kaaaaaak..', '.kkbbbbbbkk.', 'kaakbbbbkaak', 'kaakbbbbkaak', '.kkkbbbbkkk.', '...kbbbbk...', '...kbkkbk...', '..kkk..kkk..'],
};
const BOSS_COLOURS: Record<BossKind, [string, string]> = { golem: ['#8c8c8c', '#5f6b5a'], dragon: ['#5fa83b', '#c0392b'], slime: ['#7ed957', '#3f7a26'], knight: ['#4a4a6a', '#7a4fa3'] };

export function BossSprite({ boss, size = 64 }: { boss: Boss; size?: number }) {
  const [a, b] = BOSS_COLOURS[boss.kind];
  const beaten = boss.hp === 0;
  return (
    <span className={`boss-sprite ${beaten ? 'is-beaten' : ''}`}>
      <PixelArt rows={BOSS_ART[boss.kind]} palette={{ a, b, e: beaten ? '#2b1d0e' : '#ff3b3b', w: '#ffffff', k: '#1a1110' }} size={size} label={boss.name} />
    </span>
  );
}

/** The boss for one upcoming test: health bar, what hurts it, and its weak spots. */
function BossCard({ test }: { test: Test }) {
  const { data, today } = useStore();
  const boss = bossFor(test, data);
  const days = daysBetween(today, test.date);
  const pct = boss.maxHp ? boss.hp / boss.maxHp : 0;
  return (
    <li className="boss-card">
      <BossSprite boss={boss} />
      <div className="boss-card__info">
        <strong>{boss.name}</strong>
        <small className="muted">
          {test.name} · {daysLeftLabel(days)}
        </small>
        <span className="hp-bar" role="img" aria-label={`${boss.hp} of ${boss.maxHp} HP left`}>
          <span className={`hp-bar__fill ${pct > 0.6 ? '' : pct > 0.25 ? 'is-mid' : 'is-low'}`} style={{ width: `${pct * 100}%` }} />
          <span className="hp-bar__text">
            {boss.hp === 0 ? 'DEFEATED!' : `${boss.hp} / ${boss.maxHp} HP`}
          </span>
        </span>
        {boss.hp > 0 ? (
          <small>
            Each Pomodoro{test.subjectId ? ` on ${data.subjects.find((s) => s.id === test.subjectId)?.name}` : ''} = −{POMODORO_HIT} HP ({boss.pomodoros} so far). Each topic you turn green = −10 HP.
            {boss.weakSpots.length > 0 && (
              <>
                {' '}
                Weak spots: <strong>{boss.weakSpots.slice(0, 3).join(', ')}</strong>
                {boss.weakSpots.length > 3 ? ` +${boss.weakSpots.length - 3} more` : ''}.
              </>
            )}
          </small>
        ) : (
          <small>You're ready. Sleep well before the test and go get it!</small>
        )}
      </div>
    </li>
  );
}

/** A small HP line for Home's "Next test" card. */
export function BossMini({ test }: { test: Test }) {
  const { data } = useStore();
  const boss = bossFor(test, data);
  return (
    <a href="#/study/tests" className="boss-mini">
      <BossSprite boss={boss} size={36} />
      <span className="hp-bar hp-bar--small" role="img" aria-label={`${boss.name}: ${boss.hp} of ${boss.maxHp} HP`}>
        <span className="hp-bar__fill" style={{ width: `${boss.maxHp ? (boss.hp / boss.maxHp) * 100 : 0}%` }} />
        <span className="hp-bar__text">{boss.hp === 0 ? 'DEFEATED' : `${boss.name.replace(/^The /, '')} · ${boss.hp} HP`}</span>
      </span>
    </a>
  );
}

// ---------------------------------------------------------------- Topics (red / amber / green)
const RAG: { value: Exclude<Confidence, null>; label: string }[] = [
  { value: 'red', label: "Don't get it" },
  { value: 'amber', label: 'Getting there' },
  { value: 'green', label: 'Confident' },
];

function Topics() {
  const ask = useConfirm();
  const { data, update, gainXp, toast } = useStore();
  const [subjectId, setSubjectId] = useState(data.subjects[0]?.id ?? '');
  const [newTopic, setNewTopic] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  const topics = data.topics.filter((t) => t.subjectId === subjectId);
  const counts = { red: 0, amber: 0, green: 0, none: 0 };
  for (const t of topics) counts[t.confidence ?? 'none']++;

  const setConfidence = (t: Topic, value: Confidence) => {
    const next = t.confidence === value ? null : value; // tap again to clear
    update((d) => {
      const item = d.topics.find((x) => x.id === t.id);
      if (item) item.confidence = next;
    });
    if (next === 'green' && t.confidence !== 'green') gainXp(XP.topicGreen, `${t.name} mastered`);
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !subjectId) return;
    update((d) => {
      d.topics.push({ id: uid(), subjectId, name: newTopic.trim(), confidence: null });
    });
    setNewTopic('');
  };

  const saveRename = () => {
    if (!renaming) return;
    const name = renaming.name.trim();
    if (name)
      update((d) => {
        const item = d.topics.find((x) => x.id === renaming.id);
        if (item) item.name = name;
      });
    setRenaming(null);
  };

  const remove = async (t: Topic) => {
    if (!(await ask(`Delete topic "${t.name}"?`))) return;
    update((d) => {
      d.topics = d.topics.filter((x) => x.id !== t.id);
    });
  };

  // null = the "new subject" box is hidden
  const [newSubject, setNewSubject] = useState<string | null>(null);
  const addSubject = (e: FormEvent) => {
    e.preventDefault();
    const name = newSubject?.trim();
    if (!name) return;
    const id = uid();
    update((d) => {
      d.subjects.push({ id, name });
    });
    setSubjectId(id);
    setNewSubject(null);
    toast(`Added ${name}`, 'pop');
  };

  return (
    <Panel title="Topic checklist" icon="book">
      <div className="toolbar">
        <Segmented label="Subject" value={subjectId} onChange={setSubjectId} options={data.subjects.map((s) => ({ value: s.id, label: s.name }))} />
        <button type="button" className="btn btn--small" onClick={() => setNewSubject(newSubject === null ? '' : null)} aria-expanded={newSubject !== null}>
          + Subject
        </button>
      </div>
      {newSubject !== null && (
        <form className="form__row" onSubmit={addSubject}>
          <input className="input grow" aria-label="New subject name" placeholder="e.g. English" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} autoFocus />
          <button type="submit" className="btn btn--primary">
            Add
          </button>
        </form>
      )}
      <div className="rag-summary" aria-label="Confidence summary">
        <span className="rag-pill rag-pill--green">{counts.green} green</span>
        <span className="rag-pill rag-pill--amber">{counts.amber} amber</span>
        <span className="rag-pill rag-pill--red">{counts.red} red</span>
        <span className="rag-pill">{counts.none} not rated</span>
      </div>
      {topics.length > 0 && <Bar value={counts.green} max={topics.length} label="Topics rated green" color="var(--grass)" />}
      <ul className="topic-list">
        {topics.map((t) => (
          <li key={t.id} className={`topic topic--${t.confidence ?? 'none'}`}>
            {renaming?.id === t.id ? (
              <input
                className="input grow"
                aria-label="Topic name"
                value={renaming.name}
                autoFocus
                onChange={(e) => setRenaming({ id: t.id, name: e.target.value })}
                onBlur={saveRename}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key === 'Enter') saveRename();
                  if (e.key === 'Escape') setRenaming(null);
                }}
              />
            ) : (
              <button type="button" className="topic__name" onClick={() => setRenaming({ id: t.id, name: t.name })} title="Tap to rename">
                {t.name}
              </button>
            )}
            <div className="rag" role="radiogroup" aria-label={`Confidence for ${t.name}`}>
              {RAG.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={t.confidence === r.value}
                  aria-label={r.label}
                  title={r.label}
                  className={`rag__btn rag__btn--${r.value}`}
                  onClick={() => setConfidence(t, r.value)}
                />
              ))}
            </div>
            <button type="button" className="icon-btn" onClick={() => remove(t)} aria-label={`Delete ${t.name}`}>
              <PixelIcon name="trash" size={16} />
            </button>
          </li>
        ))}
      </ul>
      <form className="form__row" onSubmit={add}>
        <input className="input grow" aria-label="New topic" placeholder="Add a topic…" value={newTopic} onChange={(e) => setNewTopic(e.target.value)} />
        <button type="submit" className="btn">
          Add
        </button>
      </form>
    </Panel>
  );
}

// ---------------------------------------------------------------- Mistake notebook
function topicOptions(data: ReturnType<typeof useStore>['data']) {
  return data.subjects.map((s) => (
    <optgroup key={s.id} label={s.name}>
      {data.topics
        .filter((t) => t.subjectId === s.id)
        .map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
    </optgroup>
  ));
}

function Mistakes() {
  const ask = useConfirm();
  const { data, update, gainXp } = useStore();
  const [show, setShow] = useState<'review' | 'all'>('review');
  const [sheet, setSheet] = useState<{ open: boolean; editing: Mistake | null }>({ open: false, editing: null });

  const toReview = data.mistakes.filter((m) => m.reviewAgain);
  const list = (show === 'review' ? toReview : data.mistakes).slice().sort((a, b) => b.date.localeCompare(a.date));
  const topicName = (id: string | null) => data.topics.find((t) => t.id === id)?.name;

  const setReview = (m: Mistake, reviewAgain: boolean) => {
    update((d) => {
      const item = d.mistakes.find((x) => x.id === m.id);
      if (item) item.reviewAgain = reviewAgain;
    });
    if (!reviewAgain) gainXp(XP.mistakeReviewed, 'mistake reviewed');
  };
  const remove = async (m: Mistake) => {
    if (!(await ask('Delete this mistake?'))) return;
    update((d) => {
      d.mistakes = d.mistakes.filter((x) => x.id !== m.id);
    });
  };

  return (
    <Panel
      title="Mistake notebook"
      icon="cross"
      actions={
        <button type="button" className="btn btn--primary btn--small" onClick={() => setSheet({ open: true, editing: null })}>
          + Log a mistake
        </button>
      }
    >
      <p className="muted small">Every mistake is XP in disguise. Write down WHY, then review it before the test.</p>
      <Segmented
        label="Show"
        value={show}
        onChange={setShow}
        options={[
          { value: 'review', label: `To review (${toReview.length})` },
          { value: 'all', label: `All (${data.mistakes.length})` },
        ]}
      />
      {list.length === 0 && <Empty>{show === 'review' ? 'Nothing to review. Nice!' : 'No mistakes logged yet.'}</Empty>}
      <ul className="mistakes">
        {list.map((m) => (
          <li key={m.id} className="mistake">
            <p className="mistake__q">
              <strong>Q:</strong> {m.question}
            </p>
            <p className="mistake__wrong">
              <PixelIcon name="cross" size={14} /> {m.wrongAnswer || '—'}
            </p>
            <p className="mistake__right">
              <PixelIcon name="check" size={14} /> {m.correctAnswer || '—'}
            </p>
            {m.why && (
              <p className="mistake__why">
                <strong>Why:</strong> {m.why}
              </p>
            )}
            <div className="mistake__foot">
              <small className="muted">
                {formatDay(m.date)}
                {topicName(m.topicId) ? ` · ${topicName(m.topicId)}` : ''}
              </small>
              <div className="mistake__actions">
                {m.reviewAgain ? (
                  <button type="button" className="btn btn--small btn--primary" onClick={() => setReview(m, false)}>
                    Reviewed ✓
                  </button>
                ) : (
                  <button type="button" className="btn btn--small" onClick={() => setReview(m, true)}>
                    Review again
                  </button>
                )}
                <button type="button" className="icon-btn" onClick={() => setSheet({ open: true, editing: m })} aria-label="Edit mistake">
                  <PixelIcon name="pencil" size={16} />
                </button>
                <button type="button" className="icon-btn" onClick={() => remove(m)} aria-label="Delete mistake">
                  <PixelIcon name="trash" size={16} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Sheet open={sheet.open} onClose={() => setSheet({ open: false, editing: null })} title={sheet.editing ? 'Edit mistake' : 'Log a mistake'}>
        <MistakeForm editing={sheet.editing} onDone={() => setSheet({ open: false, editing: null })} />
      </Sheet>
    </Panel>
  );
}

function MistakeForm({ editing, onDone }: { editing: Mistake | null; onDone: () => void }) {
  const { data, update, today, toast } = useStore();
  const [m, setM] = useState({
    question: editing?.question ?? '',
    wrongAnswer: editing?.wrongAnswer ?? '',
    correctAnswer: editing?.correctAnswer ?? '',
    why: editing?.why ?? '',
    topicId: editing?.topicId ?? '',
  });
  const set = (key: keyof typeof m) => (e: { target: { value: string } }) => setM({ ...m, [key]: e.target.value });

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!m.question.trim()) {
      toast('Write the question first', 'error');
      return;
    }
    update((d) => {
      const value = { ...m, topicId: m.topicId || null };
      if (editing) Object.assign(d.mistakes.find((x) => x.id === editing.id) ?? {}, value);
      else d.mistakes.push({ id: uid(), ...value, reviewAgain: true, date: today });
    });
    toast(editing ? 'Mistake updated' : 'Mistake logged — review it later!', 'pop');
    onDone();
  };

  return (
    <form className="form" onSubmit={save}>
      <Field label="Question">
        <textarea className="input" rows={2} value={m.question} onChange={set('question')} data-autofocus />
      </Field>
      <Field label="My wrong answer">
        <input className="input" value={m.wrongAnswer} onChange={set('wrongAnswer')} />
      </Field>
      <Field label="Correct answer">
        <input className="input" value={m.correctAnswer} onChange={set('correctAnswer')} />
      </Field>
      <Field label="WHY did I get it wrong?">
        <textarea className="input" rows={2} value={m.why} onChange={set('why')} placeholder="e.g. used cos instead of sin" />
      </Field>
      <Field label="Topic">
        <select className="input" value={m.topicId} onChange={set('topicId')}>
          <option value="">—</option>
          {topicOptions(data)}
        </select>
      </Field>
      <button type="submit" className="btn btn--primary">
        Save
      </button>
    </form>
  );
}

// ---------------------------------------------------------------- Formula flashcards
/** Order cards: least-known first, shuffled inside each group so it doesn't get boring. */
function makeDeck(cards: Flashcard[]): string[] {
  return cards
    .map((c) => ({ id: c.id, key: c.box + Math.random() * 0.9 }))
    .sort((a, b) => a.key - b.key)
    .map((c) => c.id);
}

function Cards() {
  const ask = useConfirm();
  const { data, update, gainXp } = useStore();
  const [deck, setDeck] = useState(() => makeDeck(data.flashcards));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  const card = data.flashcards.find((c) => c.id === deck[index]) ?? null;
  const known = data.flashcards.filter((c) => c.box >= 2).length;

  const next = () => {
    setFlipped(false);
    if (index + 1 >= deck.length) {
      setDeck(makeDeck(data.flashcards));
      setIndex(0);
    } else setIndex(index + 1);
  };
  const answer = (gotIt: boolean) => {
    if (!card) return;
    update((d) => {
      const c = d.flashcards.find((x) => x.id === card.id);
      if (c) c.box = gotIt ? Math.min(5, c.box + 1) : 0;
    });
    if (gotIt) gainXp(XP.flashcardGot);
    next();
  };
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    const id = uid();
    update((d) => {
      d.flashcards.push({ id, front: front.trim(), back: back.trim(), box: 0 });
    });
    setDeck([...deck, id]);
    setFront('');
    setBack('');
  };
  const edit = (id: string, change: Partial<Flashcard>) =>
    update((d) => {
      const c = d.flashcards.find((x) => x.id === id);
      if (c) Object.assign(c, change);
    });
  const remove = async (c: Flashcard) => {
    if (!(await ask(`Delete card "${c.front}"?`))) return;
    update((d) => {
      d.flashcards = d.flashcards.filter((x) => x.id !== c.id);
    });
    setDeck(deck.filter((id) => id !== c.id));
    setIndex(0);
  };

  return (
    <div className="grid grid--2">
      <Panel title="Formula cards" icon="card">
        <p className="muted small">
          Known well: {known} / {data.flashcards.length}. Tap the card to flip it.
        </p>
        {card ? (
          <>
            <button type="button" className={`flashcard ${flipped ? 'is-flipped' : ''}`} onClick={() => setFlipped(!flipped)} aria-pressed={flipped} aria-label={flipped ? `Answer: ${card.back}` : `Question: ${card.front}. Tap to show answer.`}>
              <span className="flashcard__inner">
                <span className="flashcard__face flashcard__front">
                  <small>What is…</small>
                  {card.front}
                </span>
                <span className="flashcard__face flashcard__back">{card.back}</span>
              </span>
            </button>
            <div className="form__actions">
              <button type="button" className="btn btn--danger grow" onClick={() => answer(false)}>
                Again
              </button>
              <button type="button" className="btn btn--primary grow" onClick={() => answer(true)}>
                Got it!
              </button>
            </div>
            <p className="muted small center">
              Card {index + 1} of {deck.length}
            </p>
          </>
        ) : (
          <Empty>No cards. Add one →</Empty>
        )}
      </Panel>
      <Panel title="Edit cards" icon="pencil">
        <form className="form" onSubmit={add}>
          <div className="form__row">
            <input className="input grow" aria-label="Front (question)" placeholder="Front, e.g. Weight" value={front} onChange={(e) => setFront(e.target.value)} />
            <input className="input grow" aria-label="Back (answer)" placeholder="Back, e.g. W = mg" value={back} onChange={(e) => setBack(e.target.value)} />
            <button type="submit" className="btn">
              Add
            </button>
          </div>
        </form>
        <details className="details">
          <summary>All cards ({data.flashcards.length})</summary>
          <ul className="card-edit">
            {data.flashcards.map((c) => (
              <li key={c.id} className="card-edit__row">
                <input className="input" aria-label="Front" value={c.front} onChange={(e) => edit(c.id, { front: e.target.value })} />
                <input className="input" aria-label="Back" value={c.back} onChange={(e) => edit(c.id, { back: e.target.value })} />
                <button type="button" className="icon-btn" onClick={() => remove(c)} aria-label={`Delete ${c.front}`}>
                  <PixelIcon name="trash" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </details>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- Pomodoro timer
const FOCUS_TIPS = ['Phone face down. You\'ve got this.', 'One thing at a time.', 'Stuck? Write the question in your Mistake notebook later.', 'Sip some water.'];

/** Big full-screen countdown: nothing else on screen while you study. Esc or "Exit" closes it. */
function FocusScreen({ onExit }: { onExit: () => void }) {
  const { data } = useStore();
  const { timer, secondsLeft, running, start, pause, skip } = useTimer();
  const ref = useRef<HTMLDivElement>(null);
  const total = (timer.mode === 'work' ? data.settings.pomodoroWork : data.settings.pomodoroBreak) * 60;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const subject = data.subjects.find((x) => x.id === timer.subjectId)?.name ?? 'Other';
  const [tip] = useState(() => FOCUS_TIPS[Math.floor(Math.random() * FOCUS_TIPS.length)]);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onExit();
    // Leaving the browser's own full screen (e.g. swipe/Esc) also closes this view.
    const onFullscreen = () => !document.fullscreenElement && onExit();
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFullscreen);
    // Keep the screen awake while studying (where the browser supports it).
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock
      ?.request('screen')
      .then((l) => (lock = l))
      .catch(() => {});
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFullscreen);
      lock?.release().catch(() => {});
    };
  }, [onExit]);

  return (
    <div ref={ref} className={`focus focus--${timer.mode}`} role="dialog" aria-modal="true" aria-label="Full-screen focus timer" tabIndex={-1}>
      <p className="focus__mode">{timer.mode === 'work' ? 'FOCUS' : 'BREAK'}</p>
      <p className="focus__subject">{timer.mode === 'work' ? subject : 'Stretch, breathe, look away from the screen'}</p>
      <p className="focus__time" role="timer" aria-live="off">
        {mm}:{ss}
      </p>
      <div className="focus__bar">
        <Bar value={total - secondsLeft} max={total} label="Time passed" color={timer.mode === 'work' ? 'var(--lantern)' : 'var(--sky)'} />
      </div>
      <div className="focus__actions">
        {running ? (
          <button type="button" className="btn grow" onClick={pause}>
            Pause
          </button>
        ) : (
          <button type="button" className="btn btn--primary grow" onClick={start}>
            {secondsLeft < total ? 'Resume' : timer.mode === 'work' ? 'Start focus' : 'Start break'}
          </button>
        )}
        <button type="button" className="btn" onClick={skip}>
          Skip
        </button>
        <button type="button" className="btn" onClick={onExit}>
          Exit full screen
        </button>
      </div>
      <p className="focus__tip">{tip}</p>
    </div>
  );
}

function Timer() {
  const { data, update, today } = useStore();
  const { timer, secondsLeft, running, start, pause, reset, skip, setSubject } = useTimer();
  const total = (timer.mode === 'work' ? data.settings.pomodoroWork : data.settings.pomodoroBreak) * 60;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const weekStart = startOfWeek(today);
  const stats = useMemo(() => {
    const week = data.studyLog.filter((s) => s.date >= weekStart && s.date <= today);
    const bySubject = data.subjects.map((s) => ({ name: s.name, minutes: week.filter((x) => x.subjectId === s.id).reduce((a, x) => a + x.minutes, 0) }));
    const other = week.filter((x) => !data.subjects.some((s) => s.id === x.subjectId)).reduce((a, x) => a + x.minutes, 0);
    if (other) bySubject.push({ name: 'Other', minutes: other });
    const todayMins = data.studyLog.filter((s) => s.date === today).reduce((a, x) => a + x.minutes, 0);
    return { bySubject, todayMins, weekMins: week.reduce((a, x) => a + x.minutes, 0) };
  }, [data.studyLog, data.subjects, weekStart, today]);
  const maxMins = Math.max(60, ...stats.bySubject.map((s) => s.minutes));

  const setLen = (key: 'pomodoroWork' | 'pomodoroBreak', v: number) =>
    update((d) => void (d.settings[key] = Math.min(120, Math.max(1, Math.round(v) || 1))));

  // Pressing Start opens the full-screen focus view (and real browser full screen where allowed).
  const [focusOpen, setFocusOpen] = useState(false);
  const openFocus = () => {
    setFocusOpen(true);
    document.documentElement.requestFullscreen?.().catch(() => {
      /* not allowed (e.g. iPhone) — the in-app full-screen view still covers everything */
    });
  };
  const closeFocus = useCallback(() => {
    setFocusOpen(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);
  const startFocus = () => {
    start();
    openFocus();
  };

  return (
    <div className="grid grid--2">
      {focusOpen && <FocusScreen onExit={closeFocus} />}
      <Panel title="Pomodoro" icon="clock" className={`timer timer--${timer.mode}`}>
        <p className="timer__mode">{timer.mode === 'work' ? 'FOCUS' : 'BREAK'}</p>
        <p className="timer__time" role="timer" aria-live="off">
          {mm}:{ss}
        </p>
        <Bar value={total - secondsLeft} max={total} label="Time passed" color={timer.mode === 'work' ? 'var(--lantern)' : 'var(--sky)'} />
        <Field label="Studying">
          <select className="input" value={timer.subjectId ?? ''} onChange={(e) => setSubject(e.target.value || null)} disabled={running}>
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="">Other</option>
          </select>
        </Field>
        <div className="form__actions">
          {running ? (
            <>
              <button type="button" className="btn grow" onClick={pause}>
                Pause
              </button>
              <button type="button" className="btn btn--primary" onClick={openFocus}>
                Full screen
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--primary grow" onClick={startFocus}>
              {secondsLeft < total ? 'Resume' : 'Start'}
            </button>
          )}
          <button type="button" className="btn" onClick={reset}>
            Reset
          </button>
          <button type="button" className="btn" onClick={skip}>
            Skip
          </button>
        </div>
        <div className="form__row">
          <Field label="Focus (min)" className="grow">
            <input className="input" type="number" min={1} max={120} value={data.settings.pomodoroWork} onChange={(e) => setLen('pomodoroWork', Number(e.target.value))} />
          </Field>
          <Field label="Break (min)" className="grow">
            <input className="input" type="number" min={1} max={60} value={data.settings.pomodoroBreak} onChange={(e) => setLen('pomodoroBreak', Number(e.target.value))} />
          </Field>
        </div>
        <p className="muted small">Finishing a focus round gives +{XP.pomodoro} XP and logs the minutes. The timer keeps running on other screens.</p>
      </Panel>
      <Panel title="Study minutes" icon="star">
        <p className="big-number big-number--small">{stats.todayMins} min today</p>
        <p className="muted">{stats.weekMins} min this week (since Monday)</p>
        <ul className="cat-bars">
          {stats.bySubject.map((s) => (
            <li key={s.name} className="cat-bar">
              <div className="cat-bar__row">
                <span className="cat-bar__name">{s.name}</span>
                <span className="cat-bar__nums">{s.minutes} min</span>
              </div>
              <Bar value={s.minutes} max={maxMins} label={`${s.name} minutes this week`} color="var(--grass)" />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
