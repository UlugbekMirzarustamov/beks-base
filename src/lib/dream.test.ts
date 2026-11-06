import { describe, expect, it } from 'vitest';
import { dreamProgress } from './dream';
import type { DreamItem } from './types';

const item = (id: string, price: number, bought?: string): DreamItem => ({ id, name: id, price, kind: 'other', ...(bought ? { bought } : {}) });

describe('dream room', () => {
  it('fills pieces in order and says how long the next ones take', () => {
    const p = dreamProgress([item('lamp', 25), item('chair', 90), item('desk', 120)], 100, 15);
    expect(p.map((x) => x.state)).toEqual(['ready', 'saving', 'saving']);
    expect(p[1].daysToGo).toBe(1); // needs 115, has 100 → 1 more day of $15
    expect(p[2].daysToGo).toBe(9); // needs 235 → 135 more → 9 days
  });

  it('bought pieces stay bought and no longer need the jar', () => {
    const p = dreamProgress([item('lamp', 25, '2026-11-05'), item('chair', 90)], 90, 15);
    expect(p.map((x) => x.state)).toEqual(['bought', 'ready']);
    expect(dreamProgress([item('desk', 120)], 0, 0)[0].daysToGo).toBeNull();
  });
});
