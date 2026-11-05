/**
 * Engineering toolbox maths: a safe calculator (its own little parser — never eval), unit
 * conversion, physical constants, and solvers (SUVAT, quadratic, simultaneous equations,
 * f(x) = 0). Plain functions, so they're easy to test.
 */

// ---------------------------------------------------------------- Calculator
export type AngleMode = 'deg' | 'rad';

type Token = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  const s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi').replace(/√/g, 'sqrt');
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9.]/.test(c)) {
      const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i);
      if (!m) throw new Error(`I don't understand "${c}"`);
      out.push({ t: 'num', v: Number(m[0]) });
      i += m[0].length;
    } else if (/[a-zA-Z_]/.test(c)) {
      const m = s.slice(i).match(/^[a-zA-Z_][a-zA-Z_0-9]*/)!;
      out.push({ t: 'id', v: m[0] });
      i += m[0].length;
    } else if ('+-*/^(),!%'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
    } else {
      throw new Error(`I don't understand "${c}"`);
    }
  }
  return out;
}

const factorial = (n: number) => {
  if (n < 0 || !Number.isInteger(n)) throw new Error('Factorial needs a whole number ≥ 0');
  if (n > 170) return Infinity;
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
};

/**
 * Work out a maths expression: + − × ÷ ^ ( ), implicit multiplication ("2pi", "3(4+1)"),
 * n!, % (= ÷100), functions (sin cos tan asin acos atan sinh cosh tanh sqrt cbrt ln log log2
 * exp abs round floor ceil min max) and names (pi, e, ans, x…). Throws an Error with a plain message.
 */
export function evaluate(expr: string, opts: { angle?: AngleMode; vars?: Record<string, number> } = {}): number {
  const tokens = tokenize(expr);
  if (!tokens.length) throw new Error('Type something to work out');
  const angle = opts.angle ?? 'rad';
  const vars: Record<string, number> = { pi: Math.PI, e: Math.E, ...opts.vars };
  const toRad = (x: number) => (angle === 'deg' ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (angle === 'deg' ? (x * 180) / Math.PI : x);
  const fns: Record<string, (...a: number[]) => number> = {
    sin: (x) => Math.sin(toRad(x)),
    cos: (x) => Math.cos(toRad(x)),
    tan: (x) => Math.tan(toRad(x)),
    asin: (x) => fromRad(Math.asin(x)),
    acos: (x) => fromRad(Math.acos(x)),
    atan: (x) => fromRad(Math.atan(x)),
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    ln: Math.log,
    log: Math.log10,
    log2: Math.log2,
    exp: Math.exp,
    abs: Math.abs,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    min: Math.min,
    max: Math.max,
  };
  let pos = 0;
  const peek = (): Token | undefined => tokens[pos];
  const isOp = (v: string) => {
    const p = peek();
    return p?.t === 'op' && p.v === v;
  };
  const expect = (v: string) => {
    if (!isOp(v)) throw new Error(v === ')' ? 'A bracket is missing: )' : `Expected "${v}"`);
    pos++;
  };
  // Starts a value, so "2pi" or "3(4)" means multiply.
  const startsValue = () => {
    const p = peek();
    return Boolean(p && (p.t === 'num' || p.t === 'id' || (p.t === 'op' && p.v === '(')));
  };

  const expression = (): number => {
    let v = term();
    while (isOp('+') || isOp('-')) {
      const op = tokens[pos++].v;
      v = op === '+' ? v + term() : v - term();
    }
    return v;
  };
  const term = (): number => {
    let v = unary();
    for (;;) {
      if (isOp('*')) {
        pos++;
        v *= unary();
      } else if (isOp('/')) {
        pos++;
        v /= unary();
      } else if (startsValue()) {
        v *= unary();
      } else return v;
    }
  };
  const unary = (): number => {
    if (isOp('-')) {
      pos++;
      return -unary();
    }
    if (isOp('+')) {
      pos++;
      return unary();
    }
    return power();
  };
  const power = (): number => {
    const base = postfix();
    if (isOp('^')) {
      pos++;
      return base ** unary(); // right to left: 2^3^2 = 2^9
    }
    return base;
  };
  const postfix = (): number => {
    let v = primary();
    for (;;) {
      if (isOp('!')) {
        pos++;
        v = factorial(v);
      } else if (isOp('%')) {
        pos++;
        v /= 100;
      } else return v;
    }
  };
  const primary = (): number => {
    const tok = peek();
    if (!tok) throw new Error('The sum ends too early');
    if (tok.t === 'num') {
      pos++;
      return tok.v;
    }
    if (tok.t === 'id') {
      pos++;
      const name = tok.v;
      const fn = fns[name.toLowerCase()];
      if (fn) {
        if (!isOp('(')) return fn(postfix()); // "sin 30", "sqrt 2"
        pos++;
        const args = [expression()];
        while (isOp(',')) {
          pos++;
          args.push(expression());
        }
        expect(')');
        return fn(...args);
      }
      if (name in vars) return vars[name];
      throw new Error(`Unknown name "${name}"`);
    }
    if (tok.v === '(') {
      pos++;
      const v = expression();
      expect(')');
      return v;
    }
    throw new Error(`Unexpected "${tok.v}"`);
  };

  const result = expression();
  if (pos < tokens.length) throw new Error(`Unexpected "${tokens[pos].v}"`);
  if (Number.isNaN(result)) throw new Error('Not a real number (e.g. √ of a negative)');
  return result;
}

/** Up to 10 significant figures, very big/small numbers as "1.23e-7", no "0.30000000000000004". */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return n > 0 ? '∞' : n < 0 ? '−∞' : 'not a number';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e12 || abs < 1e-6) return n.toExponential(6).replace(/\.?0+e/, 'e');
  return String(Number(n.toPrecision(10)));
}

// ---------------------------------------------------------------- Units
export interface UnitDef {
  id: string;
  label: string;
  /** How many SI units one of these is (not used for temperature). */
  factor: number;
}
export interface UnitCategory {
  id: string;
  label: string;
  units: UnitDef[];
}

const u = (id: string, label: string, factor: number): UnitDef => ({ id, label, factor });

export const UNIT_CATEGORIES: UnitCategory[] = [
  { id: 'length', label: 'Length', units: [u('m', 'metre (m)', 1), u('km', 'kilometre', 1e3), u('cm', 'centimetre', 1e-2), u('mm', 'millimetre', 1e-3), u('um', 'micrometre (µm)', 1e-6), u('in', 'inch', 0.0254), u('ft', 'foot', 0.3048), u('yd', 'yard', 0.9144), u('mi', 'mile', 1609.344)] },
  { id: 'mass', label: 'Mass', units: [u('kg', 'kilogram (kg)', 1), u('g', 'gram', 1e-3), u('mg', 'milligram', 1e-6), u('t', 'tonne', 1e3), u('lb', 'pound', 0.45359237), u('oz', 'ounce', 0.028349523125)] },
  { id: 'time', label: 'Time', units: [u('s', 'second (s)', 1), u('ms', 'millisecond', 1e-3), u('min', 'minute', 60), u('h', 'hour', 3600), u('day', 'day', 86400)] },
  { id: 'speed', label: 'Speed', units: [u('mps', 'm/s', 1), u('kmh', 'km/h', 1 / 3.6), u('mph', 'mph', 0.44704), u('kn', 'knot', 1852 / 3600)] },
  { id: 'force', label: 'Force', units: [u('N', 'newton (N)', 1), u('kN', 'kilonewton', 1e3), u('kgf', 'kilogram-force', 9.80665), u('lbf', 'pound-force', 4.4482216152605)] },
  { id: 'energy', label: 'Energy', units: [u('J', 'joule (J)', 1), u('kJ', 'kilojoule', 1e3), u('MJ', 'megajoule', 1e6), u('Wh', 'watt-hour', 3600), u('kWh', 'kilowatt-hour', 3.6e6), u('cal', 'calorie', 4.184), u('kcal', 'kilocalorie', 4184), u('eV', 'electronvolt', 1.602176634e-19)] },
  { id: 'power', label: 'Power', units: [u('W', 'watt (W)', 1), u('kW', 'kilowatt', 1e3), u('MW', 'megawatt', 1e6), u('hp', 'horsepower (metric)', 735.49875)] },
  { id: 'pressure', label: 'Pressure', units: [u('Pa', 'pascal (Pa)', 1), u('kPa', 'kilopascal', 1e3), u('MPa', 'megapascal', 1e6), u('bar', 'bar', 1e5), u('atm', 'atmosphere', 101325), u('psi', 'psi', 6894.757293168), u('mmHg', 'mmHg', 133.322387415)] },
  { id: 'area', label: 'Area', units: [u('m2', 'm²', 1), u('cm2', 'cm²', 1e-4), u('mm2', 'mm²', 1e-6), u('km2', 'km²', 1e6), u('ha', 'hectare', 1e4), u('ft2', 'ft²', 0.09290304)] },
  { id: 'volume', label: 'Volume', units: [u('m3', 'm³', 1), u('L', 'litre', 1e-3), u('mL', 'millilitre', 1e-6), u('cm3', 'cm³', 1e-6), u('gal', 'UK gallon', 0.00454609), u('pt', 'UK pint', 0.00056826125)] },
  { id: 'angle', label: 'Angle', units: [u('rad', 'radian', 1), u('deg', 'degree', Math.PI / 180), u('rev', 'revolution', 2 * Math.PI)] },
  { id: 'temperature', label: 'Temperature', units: [u('C', '°C', 1), u('F', '°F', 1), u('K', 'kelvin (K)', 1)] },
];

/** Convert a value between two units of the same category. */
export function convertUnit(category: string, value: number, from: string, to: string): number {
  const cat = UNIT_CATEGORIES.find((c) => c.id === category);
  if (!cat) throw new Error('Unknown kind of unit');
  if (category === 'temperature') {
    const k = from === 'C' ? value + 273.15 : from === 'F' ? ((value - 32) * 5) / 9 + 273.15 : value;
    return to === 'C' ? k - 273.15 : to === 'F' ? ((k - 273.15) * 9) / 5 + 32 : k;
  }
  const a = cat.units.find((x) => x.id === from);
  const b = cat.units.find((x) => x.id === to);
  if (!a || !b) throw new Error('Unknown unit');
  return (value * a.factor) / b.factor;
}

// ---------------------------------------------------------------- Constants
export interface Constant {
  name: string;
  symbol: string;
  value: number;
  unit: string;
}

/** Common physical constants (exact SI values where they're defined exactly). */
export const CONSTANTS: Constant[] = [
  { name: 'Standard gravity', symbol: 'g', value: 9.80665, unit: 'm/s²' },
  { name: 'Gravitational constant', symbol: 'G', value: 6.6743e-11, unit: 'N·m²/kg²' },
  { name: 'Speed of light', symbol: 'c', value: 299792458, unit: 'm/s' },
  { name: 'Planck constant', symbol: 'h', value: 6.62607015e-34, unit: 'J·s' },
  { name: 'Elementary charge', symbol: 'e', value: 1.602176634e-19, unit: 'C' },
  { name: 'Electron mass', symbol: 'mₑ', value: 9.1093837015e-31, unit: 'kg' },
  { name: 'Proton mass', symbol: 'mₚ', value: 1.67262192369e-27, unit: 'kg' },
  { name: 'Boltzmann constant', symbol: 'k', value: 1.380649e-23, unit: 'J/K' },
  { name: 'Avogadro constant', symbol: 'Nₐ', value: 6.02214076e23, unit: '1/mol' },
  { name: 'Gas constant', symbol: 'R', value: 8.314462618, unit: 'J/(mol·K)' },
  { name: 'Permittivity of free space', symbol: 'ε₀', value: 8.8541878128e-12, unit: 'F/m' },
  { name: 'Permeability of free space', symbol: 'μ₀', value: 1.25663706212e-6, unit: 'N/A²' },
  { name: 'Stefan–Boltzmann constant', symbol: 'σ', value: 5.670374419e-8, unit: 'W/(m²·K⁴)' },
  { name: 'Standard atmosphere', symbol: 'atm', value: 101325, unit: 'Pa' },
  { name: 'Density of water (4 °C)', symbol: 'ρ', value: 1000, unit: 'kg/m³' },
  { name: 'Density of air (sea level, 15 °C)', symbol: 'ρ', value: 1.225, unit: 'kg/m³' },
  { name: 'Speed of sound in air (20 °C)', symbol: 'v', value: 343, unit: 'm/s' },
  { name: "Young's modulus of steel (typical)", symbol: 'E', value: 200e9, unit: 'Pa' },
  { name: 'Absolute zero', symbol: '0 K', value: -273.15, unit: '°C' },
];

// ---------------------------------------------------------------- SUVAT
export type SuvatKey = 's' | 'u' | 'v' | 'a' | 't';
export type Suvat = Record<SuvatKey, number>;
export const SUVAT_KEYS: SuvatKey[] = ['s', 'u', 'v', 'a', 't'];

/**
 * Constant-acceleration motion: give exactly three of s, u, v, a, t and get the other two.
 * Some cases have two answers (e.g. passing the same height going up and coming down);
 * answers needing a negative time are dropped. Throws a plain message if it can't be done.
 */
export function solveSuvat(known: Partial<Record<SuvatKey, number>>): Suvat[] {
  const has = SUVAT_KEYS.filter((k) => known[k] !== undefined && Number.isFinite(known[k]));
  if (has.length !== 3) throw new Error('Fill in exactly three of s, u, v, a, t');
  const { s, u: u0, v, a, t } = known as Suvat;
  const missing = SUVAT_KEYS.filter((k) => !has.includes(k)).join('');
  const out: Suvat[] = [];
  const push = (x: Suvat) => {
    if (SUVAT_KEYS.every((k) => Number.isFinite(x[k])) && x.t >= -1e-12) out.push(x);
  };
  const roots = (sq: number) => (sq < 0 ? [] : sq === 0 ? [0] : [Math.sqrt(sq), -Math.sqrt(sq)]);
  const needT = () => {
    if (t === 0) throw new Error('Time can’t be 0 here');
  };
  switch (missing) {
    case 'sv':
      push({ s: u0 * t + 0.5 * a * t * t, u: u0, v: u0 + a * t, a, t });
      break;
    case 'su':
      push({ s: v * t - 0.5 * a * t * t, u: v - a * t, v, a, t });
      break;
    case 'sa':
      needT();
      push({ s: 0.5 * (u0 + v) * t, u: u0, v, a: (v - u0) / t, t });
      break;
    case 'st':
      if (a === 0) throw new Error('With a = 0, u and v must be equal and time can be anything');
      push({ s: (v * v - u0 * u0) / (2 * a), u: u0, v, a, t: (v - u0) / a });
      break;
    case 'uv': {
      needT();
      const uu = (s - 0.5 * a * t * t) / t;
      push({ s, u: uu, v: uu + a * t, a, t });
      break;
    }
    case 'ua': {
      needT();
      const uu = (2 * s) / t - v;
      push({ s, u: uu, v, a: (v - uu) / t, t });
      break;
    }
    case 'ut':
      if (a === 0) push({ s, u: v, v, a, t: s / v });
      else for (const uu of roots(v * v - 2 * a * s)) push({ s, u: uu, v, a, t: (v - uu) / a });
      break;
    case 'va': {
      needT();
      const vv = (2 * s) / t - u0;
      push({ s, u: u0, v: vv, a: (vv - u0) / t, t });
      break;
    }
    case 'vt':
      if (a === 0) push({ s, u: u0, v: u0, a, t: s / u0 });
      else for (const vv of roots(u0 * u0 + 2 * a * s)) push({ s, u: u0, v: vv, a, t: (vv - u0) / a });
      break;
    case 'at':
      if (u0 + v === 0) throw new Error('u + v can’t be 0 here');
      push({ s, u: u0, v, a: s === 0 ? 0 : (v * v - u0 * u0) / (2 * s), t: (2 * s) / (u0 + v) });
      break;
  }
  if (!out.length) throw new Error('No real answer with these numbers (check the signs)');
  return out;
}

// ---------------------------------------------------------------- Equations
/** ax² + bx + c = 0 → real roots (smallest first), or the complex pair as { re, im }. */
export function solveQuadratic(a: number, b: number, c: number): { real: number[] } | { re: number; im: number } {
  if (a === 0) {
    if (b === 0) throw new Error(c === 0 ? 'Every x works' : 'No x works');
    return { real: [-c / b] };
  }
  const d = b * b - 4 * a * c;
  if (d < 0) return { re: -b / (2 * a), im: Math.sqrt(-d) / (2 * Math.abs(a)) };
  if (d === 0) return { real: [-b / (2 * a)] };
  const r = Math.sqrt(d);
  return { real: [(-b + r) / (2 * a), (-b - r) / (2 * a)].sort((x, y) => x - y) };
}

/** Solve A·x = b (2×2, 3×3…) by Gaussian elimination with pivoting. */
export function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const m = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    if (Math.abs(m[pivot][col]) < 1e-12) throw new Error('No single answer (the equations depend on each other)');
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r][col] / m[col][col];
      for (let k = col; k <= n; k++) m[r][k] -= f * m[col][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/**
 * Solve "lhs = rhs" (or "expression" = 0) for x between `from` and `to`: scans for sign changes,
 * then narrows each one down. Returns every root found (up to 10), smallest first.
 */
export function solveForX(equation: string, from = -100, to = 100, angle: AngleMode = 'rad'): number[] {
  const parts = equation.split('=');
  if (parts.length > 2) throw new Error('Use one "=" at most');
  const [lhs, rhs = '0'] = parts;
  const f = (x: number) => evaluate(lhs, { angle, vars: { x } }) - evaluate(rhs, { angle, vars: { x } });
  f((from + to) / 2 + 1e-9); // throws a clear message if the expression itself is wrong
  const safe = (x: number) => {
    try {
      return f(x);
    } catch {
      return NaN;
    }
  };
  const steps = 2000;
  const roots: number[] = [];
  let x0 = from;
  let y0 = safe(x0);
  for (let i = 1; i <= steps && roots.length < 10; i++) {
    const x1 = from + ((to - from) * i) / steps;
    const y1 = safe(x1);
    if (Number.isFinite(y0) && Number.isFinite(y1)) {
      if (y0 === 0) roots.push(x0);
      else if (y0 * y1 < 0) {
        let lo = x0;
        let hi = x1;
        for (let k = 0; k < 80; k++) {
          const mid = (lo + hi) / 2;
          if (Math.sign(safe(mid)) === Math.sign(safe(lo))) lo = mid;
          else hi = mid;
        }
        const r = (lo + hi) / 2;
        // Skip poles like 1/x, where the sign flips but f doesn't get near 0.
        if (Math.abs(safe(r)) < 1e-6 * Math.max(1, Math.abs(y0), Math.abs(y1))) roots.push(r);
      }
    }
    x0 = x1;
    y0 = y1;
  }
  if (y0 === 0 && !roots.includes(x0)) roots.push(x0);
  return roots;
}
