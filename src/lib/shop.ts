/**
 * The cabin shop: decorations you buy with coins earned from XP.
 * Every item has a "slot" — its spot in the room. One item shows per slot;
 * buying puts it on display, and you can swap or put things away any time.
 */
import type { AppData } from './types';

export type ShopSlot = 'wallA' | 'wallB' | 'table' | 'floor' | 'window' | 'shelf' | 'toy' | 'ceiling';

export interface ShopItem {
  id: string;
  name: string;
  price: number;
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
  { id: 'yarn', name: 'Yarn ball for Simba', price: 15, slot: 'toy', description: 'Simba’s favourite thing in the world (after you).' },
  { id: 'plov', name: 'Lagan of plov', price: 25, slot: 'table', description: 'A big blue plate of plov with carrots. Smells like home.' },
  { id: 'suzani', name: 'Mini suzani', price: 30, slot: 'wallA', description: 'Hand-stitched red and gold flowers for the wall.' },
  { id: 'globe', name: 'Old globe', price: 35, slot: 'shelf', description: 'Spin it and find Tashkent.' },
  { id: 'samarkand', name: 'Registan painting', price: 40, slot: 'wallA', description: 'The blue domes of Samarkand, in a wooden frame.' },
  { id: 'bukhara', name: 'Bukhara painting', price: 40, slot: 'wallB', description: 'The Kalyan minaret at sunset.' },
  { id: 'curtains', name: 'Atlas silk curtains', price: 45, slot: 'window', description: 'Bright ikat curtains in Margilan atlas silk colours.' },
  { id: 'gilam', name: 'Gilam rug', price: 50, slot: 'floor', description: 'A deep red rug with blue diamonds.' },
  { id: 'fonar', name: 'Hanging lanterns', price: 55, slot: 'ceiling', description: 'Two coloured-glass lanterns that glow at night.' },
  { id: 'samovar', name: 'Samovar', price: 60, slot: 'table', description: 'A shiny brass samovar with a choynak on top.' },
];

/** 1 coin for every 2 XP you have, minus what you've spent. */
export const coinsEarned = (d: AppData) => Math.floor(Math.max(0, d.xp) / 2);
export const coins = (d: AppData) => Math.max(0, coinsEarned(d) - d.shop.spent);

/** The item shown in each slot right now. */
export function placedItems(d: AppData): Partial<Record<ShopSlot, string>> {
  return d.shop.placed as Partial<Record<ShopSlot, string>>;
}
