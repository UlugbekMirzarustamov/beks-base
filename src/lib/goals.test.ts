import { describe, expect, it } from 'vitest';
import { carryOverCandidates, levelProgress, periodOf, previousPeriod, supportChain } from './goals';
import { emptyData } from './seed';
import type { PlanGoal } from './types';

const TODAY = '2026-11-05';
const g = (id: string, level: PlanGoal['level'], period: string, patch: Partial<PlanGoal> = {}): PlanGoal => ({ id, level, period, title: id, done: false, parentId: null, ...patch });

describe('goal periods', () => {
  it('knows this year, month and week, and the one before', () => {
    expect(periodOf('year', TODAY)).toBe('2026');
    expect(periodOf('month', TODAY)).toBe('2026-11');
    expect(periodOf('week', TODAY)).toBe('2026-11-02');
    expect(previousPeriod('month', '2026-01')).toBe('2025-12');
    expect(previousPeriod('week', '2026-11-02')).toBe('2026-10-26');
    expect(previousPeriod('year', '2026')).toBe('2025');
  });
});

describe('goals', () => {
  it('counts progress per level and period', () => {
    const goals = [g('a', 'week', '2026-11-02', { done: true }), g('b', 'week', '2026-11-02'), g('c', 'week', '2026-10-26')];
    expect(levelProgress(goals, 'week', '2026-11-02')).toEqual({ done: 1, total: 2 });
  });

  it('offers to carry over last period’s unfinished goals, once', () => {
    const goals = [g('Read ch 3', 'week', '2026-10-26'), g('Gym', 'week', '2026-10-26', { done: true }), g('Essay', 'week', '2026-10-26'), g('essay', 'week', '2026-11-02')];
    expect(carryOverCandidates(goals, 'week', TODAY).map((x) => x.title)).toEqual(['Read ch 3']);
  });

  it('shows which bigger goals a goal supports, up to the vision board', () => {
    const d = emptyData(TODAY);
    d.vision = [{ id: 'v', title: 'Become an engineer', why: '', by: '', photo: '' }];
    d.planGoals = [g('First in Physics', 'year', '2026', { parentId: 'v' }), g('Finish mechanics', 'month', '2026-11', { parentId: 'First in Physics' }), g('SUVAT sheet', 'week', '2026-11-02', { parentId: 'Finish mechanics' })];
    expect(supportChain(d, d.planGoals[2])).toEqual(['Finish mechanics', 'First in Physics', 'Become an engineer']);
  });
});
