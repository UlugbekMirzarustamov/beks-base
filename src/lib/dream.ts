/**
 * The dream room: things you're saving for with the dream room jar, filled in order. A piece is
 * "ready" once the jar covers it (and everything before it); otherwise we say how many days to go.
 * Plain functions, so they're easy to test.
 */
import type { DreamItem, DreamKind } from './types';

export interface DreamProgress {
  item: DreamItem;
  state: 'bought' | 'ready' | 'saving';
  /** Days until the jar covers it (saving only; null if the jar isn't growing). */
  daysToGo: number | null;
}

/** Each item's state, in your order. Bought items are already paid for (they left the jar). */
export function dreamProgress(items: DreamItem[], jar: number, perDay: number): DreamProgress[] {
  let need = 0;
  return items.map((item) => {
    if (item.bought) return { item, state: 'bought', daysToGo: null };
    need += item.price;
    if (need <= jar + 1e-9) return { item, state: 'ready', daysToGo: null };
    return { item, state: 'saving', daysToGo: perDay > 0 ? Math.ceil((need - jar) / perDay) : null };
  });
}

/** Ideas to start with (prices are only a guess — change them to the real ones). */
export const DREAM_IDEAS: { name: string; kind: DreamKind; price: number }[] = [
  { name: 'Desk', kind: 'desk', price: 120 },
  { name: 'Comfy desk chair', kind: 'chair', price: 90 },
  { name: 'Desk lamp', kind: 'lamp', price: 25 },
  { name: 'Monitor', kind: 'monitor', price: 150 },
  { name: 'Bookshelf', kind: 'shelf', price: 60 },
  { name: 'Cosy rug', kind: 'rug', price: 50 },
  { name: 'Plant', kind: 'plant', price: 15 },
  { name: 'Bed frame', kind: 'bed', price: 200 },
  { name: 'Wardrobe', kind: 'wardrobe', price: 150 },
  { name: 'Poster / art', kind: 'poster', price: 20 },
  { name: 'Speaker', kind: 'speaker', price: 40 },
];
