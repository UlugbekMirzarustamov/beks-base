import { describe, expect, it } from 'vitest';
import { percent, pickQuestions, predictGrade, questionPool, suggestedMinutes } from './mock';
import { emptyData } from './seed';
import type { MockResult } from './types';

const TODAY = '2026-11-05';
function data() {
  const d = emptyData(TODAY);
  d.subjects = [{ id: 'phy', name: 'Physics' }, { id: 'ma', name: 'Maths' }];
  d.topics = [
    { id: 'waves', subjectId: 'phy', name: 'Waves', confidence: 'red' },
    { id: 'forces', subjectId: 'phy', name: 'Forces', confidence: 'green' },
  ];
  d.examQuestions = [
    { id: 'q1', subjectId: 'phy', topicId: 'waves', question: 'Define wavelength', answer: 'Distance between peaks', marks: 2 },
    { id: 'q2', subjectId: 'phy', topicId: 'forces', question: 'State N2', answer: 'F = ma', marks: 1 },
    { id: 'q3', subjectId: 'ma', topicId: null, question: 'd/dx x²', answer: '2x', marks: 1 },
  ];
  d.mistakes = [{ id: 'm1', question: 'Unit of power?', wrongAnswer: 'J', correctAnswer: 'W', why: '', topicId: 'forces', reviewAgain: true, date: TODAY }];
  d.flashcards = [{ id: 'f1', front: "Newton's 2nd law", back: 'F = ma', box: 1 }];
  return d;
}
const mock = (id: string, date: string, score: number, max = 10): MockResult => ({ id, subjectId: 'phy', testId: null, date, minutes: 15, used: 600, score, max, leftApp: 0, items: [] });

describe('mock exam questions', () => {
  it('builds the pool for a module from the bank, mistakes and (optionally) formula cards', () => {
    const d = data();
    expect(questionPool(d, 'phy', false).map((q) => q.key)).toEqual(['bank-q1', 'bank-q2', 'mistake-m1']);
    expect(questionPool(d, 'phy', true)).toHaveLength(4);
    expect(questionPool(d, null, false)).toHaveLength(4);
    expect(questionPool(d, 'phy', false)[0].weight).toBeGreaterThan(questionPool(d, 'phy', false)[1].weight); // red > green
  });

  it('picks different questions, weak ones more often', () => {
    const pool = questionPool(data(), 'phy', true);
    const picked = pickQuestions(pool, 3, () => 0.01);
    expect(new Set(picked.map((q) => q.key)).size).toBe(3);
    expect(pickQuestions(pool, 10)).toHaveLength(4);
    let waves = 0;
    let rng = 1;
    const rand = () => ((rng = (rng * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 300; i++) if (pickQuestions(pool, 1, rand)[0].key === 'bank-q1') waves++;
    expect(waves).toBeGreaterThan(300 / 4); // more than an even share
  });

  it('suggests about 1.5 minutes a mark', () => {
    expect(suggestedMinutes([{ marks: 2 }, { marks: 1 }])).toBe(5);
    expect(suggestedMinutes(Array.from({ length: 10 }, () => ({ marks: 4 })))).toBe(60);
  });
});

describe('predicted grade', () => {
  it('weights recent mocks most, then topics, then coursework', () => {
    const d = data();
    expect(predictGrade(emptyData(TODAY), 'phy')).toBeNull();
    const topicsOnly = predictGrade(d, 'phy')!;
    expect(topicsOnly).toMatchObject({ pct: 60, sure: 'low' });
    d.mocks = [mock('a', '2026-10-01', 5), mock('b', '2026-10-15', 6), mock('c', '2026-11-01', 8)];
    const p = predictGrade(d, 'phy')!;
    // Mocks: (80×3 + 60×2 + 50×1)/6 = 68.3 → 68; topics 60 → (68×60 + 60×25)/85 = 65.6
    expect(p.parts.map((x) => x.value)).toEqual([68, 60]);
    expect(p).toMatchObject({ pct: 66, band: '2:1', sure: 'high' });
    expect(percent(mock('x', TODAY, 7, 8))).toBe(87.5);
  });
});
