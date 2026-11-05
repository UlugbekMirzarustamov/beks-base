import { describe, expect, it } from 'vitest';
import { adminReminders, adminStatus, nextStep, progress, sortAdmin, TEMPLATES } from './admin';
import type { AdminItem } from './types';

const TODAY = '2026-11-05';
const item = (patch: Partial<AdminItem>): AdminItem => ({ id: patch.title ?? 'x', title: 'Thing', area: 'other', date: '', dateLabel: 'Deadline', remind: 30, steps: [], notes: '', finished: false, ...patch });
const step = (text: string, done = false, due = '') => ({ id: text, text, done, due });

describe('student admin', () => {
  it('counts steps and finds the next one (dated steps first)', () => {
    const a = item({ steps: [step('a', true), step('b'), step('c', false, '2026-11-20'), step('d', false, '2026-11-10')] });
    expect(progress(a)).toEqual({ done: 1, total: 4 });
    expect(nextStep(a)?.text).toBe('d');
    expect(nextStep(item({ steps: [step('only')] }))?.text).toBe('only');
    expect(nextStep(item({ steps: [step('x', true)] }))).toBeUndefined();
  });

  it('knows overdue, soon, later, no date and finished', () => {
    expect(adminStatus(item({ date: '2026-11-04' }), TODAY)).toBe('overdue');
    expect(adminStatus(item({ date: '2026-12-05' }), TODAY)).toBe('soon');
    expect(adminStatus(item({ date: '2026-12-06' }), TODAY)).toBe('later');
    expect(adminStatus(item({}), TODAY)).toBe('nodate');
    expect(adminStatus(item({ date: '2026-11-04', finished: true }), TODAY)).toBe('finished');
  });

  it('reminds on Home inside the window, most urgent first; never for finished items', () => {
    const list = [
      item({ title: 'Visa', date: '2027-01-20', remind: 90 }),
      item({ title: 'GP', date: '2026-11-03' }),
      item({ title: 'Later', date: '2027-06-01' }),
      item({ title: 'Done', date: '2026-11-06', finished: true }),
    ];
    expect(adminReminders(list, TODAY).map((r) => [r.item.title, r.daysLeft])).toEqual([
      ['GP', -2],
      ['Visa', 76],
    ]);
    expect(sortAdmin(list, TODAY).map((i) => i.title)).toEqual(['GP', 'Visa', 'Later', 'Done']);
  });

  it('has generic templates with steps', () => {
    expect(TEMPLATES.length).toBeGreaterThan(3);
    for (const t of TEMPLATES) expect(t.steps.length).toBeGreaterThan(0);
  });
});
