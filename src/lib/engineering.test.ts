import { describe, expect, it } from 'vitest';
import { convertUnit, evaluate, formatNumber, solveForX, solveLinear, solveQuadratic, solveSuvat } from './engineering';

const close = (a: number, b: number, eps = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe('calculator', () => {
  it('follows the order of operations', () => {
    expect(evaluate('2 + 3 * 4')).toBe(14);
    expect(evaluate('(2 + 3) * 4')).toBe(20);
    expect(evaluate('2^3^2')).toBe(512);
    expect(evaluate('-2^2')).toBe(-4);
    expect(evaluate('10 / 4')).toBe(2.5);
    expect(evaluate('5!')).toBe(120);
    expect(evaluate('50%')).toBe(0.5);
    expect(evaluate('6 ÷ 3 × 2 − 1')).toBe(3);
  });

  it('knows functions, constants, implicit multiplication and degrees', () => {
    close(evaluate('sin(30)', { angle: 'deg' }), 0.5);
    close(evaluate('sin 30', { angle: 'deg' }), 0.5);
    close(evaluate('cos(pi)'), -1);
    close(evaluate('2pi'), 2 * Math.PI);
    expect(evaluate('3(4+1)')).toBe(15);
    expect(evaluate('sqrt(16) + log(1000) + ln(e)')).toBe(8);
    close(evaluate('asin(1)', { angle: 'deg' }), 90);
    expect(evaluate('max(2, 7, 3)')).toBe(7);
    expect(evaluate('ans * 2', { vars: { ans: 21 } })).toBe(42);
    expect(evaluate('1.5e3 + 2E-1')).toBe(1500.2);
  });

  it('gives plain messages for mistakes, and never runs code', () => {
    expect(() => evaluate('(2 + 3')).toThrow('bracket');
    expect(() => evaluate('2 +')).toThrow('ends too early');
    expect(() => evaluate('foo(2)')).toThrow('Unknown name');
    expect(() => evaluate('sqrt(-1)')).toThrow('Not a real number');
    expect(() => evaluate('alert(1)')).toThrow('Unknown name');
    expect(() => evaluate('2 $ 3')).toThrow("don't understand");
  });

  it('formats answers tidily', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
    expect(formatNumber(6.02214076e23)).toBe('6.022141e+23');
    expect(formatNumber(1 / 3)).toBe('0.3333333333');
    expect(formatNumber(Infinity)).toBe('∞');
  });
});

describe('units', () => {
  it('converts within a category', () => {
    close(convertUnit('length', 1, 'mi', 'km'), 1.609344);
    close(convertUnit('speed', 36, 'kmh', 'mps'), 10);
    close(convertUnit('pressure', 1, 'atm', 'kPa'), 101.325);
    close(convertUnit('energy', 1, 'kWh', 'MJ'), 3.6);
    close(convertUnit('temperature', 100, 'C', 'F'), 212);
    close(convertUnit('temperature', 0, 'K', 'C'), -273.15);
  });
});

describe('SUVAT', () => {
  it('finds the two missing values from any three', () => {
    const [r] = solveSuvat({ u: 0, a: 9.81, t: 2 });
    close(r.v, 19.62);
    close(r.s, 19.62);
    const [r2] = solveSuvat({ s: 100, u: 0, v: 20 });
    close(r2.a, 2);
    close(r2.t, 10);
  });

  it('gives both answers when there are two, and drops negative times', () => {
    // Thrown up at 20 m/s: when is it 15 m up? (a = −10)
    const r = solveSuvat({ s: 15, u: 20, a: -10 });
    expect(r.map((x) => Math.round(x.t * 1000) / 1000)).toEqual([1, 3]);
    expect(() => solveSuvat({ s: 100, u: 20, a: -10 })).toThrow('No real answer');
    expect(() => solveSuvat({ s: 1, u: 2 })).toThrow('exactly three');
  });
});

describe('equations', () => {
  it('solves quadratics, real and complex', () => {
    expect(solveQuadratic(1, -3, 2)).toEqual({ real: [1, 2] });
    expect(solveQuadratic(1, 2, 5)).toEqual({ re: -1, im: 2 });
    expect(solveQuadratic(0, 2, -4)).toEqual({ real: [2] });
  });

  it('solves simultaneous equations', () => {
    const [x, y] = solveLinear([[2, 1], [1, -1]], [5, 1]);
    close(x, 2);
    close(y, 1);
    const [a, b, c] = solveLinear([[1, 1, 1], [0, 2, 5], [2, 5, -1]], [6, -4, 27]);
    close(a, 5);
    close(b, 3);
    close(c, -2);
    expect(() => solveLinear([[1, 2], [2, 4]], [3, 6])).toThrow('No single answer');
  });

  it('solves f(x) = 0 numerically and skips poles', () => {
    const r = solveForX('x^2 = 2');
    expect(r).toHaveLength(2);
    close(r[1], Math.SQRT2, 1e-7);
    const s = solveForX('sin(x) = 0.5', 0, 180, 'deg');
    expect(s.map((x) => Math.round(x))).toEqual([30, 150]);
    expect(solveForX('1/x', -10, 10)).toEqual([]);
  });
});
