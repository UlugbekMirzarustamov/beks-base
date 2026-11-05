/**
 * 🍳 KITCHEN — groceries, what's at home (pantry), the week's meals and your own cookbook,
 * plus "what can I cook?" from what you have. Logic lives in lib/kitchen.ts.
 * A life tool: no XP, coins or streaks.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { addDays, daysBetween, formatDay, relativeDays, startOfWeek } from '../lib/dates';
import { uid } from '../lib/id';
import { checkRecipe, freshness, itemKey, newGroceryLines, parseQty, stockUp, suggestRecipes } from '../lib/kitchen';
import { fold } from '../lib/search';
import type { Meal, MealSlot, PantryItem, Recipe } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Empty, Field, Panel, Sheet, Tabs, useConfirm, useSubRoute } from '../ui/kit';

const TABS = ['groceries', 'pantry', 'meals', 'recipes'] as const;
type Tab = (typeof TABS)[number];
const SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
];

/** "2 eggs" / "500 g" — how much is left of a pantry item. */
const amount = (p: PantryItem) => `${Number.isInteger(p.qty) ? p.qty : p.qty.toFixed(2).replace(/0+$/, '')}${p.unit ? ` ${p.unit}` : ''}`;

export default function Kitchen({ sub }: { sub?: string }) {
  const [tab, setTab] = useSubRoute<Tab>('kitchen', sub, TABS);
  return (
    <div className="screen">
      <h1 className="screen__title">
        <PixelIcon name="apple" size={28} /> Kitchen
      </h1>
      <Tabs<Tab>
        label="Kitchen sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'groceries', label: 'Shopping', icon: 'check' },
          { id: 'pantry', label: 'Pantry', icon: 'box' },
          { id: 'meals', label: 'Meals', icon: 'calendar' },
          { id: 'recipes', label: 'Recipes', icon: 'book' },
        ]}
      />
      {tab === 'groceries' && <Groceries />}
      {tab === 'pantry' && <Pantry />}
      {tab === 'meals' && <Meals />}
      {tab === 'recipes' && <Recipes />}
    </div>
  );
}

/** Adds lines to the shopping list (skipping ones already on it) and says what happened. */
function useAddToList() {
  const { data, update, toast } = useStore();
  return (lines: string[]) => {
    const fresh = newGroceryLines(lines, data.groceries);
    if (!fresh.length) {
      toast('Already on your shopping list', 'info');
      return;
    }
    update((d) => {
      for (const text of fresh) d.groceries.push({ id: uid(), text, done: false });
    });
    toast(fresh.length === 1 ? `Added to shopping: ${fresh[0]}` : `Added ${fresh.length} things to shopping`, 'pop');
  };
}

// ---------------------------------------------------------------- Shopping list
function Groceries() {
  const ask = useConfirm();
  const { data, update, toast } = useStore();
  const addToList = useAddToList();
  const [text, setText] = useState('');
  const open = data.groceries.filter((g) => !g.done);
  const ticked = data.groceries.filter((g) => g.done);
  const onList = new Set(open.map((g) => itemKey(parseQty(g.text).name)));
  const runOut = data.pantry.filter((p) => p.qty <= 0 && !onList.has(itemKey(p.name)));

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addToList([text]);
    setText('');
  };

  const toPantry = () => {
    update((d) => {
      d.pantry = stockUp(d.pantry, ticked.map((g) => g.text), uid);
      d.groceries = d.groceries.filter((g) => !g.done);
    });
    toast(`${ticked.length} thing(s) put in the pantry`, 'pop');
  };

  const clearTicked = async () => {
    if (!(await ask(`Remove ${ticked.length} ticked item(s) without putting them in the pantry?`, { ok: 'Remove' }))) return;
    update((d) => void (d.groceries = d.groceries.filter((g) => !g.done)));
  };

  const toggle = (id: string) =>
    update((d) => {
      const g = d.groceries.find((x) => x.id === id);
      if (g) g.done = !g.done;
    });
  const remove = (id: string) => update((d) => void (d.groceries = d.groceries.filter((x) => x.id !== id)));

  return (
    <div className="grid grid--2">
      <Panel title="Shopping list" icon="check">
        <form className="form" onSubmit={add}>
          <div className="form__row">
            <input className="input grow" aria-label="Add to shopping list" placeholder="e.g. 500g pasta, 6 eggs, milk" value={text} onChange={(e) => setText(e.target.value)} />
            <button type="submit" className="btn btn--primary">
              Add
            </button>
          </div>
        </form>
        {open.length === 0 && <Empty>Nothing to buy. Lovely.</Empty>}
        <ul className="tasks">
          {open.map((g) => (
            <li key={g.id} className="task">
              <input type="checkbox" className="pixel-check" checked={false} onChange={() => toggle(g.id)} aria-label={`Got it: ${g.text}`} />
              <span className="task__title grow">{g.text}</span>
              <button type="button" className="icon-btn" onClick={() => remove(g.id)} aria-label={`Delete ${g.text}`}>
                <PixelIcon name="trash" size={16} />
              </button>
            </li>
          ))}
        </ul>
        {ticked.length > 0 && (
          <>
            <p className="muted small">In the basket ({ticked.length}):</p>
            <ul className="tasks">
              {ticked.map((g) => (
                <li key={g.id} className="task is-done">
                  <input type="checkbox" className="pixel-check" checked onChange={() => toggle(g.id)} aria-label={`Not yet: ${g.text}`} />
                  <span className="task__title grow">{g.text}</span>
                </li>
              ))}
            </ul>
            <div className="form__row">
              <button type="button" className="btn btn--primary grow" onClick={toPantry}>
                <PixelIcon name="box" size={16} /> Put in the pantry
              </button>
              <button type="button" className="btn" onClick={clearTicked}>
                Just clear
              </button>
            </div>
          </>
        )}
      </Panel>
      {runOut.length > 0 && (
        <Panel title="Ran out at home" icon="box">
          <p className="muted small">Tap to add to the list.</p>
          <div className="kitchen-chips">
            {runOut.map((p) => (
              <button key={p.id} type="button" className="btn btn--small" onClick={() => addToList([p.name])}>
                <PixelIcon name="plus" size={14} /> {p.name}
              </button>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Pantry
const FRESH_LABEL = { expired: 'past its date', soon: 'use soon', ok: '', none: '' } as const;

function Pantry() {
  const ask = useConfirm();
  const { data, update, today } = useStore();
  const addToList = useAddToList();
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editing) formRef.current?.scrollIntoView({ block: 'start' });
  }, [editing]);

  // Things to use up first, then the rest by name.
  const rank = (p: PantryItem) => ({ expired: 0, soon: 1, ok: 2, none: 2 })[freshness(p, today)];
  const items = [...data.pantry].sort((a, b) => rank(a) - rank(b) || (a.expires || '9999').localeCompare(b.expires || '9999') || a.name.localeCompare(b.name));

  const change = (id: string, by: number) =>
    update((d) => {
      const p = d.pantry.find((x) => x.id === id);
      if (p) p.qty = Math.max(0, Math.round((p.qty + by) * 100) / 100);
    });
  const remove = async (p: PantryItem) => {
    if (!(await ask(`Remove ${p.name} from the pantry?`, { ok: 'Remove' }))) return;
    update((d) => void (d.pantry = d.pantry.filter((x) => x.id !== p.id)));
    if (editing?.id === p.id) setEditing(null);
  };

  return (
    <div className="grid grid--2">
      <Panel title="At home" icon="box">
        {items.length === 0 && <Empty>Your pantry is empty. Add what you have, or tick off shopping and put it here.</Empty>}
        <ul className="list">
          {items.map((p) => {
            const f = freshness(p, today);
            const step = p.unit === 'g' || p.unit === 'ml' ? 100 : 1;
            return (
              <li key={p.id} className="list__item">
                <button type="button" className="list__main" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}>
                  <span className="list__text">
                    <span>{p.name}</span>
                    <small className={f === 'expired' || f === 'soon' ? 'pantry-warn' : 'muted'}>
                      {p.qty <= 0 ? 'run out' : amount(p)}
                      {p.expires ? ` · ${FRESH_LABEL[f] ? `${FRESH_LABEL[f]} · ` : ''}${f === 'expired' ? formatDay(p.expires) : `by ${relativeDays(daysBetween(today, p.expires))}`}` : ''}
                    </small>
                  </span>
                </button>
                {p.qty <= 0 ? (
                  <button type="button" className="btn btn--small" onClick={() => addToList([p.name])}>
                    + list
                  </button>
                ) : (
                  <button type="button" className="icon-btn" onClick={() => change(p.id, -step)} aria-label={`Use some ${p.name}`}>
                    −
                  </button>
                )}
                <button type="button" className="icon-btn" onClick={() => change(p.id, step)} aria-label={`Add more ${p.name}`}>
                  <PixelIcon name="plus" size={16} />
                </button>
                <button type="button" className="icon-btn" onClick={() => remove(p)} aria-label={`Remove ${p.name}`}>
                  <PixelIcon name="trash" size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>
      <div ref={formRef} style={{ scrollMarginTop: 120 }}>
        <Panel title={editing ? `Change ${editing.name}` : 'Add to pantry'} icon="plus">
          <PantryForm key={editing?.id ?? 'new'} editing={editing} onDone={() => setEditing(null)} />
        </Panel>
      </div>
    </div>
  );
}

function PantryForm({ editing, onDone }: { editing: PantryItem | null; onDone: () => void }) {
  const { update, toast } = useStore();
  const [name, setName] = useState(editing?.name ?? '');
  const [qty, setQty] = useState(editing ? String(editing.qty) : '1');
  const [unit, setUnit] = useState(editing?.unit ?? '');
  const [expires, setExpires] = useState(editing?.expires ?? '');

  const save = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(qty.replace(',', '.'));
    if (!name.trim() || qty.trim() === '' || !Number.isFinite(n) || n < 0) {
      toast('Give it a name and an amount', 'error');
      return;
    }
    const fields = { name: name.trim(), qty: n, unit: unit.trim(), expires };
    update((d) => {
      const p = editing && d.pantry.find((x) => x.id === editing.id);
      if (p) Object.assign(p, fields);
      else d.pantry.push({ id: uid(), ...fields });
    });
    toast(editing ? `Saved: ${fields.name}` : `In the pantry: ${fields.name}`, 'pop');
    if (editing) onDone();
    else {
      setName('');
      setQty('1');
      setUnit('');
      setExpires('');
    }
  };

  return (
    <form className="form" onSubmit={save}>
      <Field label="What">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rice" maxLength={60} />
      </Field>
      <div className="form__row">
        <Field label="How much" className="grow">
          <input className="input" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Field label="Unit (optional)" className="grow">
          <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="g, ml, pack…" list="kitchen-units" maxLength={12} />
        </Field>
      </div>
      <datalist id="kitchen-units">
        {['g', 'kg', 'ml', 'l', 'pack', 'tin', 'bag', 'bottle'].map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
      <Field label="Use by (optional)" hint="It moves to the top when it needs using up.">
        <input className="input" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
      </Field>
      <div className="form__row">
        <button type="submit" className="btn btn--primary grow">
          {editing ? 'Save changes' : 'Add'}
        </button>
        {editing && (
          <button type="button" className="btn" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Meal plan
/** One meal box: type anything, or a recipe name (suggested as you type). Saves when you leave it. */
function MealInput({ date, slot, meal }: { date: string; slot: (typeof SLOTS)[number]; meal: Meal | undefined }) {
  const { data, update } = useStore();
  const [text, setText] = useState(meal?.text ?? '');
  const [prev, setPrev] = useState(meal?.text);
  if (meal?.text !== prev) {
    // Changed elsewhere: show the stored value.
    setPrev(meal?.text);
    setText(meal?.text ?? '');
  }
  const commit = () => {
    const value = text.trim();
    if (value === (meal?.text ?? '')) return;
    const recipe = data.recipes.find((r) => fold(r.name) === fold(value));
    update((d) => {
      const day = d.meals[date] ?? {};
      if (value) day[slot.id] = recipe ? { text: value, recipeId: recipe.id } : { text: value };
      else delete day[slot.id];
      if (Object.keys(day).length) d.meals[date] = day;
      else delete d.meals[date];
    });
  };
  return (
    <label className="meal-slot">
      <small className="muted">{slot.label}</small>
      <input
        className="input"
        value={text}
        list="kitchen-recipes"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
        aria-label={`${slot.label} on ${formatDay(date)}`}
        placeholder="—"
      />
    </label>
  );
}

function Meals() {
  const { data, today, toast } = useStore();
  const addToList = useAddToList();
  const [monday, setMonday] = useState(startOfWeek(today));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  // Ingredients still missing for the recipes planned this week (from today on).
  const shop = () => {
    const lines: string[] = [];
    for (const day of days) {
      if (day < today) continue;
      for (const meal of Object.values(data.meals[day] ?? {})) {
        const recipe = meal?.recipeId ? data.recipes.find((r) => r.id === meal.recipeId) : undefined;
        if (recipe) lines.push(...checkRecipe(recipe, data.pantry, today).missing);
      }
    }
    if (!lines.length) toast('Nothing missing for the recipes planned this week', 'info');
    else addToList(lines);
  };

  return (
    <div className="grid">
      <Panel title="Meal plan" icon="calendar">
        <div className="form__row">
          <button type="button" className="btn btn--small" onClick={() => setMonday(addDays(monday, -7))} aria-label="Previous week">
            ←
          </button>
          <strong className="grow meal-week__range">
            {formatDay(monday)} – {formatDay(addDays(monday, 6))}
          </strong>
          <button type="button" className="btn btn--small" onClick={() => setMonday(addDays(monday, 7))} aria-label="Next week">
            →
          </button>
        </div>
        <p className="muted small">Type a meal or pick one of your recipes. Recipes know their ingredients, so the button below can fill your shopping list.</p>
        <datalist id="kitchen-recipes">
          {data.recipes.map((r) => (
            <option key={r.id} value={r.name} />
          ))}
        </datalist>
        <div className="meal-week">
          {days.map((day) => (
            <div key={day} className={`meal-day ${day === today ? 'is-today' : ''}`}>
              <strong>{day === today ? `Today · ${formatDay(day)}` : formatDay(day)}</strong>
              <div className="meal-day__slots">
                {SLOTS.map((slot) => (
                  <MealInput key={slot.id} date={day} slot={slot} meal={data.meals[day]?.[slot.id]} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn--primary" onClick={shop}>
          <PixelIcon name="check" size={16} /> Add missing ingredients to shopping
        </button>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- Recipes
function Recipes() {
  const { data, today } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Recipe | 'new' | null>(null);
  const ideas = suggestRecipes(data.recipes, data.pantry, today).slice(0, 5);
  const recipes = [...data.recipes].sort((a, b) => a.name.localeCompare(b.name));
  // Read from the data each time, so edits show straight away.
  const open = data.recipes.find((r) => r.id === openId);

  return (
    <div className="grid grid--2">
      <Panel title="What can I cook?" icon="apple">
        {data.recipes.length === 0 ? (
          <Empty>Add a few recipes to your cookbook and this will suggest what to cook from what's at home.</Empty>
        ) : ideas.length === 0 ? (
          <Empty>Nothing matches your pantry yet. Add what you have in Pantry.</Empty>
        ) : (
          <ul className="list">
            {ideas.map((s) => (
              <li key={s.recipe.id} className="list__item">
                <button type="button" className="list__main" onClick={() => setOpenId(s.recipe.id)}>
                  <span className="list__text">
                    <span>{s.recipe.name}</span>
                    <small className="muted">
                      {s.missing.length === 0 ? 'You have everything!' : `Missing: ${s.missing.map((m) => parseQty(m).name).join(', ')}`}
                      {s.usesSoon.length > 0 ? ` · uses up ${s.usesSoon.join(', ')}` : ''}
                    </small>
                  </span>
                  <span className="list__amount">
                    {s.have.length}/{s.have.length + s.missing.length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel
        title="My cookbook"
        icon="book"
        actions={
          <button type="button" className="btn btn--small" onClick={() => setEditing('new')}>
            <PixelIcon name="plus" size={14} /> Recipe
          </button>
        }
      >
        {recipes.length === 0 && <Empty>No recipes yet. Add the meals you like to make.</Empty>}
        <ul className="list">
          {recipes.map((r) => (
            <li key={r.id} className="list__item">
              <button type="button" className="list__main" onClick={() => setOpenId(r.id)}>
                <span className="list__text">
                  <span>{r.name}</span>
                  <small className="muted">
                    {r.ingredients.length} ingredient{r.ingredients.length === 1 ? '' : 's'}
                    {r.minutes ? ` · ${r.minutes} min` : ''}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      <Sheet open={Boolean(open)} onClose={() => setOpenId(null)} title={open?.name ?? 'Recipe'}>
        {open && (
          <RecipeView
            recipe={open}
            onEdit={() => {
              setEditing(open);
              setOpenId(null);
            }}
            onDeleted={() => setOpenId(null)}
          />
        )}
      </Sheet>
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New recipe' : 'Edit recipe'}>
        {editing !== null && <RecipeForm key={editing === 'new' ? 'new' : editing.id} editing={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </div>
  );
}

function RecipeView({ recipe, onEdit, onDeleted }: { recipe: Recipe; onEdit: () => void; onDeleted: () => void }) {
  const ask = useConfirm();
  const { data, update, today } = useStore();
  const addToList = useAddToList();
  const { have, missing } = checkRecipe(recipe, data.pantry, today);
  const remove = async () => {
    if (!(await ask(`Delete the recipe "${recipe.name}"? (Planned meals keep their name.)`))) return;
    update((d) => {
      d.recipes = d.recipes.filter((r) => r.id !== recipe.id);
      for (const day of Object.values(d.meals)) for (const meal of Object.values(day)) if (meal?.recipeId === recipe.id) delete meal.recipeId;
    });
    onDeleted();
  };
  return (
    <div className="form">
      {recipe.minutes ? <p className="muted small">About {recipe.minutes} minutes</p> : null}
      <ul className="recipe-ingredients">
        {recipe.ingredients.map((line, i) => (
          <li key={i} className={have.includes(line) ? 'is-have' : 'is-missing'}>
            <span aria-hidden="true">{have.includes(line) ? '✓' : '·'}</span> {line}
            <span className="visually-hidden">{have.includes(line) ? ' (you have it)' : ' (missing)'}</span>
          </li>
        ))}
      </ul>
      {missing.length > 0 && (
        <button type="button" className="btn btn--primary" onClick={() => addToList(missing)}>
          <PixelIcon name="check" size={16} /> Add {missing.length} missing to shopping
        </button>
      )}
      {recipe.steps && <p className="recipe-steps">{recipe.steps}</p>}
      <div className="form__actions">
        <button type="button" className="btn btn--danger" onClick={remove}>
          <PixelIcon name="trash" size={16} /> Delete
        </button>
        <button type="button" className="btn grow" onClick={onEdit}>
          <PixelIcon name="pencil" size={16} /> Edit
        </button>
      </div>
    </div>
  );
}

function RecipeForm({ editing, onDone }: { editing: Recipe | null; onDone: () => void }) {
  const { update, toast } = useStore();
  const [name, setName] = useState(editing?.name ?? '');
  const [ingredients, setIngredients] = useState(editing?.ingredients.join('\n') ?? '');
  const [steps, setSteps] = useState(editing?.steps ?? '');
  const [minutes, setMinutes] = useState(editing?.minutes ? String(editing.minutes) : '');

  const save = (e: FormEvent) => {
    e.preventDefault();
    const lines = ingredients
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!name.trim() || !lines.length) {
      toast('Give it a name and at least one ingredient', 'error');
      return;
    }
    const mins = Math.round(Number(minutes));
    const fields = { name: name.trim(), ingredients: lines, steps: steps.trim(), minutes: mins > 0 ? mins : null };
    update((d) => {
      const r = editing && d.recipes.find((x) => x.id === editing.id);
      if (r) Object.assign(r, fields);
      else d.recipes.push({ id: uid(), ...fields });
    });
    toast(editing ? 'Recipe saved' : `In your cookbook: ${fields.name}`, 'pop');
    onDone();
  };

  return (
    <form className="form" onSubmit={save}>
      <Field label="Name">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Plov" maxLength={60} data-autofocus />
      </Field>
      <Field label="Ingredients" hint="One per line, e.g. 2 eggs, 200g rice">
        <textarea className="input" rows={6} value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
      </Field>
      <Field label="How to make it (optional)">
        <textarea className="input" rows={4} value={steps} onChange={(e) => setSteps(e.target.value)} />
      </Field>
      <Field label="Minutes (optional)">
        <input className="input" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
      </Field>
      <button type="submit" className="btn btn--primary">
        {editing ? 'Save recipe' : 'Add recipe'}
      </button>
    </form>
  );
}
