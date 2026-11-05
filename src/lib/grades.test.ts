import { describe, expect, it } from 'vitest';
import { assessmentsFor, band, moduleGrade, openAssignments, type Assessment } from './grades';
import { emptyData } from './seed';
import type { Assignment } from './types';

const TODAY = '2026-11-05';
const a = (weight: number | null, mark: number | null, title = 'x'): Assessment => ({ id: title, title, source: 'assignment', date: TODAY, weight, mark });
const assignment = (over: Partial<Assignment>): Assignment => ({ id: 'a', title: 'Essay', subjectId: 'physics', due: TODAY, dueTime: '', priority: 'medium', status: 'todo', notes: '', ...over });

describe('module grades', () => {
  it('works out the weighted average and what is secured', () => {
    // 30% coursework at 80, 20% quiz at 60, 50% exam to come
    const g = moduleGrade([a(30, 80), a(20, 60), a(50, null)], 70);
    expect(g.average).toBe(72); // (30×80 + 20×60) / 50
    expect(g.secured).toBe(36); // points of the final 100 already earned
    expect(g.remainingWeight).toBe(50);
    expect(g.needed).toBe(68); // (70 − 36) / 0.5
    expect(g.status).toBe('possible');
  });

  it('says when a target is already safe or out of reach', () => {
    expect(moduleGrade([a(60, 90), a(40, null)], 50)).toMatchObject({ status: 'safe', needed: -10 });
    expect(moduleGrade([a(80, 20), a(20, null)], 70)).toMatchObject({ status: 'impossible' });
  });

  it('treats weights that add up to less than 100% as work still to come', () => {
    const g = moduleGrade([a(40, 50)], 60);
    expect(g.remainingWeight).toBe(60);
    expect(g.needed).toBe(66.7); // (60 − 20) / 0.6
  });

  it('scales weights that add up to more than 100%', () => {
    const g = moduleGrade([a(100, 50), a(100, null)], 60);
    expect(g.secured).toBe(25);
    expect(g.remainingWeight).toBe(50);
    expect(g.needed).toBe(70);
  });

  it('handles the edge cases', () => {
    expect(moduleGrade([a(null, 80)]).status).toBe('no-weights');
    expect(moduleGrade([a(50, null), a(50, null)]).status).toBe('no-target');
    expect(moduleGrade([a(50, null), a(50, null)]).average).toBeNull();
    expect(moduleGrade([a(50, 70), a(50, 60)], 60)).toMatchObject({ status: 'done', average: 65, secured: 65 });
  });

  it('gives a rough UK degree band', () => {
    expect([75, 65, 55, 45, 30].map(band)).toEqual(['First', '2:1', '2:2', 'Pass', 'Below pass']);
  });
});

describe('assignments and exams together', () => {
  it('a module counts its assignments AND its exams, each from its own list', () => {
    const d = emptyData(TODAY);
    d.assignments.push(assignment({ id: 'cw', weight: 40, mark: 75 }));
    d.tests.push({ id: 'ex', name: 'Final exam', date: '2027-01-20', subjectId: 'physics', weight: 60 });
    d.tests.push({ id: 'other', name: 'Maths exam', date: '2027-01-21', subjectId: 'maths', weight: 100 });
    const items = assessmentsFor(d, 'physics');
    expect(items.map((i) => `${i.source}:${i.title}`)).toEqual(['assignment:Essay', 'test:Final exam']);
    expect(moduleGrade(items, 60)).toMatchObject({ secured: 30, needed: 50, status: 'possible' });
  });

  it('lists open assignments by due date, then time, then priority', () => {
    const d = emptyData(TODAY);
    d.assignments.push(
      assignment({ id: '1', title: 'Later', due: '2026-11-20' }),
      assignment({ id: '2', title: 'Low', due: '2026-11-10', priority: 'low' }),
      assignment({ id: '3', title: 'High', due: '2026-11-10', priority: 'high' }),
      assignment({ id: '4', title: 'Done', due: '2026-11-08', status: 'submitted' }),
    );
    expect(openAssignments(d).map((x) => x.title)).toEqual(['High', 'Low', 'Later']);
  });
});
