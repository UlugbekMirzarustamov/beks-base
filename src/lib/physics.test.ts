import { describe, expect, it } from 'vitest';
import { checkAnswer, combineUncertainty, describeGiven, FORMULAS, makeProblem, solveFormula, TOPICS } from './physics';

describe('physics formula sheet', () => {
  it('has unique ids, known topics, and every symbol explained', () => {
    expect(new Set(FORMULAS.map((f) => f.id)).size).toBe(FORMULAS.length);
    for (const f of FORMULAS) {
      expect(TOPICS).toContain(f.topic);
      for (const [sym] of f.vars) expect(f.eq).toMatch(new RegExp(`\\b${sym}\\b`));
    }
  });

  it('solves every formula for every quantity (hide one value, get it back)', () => {
    for (const f of FORMULAS) {
      // A consistent set of values: pick all but the first, then work the first out.
      const values: Record<string, number> = {};
      for (const [sym, , , min, max] of f.vars.slice(1)) values[sym] = (min + max) / 2;
      values[f.vars[0][0]] = solveFormula(f, f.vars[0][0], values);
      for (const [sym] of f.vars) {
        const { [sym]: hidden, ...known } = values;
        const got = solveFormula(f, sym, known);
        expect(Math.abs(got - hidden) / Math.abs(hidden), `${f.id}: ${sym}`).toBeLessThan(1e-6);
      }
    }
  });

  it('gives the expected answers for a few classics', () => {
    const ohm = FORMULAS.find((f) => f.id === 'ohm')!;
    expect(solveFormula(ohm, 'R', { V: 12, I: 2 })).toBeCloseTo(6);
    const pend = FORMULAS.find((f) => f.id === 'pendulum')!;
    expect(solveFormula(pend, 'L', { T: 2, g: 9.81 })).toBeCloseTo(0.9940, 3);
    const ke = FORMULAS.find((f) => f.id === 'ke')!;
    expect(solveFormula(ke, 'v', { Ek: 100, m: 2 })).toBeCloseTo(10); // the positive root
    expect(() => solveFormula(ohm, 'R', { V: 12, I: 0 })).toThrow('No answer');
  });
});

describe('practice problems', () => {
  it('makes solvable problems and checks answers within 2%', () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 60; i++) {
      const p = makeProblem(rand);
      expect(p.answer).toBeGreaterThan(0);
      expect(describeGiven(p).length).toBeGreaterThan(3);
      expect(checkAnswer(p.answer * 1.015, p.answer)).toBe(true);
      expect(checkAnswer(p.answer * 1.05, p.answer)).toBe(false);
    }
    expect(makeProblem(rand, 'Electricity').formula.topic).toBe('Electricity');
  });
});

describe('uncertainties', () => {
  it('adds absolute for + and −, percentages for × and ÷, and n× for powers', () => {
    expect(combineUncertainty('add', 10, 0.5, 5, 0.2)).toMatchObject({ value: 15, abs: 0.7 });
    const m = combineUncertainty('mul', 10, 0.1, 5, 0.1); // 1% + 2% = 3% of 50
    expect(m.value).toBe(50);
    expect(m.pct).toBeCloseTo(3);
    expect(m.abs).toBeCloseTo(1.5);
    expect(combineUncertainty('pow', 2, 0.02, 3, 0).pct).toBeCloseTo(3); // 1% × 3
    expect(() => combineUncertainty('div', 1, 0, 0, 0)).toThrow();
  });
});
