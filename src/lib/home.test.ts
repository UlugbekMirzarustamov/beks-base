import { describe, expect, it } from 'vitest';
import { cardsIn, discoverTips, HOME_CARDS, placeOf } from './home';
import { emptyData } from './seed';

const none = { pinned: [], hidden: [], dismissed: [] };

describe('calm Home', () => {
  it('keeps the front calm: a few cards now, the rest in "More for today"', () => {
    const now = cardsIn('now', none, 9);
    expect(now[0]).toBe('today');
    expect(now).toContain('quest');
    expect(now).not.toContain('weather');
    expect(cardsIn('more', none, 9)).toContain('weather');
    expect(new Set(HOME_CARDS.map((c) => c.id)).size).toBe(HOME_CARDS.length);
  });

  it('moves the morning promise back after noon, and obeys pins and hides', () => {
    expect(placeOf('promise', none, 9)).toBe('now');
    expect(placeOf('promise', none, 15)).toBe('more');
    expect(placeOf('promise', none, 1)).toBe('more');
    const home = { pinned: ['weather', 'level'], hidden: ['ghost', 'quest'], dismissed: [] };
    expect(cardsIn('now', home, 9).slice(0, 2)).toEqual(['weather', 'level']);
    expect(placeOf('ghost', home, 9)).toBe('hidden');
    expect(cardsIn('now', home, 9)).not.toContain('quest');
    expect(cardsIn('more', home, 9)).not.toContain('weather');
  });

  it('shows up to three unused features on the Discover shelf, never dismissed or used ones', () => {
    const d = emptyData('2026-11-06');
    expect(discoverTips(d)).toHaveLength(3);
    d.settings.home.dismissed = ['goals'];
    d.lectureNotes = [{ id: 'n', subjectId: null, title: 'x', date: '2026-11-06', body: '', updated: '' }];
    const ids = discoverTips(d, 10).map((t) => t.id);
    expect(ids).not.toContain('goals');
    expect(ids).not.toContain('notes');
    expect(ids).toContain('mock');
  });
});
