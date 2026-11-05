/**
 * Physics mastery: a formula sheet (with symbols and units), solving any formula for any quantity,
 * practice problems with random values, and uncertainty propagation for lab work.
 * Uses the calculator's safe parser (lib/engineering.ts). Plain functions, so they're easy to test.
 */
import { evaluate, formatNumber } from './engineering';

/** A quantity in a formula: symbol (as used in `eq`), name, unit, and a sensible range for practice. */
export type PVar = [symbol: string, name: string, unit: string, min: number, max: number];

export interface PFormula {
  id: string;
  topic: string;
  name: string;
  /** How it looks, e.g. "F = ma". */
  show: string;
  /** For the solver, in calculator syntax with * and ^ ; angles in degrees. */
  eq: string;
  vars: PVar[];
}

const v = (symbol: string, name: string, unit: string, min: number, max: number): PVar => [symbol, name, unit, min, max];

export const TOPICS = ['Mechanics', 'Materials', 'Circular motion & SHM', 'Waves & light', 'Electricity', 'Thermal', 'Fields', 'Nuclear'];

export const FORMULAS: PFormula[] = [
  { id: 'n2', topic: 'Mechanics', name: "Newton's 2nd law", show: 'F = ma', eq: 'F = m*a', vars: [v('F', 'resultant force', 'N', 1, 500), v('m', 'mass', 'kg', 0.5, 80), v('a', 'acceleration', 'm/s²', 0.5, 20)] },
  { id: 'weight', topic: 'Mechanics', name: 'Weight', show: 'W = mg', eq: 'W = m*g', vars: [v('W', 'weight', 'N', 5, 900), v('m', 'mass', 'kg', 0.5, 90), v('g', 'gravitational field strength', 'N/kg', 9.81, 9.81)] },
  { id: 'momentum', topic: 'Mechanics', name: 'Momentum', show: 'p = mv', eq: 'p = m*v', vars: [v('p', 'momentum', 'kg·m/s', 1, 2000), v('m', 'mass', 'kg', 0.1, 100), v('v', 'velocity', 'm/s', 0.5, 40)] },
  { id: 'impulse', topic: 'Mechanics', name: 'Impulse', show: 'FΔt = Δp = mv − mu', eq: 'F*t = m*v - m*u', vars: [v('F', 'force', 'N', 10, 2000), v('t', 'time of contact', 's', 0.01, 2), v('m', 'mass', 'kg', 0.1, 80), v('v', 'final velocity', 'm/s', 5, 40), v('u', 'initial velocity', 'm/s', 0, 4)] },
  { id: 'work', topic: 'Mechanics', name: 'Work done', show: 'W = Fs cos θ', eq: 'W = F*s*cos(theta)', vars: [v('W', 'work done', 'J', 1, 5000), v('F', 'force', 'N', 1, 500), v('s', 'distance moved', 'm', 0.5, 50), v('theta', 'angle between force and motion', '°', 0, 60)] },
  { id: 'ke', topic: 'Mechanics', name: 'Kinetic energy', show: 'Eₖ = ½mv²', eq: 'Ek = 0.5*m*v^2', vars: [v('Ek', 'kinetic energy', 'J', 1, 5000), v('m', 'mass', 'kg', 0.1, 80), v('v', 'speed', 'm/s', 0.5, 30)] },
  { id: 'gpe', topic: 'Mechanics', name: 'Gravitational PE', show: 'ΔEₚ = mgΔh', eq: 'Ep = m*g*h', vars: [v('Ep', 'change in GPE', 'J', 1, 5000), v('m', 'mass', 'kg', 0.1, 80), v('g', 'gravitational field strength', 'N/kg', 9.81, 9.81), v('h', 'change in height', 'm', 0.5, 50)] },
  { id: 'power-w', topic: 'Mechanics', name: 'Power', show: 'P = W/t', eq: 'P = W/t', vars: [v('P', 'power', 'W', 1, 3000), v('W', 'work done', 'J', 10, 50000), v('t', 'time', 's', 1, 600)] },
  { id: 'power-fv', topic: 'Mechanics', name: 'Power (force × velocity)', show: 'P = Fv', eq: 'P = F*v', vars: [v('P', 'power', 'W', 1, 50000), v('F', 'force', 'N', 10, 2000), v('v', 'velocity', 'm/s', 0.5, 30)] },
  { id: 'eff', topic: 'Mechanics', name: 'Efficiency', show: 'efficiency = useful out / total in × 100%', eq: 'eff = Eu/Et*100', vars: [v('eff', 'efficiency', '%', 5, 95), v('Eu', 'useful energy out', 'J', 10, 900), v('Et', 'total energy in', 'J', 1000, 2000)] },
  { id: 'moment', topic: 'Mechanics', name: 'Moment', show: 'M = Fd', eq: 'M = F*d', vars: [v('M', 'moment', 'N·m', 1, 500), v('F', 'force', 'N', 1, 300), v('d', 'perpendicular distance to pivot', 'm', 0.05, 3)] },
  { id: 'density', topic: 'Materials', name: 'Density', show: 'ρ = m/V', eq: 'rho = m/V', vars: [v('rho', 'density', 'kg/m³', 500, 11000), v('m', 'mass', 'kg', 0.1, 50), v('V', 'volume', 'm³', 0.0001, 0.05)] },
  { id: 'pressure', topic: 'Materials', name: 'Pressure', show: 'p = F/A', eq: 'p = F/A', vars: [v('p', 'pressure', 'Pa', 100, 100000), v('F', 'force', 'N', 10, 5000), v('A', 'area', 'm²', 0.01, 2)] },
  { id: 'hooke', topic: 'Materials', name: "Hooke's law", show: 'F = kx', eq: 'F = k*x', vars: [v('F', 'force', 'N', 1, 200), v('k', 'spring constant', 'N/m', 10, 2000), v('x', 'extension', 'm', 0.005, 0.3)] },
  { id: 'epe', topic: 'Materials', name: 'Elastic potential energy', show: 'E = ½kx²', eq: 'E = 0.5*k*x^2', vars: [v('E', 'elastic PE', 'J', 0.1, 50), v('k', 'spring constant', 'N/m', 10, 2000), v('x', 'extension', 'm', 0.005, 0.3)] },
  { id: 'stress', topic: 'Materials', name: 'Stress', show: 'σ = F/A', eq: 'sigma = F/A', vars: [v('sigma', 'stress', 'Pa', 1e5, 5e8), v('F', 'tension', 'N', 10, 5000), v('A', 'cross-sectional area', 'm²', 1e-6, 1e-4)] },
  { id: 'strain', topic: 'Materials', name: 'Strain', show: 'ε = ΔL/L', eq: 'strain = dL/L', vars: [v('strain', 'strain', '(no unit)', 0.0005, 0.02), v('dL', 'extension', 'm', 0.0005, 0.02), v('L', 'original length', 'm', 0.5, 3)] },
  { id: 'young', topic: 'Materials', name: "Young's modulus", show: 'E = σ/ε', eq: 'E = sigma/strain', vars: [v('E', "Young's modulus", 'Pa', 1e9, 2.1e11), v('sigma', 'stress', 'Pa', 1e6, 5e8), v('strain', 'strain', '(no unit)', 0.0005, 0.02)] },
  { id: 'centa', topic: 'Circular motion & SHM', name: 'Centripetal acceleration', show: 'a = v²/r', eq: 'a = v^2/r', vars: [v('a', 'centripetal acceleration', 'm/s²', 0.5, 50), v('v', 'speed', 'm/s', 1, 30), v('r', 'radius', 'm', 0.5, 50)] },
  { id: 'centf', topic: 'Circular motion & SHM', name: 'Centripetal force', show: 'F = mv²/r', eq: 'F = m*v^2/r', vars: [v('F', 'centripetal force', 'N', 1, 5000), v('m', 'mass', 'kg', 0.1, 1500), v('v', 'speed', 'm/s', 1, 30), v('r', 'radius', 'm', 0.5, 50)] },
  { id: 'omega', topic: 'Circular motion & SHM', name: 'Angular speed', show: 'ω = v/r = 2πf', eq: 'w = 2*pi*f', vars: [v('w', 'angular speed', 'rad/s', 0.5, 100), v('f', 'frequency', 'Hz', 0.1, 15)] },
  { id: 'period', topic: 'Circular motion & SHM', name: 'Period and frequency', show: 'T = 1/f', eq: 'T = 1/f', vars: [v('T', 'period', 's', 0.01, 10), v('f', 'frequency', 'Hz', 0.1, 100)] },
  { id: 'pendulum', topic: 'Circular motion & SHM', name: 'Simple pendulum', show: 'T = 2π√(L/g)', eq: 'T = 2*pi*sqrt(L/g)', vars: [v('T', 'period', 's', 0.5, 5), v('L', 'length', 'm', 0.1, 3), v('g', 'gravitational field strength', 'm/s²', 9.81, 9.81)] },
  { id: 'spring-shm', topic: 'Circular motion & SHM', name: 'Mass on a spring', show: 'T = 2π√(m/k)', eq: 'T = 2*pi*sqrt(m/k)', vars: [v('T', 'period', 's', 0.1, 5), v('m', 'mass', 'kg', 0.05, 5), v('k', 'spring constant', 'N/m', 5, 500)] },
  { id: 'wave', topic: 'Waves & light', name: 'Wave speed', show: 'v = fλ', eq: 'v = f*lambda', vars: [v('v', 'wave speed', 'm/s', 1, 3000), v('f', 'frequency', 'Hz', 1, 2000), v('lambda', 'wavelength', 'm', 0.01, 5)] },
  { id: 'refr', topic: 'Waves & light', name: 'Refractive index', show: 'n = c/v', eq: 'n = 299792458/v', vars: [v('n', 'refractive index', '(no unit)', 1.1, 2.4), v('v', 'speed of light in the material', 'm/s', 1.3e8, 2.7e8)] },
  { id: 'snell', topic: 'Waves & light', name: "Snell's law", show: 'n₁ sin θ₁ = n₂ sin θ₂', eq: 'n1*sin(t1) = n2*sin(t2)', vars: [v('n1', 'first refractive index', '(no unit)', 1, 1.1), v('t1', 'angle of incidence', '°', 10, 60), v('n2', 'second refractive index', '(no unit)', 1.3, 1.6), v('t2', 'angle of refraction', '°', 5, 40)] },
  { id: 'grating', topic: 'Waves & light', name: 'Diffraction grating', show: 'd sin θ = nλ', eq: 'd*sin(theta) = n*lambda', vars: [v('d', 'slit spacing', 'm', 1e-6, 5e-6), v('theta', 'angle of the maximum', '°', 5, 60), v('n', 'order', '(no unit)', 1, 2), v('lambda', 'wavelength', 'm', 4e-7, 7e-7)] },
  { id: 'photon', topic: 'Waves & light', name: 'Photon energy', show: 'E = hf', eq: 'E = 6.62607015e-34*f', vars: [v('E', 'photon energy', 'J', 1e-19, 6e-19), v('f', 'frequency', 'Hz', 4e14, 9e14)] },
  { id: 'ohm', topic: 'Electricity', name: "Ohm's law", show: 'V = IR', eq: 'V = I*R', vars: [v('V', 'potential difference', 'V', 1, 240), v('I', 'current', 'A', 0.01, 10), v('R', 'resistance', 'Ω', 1, 1000)] },
  { id: 'charge', topic: 'Electricity', name: 'Charge', show: 'Q = It', eq: 'Q = I*t', vars: [v('Q', 'charge', 'C', 1, 5000), v('I', 'current', 'A', 0.1, 10), v('t', 'time', 's', 1, 600)] },
  { id: 'power-iv', topic: 'Electricity', name: 'Electrical power', show: 'P = IV', eq: 'P = I*V', vars: [v('P', 'power', 'W', 1, 3000), v('I', 'current', 'A', 0.05, 13), v('V', 'potential difference', 'V', 1, 240)] },
  { id: 'power-i2r', topic: 'Electricity', name: 'Power (current, resistance)', show: 'P = I²R', eq: 'P = I^2*R', vars: [v('P', 'power', 'W', 0.1, 3000), v('I', 'current', 'A', 0.05, 10), v('R', 'resistance', 'Ω', 1, 500)] },
  { id: 'energy-vit', topic: 'Electricity', name: 'Electrical energy', show: 'E = VIt', eq: 'E = V*I*t', vars: [v('E', 'energy transferred', 'J', 10, 1e6), v('V', 'potential difference', 'V', 1, 240), v('I', 'current', 'A', 0.05, 10), v('t', 'time', 's', 1, 600)] },
  { id: 'resistivity', topic: 'Electricity', name: 'Resistivity', show: 'R = ρL/A', eq: 'R = rho*L/A', vars: [v('R', 'resistance', 'Ω', 0.01, 100), v('rho', 'resistivity', 'Ω·m', 1.7e-8, 1e-6), v('L', 'length', 'm', 0.1, 5), v('A', 'cross-sectional area', 'm²', 1e-7, 1e-5)] },
  { id: 'cap', topic: 'Electricity', name: 'Capacitance', show: 'Q = CV', eq: 'Q = C*V', vars: [v('Q', 'charge', 'C', 1e-6, 0.05), v('C', 'capacitance', 'F', 1e-6, 1e-3), v('V', 'potential difference', 'V', 1, 50)] },
  { id: 'shc', topic: 'Thermal', name: 'Specific heat capacity', show: 'Q = mcΔθ', eq: 'Q = m*c*dT', vars: [v('Q', 'energy supplied', 'J', 100, 5e5), v('m', 'mass', 'kg', 0.1, 5), v('c', 'specific heat capacity', 'J/(kg·K)', 380, 4200), v('dT', 'temperature change', 'K', 1, 80)] },
  { id: 'latent', topic: 'Thermal', name: 'Specific latent heat', show: 'Q = mL', eq: 'Q = m*L', vars: [v('Q', 'energy', 'J', 1000, 2e6), v('m', 'mass', 'kg', 0.01, 2), v('L', 'specific latent heat', 'J/kg', 3.3e5, 2.26e6)] },
  { id: 'gas', topic: 'Thermal', name: 'Ideal gas', show: 'pV = nRT', eq: 'p*V = n*8.314*T', vars: [v('p', 'pressure', 'Pa', 5e4, 3e5), v('V', 'volume', 'm³', 0.001, 0.1), v('n', 'amount of gas', 'mol', 0.1, 5), v('T', 'temperature', 'K', 250, 400)] },
  { id: 'gravity', topic: 'Fields', name: 'Newton’s law of gravitation', show: 'F = GMm/r²', eq: 'F = 6.6743e-11*M*m/r^2', vars: [v('F', 'force', 'N', 1e-3, 1e3), v('M', 'mass 1', 'kg', 1e10, 1e22), v('m', 'mass 2', 'kg', 1, 1000), v('r', 'distance between centres', 'm', 1e5, 1e8)] },
  { id: 'coulomb', topic: 'Fields', name: 'Coulomb’s law', show: 'F = kQ₁Q₂/r²', eq: 'F = 8.9875e9*Q1*Q2/r^2', vars: [v('F', 'force', 'N', 1e-3, 100), v('Q1', 'charge 1', 'C', 1e-9, 1e-6), v('Q2', 'charge 2', 'C', 1e-9, 1e-6), v('r', 'separation', 'm', 0.01, 1)] },
  { id: 'efield', topic: 'Fields', name: 'Electric field strength', show: 'E = F/Q', eq: 'E = F/Q', vars: [v('E', 'field strength', 'N/C', 100, 1e6), v('F', 'force', 'N', 1e-6, 1), v('Q', 'charge', 'C', 1e-9, 1e-6)] },
  { id: 'halflife', topic: 'Nuclear', name: 'Radioactive decay', show: 'N = N₀ (½)^(t / t½)', eq: 'N = N0*0.5^(t/th)', vars: [v('N', 'nuclei left', '(count)', 10, 1e6), v('N0', 'nuclei at the start', '(count)', 1e3, 1e7), v('t', 'time', 's', 10, 1000), v('th', 'half-life', 's', 5, 500)] },
  { id: 'emc2', topic: 'Nuclear', name: 'Mass–energy', show: 'E = mc²', eq: 'E = m*299792458^2', vars: [v('E', 'energy', 'J', 1e-13, 1e-10), v('m', 'mass', 'kg', 1e-30, 1e-27)] },
];

/**
 * Solve a formula for one quantity, given the others: finds where (left − right) = 0 using the
 * secant method from several starting points. Prefers a positive answer. Throws a plain message.
 */
export function solveFormula(f: PFormula, unknown: string, known: Record<string, number>): number {
  const [lhs, rhs] = f.eq.split('=');
  const g = (x: number) => {
    const vars = { ...known, [unknown]: x };
    return evaluate(lhs, { angle: 'deg', vars }) - evaluate(rhs, { angle: 'deg', vars });
  };
  const safe = (x: number) => {
    try {
      const y = g(x);
      return Number.isFinite(y) ? y : NaN;
    } catch {
      return NaN;
    }
  };
  const answers: number[] = [];
  for (const start of [1, 0.001, 10, 1e3, 1e-7, 1e6, 1e-12, 1e12, 30, -1]) {
    let x0 = start;
    let x1 = start * 1.1 + 1e-12;
    let y0 = safe(x0);
    let y1 = safe(x1);
    for (let k = 0; k < 200 && Number.isFinite(y0) && Number.isFinite(y1); k++) {
      if (y1 === y0) break;
      const x2 = x1 - (y1 * (x1 - x0)) / (y1 - y0);
      if (!Number.isFinite(x2)) break;
      x0 = x1;
      y0 = y1;
      x1 = x2;
      y1 = safe(x1);
      if (Math.abs(x1 - x0) <= 1e-13 * Math.abs(x1)) break;
    }
    // Accept only if both sides really come out equal (relative to their size).
    if (Number.isFinite(x1) && balanced(lhs, rhs, { ...known, [unknown]: x1 })) answers.push(x1);
  }
  // Fallback for curvy formulas (e.g. exponentials): scan positive values on a log scale for a sign change, then halve.
  if (!answers.length) {
    let px = 1e-15;
    let py = safe(px);
    for (let k = 1; k <= 30 * 6 && !answers.length; k++) {
      const x = 1e-15 * 10 ** (k / 6);
      const y = safe(x);
      if (Number.isFinite(py) && Number.isFinite(y) && py * y <= 0) {
        let lo = px;
        let hi = x;
        for (let j = 0; j < 200; j++) {
          const mid = (lo + hi) / 2;
          if (Math.sign(safe(mid)) === Math.sign(safe(lo))) lo = mid;
          else hi = mid;
        }
        if (balanced(lhs, rhs, { ...known, [unknown]: (lo + hi) / 2 })) answers.push((lo + hi) / 2);
      }
      px = x;
      py = y;
    }
  }
  if (!answers.length) throw new Error('No answer with these numbers — check the values and units');
  const positive = answers.filter((a) => a > 0);
  return (positive.length ? positive : answers).sort((a, b) => a - b)[0];
}
/** Do both sides of the equation agree (to 1 part in 10⁸)? */
function balanced(lhs: string, rhs: string, vars: Record<string, number>): boolean {
  try {
    const l = evaluate(lhs, { angle: 'deg', vars });
    const r = evaluate(rhs, { angle: 'deg', vars });
    return Math.abs(l - r) <= 1e-8 * Math.max(Math.abs(l), Math.abs(r), 1e-300);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- practice
export interface Problem {
  formula: PFormula;
  unknown: PVar;
  given: { v: PVar; value: number }[];
  answer: number;
}

/** A round number in a range with 2–3 significant figures. */
function niceValue(min: number, max: number, rand: () => number): number {
  if (min === max) return min;
  const x = min + (max - min) * rand();
  const mag = 10 ** (Math.floor(Math.log10(Math.abs(x))) - 1);
  return Math.round(x / mag) * mag;
}

/** A practice problem: random values for all but one quantity; the answer worked out. Throws if none fit. */
export function makeProblem(rand: () => number = Math.random, topic?: string): Problem {
  const pool = FORMULAS.filter((f) => !topic || f.topic === topic);
  for (let tries = 0; tries < 50; tries++) {
    const formula = pool[Math.floor(rand() * pool.length)];
    const choices = formula.vars.filter((x) => x[3] !== x[4]); // don't ask for constants like g
    const unknown = choices[Math.floor(rand() * choices.length)];
    const given = formula.vars.filter((x) => x !== unknown).map((x) => ({ v: x, value: niceValue(x[3], x[4], rand) }));
    try {
      const answer = solveFormula(formula, unknown[0], Object.fromEntries(given.map((g) => [g.v[0], g.value])));
      if (answer > 0 && Number.isFinite(answer)) return { formula, unknown, given, answer };
    } catch {
      /* try another */
    }
  }
  throw new Error('Could not make a problem');
}

/** Is an answer right (within `tolerance`, default 2%)? */
export const checkAnswer = (given: number, answer: number, tolerance = 0.02) => Number.isFinite(given) && Math.abs(given - answer) <= tolerance * Math.abs(answer);

/** "m = 2.5 kg, a = 3.1 m/s²" */
export const describeGiven = (p: Problem) => p.given.map((g) => `${g.v[0]} = ${formatNumber(g.value)} ${g.v[2]}`.trim()).join(', ');

// ---------------------------------------------------------------- uncertainty
export type UOp = 'add' | 'sub' | 'mul' | 'div' | 'pow';

/**
 * Combine measurements with uncertainties (the school/first-year rules):
 * + and − add absolute uncertainties; × and ÷ add percentage uncertainties; Aⁿ multiplies A's % by |n|.
 */
export function combineUncertainty(op: UOp, a: number, da: number, b: number, db: number): { value: number; abs: number; pct: number } {
  const pa = a ? Math.abs(da / a) : 0;
  const pb = b ? Math.abs(db / b) : 0;
  let value: number;
  let abs: number;
  switch (op) {
    case 'add':
      value = a + b;
      abs = Math.abs(da) + Math.abs(db);
      break;
    case 'sub':
      value = a - b;
      abs = Math.abs(da) + Math.abs(db);
      break;
    case 'mul':
      value = a * b;
      abs = Math.abs(value) * (pa + pb);
      break;
    case 'div':
      if (b === 0) throw new Error('Can’t divide by 0');
      value = a / b;
      abs = Math.abs(value) * (pa + pb);
      break;
    case 'pow':
      value = a ** b;
      abs = Math.abs(value) * pa * Math.abs(b);
      break;
  }
  return { value, abs, pct: value ? (abs / Math.abs(value)) * 100 : 0 };
}
