/**
 * 🔧 Study → Tools: the engineering toolbox — physics (formula sheet, solver, practice, uncertainty), scientific calculator, unit converter, constants
 * and solvers (SUVAT, quadratic, simultaneous equations, f(x) = 0). The maths lives in
 * lib/engineering.ts. Nothing here is saved except your degrees/radians choice.
 */
import { useState, type FormEvent } from 'react';
import {
  CONSTANTS,
  convertUnit,
  evaluate,
  formatNumber,
  solveForX,
  solveLinear,
  solveQuadratic,
  solveSuvat,
  SUVAT_KEYS,
  UNIT_CATEGORIES,
  type AngleMode,
  type SuvatKey,
} from '../lib/engineering';
import { fold } from '../lib/search';
import { PixelIcon } from '../ui/icons';
import { Field, Panel, Segmented } from '../ui/kit';
import PhysicsTools from './PhysicsTools';

type Section = 'physics' | 'calc' | 'units' | 'constants' | 'solve';

const ANGLE_KEY = 'beks:angle';
const savedAngle = (): AngleMode => {
  try {
    return localStorage.getItem(ANGLE_KEY) === 'rad' ? 'rad' : 'deg';
  } catch {
    return 'deg';
  }
};

/** A number typed by hand ("" or nonsense = not given). Accepts sums like "9.81*2" too. */
const num = (text: string): number | undefined => {
  if (!text.trim()) return undefined;
  try {
    return evaluate(text);
  } catch {
    return undefined;
  }
};

export default function Toolbox() {
  const [section, setSection] = useState<Section>('physics');
  const [expr, setExpr] = useState('');
  // Kept here (not in the calculator) so the last answer and history survive switching tools.
  const [ans, setAns] = useState(0);
  const [history, setHistory] = useState<History>([]);
  const [angle, setAngleState] = useState<AngleMode>(savedAngle);
  const setAngle = (a: AngleMode) => {
    setAngleState(a);
    try {
      localStorage.setItem(ANGLE_KEY, a);
    } catch {
      /* private mode: just not remembered */
    }
  };
  return (
    <div className="grid">
      <Segmented<Section>
        label="Tool"
        value={section}
        onChange={setSection}
        options={[
          { value: 'physics', label: 'Physics' },
          { value: 'calc', label: 'Calculator' },
          { value: 'units', label: 'Units' },
          { value: 'constants', label: 'Constants' },
          { value: 'solve', label: 'Solvers' },
        ]}
      />
      {section === 'physics' && <PhysicsTools />}
      {section === 'calc' && <Calculator expr={expr} setExpr={setExpr} angle={angle} setAngle={setAngle} ans={ans} setAns={setAns} history={history} setHistory={setHistory} />}
      {section === 'units' && <Units />}
      {section === 'constants' && (
        <Constants
          onUse={(value) => {
            setExpr((e) => `${e}${e && /[\d)a-z]$/i.test(e) ? '*' : ''}${value}`);
            setSection('calc');
          }}
        />
      )}
      {section === 'solve' && <Solvers angle={angle} />}
    </div>
  );
}

// ---------------------------------------------------------------- Calculator
const KEYS: { label: string; insert?: string; action?: 'clear' | 'back' | 'equals'; name?: string }[] = [
  { label: 'sin', insert: 'sin(' },
  { label: 'cos', insert: 'cos(' },
  { label: 'tan', insert: 'tan(' },
  { label: '√', insert: 'sqrt(', name: 'Square root' },
  { label: 'xʸ', insert: '^', name: 'Power' },
  { label: 'ln', insert: 'ln(' },
  { label: 'log', insert: 'log(' },
  { label: 'π', insert: 'pi', name: 'Pi' },
  { label: 'e', insert: 'e' },
  { label: 'ans', insert: 'ans', name: 'Last answer' },
  { label: '(', insert: '(' },
  { label: ')', insert: ')' },
  { label: 'x²', insert: '^2', name: 'Squared' },
  { label: '⌫', action: 'back', name: 'Delete' },
  { label: 'AC', action: 'clear', name: 'Clear' },
  { label: '7' },
  { label: '8' },
  { label: '9' },
  { label: '÷', insert: '/', name: 'Divide' },
  { label: 'n!', insert: '!', name: 'Factorial' },
  { label: '4' },
  { label: '5' },
  { label: '6' },
  { label: '×', insert: '*', name: 'Times' },
  { label: '×10ˣ', insert: 'e', name: 'Times ten to the power' },
  { label: '1' },
  { label: '2' },
  { label: '3' },
  { label: '−', insert: '-', name: 'Minus' },
  { label: '%', insert: '%', name: 'Percent' },
  { label: '0' },
  { label: '.' },
  { label: ',', insert: ',', name: 'Comma' },
  { label: '+', insert: '+', name: 'Plus' },
  { label: '=', action: 'equals', name: 'Equals' },
];

type History = { expr: string; result: string }[];

function Calculator(props: {
  expr: string;
  setExpr: (fn: (e: string) => string) => void;
  angle: AngleMode;
  setAngle: (a: AngleMode) => void;
  ans: number;
  setAns: (n: number) => void;
  history: History;
  setHistory: (fn: (h: History) => History) => void;
}) {
  const { expr, setExpr, angle, setAngle, ans, setAns, history, setHistory } = props;
  const [error, setError] = useState('');

  let preview = '';
  if (expr.trim()) {
    try {
      preview = formatNumber(evaluate(expr, { angle, vars: { ans } }));
    } catch {
      preview = '';
    }
  }

  const equals = () => {
    if (!expr.trim()) return;
    try {
      const value = evaluate(expr, { angle, vars: { ans } });
      setAns(value);
      setHistory((h) => [{ expr, result: formatNumber(value) }, ...h].slice(0, 20));
      setExpr(() => '');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That doesn’t work out');
    }
  };

  const press = (k: (typeof KEYS)[number]) => {
    setError('');
    if (k.action === 'equals') equals();
    else if (k.action === 'clear') setExpr(() => '');
    else if (k.action === 'back') setExpr((e) => e.slice(0, -1));
    else setExpr((e) => e + (k.insert ?? k.label));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    equals();
  };

  return (
    <Panel
      title="Calculator"
      icon="table"
      actions={
        <Segmented<AngleMode>
          label="Angles"
          value={angle}
          onChange={setAngle}
          options={[
            { value: 'deg', label: 'DEG' },
            { value: 'rad', label: 'RAD' },
          ]}
        />
      }
    >
      <form className="calc" onSubmit={submit}>
        <input
          className="input calc__input"
          value={expr}
          onChange={(e) => {
            setExpr(() => e.target.value);
            setError('');
          }}
          placeholder="e.g. 0.5*9.81*2^2"
          aria-label="Calculation"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="calc__result" aria-live="polite">
          {error ? <span className="pantry-warn">{error}</span> : preview ? `= ${preview}` : ' '}
        </p>
        <div className="calc__keys">
          {KEYS.map((k) => (
            <button
              key={k.label}
              type="button"
              className={`calc__key ${k.action === 'equals' ? 'is-equals' : /^[0-9.]$/.test(k.label) ? 'is-digit' : ''}`}
              onClick={() => press(k)}
              aria-label={k.name}
            >
              {k.label}
            </button>
          ))}
        </div>
      </form>
      {history.length > 0 && (
        <ul className="list" aria-label="Earlier answers">
          {history.map((h, i) => (
            <li key={i} className="list__item">
              <button type="button" className="list__main" onClick={() => setExpr((e) => e + h.result.replace('−', '-'))} aria-label={`Use ${h.result}`}>
                <span className="list__text">
                  <small className="muted">{h.expr}</small>
                  <span>= {h.result}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">Type straight in too, e.g. “sin 30”, “2pi”, “5!”, “1.2e-3”. “ans” is the last answer; tap an old answer to reuse it.</p>
    </Panel>
  );
}

// ---------------------------------------------------------------- Units
function Units() {
  const [cat, setCat] = useState(UNIT_CATEGORIES[0].id);
  const category = UNIT_CATEGORIES.find((c) => c.id === cat)!;
  const units = category.units;
  const [from, setFrom] = useState(units[0].id);
  const [to, setTo] = useState(units[1].id);
  const [value, setValue] = useState('1');
  const v = num(value);
  const changeCat = (id: string) => {
    const list = UNIT_CATEGORIES.find((c) => c.id === id)!.units;
    setCat(id);
    setFrom(list[0].id);
    setTo(list[1].id);
  };
  const label = (id: string) => units.find((x) => x.id === id)?.label ?? id;
  const unitOptions = units.map((x) => (
    <option key={x.id} value={x.id}>
      {x.label}
    </option>
  ));
  return (
    <Panel title="Unit converter" icon="globe">
      <div className="form">
        <Field label="Kind">
          <select className="input" value={cat} onChange={(e) => changeCat(e.target.value)}>
            {UNIT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Value">
          <input className="input" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <div className="form__row units__row">
          <Field label="From" className="grow">
            <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
              {unitOptions}
            </select>
          </Field>
          <button
            type="button"
            className="btn btn--small"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
            aria-label="Swap units"
          >
            ⇄
          </button>
          <Field label="To" className="grow">
            <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
              {unitOptions}
            </select>
          </Field>
        </div>
        <p className="calc__result" aria-live="polite">
          {v === undefined ? 'Type a number' : `${formatNumber(v)} ${label(from)} = ${formatNumber(convertUnit(cat, v, from, to))} ${label(to)}`}
        </p>
        {v !== undefined && (
          <details className="details">
            <summary>In every {category.label.toLowerCase()} unit</summary>
            <ul className="mini-list">
              {units.map((x) => (
                <li key={x.id}>
                  {formatNumber(convertUnit(cat, v, from, x.id))} <span className="muted">{x.label}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------- Constants
function Constants({ onUse }: { onUse: (value: string) => void }) {
  const [q, setQ] = useState('');
  const list = CONSTANTS.filter((c) => fold(`${c.name} ${c.symbol} ${c.unit}`).includes(fold(q)));
  return (
    <Panel title="Constants" icon="book">
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, e.g. gravity, planck" aria-label="Search constants" />
      <ul className="list">
        {list.map((c) => (
          <li key={c.name} className="list__item">
            <button type="button" className="list__main" onClick={() => onUse(String(c.value))} aria-label={`Use ${c.name} in the calculator`}>
              <span className="list__text">
                <span>
                  <strong>{c.symbol}</strong> · {c.name}
                </span>
                <small className="muted">
                  {formatNumber(c.value)} {c.unit}
                </small>
              </span>
              <PixelIcon name="plus" size={16} />
            </button>
          </li>
        ))}
      </ul>
      <p className="muted small">Tap one to put its value into the calculator.</p>
    </Panel>
  );
}

// ---------------------------------------------------------------- Solvers
type Solver = 'suvat' | 'quadratic' | 'linear' | 'fx';

function Solvers({ angle }: { angle: AngleMode }) {
  const [which, setWhich] = useState<Solver>('suvat');
  return (
    <Panel title="Solvers" icon="star">
      <Segmented<Solver>
        label="Solver"
        value={which}
        onChange={setWhich}
        options={[
          { value: 'suvat', label: 'SUVAT' },
          { value: 'quadratic', label: 'ax²+bx+c' },
          { value: 'linear', label: 'Simultaneous' },
          { value: 'fx', label: 'f(x) = 0' },
        ]}
      />
      {which === 'suvat' && <SuvatSolver />}
      {which === 'quadratic' && <QuadraticSolver />}
      {which === 'linear' && <LinearSolver />}
      {which === 'fx' && <FxSolver angle={angle} />}
    </Panel>
  );
}

const SUVAT_LABEL: Record<SuvatKey, string> = { s: 's — displacement (m)', u: 'u — initial velocity (m/s)', v: 'v — final velocity (m/s)', a: 'a — acceleration (m/s²)', t: 't — time (s)' };
const EMPTY_SUVAT: Record<SuvatKey, string> = { s: '', u: '', v: '', a: '', t: '' };

function SuvatSolver() {
  const [vals, setVals] = useState(EMPTY_SUVAT);
  const known: Partial<Record<SuvatKey, number>> = {};
  for (const k of SUVAT_KEYS) {
    const n = num(vals[k]);
    if (n !== undefined) known[k] = n;
  }
  const count = Object.keys(known).length;
  const missing = SUVAT_KEYS.filter((k) => known[k] === undefined);
  let lines: string[] = [];
  let error = '';
  if (count === 3) {
    try {
      const res = solveSuvat(known);
      lines = res.map((r, i) => `${res.length > 1 ? `Answer ${i + 1}: ` : ''}${missing.map((k) => `${k} = ${formatNumber(r[k])}`).join(',  ')}`);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Can’t solve that';
    }
  }
  return (
    <div className="form">
      <p className="muted small">Constant acceleration. Fill in any three; up is positive (falling under gravity: a = −9.81).</p>
      {SUVAT_KEYS.map((k) => (
        <Field key={k} label={SUVAT_LABEL[k]}>
          <input className="input" inputMode="decimal" value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} placeholder={count >= 3 && known[k] === undefined ? '?' : ''} />
        </Field>
      ))}
      <div className="calc__result" aria-live="polite">
        {count < 3 && <p>Fill in {3 - count} more</p>}
        {count > 3 && <p>Only three, please — clear one box</p>}
        {error && <p className="pantry-warn">{error}</p>}
        {lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
      <button type="button" className="btn btn--small" onClick={() => setVals(EMPTY_SUVAT)}>
        Clear
      </button>
    </div>
  );
}

function QuadraticSolver() {
  const [coef, setCoef] = useState({ a: '1', b: '-3', c: '2' });
  const [na, nb, nc] = [num(coef.a), num(coef.b), num(coef.c)];
  let text = 'Fill in a, b and c';
  if (na !== undefined && nb !== undefined && nc !== undefined) {
    try {
      const r = solveQuadratic(na, nb, nc);
      text = 'real' in r ? r.real.map((x, i) => `x${r.real.length > 1 ? i + 1 : ''} = ${formatNumber(x)}`).join(',  ') : `x = ${formatNumber(r.re)} ± ${formatNumber(r.im)}i (no real roots)`;
    } catch (err) {
      text = err instanceof Error ? err.message : 'Can’t solve that';
    }
  }
  return (
    <div className="form">
      <p className="muted small">ax² + bx + c = 0</p>
      <div className="form__row">
        {(['a', 'b', 'c'] as const).map((k) => (
          <Field key={k} label={k} className="grow">
            <input className="input" inputMode="decimal" value={coef[k]} onChange={(e) => setCoef({ ...coef, [k]: e.target.value })} />
          </Field>
        ))}
      </div>
      <p className="calc__result" aria-live="polite">
        {text}
      </p>
    </div>
  );
}

function LinearSolver() {
  const [n, setN] = useState<2 | 3>(2);
  // Each row: the numbers before x, y, z, then the right-hand side.
  const [cells, setCells] = useState<string[][]>([
    ['2', '1', '', '5'],
    ['1', '-1', '', '1'],
    ['', '', '', ''],
  ]);
  const names = n === 2 ? ['x', 'y'] : ['x', 'y', 'z'];
  const set = (r: number, c: number, v: string) => setCells(cells.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)));
  let text = 'Fill in every box';
  const rows = cells.slice(0, n).map((row) => [...row.slice(0, n), row[3]].map(num));
  if (rows.every((row) => row.every((x) => x !== undefined))) {
    try {
      const sol = solveLinear(
        rows.map((row) => row.slice(0, n) as number[]),
        rows.map((row) => row[n] as number),
      );
      text = sol.map((x, i) => `${names[i]} = ${formatNumber(x)}`).join(',  ');
    } catch (err) {
      text = err instanceof Error ? err.message : 'Can’t solve that';
    }
  }
  return (
    <div className="form">
      <Segmented<2 | 3>
        label="How many unknowns"
        value={n}
        onChange={setN}
        options={[
          { value: 2, label: 'x, y' },
          { value: 3, label: 'x, y, z' },
        ]}
      />
      {cells.slice(0, n).map((row, r) => (
        <div key={r} className="lin-row">
          {names.map((name, c) => (
            <label key={name} className="lin-cell">
              <input className="input" inputMode="decimal" value={row[c]} onChange={(e) => set(r, c, e.target.value)} aria-label={`Equation ${r + 1}: number in front of ${name}`} />
              <span>
                {name}
                {c < n - 1 ? ' +' : ' ='}
              </span>
            </label>
          ))}
          <input className="input lin-cell__rhs" inputMode="decimal" value={row[3]} onChange={(e) => set(r, 3, e.target.value)} aria-label={`Equation ${r + 1}: right-hand side`} />
        </div>
      ))}
      <p className="calc__result" aria-live="polite">
        {text}
      </p>
    </div>
  );
}

function FxSolver({ angle }: { angle: AngleMode }) {
  const [eq, setEq] = useState('x^3 - 2x = 5');
  const [range, setRange] = useState({ from: '-100', to: '100' });
  const [result, setResult] = useState('');
  const solve = (e: FormEvent) => {
    e.preventDefault();
    const lo = num(range.from);
    const hi = num(range.to);
    if (lo === undefined || hi === undefined || lo >= hi) {
      setResult('The search range needs "from" smaller than "to"');
      return;
    }
    try {
      const roots = solveForX(eq, lo, hi, angle);
      setResult(roots.length ? roots.map((x) => `x = ${formatNumber(Number(x.toPrecision(9)))}`).join(',  ') : `No answer between ${formatNumber(lo)} and ${formatNumber(hi)}`);
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Can’t solve that');
    }
  };
  return (
    <form className="form" onSubmit={solve}>
      <Field label="Equation in x" hint={`Any calculator sum with x, e.g. "cos(x) = x". Angles in ${angle === 'deg' ? 'degrees' : 'radians'} (switch on the calculator).`}>
        <input className="input" value={eq} onChange={(e) => setEq(e.target.value)} autoComplete="off" spellCheck={false} />
      </Field>
      <div className="form__row">
        <Field label="Look from" className="grow">
          <input className="input" inputMode="decimal" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        </Field>
        <Field label="to" className="grow">
          <input className="input" inputMode="decimal" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </Field>
      </div>
      <button type="submit" className="btn btn--primary">
        Solve
      </button>
      {result && (
        <p className="calc__result" aria-live="polite">
          {result}
        </p>
      )}
    </form>
  );
}
