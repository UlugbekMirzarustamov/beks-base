/**
 * 📝 Study → Mock: practise under real exam conditions, then get a predicted grade.
 *  1. Set up: module (or an upcoming exam), number of questions, time.
 *  2. Exam: full screen, countdown, no notes; leaving the app is noted honestly (never a penalty).
 *  3. Mark: compare your answers with the model answers and give the marks.
 *  4. Result: score, predicted grade (mocks + topic confidence + coursework), lost marks → mistakes.
 * Questions come from your own bank, your mistakes notebook and (optionally) formula cards.
 * Logic lives in lib/mock.ts.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { formatDay } from '../lib/dates';
import { uid } from '../lib/id';
import { percent, pickQuestions, predictGrade, questionPool, suggestedMinutes, type MockQ } from '../lib/mock';
import type { MockResult } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Bar, Empty, Field, Panel, useConfirm } from '../ui/kit';

type ExamPhase = { kind: 'exam'; qs: MockQ[]; answers: string[]; endsAt: number; started: number; minutes: number };
type MarkPhase = { kind: 'mark'; qs: MockQ[]; answers: string[]; used: number; left: number; minutes: number };
type Phase = { kind: 'setup' } | ExamPhase | MarkPhase | { kind: 'result'; result: MockResult };

export default function Mock() {
  const { data, today } = useStore();
  const upcoming = data.tests.filter((t) => t.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const [subjectId, setSubjectId] = useState<string>(upcoming[0]?.subjectId ?? data.subjects[0]?.id ?? '');
  const [testId, setTestId] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' });
  const sid = subjectId || null;

  return (
    <div className="grid grid--2">
      {phase.kind === 'setup' && <Setup subjectId={subjectId} setSubjectId={setSubjectId} testId={testId} setTestId={setTestId} onStart={setPhase} />}
      {phase.kind === 'exam' && <ExamRoom phase={phase} onFinish={setPhase} />}
      {phase.kind === 'mark' && <Marking phase={phase} subjectId={sid} testId={testId || null} onDone={setPhase} />}
      {phase.kind === 'result' && <Result result={phase.result} onDone={() => setPhase({ kind: 'setup' })} />}
      {phase.kind !== 'exam' && (
        <>
          <PredictionCard subjectId={sid} />
          <History subjectId={sid} />
          <QuestionBank subjectId={sid} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- setup
function Setup(props: { subjectId: string; setSubjectId: (s: string) => void; testId: string; setTestId: (s: string) => void; onStart: (p: Phase) => void }) {
  const ask = useConfirm();
  const { data, today, toast } = useStore();
  const [count, setCount] = useState(10);
  const [formulas, setFormulas] = useState(false);
  const [minutes, setMinutes] = useState('');
  const upcoming = data.tests.filter((t) => t.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const pool = questionPool(data, props.subjectId || null, formulas);
  const autoMinutes = suggestedMinutes(pool.slice(0, count));

  const start = async () => {
    if (!pool.length) {
      toast('Add some questions to the bank first (or include formula cards)', 'error');
      return;
    }
    const qs = pickQuestions(pool, count);
    const mins = Math.max(1, Math.round(Number(minutes) || suggestedMinutes(qs)));
    if (!(await ask(`Exam conditions: ${qs.length} questions, ${mins} minutes, full screen. Put your notes away and silence your phone. Ready?`, { ok: 'Start the exam' }))) return;
    const now = Date.now();
    props.onStart({ kind: 'exam', qs, answers: qs.map(() => ''), started: now, endsAt: now + mins * 60_000, minutes: mins });
  };

  return (
    <Panel title="Mock exam" icon="sword">
      <p className="muted small">Practise like the real thing: a timer, full screen, no notes. Then mark it and see a predicted grade.</p>
      <div className="form">
        {upcoming.length > 0 && (
          <Field label="For an exam (optional)">
            <select
              className="input"
              value={props.testId}
              onChange={(e) => {
                props.setTestId(e.target.value);
                const t = data.tests.find((x) => x.id === e.target.value);
                if (t?.subjectId) props.setSubjectId(t.subjectId);
              }}
            >
              <option value="">—</option>
              {upcoming.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {formatDay(t.date)}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Module">
          <select className="input" value={props.subjectId} onChange={(e) => props.setSubjectId(e.target.value)}>
            <option value="">All modules</option>
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="form__row">
          <Field label="Questions" className="grow">
            <select className="input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[5, 10, 15, 20, 30].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Minutes" className="grow">
            <input className="input" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder={`about ${autoMinutes}`} />
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={formulas} onChange={(e) => setFormulas(e.target.checked)} />
          <span>Include formula cards</span>
        </label>
        <p className="muted small">
          {pool.length} question{pool.length === 1 ? '' : 's'} available (question bank, mistakes notebook{formulas ? ', formula cards' : ''}). Weak topics come up more often.
        </p>
        <button type="button" className="btn btn--primary" onClick={start} disabled={!pool.length}>
          <PixelIcon name="sword" size={16} /> Start mock exam
        </button>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------- exam room
function ExamRoom({ phase, onFinish }: { phase: ExamPhase; onFinish: (p: Phase) => void }) {
  const ask = useConfirm();
  const [i, setI] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [answers, setAnswers] = useState(phase.answers);
  const [leftCount, setLeftCount] = useState(0);
  const latest = useRef({ answers, leftCount });
  latest.current = { answers, leftCount };
  const done = useRef(false);
  const box = useRef<HTMLTextAreaElement>(null);
  // Put the cursor in the answer box (after the start pop-up has handed focus back, and on each question).
  useEffect(() => {
    const t = window.setTimeout(() => box.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [i]);
  const remaining = Math.max(0, Math.round((phase.endsAt - now) / 1000));

  const finish = () => {
    if (done.current) return;
    done.current = true;
    const used = Math.round((Math.min(Date.now(), phase.endsAt) - phase.started) / 1000);
    onFinish({ kind: 'mark', qs: phase.qs, answers: latest.current.answers, used, left: latest.current.leftCount, minutes: phase.minutes });
  };

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    const onHide = () => {
      if (document.visibilityState === 'hidden') setLeftCount((n) => n + 1);
    };
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', warn);
    document.body.classList.add('exam-mode');
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', warn);
      document.body.classList.remove('exam-mode');
    };
  }, []);
  // Time's up: the paper is handed in, like a real exam.
  useEffect(() => {
    if (remaining === 0) finish();
  });

  const q = phase.qs[i];
  const clock = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  const handIn = async () => {
    const blank = latest.current.answers.filter((a) => !a.trim()).length;
    if (await ask(blank ? `Hand in your paper? ${blank} question${blank === 1 ? ' is' : 's are'} still blank.` : 'Hand in your paper?', { ok: 'Hand in' })) finish();
  };
  return (
    <div className="exam-room" role="dialog" aria-modal="true" aria-label="Mock exam">
      <div className="exam-room__bar">
        <strong>
          Question {i + 1} / {phase.qs.length}
        </strong>
        <span className={`exam-room__timer ${remaining < 300 ? 'is-low' : ''}`} role="timer" aria-label={`${Math.ceil(remaining / 60)} minutes left`}>
          {clock}
        </span>
      </div>
      {leftCount > 0 && <p className="exam-room__note">You left the exam {leftCount}× — in the real exam you couldn't. (Just noted, no penalty.)</p>}
      <div className="exam-room__paper">
        <p className="exam-room__marks">
          [{q.marks} mark{q.marks === 1 ? '' : 's'}]
        </p>
        <p className="exam-room__question">{q.question}</p>
        <textarea
          key={q.key}
          ref={box}
          className="input exam-room__answer"
          rows={8}
          value={answers[i]}
          onChange={(e) => setAnswers(answers.map((a, k) => (k === i ? e.target.value : a)))}
          aria-label={`Your answer to question ${i + 1}`}
        />
      </div>
      <div className="exam-room__grid" role="group" aria-label="Go to question">
        {phase.qs.map((x, k) => (
          <button key={x.key} type="button" className={`exam-room__dot ${k === i ? 'is-current' : ''} ${answers[k].trim() ? 'is-answered' : ''}`} onClick={() => setI(k)} aria-label={`Question ${k + 1}${answers[k].trim() ? ', answered' : ''}`}>
            {k + 1}
          </button>
        ))}
      </div>
      <div className="form__row">
        <button type="button" className="btn grow" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>
          ← Back
        </button>
        {i < phase.qs.length - 1 ? (
          <button type="button" className="btn btn--primary grow" onClick={() => setI(i + 1)}>
            Next →
          </button>
        ) : (
          <button type="button" className="btn btn--primary grow" onClick={handIn}>
            Hand in
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- marking
function Marking({ phase, subjectId, testId, onDone }: { phase: MarkPhase; subjectId: string | null; testId: string | null; onDone: (p: Phase) => void }) {
  const { update, today } = useStore();
  const [got, setGot] = useState(() => phase.qs.map(() => 0));
  const save = () => {
    const result: MockResult = {
      id: uid(),
      subjectId,
      testId,
      date: today,
      minutes: phase.minutes,
      used: phase.used,
      score: got.reduce((a, x) => a + x, 0),
      max: phase.qs.reduce((a, q) => a + q.marks, 0),
      leftApp: phase.left,
      items: phase.qs.map((q, k) => ({ question: q.question, answer: q.answer, given: phase.answers[k], marks: q.marks, got: got[k] })),
    };
    update((d) => void d.mocks.push(result));
    onDone({ kind: 'result', result });
  };
  return (
    <Panel title="Mark your paper" icon="check">
      <p className="muted small">Be a fair examiner: compare with the model answer and give the marks you'd really get.</p>
      <ol className="mark-list">
        {phase.qs.map((q, k) => (
          <li key={q.key} className="mark-item">
            <p>
              <strong>{q.question}</strong> <small className="muted">[{q.marks}]</small>
            </p>
            <p className="note-body">
              <small className="muted">Your answer: </small>
              {phase.answers[k].trim() || <em className="muted">blank</em>}
            </p>
            <p className="note-body mark-item__model">
              <small className="muted">Model answer: </small>
              {q.answer}
            </p>
            <div className="kitchen-chips" role="radiogroup" aria-label={`Marks for question ${k + 1}`}>
              {Array.from({ length: q.marks + 1 }, (_, m) => (
                <button key={m} type="button" role="radio" aria-checked={got[k] === m} className="segmented__btn" onClick={() => setGot(got.map((x, j) => (j === k ? m : x)))}>
                  {m}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn--primary" onClick={save}>
        See my result
      </button>
    </Panel>
  );
}

// ---------------------------------------------------------------- result
function Result({ result, onDone }: { result: MockResult; onDone: () => void }) {
  const { data, update, today, toast } = useStore();
  const p = predictGrade(data, result.subjectId);
  const lost = result.items.filter((it) => it.got < it.marks);
  const [added, setAdded] = useState(false);
  const toMistakes = () => {
    update((d) => {
      for (const it of lost)
        if (!d.mistakes.some((m) => m.question === it.question))
          d.mistakes.push({ id: uid(), question: it.question, wrongAnswer: it.given, correctAnswer: it.answer, why: 'From a mock exam', topicId: null, reviewAgain: true, date: today });
    });
    setAdded(true);
    toast(`Added to your mistakes notebook`, 'pop');
  };
  return (
    <Panel title="Your result" icon="star">
      <p className="big-number big-number--small">{percent(result)}%</p>
      <p>
        {result.score} / {result.max} marks · {Math.max(1, Math.round(result.used / 60))} of {result.minutes} minutes
        {result.leftApp ? ` · left the exam ${result.leftApp}×` : ''}
      </p>
      {p && (
        <p>
          Predicted grade now: <strong>{p.pct}%</strong> ({p.band})
        </p>
      )}
      {lost.length > 0 && !added && (
        <button type="button" className="btn" onClick={toMistakes}>
          Add {lost.length} question{lost.length === 1 ? '' : 's'} with lost marks to my mistakes notebook
        </button>
      )}
      <button type="button" className="btn btn--primary" onClick={onDone}>
        Done
      </button>
    </Panel>
  );
}

// ---------------------------------------------------------------- prediction, history, bank
function PredictionCard({ subjectId }: { subjectId: string | null }) {
  const { data } = useStore();
  const p = predictGrade(data, subjectId);
  const name = data.subjects.find((s) => s.id === subjectId)?.name ?? 'all modules';
  const totalWeight = p ? p.parts.reduce((a, y) => a + y.weight, 0) : 1;
  return (
    <Panel title={`Predicted grade · ${name}`} icon="telescope">
      {!p ? (
        <Empty>Do a mock exam (or rate your topics) to get a prediction.</Empty>
      ) : (
        <>
          <p className="big-number big-number--small">{p.pct}%</p>
          <p>
            <strong>{p.band}</strong> · {p.sure === 'high' ? 'fairly sure (3+ mocks)' : p.sure === 'medium' ? 'a rough guess — more mocks make it surer' : 'a very rough guess — no mocks yet'}
          </p>
          <ul className="mini-list">
            {p.parts.map((x) => (
              <li key={x.label}>
                {x.label}: <strong>{x.value}%</strong> <small className="muted">(counts {Math.round((x.weight / totalWeight) * 100)}%)</small>
              </li>
            ))}
          </ul>
          <p className="muted small">A guide, not a promise — real exams differ. The fastest way up: turn red topics green.</p>
        </>
      )}
    </Panel>
  );
}

function History({ subjectId }: { subjectId: string | null }) {
  const { data } = useStore();
  const list = data.mocks.filter((m) => subjectId === null || m.subjectId === subjectId).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  if (!list.length) return null;
  return (
    <Panel title="Past mocks" icon="calendar">
      <ul className="list">
        {list.map((m) => (
          <li key={m.id} className="list__item mock-row">
            <div className="list__main">
              <span className="list__text">
                <span>
                  {percent(m)}% · {m.score}/{m.max}
                </span>
                <small className="muted">
                  {formatDay(m.date)} · {data.subjects.find((s) => s.id === m.subjectId)?.name ?? 'All modules'}
                  {m.leftApp ? ` · left ${m.leftApp}×` : ''}
                </small>
              </span>
            </div>
            <div className="mock-row__bar">
              <Bar value={m.score} max={m.max} label={`${percent(m)}%`} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function QuestionBank({ subjectId }: { subjectId: string | null }) {
  const ask = useConfirm();
  const { data, update, toast } = useStore();
  const [f, setF] = useState({ question: '', answer: '', marks: '2', topicId: '' });
  const topics = data.topics.filter((t) => subjectId === null || t.subjectId === subjectId);
  const list = data.examQuestions.filter((q) => subjectId === null || q.subjectId === subjectId);
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!f.question.trim() || !f.answer.trim()) {
      toast('Write the question and its model answer', 'error');
      return;
    }
    const topic = data.topics.find((t) => t.id === f.topicId);
    const marks = Math.min(20, Math.max(1, Math.round(Number(f.marks)) || 1));
    update((d) => void d.examQuestions.push({ id: uid(), subjectId: topic?.subjectId ?? subjectId, topicId: topic?.id ?? null, question: f.question.trim(), answer: f.answer.trim(), marks }));
    setF({ ...f, question: '', answer: '' });
    toast('Question added', 'pop');
  };
  const remove = async (id: string) => {
    if (!(await ask('Delete this question?'))) return;
    update((d) => void (d.examQuestions = d.examQuestions.filter((q) => q.id !== id)));
  };
  return (
    <Panel title={`Question bank (${list.length})`} icon="scroll">
      <form className="form" onSubmit={add}>
        <textarea className="input" rows={2} value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} placeholder="Question, e.g. from a past paper" aria-label="Question" />
        <textarea className="input" rows={2} value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} placeholder="Model answer / mark scheme" aria-label="Model answer" />
        <div className="form__row">
          <Field label="Marks" className="grow">
            <input className="input" inputMode="numeric" value={f.marks} onChange={(e) => setF({ ...f, marks: e.target.value })} />
          </Field>
          {topics.length > 0 && (
            <Field label="Topic" className="grow">
              <select className="input" value={f.topicId} onChange={(e) => setF({ ...f, topicId: e.target.value })}>
                <option value="">—</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <button type="submit" className="btn btn--primary">
          <PixelIcon name="plus" size={16} /> Add question
        </button>
      </form>
      {list.length > 0 && (
        <details className="details">
          <summary>All questions</summary>
          <ul className="list">
            {list.map((q) => (
              <li key={q.id} className="list__item">
                <div className="list__main">
                  <span className="list__text">
                    <span>{q.question}</span>
                    <small className="muted">
                      [{q.marks}] {q.answer}
                    </small>
                  </span>
                </div>
                <button type="button" className="icon-btn" onClick={() => remove(q.id)} aria-label="Delete question">
                  <PixelIcon name="trash" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Panel>
  );
}
