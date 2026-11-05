/**
 * Kitchen maths: reading "500g pasta" lines, matching recipe ingredients to the pantry,
 * expiry warnings and "what can I cook?" suggestions. Plain functions, so they're easy to test.
 * No XP or coins here: it's a life tool, not a game.
 */
import { daysBetween } from './dates';
import { fold } from './search';
import type { PantryItem, Recipe } from './types';

const UNITS = ['kg', 'g', 'mg', 'l', 'ml', 'tbsp', 'tsp', 'cup', 'cups', 'pack', 'packs', 'tin', 'tins', 'can', 'cans', 'bag', 'bags', 'bottle', 'bottles', 'jar', 'jars', 'x'];

/** "500g pasta" → { qty: 500, unit: 'g', name: 'pasta' }; "2 eggs" → 2, '', 'eggs'; "milk" → 1, '', 'milk'. */
export function parseQty(line: string): { qty: number; unit: string; name: string } {
  const text = line.trim().replace(/\s+/g, ' ');
  const m = text.match(/^(\d+(?:[.,]\d+)?|½|¼)\s*([a-zA-Z]+)?\s*(?:of\s+)?(.*)$/);
  if (!m) return { qty: 1, unit: '', name: text };
  const qty = m[1] === '½' ? 0.5 : m[1] === '¼' ? 0.25 : Number(m[1].replace(',', '.'));
  const word = (m[2] ?? '').toLowerCase();
  if (UNITS.includes(word) && m[3]) return { qty, unit: word === 'x' ? '' : word, name: m[3].trim() };
  // No unit: the word belongs to the name ("2 eggs").
  return { qty, unit: '', name: [m[2], m[3]].filter(Boolean).join(' ').trim() || text };
}

/** "Tomatoes" → "tomato", "eggs" → "egg": a simple key so names match each other. */
export function itemKey(name: string): string {
  return fold(name)
    .split(' ')
    .map((w) => (w.length > 3 && w.endsWith('oes') ? w.slice(0, -2) : w.length > 3 && w.endsWith('ies') ? `${w.slice(0, -3)}y` : w.length > 2 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .join(' ');
}

/** Does a recipe ingredient line ("200g chopped tomatoes") match a pantry item ("tomatoes")? */
export function ingredientMatches(line: string, pantryName: string): boolean {
  const ing = itemKey(parseQty(line).name);
  const have = itemKey(pantryName);
  if (!ing || !have) return false;
  if (ing === have) return true;
  // Whole-word match either way: "chicken breast" ↔ "chicken", "rice" ↔ "basmati rice".
  const words = (s: string) => ` ${s} `;
  return words(ing).includes(words(have)) || words(have).includes(words(ing));
}

export type Freshness = 'expired' | 'soon' | 'ok' | 'none';

/** Expired, use within `soonDays` days, fine, or no date. */
export function freshness(item: PantryItem, today: string, soonDays = 3): Freshness {
  if (!item.expires) return 'none';
  const left = daysBetween(today, item.expires);
  return left < 0 ? 'expired' : left <= soonDays ? 'soon' : 'ok';
}

/** Pantry items you actually have (some left and not past their date). */
export const usable = (pantry: PantryItem[], today: string) => pantry.filter((p) => p.qty > 0 && freshness(p, today) !== 'expired');

/** Things to use up soon (or already expired but still in stock), soonest first. */
export function toUseSoon(pantry: PantryItem[], today: string, soonDays = 3): PantryItem[] {
  return pantry
    .filter((p) => p.qty > 0 && (freshness(p, today, soonDays) === 'soon' || freshness(p, today, soonDays) === 'expired'))
    .sort((a, b) => a.expires.localeCompare(b.expires));
}

/** Which of a recipe's ingredients you have and which are missing. */
export function checkRecipe(recipe: Recipe, pantry: PantryItem[], today: string): { have: string[]; missing: string[]; usesSoon: string[] } {
  const stock = usable(pantry, today);
  const soon = toUseSoon(pantry, today);
  const have: string[] = [];
  const missing: string[] = [];
  const usesSoon: string[] = [];
  for (const line of recipe.ingredients) {
    if (!line.trim()) continue;
    if (stock.some((p) => ingredientMatches(line, p.name))) have.push(line);
    else missing.push(line);
    const s = soon.find((p) => ingredientMatches(line, p.name));
    if (s && !usesSoon.includes(s.name)) usesSoon.push(s.name);
  }
  return { have, missing, usesSoon };
}

export interface Suggestion {
  recipe: Recipe;
  have: string[];
  missing: string[];
  usesSoon: string[];
}

/**
 * "What can I cook?": recipes that use at least one thing you have, best first —
 * fewest missing ingredients, then the ones that use up food expiring soon.
 */
export function suggestRecipes(recipes: Recipe[], pantry: PantryItem[], today: string): Suggestion[] {
  return recipes
    .map((recipe) => ({ recipe, ...checkRecipe(recipe, pantry, today) }))
    .filter((s) => s.have.length > 0)
    .sort((a, b) => a.missing.length - b.missing.length || b.usesSoon.length - a.usesSoon.length || b.have.length - a.have.length || a.recipe.name.localeCompare(b.recipe.name));
}

/** Grocery lines not already on the list (compared by name), so adding twice doesn't duplicate. */
export function newGroceryLines(lines: string[], list: { text: string; done: boolean }[]): string[] {
  const onList = new Set(list.filter((g) => !g.done).map((g) => itemKey(parseQty(g.text).name)));
  const out: string[] = [];
  for (const line of lines) {
    const key = itemKey(parseQty(line).name);
    if (!key || onList.has(key)) continue;
    onList.add(key);
    out.push(line.trim());
  }
  return out;
}

/**
 * Put bought groceries into the pantry: an item with the same name and unit gets the quantity
 * added; otherwise a new pantry item is made. Returns a new list.
 */
export function stockUp(pantry: PantryItem[], lines: string[], makeId: () => string): PantryItem[] {
  const out = pantry.map((p) => ({ ...p }));
  for (const line of lines) {
    const { qty, unit, name } = parseQty(line);
    const same = out.find((p) => itemKey(p.name) === itemKey(name) && p.unit === unit);
    if (same) same.qty = Math.round((same.qty + qty) * 100) / 100;
    else out.push({ id: makeId(), name, qty, unit, expires: '' });
  }
  return out;
}
