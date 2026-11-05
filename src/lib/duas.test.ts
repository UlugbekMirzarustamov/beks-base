import { describe, expect, it } from 'vitest';
import { DUA_TOPICS, DUAS, STARTER_BOOKS } from './duas';
import { buildIndex, searchIndex } from './search';
import { emptyData } from './seed';

describe('dua collection', () => {
  it('has unique ids, known topics, Arabic text and a source for every dua', () => {
    expect(new Set(DUAS.map((d) => d.id)).size).toBe(DUAS.length);
    for (const d of DUAS) {
      expect(Object.keys(DUA_TOPICS)).toContain(d.topic);
      expect(d.arabic).toMatch(/[؀-ۿ]/);
      expect(d.source.length).toBeGreaterThan(2);
    }
    expect(STARTER_BOOKS.length).toBeGreaterThan(3);
  });

  it('keeps the good deeds journal out of search; learning items are findable', () => {
    const d = emptyData('2026-11-05');
    d.deeds = [{ id: 'x', date: '2026-11-05', text: 'Helped a neighbour carry shopping' }];
    d.learning = [{ id: 'l', title: 'Forty Hadith', by: 'Imam an-Nawawi', kind: 'book', status: 'reading', link: '', notes: '' }];
    const index = buildIndex(d);
    expect(searchIndex(index, 'neighbour')).toEqual([]);
    expect(searchIndex(index, 'nawawi')[0].kind).toBe('Learning');
  });
});
