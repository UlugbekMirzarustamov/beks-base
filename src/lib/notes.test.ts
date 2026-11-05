import { describe, expect, it } from 'vitest';
import { backlinks, findNote, linksIn, splitLinks } from './notes';
import { planRevision, SESSION_MINUTES } from './revision';
import { emptyData } from './seed';
import type { LectureNote } from './types';

const note = (title: string, body = ''): LectureNote => ({ id: title, subjectId: null, title, date: '2026-11-05', body, updated: '' });

describe('lecture note links', () => {
  it('finds [[links]] once each, ignoring case', () => {
    expect(linksIn('See [[Momentum]] and [[Impulse]], also [[momentum]].')).toEqual(['Momentum', 'Impulse']);
    expect(linksIn('no links [here]')).toEqual([]);
  });

  it('splits a note into text and links', () => {
    expect(splitLinks('F = ma, see [[Newton]] now')).toEqual([{ text: 'F = ma, see ' }, { link: 'Newton' }, { text: ' now' }]);
  });

  it('finds notes by title and the notes linking back', () => {
    const a = note('Momentum', 'p = mv');
    const b = note('Impulse', 'Change in [[momentum]]');
    const c = note('Collisions', '[[Momentum]] is conserved');
    expect(findNote([a, b], 'MOMENTUM')).toBe(a);
    expect(backlinks([a, b, c], a).map((n) => n.title)).toEqual(['Impulse', 'Collisions']);
    expect(backlinks([a, b, c], b)).toEqual([]);
  });
});

describe('revision planner', () => {
  const TODAY = '2026-11-05';
  function data() {
    const d = emptyData(TODAY);
    d.subjects = [{ id: 'phy', name: 'Physics' }];
    d.topics = [
      { id: 'weak', subjectId: 'phy', name: 'Waves', confidence: 'red' },
      { id: 'ok', subjectId: 'phy', name: 'Forces', confidence: 'green' },
    ];
    d.tests = [
      { id: 'exam', name: 'Physics exam', date: '2026-11-10', subjectId: 'phy' },
      { id: 'other', name: 'Essay test', date: '2026-11-08', subjectId: null },
    ];
    return d;
  }

  it('fills each day up to the last exam with back-to-back sessions', () => {
    const plan = planRevision(data(), TODAY, { minutesPerDay: 60, startTime: '18:00' });
    expect(new Set(plan.map((s) => s.date))).toEqual(new Set(['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09']));
    expect(plan.filter((s) => s.date === '2026-11-06').map((s) => [s.start, s.end])).toEqual([
      ['18:00', '18:30'],
      ['18:30', '19:00'],
    ]);
    expect(SESSION_MINUTES).toBe(30);
  });

  it('gives weak topics more time, and stops revising for an exam once it has happened', () => {
    const plan = planRevision(data(), TODAY, { minutesPerDay: 90, startTime: '17:00' });
    const count = (t: string) => plan.filter((s) => s.title.startsWith(t)).length;
    expect(count('Waves')).toBeGreaterThan(count('Forces'));
    expect(plan.some((s) => s.title === 'Revise for Essay test' && s.date >= '2026-11-08')).toBe(false);
    expect(plan.some((s) => s.title === 'Revise for Essay test')).toBe(true);
  });

  it('plans nothing without exams in the next four weeks', () => {
    const d = data();
    d.tests = [{ id: 'far', name: 'Final', date: '2027-05-01', subjectId: 'phy' }];
    expect(planRevision(d, TODAY, { minutesPerDay: 60, startTime: '18:00' })).toEqual([]);
  });
});
