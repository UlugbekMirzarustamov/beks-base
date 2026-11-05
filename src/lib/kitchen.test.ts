import { describe, expect, it } from 'vitest';
import { checkRecipe, freshness, ingredientMatches, itemKey, newGroceryLines, parseQty, stockUp, suggestRecipes, toUseSoon } from './kitchen';
import type { PantryItem, Recipe } from './types';

const TODAY = '2026-11-05';
const item = (name: string, patch: Partial<PantryItem> = {}): PantryItem => ({ id: name, name, qty: 1, unit: '', expires: '', ...patch });
const recipe = (name: string, ingredients: string[]): Recipe => ({ id: name, name, ingredients, steps: '', minutes: null });

describe('reading quantities', () => {
  it('splits amount, unit and name', () => {
    expect(parseQty('500g pasta')).toEqual({ qty: 500, unit: 'g', name: 'pasta' });
    expect(parseQty('2 eggs')).toEqual({ qty: 2, unit: '', name: 'eggs' });
    expect(parseQty('1.5 l of milk')).toEqual({ qty: 1.5, unit: 'l', name: 'milk' });
    expect(parseQty('bread')).toEqual({ qty: 1, unit: '', name: 'bread' });
  });

  it('matches singular and plural names', () => {
    expect(itemKey('Tomatoes')).toBe('tomato');
    expect(itemKey('berries')).toBe('berry');
    expect(itemKey('Eggs')).toBe('egg');
    expect(itemKey('glass')).toBe('glass');
    expect(ingredientMatches('200g chopped tomatoes', 'tomato')).toBe(true);
    expect(ingredientMatches('2 chicken breasts', 'chicken')).toBe(true);
    expect(ingredientMatches('rice', 'basmati rice')).toBe(true);
    expect(ingredientMatches('rice', 'price tag')).toBe(false);
  });
});

describe('pantry', () => {
  it('flags food to use soon and expired food', () => {
    expect(freshness(item('milk', { expires: '2026-11-04' }), TODAY)).toBe('expired');
    expect(freshness(item('milk', { expires: '2026-11-08' }), TODAY)).toBe('soon');
    expect(freshness(item('milk', { expires: '2026-11-20' }), TODAY)).toBe('ok');
    expect(freshness(item('rice'), TODAY)).toBe('none');
    const list = [item('a', { expires: '2026-11-07' }), item('b', { expires: '2026-11-06' }), item('c', { expires: '2026-11-06', qty: 0 }), item('d')];
    expect(toUseSoon(list, TODAY).map((p) => p.name)).toEqual(['b', 'a']);
  });

  it('puts bought groceries in the pantry, adding to what is there', () => {
    let n = 0;
    const out = stockUp([item('Eggs', { qty: 2 })], ['6 eggs', '500g pasta'], () => `new${n++}`);
    expect(out.find((p) => p.name === 'Eggs')?.qty).toBe(8);
    expect(out.find((p) => p.name === 'pasta')).toMatchObject({ qty: 500, unit: 'g', expires: '' });
  });

  it("doesn't add the same thing to the shopping list twice", () => {
    expect(newGroceryLines(['2 onions', 'milk', 'onion'], [{ text: 'Milk', done: false }])).toEqual(['2 onions']);
    expect(newGroceryLines(['milk'], [{ text: 'milk', done: true }])).toEqual(['milk']);
  });
});

describe('what can I cook?', () => {
  const pantry = [item('eggs', { qty: 6 }), item('milk', { expires: '2026-11-06' }), item('cheese', { qty: 0 }), item('bread', { expires: '2026-11-01' })];
  const omelette = recipe('Omelette', ['3 eggs', 'splash of milk', 'cheese']);
  const pancakes = recipe('Pancakes', ['2 eggs', '300ml milk', '100g flour']);
  const toast = recipe('Toast', ['bread', 'butter']);

  it('knows what you have and what is missing (out of stock and expired count as missing)', () => {
    expect(checkRecipe(omelette, pantry, TODAY)).toEqual({ have: ['3 eggs', 'splash of milk'], missing: ['cheese'], usesSoon: ['milk'] });
    expect(checkRecipe(toast, pantry, TODAY).have).toEqual([]);
  });

  it('suggests recipes with the fewest missing ingredients first', () => {
    const s = suggestRecipes([pancakes, toast, omelette], pantry, TODAY);
    expect(s.map((x) => x.recipe.name)).toEqual(['Omelette', 'Pancakes']);
  });
});
