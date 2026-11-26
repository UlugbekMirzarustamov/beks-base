import { describe, expect, it } from 'vitest';
import { cardsIn, HOME_CARDS, placeOf } from './home';

const none = { pinned: [], hidden: [], dismissed: [] };

describe('calm Home', () => {
  it('keeps the front calm: a few cards now, the rest in "More for today"', () => {
    const now = cardsIn('now', none, 9);
    expect(now[0]).toBe('today');
    expect(now).not.toContain('weather');
    expect(cardsIn('more', none, 9)).toContain('weather');
    expect(new Set(HOME_CARDS.map((c) => c.id)).size).toBe(HOME_CARDS.length);
  });

  it('obeys pins and hides, and ignores cards that no longer exist', () => {
    const home = { pinned: ['weather', 'level', 'money'], hidden: ['ghost', 'week'], dismissed: [] };
    expect(cardsIn('now', home, 9).slice(0, 2)).toEqual(['weather', 'money']);
    expect(placeOf('week', home, 9)).toBe('hidden');
    expect(cardsIn('now', home, 9)).not.toContain('week');
    expect(cardsIn('more', home, 9)).not.toContain('weather');
  });

  it('has no game cards any more', () => {
    for (const gone of ['quest', 'promise', 'campfire', 'ghost', 'simba', 'savings', 'kitchen', 'mood', 'clocks', 'level']) expect(HOME_CARDS.map((c) => c.id as string)).not.toContain(gone);
  });
});
