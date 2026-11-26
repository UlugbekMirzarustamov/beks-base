import { describe, expect, it } from 'vitest';
import { archiveYears, buildIndex, fold, groupByMonth, searchArchive, searchCommands, searchIndex } from './search';
import { emptyData } from './seed';

const TODAY = '2026-11-05';

function sample() {
  const d = emptyData(TODAY);
  d.tasks.push({ id: 't1', title: 'Physics worksheet', due: '2026-11-07', done: false });
  d.tests.push({ id: 'x1', name: 'Lab exam', subjectId: 'physics', date: '2026-11-12', time: '', room: 'Hicks LT1' });
  d.expenses.push({ id: 'e1', amount: 5.92, paidGbp: 4.5, categoryId: 'food', note: 'Café latte', date: '2026-11-04' });
  d.nightLogs['2026-11-04'] = { line: 'Good day in the library', good: ['met a friend', '', ''], tomorrow: '' };
  // Removed features: kept in the data, but no longer searchable.
  d.notes.push({ id: 'n1', title: 'Ideas', body: 'Build a pixel garden for habits', updated: '2026-11-03T10:00:00.000Z' });
  d.letters.push({ id: 'l1', title: 'For graduation day', body: 'secret words inside', written: TODAY, openOn: '2027-07-01', opened: false });
  return d;
}

describe('global search', () => {
  it('finds records across the app, ignoring case and accents', () => {
    const index = buildIndex(sample());
    expect(searchIndex(index, 'LAB').map((e) => e.kind)).toEqual(['Exam']);
    expect(searchIndex(index, 'cafe')[0]).toMatchObject({ kind: 'Purchase', href: '#/money/spending' });
    expect(fold('  Café   LATTE ')).toBe('cafe latte');
  });

  it('searches inside hidden text: amounts and nightly good things', () => {
    const index = buildIndex(sample());
    expect(searchIndex(index, '5.92')[0].kind).toBe('Purchase');
    expect(searchIndex(index, '£4.50')[0].kind).toBe('Purchase');
    expect(searchIndex(index, 'friend')[0]).toMatchObject({ kind: 'Night log', href: '#/reflect/tonight' });
  });

  it('needs every word, and puts title matches first', () => {
    const index = buildIndex(sample());
    expect(searchIndex(index, 'physics lab').map((e) => e.title)).toEqual(['Lab exam']); // "Physics" is its module
    const physics = searchIndex(index, 'physics').map((e) => e.title);
    expect(physics[0]).toBe('Physics worksheet');
    expect(physics).toContain('Lab exam');
    expect(searchIndex(index, '')).toEqual([]);
  });

  it('leaves removed features out (their data is still saved)', () => {
    const index = buildIndex(sample());
    expect(searchIndex(index, 'pixel garden')).toEqual([]);
    expect(searchIndex(index, 'graduation')).toEqual([]);
  });

  it('finds commands by name or keyword, and none for removed screens', () => {
    expect(searchCommands('spent')[0].action).toBe('add-purchase');
    expect(searchCommands('pomodoro').map((c) => c.href)).toEqual(['#/study/timer']);
    expect(searchCommands('dark')[0].action).toBe('toggle-theme');
    expect(searchCommands('bored')[0].href).toBe('#/quest');
    for (const gone of ['admin', 'formula', 'mock exam', 'recipes', 'pond', 'vision board']) expect(searchCommands(gone)).toEqual([]);
    expect(searchCommands('').length).toBeGreaterThan(0);
  });
});

describe('archive', () => {
  function archiveSample() {
    const d = sample();
    d.reflections['2026-10-26'] = { wentWell: 'Finished the lab', hard: '', learned: 'start early', next: '', updated: '2026-11-01T10:00:00.000Z' };
    d.inbox.push({ id: 'i1', kind: 'idea', text: 'Old idea about a podcast', url: '', remindAt: '', created: '2025-12-01', done: '2025-12-02' });
    return d;
  }

  it('also finds week reviews and finished inbox items', () => {
    const index = buildIndex(archiveSample());
    expect(searchIndex(index, 'start early')[0].kind).toBe('Week review');
    expect(searchIndex(index, 'podcast')[0].kind).toBe('Inbox (done)');
  });

  it('lists everything newest first, filtered by area and dates, grouped by month', () => {
    const index = buildIndex(archiveSample());
    const all = searchArchive(index, { query: '', areas: [] });
    for (let i = 1; i < all.length; i++) expect(all[i - 1].date >= all[i].date || all[i].date === '').toBe(true);
    const reflect = searchArchive(index, { query: '', areas: ['reflect'] });
    expect(new Set(reflect.map((e) => e.kind))).toEqual(new Set(['Night log', 'Week review']));
    const lastYear = searchArchive(index, { query: '', areas: [], from: '2025-01-01', to: '2025-12-31' });
    expect(lastYear.map((e) => e.title)).toEqual(['Old idea about a podcast']);
    expect(searchArchive(index, { query: 'lab', areas: ['study'] }).map((e) => e.kind)).toEqual(['Exam']);
    const months = groupByMonth(searchArchive(index, { query: '', areas: [], from: '2025-01-01' }));
    expect(months.map((m) => m.month)).toEqual(['2026-11', '2026-10', '2025-12']);
    expect(archiveYears(index)).toEqual(['2026', '2025']);
  });
});
