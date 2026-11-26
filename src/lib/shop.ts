/**
 * Cabin decorations. Every item has a "slot": its spot in the room. One item shows per slot;
 * you can display, swap or put things away any time. (They used to cost coins earned from XP;
 * now they are all free.)
 */
import type { AppData } from './types';

export type ShopSlot = 'wallA' | 'wallB' | 'table' | 'floor' | 'window' | 'shelf' | 'toy' | 'ceiling';

export interface ShopItem {
  id: string;
  name: string;
  slot: ShopSlot;
  description: string;
}

export const SLOT_NAMES: Record<ShopSlot, string> = {
  wallA: 'wall above the chest',
  wallB: 'wall above the crafting table',
  table: 'crafting table',
  floor: 'floor by the bookshelf',
  window: 'window',
  shelf: 'top of the bookshelf',
  toy: 'floor (for Simba)',
  ceiling: 'ceiling',
};

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'yarn', name: 'Yarn ball for Simba', slot: 'toy', description: 'Simba’s favourite thing in the world (after you).' },
  { id: 'plov', name: 'Lagan of plov', slot: 'table', description: 'A big blue plate of plov with carrots. Smells like home.' },
  { id: 'suzani', name: 'Mini suzani', slot: 'wallA', description: 'Hand-stitched red and gold flowers for the wall.' },
  { id: 'globe', name: 'Old globe', slot: 'shelf', description: 'Spin it and find Tashkent.' },
  { id: 'samarkand', name: 'Registan painting', slot: 'wallA', description: 'The blue domes of Samarkand, in a wooden frame.' },
  { id: 'bukhara', name: 'Bukhara painting', slot: 'wallB', description: 'The Kalyan minaret at sunset.' },
  { id: 'curtains', name: 'Atlas silk curtains', slot: 'window', description: 'Bright ikat curtains in Margilan atlas silk colours.' },
  { id: 'gilam', name: 'Gilam rug', slot: 'floor', description: 'A deep red rug with blue diamonds.' },
  { id: 'fonar', name: 'Hanging lanterns', slot: 'ceiling', description: 'Two coloured-glass lanterns that glow at night.' },
  { id: 'samovar', name: 'Samovar', slot: 'table', description: 'A shiny brass samovar with a choynak on top.' },
];

/** The item shown in each slot right now. */
export function placedItems(d: AppData): Partial<Record<ShopSlot, string>> {
  return d.shop.placed as Partial<Record<ShopSlot, string>>;
}
