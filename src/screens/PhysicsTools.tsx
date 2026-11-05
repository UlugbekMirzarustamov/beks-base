/**
 * ⚛️ Study → Tools → Physics: everything for mastering physics in one place —
 *  - Formula sheet: the core formulas by topic, every symbol and unit explained; one tap → formula card.
 *  - Solve: any formula for any quantity (fill in what you know).
 *  - Practice: endless problems with random numbers, checked instantly; missed ones → mistakes notebook.
 *  - Uncertainty: combine measurement uncertainties for lab reports.
 * The maths lives in lib/physics.ts (and the calculator in lib/engineering.ts).
 */
import { useState, type FormEvent } from 'react';
import { evaluate, formatNumber } from '../lib/engineering';
import { uid } from '../lib/id';
import { checkAnswer, combineUncertainty, describeGiven, FORMULAS, makeProblem, solveFormula, TOPICS, type PFormula, type Problem, type UOp } from '../lib/physics';
import { fold } from '../lib/search';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Field, Panel, Segmented } from '../ui/kit';

type Tab = 'sheet' | 'solve' | 'practice' | 'uncertainty';

/** A number typed by hand; calculator sums like "2*9.81" or "3e8" are fine. */
const num = (text: string): number | undefined => {
  if (!text.trim()) return undefined;
  try {
    return evaluate(text);
  } catch {
    return undefined;
  }
};
const unitText = (unit: string) => (unit && unit !== '(no unit)' ? unit : '');

export default function PhysicsTools() {
  const [tab, setTab] = useState<Tab>('sheet');
  const [formulaId, setFormulaId] = useState(FORMULAS[0].id);
  return (
    <div className="grid">
      <Segmented<Tab>
        label="Physics tool"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'sheet', label: 'Formula sheet' },
          { value: 'solve', label: 'Solve' },
          { value: 'practice', label: 'Practice' },
          { value: 'uncertainty', label: 'Uncertainty' },
        ]}
      />
      {tab === 'sheet' && (
        <FormulaSheet
          onSolve={(id) => {
            setFormulaId(id);
            setTab('solve');
          }}
        />
      )}
      {tab === 'solve' && <Solver key={formulaId} formulaId={formulaId} setFormulaId={setFormulaId} />}
      {tab === 'practice' && <Practice />}
      {tab === 'uncertainty' && <Uncertainty />}
    </div>
  );
}

// ---------------------------------------------------------------- formula sheet
function FormulaSheet({ onSolve }: { onSolve: (id: string) => void }) {
  const { data, update, toast } = useStore();
  const [topic, setTopic] = useState('');
  const [q, setQ] = useState('');
  const words = fold(q).split(' ').filter(Boolean);
  const list = FORMULAS.filter((f) => !topic || f.topic === topic).filter((f) => words.every((w) => fold(`${f.name} ${f.show} ${f.topic} ${f.vars.map((x) => x[1]).join(' ')}`).includes(w)));
  const inCards = (f: PFormula) => data.flashcards.some((c) => c.back === f.show);
  const toCard = (f: PFormula) => {
    update((d) => void d.flashcards.push({ id: uid(), front: f.name, back: f.show, box: 1 }));
    toast(`${f.name} added to your formula cards`, 'pop');
  };
  return (
    <Panel title="Formula sheet" icon="book">
      <div className="form">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, e.g. energy, current, wave" aria-label="Search formulas" />
        <select className="input" value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Topic">
          <option value="">All topics</option>
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <ul className="formula-list">
        {list.map((f) => (
          <li key={f.id} className="formula-card">
            <div className="formula-card__head">
              <strong>{f.name}</strong>
              <small className="muted">{f.topic}</small>
            </div>
            <p className="formula formula-card__eq">{f.show}</p>
            <ul className="formula-card__vars">
              {f.vars.map(([sym, name, unit]) => (
                <li key={sym}>
                  <span className="formula">{sym}</span> — {name}
                  {unitText(unit) ? ` (${unit})` : ''}
                </li>
              ))}
            </ul>
            <div className="form__row">
              <button type="button" className="btn btn--small" onClick={() => onSolve(f.id)}>
                Solve →
              </button>
              <button type="button" className="btn btn--small" onClick={() => toCard(f)} disabled={inCards(f)}>
                {inCards(f) ? '✓ In my cards' : '+ Formula card'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ---------------------------------------------------------------- solver
function Solver({ formulaId, setFormulaId }: { formulaId: string; setFormulaId: (id: string) => void }) {
  const f = FORMULAS.find((x) => x.id === formulaId) ?? FORMULAS[0];
  const [unknown, setUnknown] = useState(f.vars[0][0]);
  const [vals, setVals] = useState<Record<string, string>>({});
  const target = f.vars.find((x) => x[0] === unknown) ?? f.vars[0];
  const known: Record<string, number> = {};
  const missing: string[] = [];
  for (const [sym, , , min, max] of f.vars) {
    if (sym === target[0]) continue;
    const typed = num(vals[sym] ?? '');
    // Fixed constants (like g = 9.81) are filled in for you unless you type another value.
    const value = typed ?? (min === max ? min : undefined);
    if (value === undefined) missing.push(sym);
    else known[sym] = value;
  }
  let result = '';
  if (!missing.length) {
    try {
      result = `${target[0]} = ${formatNumber(solveFormula(f, target[0], known))} ${unitText(target[2])}`;
    } catch (err) {
      result = err instanceof Error ? err.message : 'No answer';
    }
  }
  return (
    <Panel title="Solve a formula" icon="star">
      <div className="form">
        <Field label="Formula">
          <select className="input" value={f.id} onChange={(e) => setFormulaId(e.target.value)}>
            {TOPICS.map((t) => (
              <optgroup key={t} label={t}>
                {FORMULAS.filter((x) => x.topic === t).map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} — {x.show}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <p className="formula formula-card__eq">{f.show}</p>
        <Field label="Find">
          <select className="input" value={target[0]} onChange={(e) => setUnknown(e.target.value)}>
            {f.vars.map(([sym, name]) => (
              <option key={sym} value={sym}>
                {sym} — {name}
              </option>
            ))}
          </select>
        </Field>
        {f.vars
          .filter((x) => x[0] !== target[0])
          .map(([sym, name, unit, min, max]) => (
            <Field key={sym} label={`${sym} — ${name}${unitText(unit) ? ` (${unit})` : ''}`}>
              <input className="input" inputMode="decimal" value={vals[sym] ?? ''} onChange={(e) => setVals({ ...vals, [sym]: e.target.value })} placeholder={min === max ? String(min) : 'e.g. 2.5 or 3e8'} />
            </Field>
          ))}
        <p className="calc__result" aria-live="polite">
          {missing.length ? `Fill in ${missing.join(', ')}` : result}
        </p>
        {f.vars.some((x) => x[2] === '°') && <p className="muted small">Angles are in degrees.</p>}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------- practice
function Practice() {
  const { update, today, toast } = useStore();
  const [topic, setTopic] = useState('');
  const [p, setP] = useState<Problem>(() => makeProblem());
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState<null | boolean>(null);
  const [tally, setTally] = useState({ right: 0, tried: 0 });
  const [saved, setSaved] = useState(false);

  const next = (t = topic) => {
    setP(makeProblem(Math.random, t || undefined));
    setAnswer('');
    setChecked(null);
    setSaved(false);
  };
  const check = (e: FormEvent) => {
    e.preventDefault();
    const given = num(answer);
    if (given === undefined) {
      toast('Type a number (you can use 3e8 or a sum)', 'error');
      return;
    }
    const ok = checkAnswer(given, p.answer);
    setChecked(ok);
    setTally((t) => ({ right: t.right + (ok ? 1 : 0), tried: t.tried + 1 }));
  };
  const toMistakes = () => {
    update(
      (d) =>
        void d.mistakes.push({
          id: uid(),
          question: `${p.formula.name}: given ${describeGiven(p)}, find the ${p.unknown[1]} (${p.unknown[0]}).`,
          wrongAnswer: answer,
          correctAnswer: `${formatNumber(p.answer)} ${unitText(p.unknown[2])} — using ${p.formula.show}`.trim(),
          why: 'From physics practice',
          topicId: null,
          reviewAgain: true,
          date: today,
        }),
    );
    setSaved(true);
    toast('Added to your mistakes notebook', 'pop');
  };

  return (
    <Panel title="Practice problems" icon="sword">
      <div className="form">
        <select
          className="input"
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value);
            next(e.target.value);
          }}
          aria-label="Topic"
        >
          <option value="">All topics</option>
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div className="practice-q">
          <small className="muted">
            {p.formula.topic} · {p.formula.name}
          </small>
          <p>
            Given <strong>{describeGiven(p)}</strong>, find the <strong>{p.unknown[1]}</strong> ({p.unknown[0]}
            {unitText(p.unknown[2]) ? `, in ${p.unknown[2]}` : ''}).
          </p>
          {p.formula.vars.some((x) => x[2] === '°') && <small className="muted">Angles in degrees.</small>}
        </div>
        <form className="form__row" onSubmit={check}>
          <input className="input grow" inputMode="decimal" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer" aria-label="Your answer" disabled={checked !== null} />
          <button type="submit" className="btn btn--primary" disabled={checked !== null}>
            Check
          </button>
        </form>
        {checked !== null && (
          <div className={`alert ${checked ? 'alert--ok' : 'alert--over'}`} role="status">
            {checked ? '✓ Right! ' : '✗ Not quite. '}
            Answer: {formatNumber(p.answer)} {unitText(p.unknown[2])} — using <span className="formula">{p.formula.show}</span>
          </div>
        )}
        <div className="form__row">
          {checked === false && !saved && (
            <button type="button" className="btn" onClick={toMistakes}>
              <PixelIcon name="cross" size={14} /> To mistakes
            </button>
          )}
          <button type="button" className="btn btn--primary grow" onClick={() => next()}>
            {checked === null ? 'Skip' : 'Next problem →'}
          </button>
        </div>
        {tally.tried > 0 && (
          <p className="muted small">
            {tally.right} of {tally.tried} right this session (answers within 2% count).
          </p>
        )}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------- uncertainty
const OPS: { value: UOp; label: string }[] = [
  { value: 'add', label: 'A + B' },
  { value: 'sub', label: 'A − B' },
  { value: 'mul', label: 'A × B' },
  { value: 'div', label: 'A ÷ B' },
  { value: 'pow', label: 'Aⁿ' },
];

function Uncertainty() {
  const [op, setOp] = useState<UOp>('mul');
  const [f, setF] = useState({ a: '2.50', da: '0.05', b: '1.20', db: '0.02' });
  const a = num(f.a);
  const da = num(f.da) ?? 0;
  const b = num(f.b);
  const db = op === 'pow' ? 0 : (num(f.db) ?? 0);
  let text = 'Fill in the values';
  if (a !== undefined && b !== undefined) {
    try {
      const r = combineUncertainty(op, a, da, b, db);
      text = `${formatNumber(r.value)} ± ${formatNumber(Number(r.abs.toPrecision(2)))}  (${r.pct.toFixed(1)}%)`;
    } catch (err) {
      text = err instanceof Error ? err.message : 'Can’t work that out';
    }
  }
  return (
    <Panel title="Uncertainty calculator" icon="table">
      <p className="muted small">For lab reports: + and − add absolute uncertainties; × and ÷ add percentage uncertainties; a power multiplies the percentage by n.</p>
      <div className="form">
        <select className="input" value={op} onChange={(e) => setOp(e.target.value as UOp)} aria-label="Calculation">
          {OPS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="form__row">
          <Field label="A" className="grow">
            <input className="input" inputMode="decimal" value={f.a} onChange={(e) => setF({ ...f, a: e.target.value })} />
          </Field>
          <Field label="± A" className="grow">
            <input className="input" inputMode="decimal" value={f.da} onChange={(e) => setF({ ...f, da: e.target.value })} />
          </Field>
        </div>
        <div className="form__row">
          <Field label={op === 'pow' ? 'n (power)' : 'B'} className="grow">
            <input className="input" inputMode="decimal" value={f.b} onChange={(e) => setF({ ...f, b: e.target.value })} />
          </Field>
          {op !== 'pow' && (
            <Field label="± B" className="grow">
              <input className="input" inputMode="decimal" value={f.db} onChange={(e) => setF({ ...f, db: e.target.value })} />
            </Field>
          )}
        </div>
        <p className="calc__result" aria-live="polite">
          {text}
        </p>
      </div>
    </Panel>
  );
}
