import { describe, expect, it } from 'vitest';
import { buildIndex, fold, searchCommands, searchIndex } from './search';
import { emptyData } from './seed';

const TODAY = '2026-11-05';

function sample() {
  const d = emptyData(TODAY);
  d.tasks.push({ id: 't1', title: 'Physics worksheet', due: '2026-11-07', done: false });
  d.assignments.push({ id: 'a1', title: 'Lab report', subjectId: 'physics', due: '2026-11-12', dueTime: '', priority: 'high', status: 'todo', notes: 'pendulum experiment' });
  d.expenses.push({ id: 'e1', amount: 5.92, paidGbp: 4.5, categoryId: 'food', note: 'Café latte', date: '2026-11-04' });
  d.notes.push({ id: 'n1', title: 'Ideas', body: 'Build a pixel garden for habits', updated: '2026-11-03T10:00:00.000Z' });
  d.letters.push({ id: 'l1', title: 'For graduation day', body: 'secret words inside', written: TODAY, openOn: '2027-07-01', opened: false });
  d.nightLogs['2026-11-04'] = { line: 'Good day in the library', good: ['met a friend', '', ''], tomorrow: '' };
  return d;
}

describe('global search', () => {
  it('finds records across the app, ignoring case and accents', () => {
    const index = buildIndex(sample());
    expect(searchIndex(index, 'LAB').map((e) => e.kind)).toEqual(['Assignment']);
    expect(searchIndex(index, 'cafe')[0]).toMatchObject({ kind: 'Purchase', href: '#/money/spending' });
    expect(fold('  Café   LATTE ')).toBe('cafe latte');
  });

  it('searches inside hidden text: notes, amounts, nightly good things', () => {
    const index = buildIndex(sample());
    expect(searchIndex(index, 'pendulum')[0].title).toBe('Lab report');
    expect(searchIndex(index, 'pixel garden')[0].kind).toBe('Journal');
    expect(searchIndex(index, '5.92')[0].kind).toBe('Purchase');
    expect(searchIndex(index, '£4.50')[0].kind).toBe('Purchase');
    expect(searchIndex(index, 'friend')[0].kind).toBe('Night log');
  });

  it('needs every word, and puts title matches first', () => {
    const index = buildIndex(sample());
    expect(searchIndex(index, 'physics lab').map((e) => e.title)).toEqual(['Lab report']); // "Physics" is its module
    const physics = searchIndex(index, 'physics').map((e) => e.title);
    expect(physics[0]).toBe('Physics worksheet');
    expect(physics).toContain('Lab report');
    expect(searchIndex(index, '')).toEqual([]);
  });

  it('never searches inside sealed letters', () => {
    const index = buildIndex(sample());
    expect(searchIndex(index, 'graduation')[0].kind).toBe('Letter');
    expect(searchIndex(index, 'secret')).toEqual([]);
  });

  it('finds commands by name or keyword', () => {
    expect(searchCommands('spent')[0].action).toBe('add-purchase');
    expect(searchCommands('grade calc').map((c) => c.href)).toEqual(['#/study/assignments']);
    expect(searchCommands('dark')[0].action).toBe('toggle-theme');
    expect(searchCommands('').length).toBeGreaterThan(0);
  });
});
