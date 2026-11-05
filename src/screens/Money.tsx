/**
 * 💷 MONEY — "the Chest".
 * Tabs: Overview · Spending · Charts · Bills · Setup · Tools
 * Also exports <ExpenseSheet> (the quick "add purchase" pop-up used by the big + button)
 * and <SafeToSpendCard> (also shown on Home).
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { guessColumns, parseCsv, rowsToPurchases, type ColumnGuess } from '../lib/csv';
import { addDays, addMonths, daysBetween, daysInMonth, formatDay, formatMonth, monthOf, relativeDays } from '../lib/dates';
import { uid } from '../lib/id';
import { barLevel, billCost, billsBetween, convertPoundsToDollars, formatMoney, formatPounds, parseAmount, poundsToDollars, roundPennies, safeToSpend, spendingByDay, spentInMonth, savedIn } from '../lib/money';
import { moneyInsights } from '../lib/daily';
import { PlanTab, PotToday, Wishes } from './Plan';
import { sfx } from '../lib/sound';
import type { Category, CategoryIcon, Expense, RecurringBill, SavingsGoal } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Bar, Empty, Field, Panel, Segmented, Sheet, Tabs, useConfirm, useSubRoute } from '../ui/kit';

/** Each category icon also gets a colour for bars and charts. */
export const CATEGORY_COLOR: Record<CategoryIcon, string> = {
  house: '#d64541',
  apple: '#5fa83b',
  bus: '#4aa3df',
  phone: '#8e6bd6',
  star: '#f0a020',
  coin: '#e8c21a',
  box: '#9a9a9a',
};
const ICON_CHOICES: CategoryIcon[] = ['house', 'apple', 'bus', 'phone', 'star', 'coin', 'box'];

const TABS = ['plan', 'wishes', 'overview', 'spending', 'savings', 'charts', 'bills', 'setup', 'tools'] as const;
type Tab = (typeof TABS)[number];

export default function Money({ sub }: { sub?: string }) {
  const [tab, setTab] = useSubRoute<Tab>('money', sub, TABS);
  return (
    <div className="screen">
      <h1 className="screen__title">
        <PixelIcon name="chest" size={28} /> The Chest
      </h1>
      <Tabs<Tab>
        label="Money sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'plan', label: 'Plan', icon: 'chest' },
          { id: 'wishes', label: 'Wishes', icon: 'star' },
          { id: 'overview', label: 'Budget', icon: 'coin' },
          { id: 'spending', label: 'Spending', icon: 'scroll' },
          { id: 'savings', label: 'Savings', icon: 'gift' },
          { id: 'charts', label: 'Charts', icon: 'calendar' },
          { id: 'bills', label: 'Bills', icon: 'house' },
          { id: 'setup', label: 'Limits', icon: 'gear' },
          { id: 'tools', label: 'Tools', icon: 'globe' },
        ]}
      />
      {tab === 'overview' && (
        <div className="grid grid--2">
          <SafeToSpendCard />
          <CategoryBars />
          <Insights />
        </div>
      )}
      {tab === 'plan' && <PlanTab />}
      {tab === 'wishes' && <Wishes />}
      {tab === 'spending' && <SpendingList />}
      {tab === 'savings' && <Savings />}
      {tab === 'charts' && <Charts />}
      {tab === 'bills' && <Bills />}
      {tab === 'setup' && <BudgetSetup />}
      {tab === 'tools' && (
        <div className="grid grid--2">
          <Converter />
          <CsvImport />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- helpers
function useCategory() {
  const { data } = useStore();
  return (id: string): Category =>
    data.categories.find((c) => c.id === id) ?? { id, name: 'Unknown', limit: 0, icon: 'box' };
}

// ---------------------------------------------------------------- Safe to spend
export function SafeToSpendCard() {
  const { data } = useStore();
  // With a money plan (one pot for N months), show today's allowance from the pot instead.
  return data.pot ? <PotToday /> : <MonthlySafeToSpend />;
}

function MonthlySafeToSpend() {
  const { data, today, openExpense } = useStore();
  const s = safeToSpend(data.monthlyBudget, data.expenses, today);
  const spent = roundPennies(data.monthlyBudget - s.left);
  const level = barLevel(spent, data.monthlyBudget);
  return (
    <Panel title="Safe to spend today" icon="coin" className="safe">
      {!data.settings.currencyChecked && <CurrencyCheck />}
      <p className={`big-number ${s.perDay === 0 ? 'is-zero' : ''}`}>{formatMoney(s.perDay)}</p>
      <p className="muted">
        {formatMoney(Math.max(0, s.left))} left ÷ {s.daysLeft} day{s.daysLeft === 1 ? '' : 's'} left in {formatMonth(monthOf(today)).split(' ')[0]}
      </p>
      <Bar value={spent} max={data.monthlyBudget} level={level} label="Monthly budget used" />
      <p className="bar-caption">
        {formatMoney(spent)} of {formatMoney(data.monthlyBudget)} spent this month
      </p>
      {s.left < 0 && <p className="alert alert--over">Over budget by {formatMoney(-s.left)}. Time for cheap meals!</p>}
      <button type="button" className="btn btn--primary btn--wide" onClick={() => openExpense()}>
        <PixelIcon name="plus" size={18} /> Add purchase
      </button>
    </Panel>
  );
}

/**
 * Shown once after the switch to dollars: were the amounts typed in before in pounds?
 * Nothing is converted unless you say so.
 */
function CurrencyCheck() {
  const { data, update, replaceAll, toast } = useStore();
  const rate = data.settings.gbpPerUsd;
  return (
    <div className="currency-check" role="status">
      <p>
        <strong>Money is now shown in US dollars.</strong> Were the amounts you typed in before (budget, purchases, bills) in pounds?
      </p>
      <div className="form__actions">
        <button
          type="button"
          className="btn btn--primary grow"
          onClick={async () => {
            if (await replaceAll(convertPoundsToDollars(data, rate), 'Before converting £ to $')) toast('Converted your £ amounts to $', 'pop');
          }}
        >
          Yes — convert £ to $
        </button>
        <button type="button" className="btn grow" onClick={() => update((d) => void (d.settings.currencyChecked = true))}>
          No, they're dollars
        </button>
      </div>
      <small className="muted">Uses £{rate} per $1 — change it first in Money → Tools if your rate is different.</small>
    </div>
  );
}

// ---------------------------------------------------------------- Insights
function Insights() {
  const { data, today } = useStore();
  const tips = moneyInsights(data, today);
  if (!tips.length) return null;
  return (
    <Panel title="Money insights" icon="globe">
      <ul className="insights">
        {tips.map((t) => (
          <li key={t}>
            <PixelIcon name="star" size={14} /> {t}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ---------------------------------------------------------------- Category bars
function CategoryBars() {
  const { data, today } = useStore();
  const month = monthOf(today);
  return (
    <Panel title="Categories" icon="heart">
      <ul className="cat-bars">
        {data.categories.map((c) => {
          const spent = spentInMonth(data.expenses, month, c.id);
          const level = barLevel(spent, c.limit);
          return (
            <li key={c.id} className="cat-bar">
              <div className="cat-bar__row">
                <PixelIcon name={c.icon} size={20} />
                <span className="cat-bar__name">{c.name}</span>
                <span className="cat-bar__nums">
                  {formatMoney(spent)} / {formatMoney(c.limit)}
                </span>
              </div>
              <Bar value={spent} max={c.limit} level={level} color={CATEGORY_COLOR[c.icon]} label={`${c.name} spending`} />
              {level === 'warn' && <p className="bar-note bar-note--warn">! Careful — over 80% used</p>}
              {level === 'over' && <p className="bar-note bar-note--over">!! Limit reached</p>}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ---------------------------------------------------------------- Add / edit purchase
const LAST_CAT_KEY = 'ulus-last-category';
const LAST_CUR_KEY = 'beks-last-currency';

/** The pop-up for adding or editing a purchase. Opened by the + button anywhere in the app. */
export function ExpenseSheet() {
  const { expenseSheet, closeExpense } = useStore();
  return (
    <Sheet open={expenseSheet.open} onClose={closeExpense} title={expenseSheet.editing ? 'Edit purchase' : 'Add purchase'}>
      <ExpenseForm editing={expenseSheet.editing} onDone={closeExpense} />
    </Sheet>
  );
}

function ExpenseForm({ editing, onDone }: { editing: Expense | null; onDone: () => void }) {
  const ask = useConfirm();
  const { data, update, toast, today } = useStore();
  const lastCat = (() => {
    try {
      return localStorage.getItem(LAST_CAT_KEY);
    } catch {
      return null;
    }
  })();
  const defaultCat = data.categories.find((c) => c.id === lastCat)?.id ?? data.categories.find((c) => c.id === 'food')?.id ?? data.categories[0]?.id ?? 'other';
  const rate = data.settings.gbpPerUsd;
  const lastCur = (() => {
    try {
      return localStorage.getItem(LAST_CUR_KEY) === 'GBP' ? 'GBP' : 'USD';
    } catch {
      return 'USD';
    }
  })();
  // Paid in pounds? Then we save the dollar value and remember the pounds too.
  const [cur, setCur] = useState<'USD' | 'GBP'>(editing ? (editing.paidGbp != null ? 'GBP' : 'USD') : lastCur);
  const [amount, setAmount] = useState(editing ? String(editing.paidGbp ?? editing.amount) : '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? defaultCat);
  const [note, setNote] = useState(editing?.note ?? '');
  const [date, setDate] = useState(editing?.date ?? today);
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const typed = parseAmount(amount);
    const value = cur === 'GBP' ? poundsToDollars(typed, rate) : typed; // always saved in dollars
    if (!(typed > 0)) {
      setError('Type an amount, like 4.50');
      return;
    }
    if (!date) {
      setError('Pick a date');
      return;
    }
    const cat = data.categories.find((c) => c.id === categoryId);
    // Work out the category total BEFORE and AFTER, to warn when crossing 80% / 100%.
    const others = data.expenses.filter((x) => x.id !== editing?.id);
    const before = spentInMonth(others, monthOf(date), categoryId);
    const after = roundPennies(before + value);

    update((d) => {
      if (editing) {
        const item = d.expenses.find((x) => x.id === editing.id);
        if (item) Object.assign(item, { amount: value, categoryId, note: note.trim(), date, paidGbp: cur === 'GBP' ? typed : undefined });
      } else {
        d.expenses.push({ id: uid(), amount: value, categoryId, note: note.trim(), date, ...(cur === 'GBP' ? { paidGbp: typed } : {}) });
      }
    });
    try {
      localStorage.setItem(LAST_CUR_KEY, cur);
      localStorage.setItem(LAST_CAT_KEY, categoryId);
    } catch {
      /* ignore */
    }
    toast(editing ? 'Purchase updated' : `${formatMoney(value)}${cur === 'GBP' ? ` (${formatPounds(typed)})` : ''} · ${cat?.name ?? ''} added`, 'pop');
    if (cat && cat.limit > 0) {
      if (barLevel(before, cat.limit) !== 'over' && barLevel(after, cat.limit) === 'over') toast(`${cat.name} is over its limit!`, 'error');
      else if (barLevel(before, cat.limit) === 'ok' && barLevel(after, cat.limit) === 'warn') toast(`${cat.name} is over 80% of its limit`, 'warn');
    }
    onDone();
  };

  const remove = async () => {
    if (!editing || !(await ask('Delete this purchase?'))) return;
    update((d) => {
      d.expenses = d.expenses.filter((x) => x.id !== editing.id);
    });
    toast('Purchase deleted', 'info');
    onDone();
  };

  return (
    <form className="form" onSubmit={submit}>
      <div className="field">
        <span className="field__label" id="amount-label">
          Amount
        </span>
        <div className="amount-row">
          <div className="cur-toggle" role="radiogroup" aria-label="Paid in">
            {(['USD', 'GBP'] as const).map((c) => (
              <button key={c} type="button" role="radio" aria-checked={cur === c} className="cur-toggle__btn" onClick={() => setCur(c)}>
                {c === 'USD' ? '$' : '£'}
              </button>
            ))}
          </div>
          <input
            className="input input--huge"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            aria-labelledby="amount-label"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError('');
            }}
            data-autofocus
            aria-invalid={Boolean(error)}
          />
        </div>
        {cur === 'GBP' && parseAmount(amount) > 0 && (
          <span className="field__hint">
            = <strong>{formatMoney(poundsToDollars(parseAmount(amount), rate))}</strong> at £{rate} per $1 (change the rate in Money → Tools)
          </span>
        )}
      </div>
      <fieldset className="field">
        <legend className="field__label">Category</legend>
        <div className="chip-grid" role="radiogroup" aria-label="Category">
          {data.categories.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={c.id === categoryId}
              className="chip"
              onClick={() => setCategoryId(c.id)}
            >
              <PixelIcon name={c.icon} size={18} />
              {c.name}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="form__row">
        <Field label="Note (optional)" className="grow">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Tesco" maxLength={80} />
        </Field>
        <Field label="Date">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} max="2100-12-31" />
        </Field>
      </div>
      {error && (
        <p className="alert alert--over" role="alert">
          {error}
        </p>
      )}
      <div className="form__actions">
        {editing && (
          <button type="button" className="btn btn--danger" onClick={remove}>
            <PixelIcon name="trash" size={18} /> Delete
          </button>
        )}
        <button type="submit" className="btn btn--primary grow">
          <PixelIcon name="check" size={18} /> Save
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Spending list
function MonthPicker({ month, setMonth }: { month: string; setMonth: (m: string) => void }) {
  return (
    <div className="month-picker">
      <button type="button" className="btn btn--small" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">
        <PixelIcon name="arrowL" size={16} />
      </button>
      <span className="month-picker__label">{formatMonth(month)}</span>
      <button type="button" className="btn btn--small" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
        <PixelIcon name="arrowR" size={16} />
      </button>
    </div>
  );
}

function SpendingList() {
  const ask = useConfirm();
  const { data, today, update, openExpense, toast } = useStore();
  const cat = useCategory();
  const [month, setMonth] = useState(monthOf(today));
  const [filter, setFilter] = useState('all');

  const list = data.expenses
    .filter((e) => monthOf(e.date) === month && (filter === 'all' || e.categoryId === filter))
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = roundPennies(list.reduce((sum, e) => sum + e.amount, 0));
  const byDay = new Map<string, Expense[]>();
  for (const e of list) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);

  const remove = async (e: Expense) => {
    if (!(await ask(`Delete ${formatMoney(e.amount)} ${e.note || cat(e.categoryId).name}?`))) return;
    update((d) => {
      d.expenses = d.expenses.filter((x) => x.id !== e.id);
    });
    toast('Purchase deleted', 'info');
  };

  return (
    <Panel title="Spending" icon="scroll">
      <div className="toolbar">
        <MonthPicker month={month} setMonth={setMonth} />
        <label className="field field--inline">
          <span className="field__label">Category</span>
          <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="total-line">
        Total: <strong>{formatMoney(total)}</strong> · {list.length} purchase{list.length === 1 ? '' : 's'}
      </p>
      {list.length === 0 && <Empty>Nothing here yet. Tap the big + to add a purchase.</Empty>}
      {[...byDay.entries()].map(([day, items]) => (
        <div key={day} className="day-group">
          <h3 className="day-group__title">{formatDay(day)}</h3>
          <ul className="list">
            {items.map((e) => {
              const c = cat(e.categoryId);
              return (
                <li key={e.id} className="list__item">
                  <button type="button" className="list__main" onClick={() => openExpense(e)} aria-label={`Edit ${e.note || c.name}, ${formatMoney(e.amount)}`}>
                    <PixelIcon name={c.icon} size={22} />
                    <span className="list__text">
                      <span>{e.note || c.name}</span>
                      <small className="muted">
                        {c.name}
                        {e.recurringId ? ' · bill' : ''}
                      </small>
                    </span>
                    <span className="list__amount">
                      {formatMoney(e.amount)}
                      {e.paidGbp != null && <small className="list__paid">{formatPounds(e.paidGbp)}</small>}
                    </span>
                  </button>
                  <button type="button" className="icon-btn" onClick={() => remove(e)} aria-label={`Delete ${e.note || c.name}`}>
                    <PixelIcon name="trash" size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </Panel>
  );
}

// ---------------------------------------------------------------- Charts
function Charts() {
  const { data, today } = useStore();
  const [month, setMonth] = useState(monthOf(today));
  const days = spendingByDay(data.expenses, month);
  const maxDay = Math.max(1, ...days);
  const byCat = data.categories.map((c) => ({ c, spent: spentInMonth(data.expenses, month, c.id) }));
  const maxCat = Math.max(1, ...byCat.map((x) => Math.max(x.spent, x.c.limit)));
  const todayIndex = monthOf(today) === month ? Number(today.slice(8)) - 1 : -1;
  const biggest = days.indexOf(Math.max(...days));

  return (
    <div className="grid grid--2">
      <Panel title="By category" icon="heart" actions={<MonthPicker month={month} setMonth={setMonth} />}>
        <ul className="hbars">
          {byCat.map(({ c, spent }) => (
            <li key={c.id} className="hbar">
              <span className="hbar__label">
                <PixelIcon name={c.icon} size={16} /> {c.name}
              </span>
              <span className="hbar__track">
                <span className="hbar__fill" style={{ width: `${(spent / maxCat) * 100}%`, background: CATEGORY_COLOR[c.icon] }} />
                {c.limit > 0 && <span className="hbar__limit" style={{ left: `${(c.limit / maxCat) * 100}%` }} title="limit" />}
              </span>
              <span className="hbar__value">{formatMoney(spent)}</span>
            </li>
          ))}
        </ul>
        <p className="muted small">The upright line on each bar marks that category's limit.</p>
      </Panel>
      <Panel title="By day" icon="calendar">
        <svg className="day-chart" viewBox={`0 0 ${days.length * 6} 64`} preserveAspectRatio="none" role="img" aria-label={`Spending per day in ${formatMonth(month)}`}>
          {days.map((v, i) => {
            const h = v > 0 ? Math.max(2, Math.round((v / maxDay) * 60)) : 0;
            return <rect key={i} x={i * 6 + 1} y={64 - h} width={4} height={h} className={i === todayIndex ? 'day-chart__bar is-today' : 'day-chart__bar'} />;
          })}
        </svg>
        <div className="day-chart__axis" aria-hidden="true">
          <span>1</span>
          <span>10</span>
          <span>20</span>
          <span>{days.length}</span>
        </div>
        <p className="muted small">
          Highest day: {Math.max(...days) > 0 ? `${formatMoney(Math.max(...days))} on the ${biggest + 1}${ordinal(biggest + 1)}` : 'none yet'}
        </p>
      </Panel>
    </div>
  );
}

const ordinal = (n: number) => (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');

// ---------------------------------------------------------------- Recurring bills & subscriptions
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Day 5 every month" / "5 March every year". */
const billWhen = (b: RecurringBill) => (b.every === 'year' ? `${b.day} ${MONTHS[(b.month ?? 1) - 1]} every year` : `Day ${b.day} every month`);

function Bills() {
  const ask = useConfirm();
  const { data, update, today } = useStore();
  const cat = useCategory();
  const [editing, setEditing] = useState<RecurringBill | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  // On a phone the form is far below the list: bring it into view when you tap a bill.
  useEffect(() => {
    if (editing) formRef.current?.scrollIntoView({ block: 'start' });
  }, [editing]);
  const subs = data.recurring.filter((b) => b.kind === 'subscription');
  const bills = data.recurring.filter((b) => b.kind !== 'subscription');
  const total = (list: RecurringBill[], per: 'month' | 'year') => roundPennies(list.reduce((sum, b) => sum + billCost(b)[per], 0));
  const next30 = billsBetween(data.recurring, today, addDays(today, 30));
  const nextOf = (b: RecurringBill) => billsBetween([b], today, addDays(today, 366))[0]?.date;
  const trials = data.recurring.filter((b) => b.trialEnds && b.trialEnds >= today && daysBetween(today, b.trialEnds) <= 7);

  const remove = async (b: RecurringBill) => {
    const what = b.kind === 'subscription' ? 'subscription' : 'bill';
    if (!(await ask(`Stop this ${what}? (Past payments stay in your list.)`, { ok: `Stop ${what}` }))) return;
    update((d) => {
      d.recurring = d.recurring.filter((x) => x.id !== b.id);
    });
    if (editing?.id === b.id) setEditing(null);
  };

  const row = (b: RecurringBill) => {
    const next = nextOf(b);
    return (
      <li key={b.id} className="list__item">
        <button type="button" className="list__main" onClick={() => setEditing(b)} aria-label={`Edit ${b.name}, ${formatMoney(b.amount)}`}>
          <PixelIcon name={cat(b.categoryId).icon} size={22} />
          <span className="list__text">
            <span>{b.name}</span>
            <small className="muted">
              {billWhen(b)} · {cat(b.categoryId).name}
              {b.trialEnds && b.trialEnds >= today ? ` · free until ${formatDay(b.trialEnds)}` : ''}
              {next ? ` · next ${relativeDays(daysBetween(today, next))}` : ''}
            </small>
          </span>
          <span className="list__amount">{formatMoney(b.amount)}</span>
        </button>
        <button type="button" className="icon-btn" onClick={() => remove(b)} aria-label={`Delete ${b.name}`}>
          <PixelIcon name="trash" size={18} />
        </button>
      </li>
    );
  };

  return (
    <div className="grid grid--2">
      <Panel title="Subscriptions" icon="phone">
        {trials.map((b) => (
          <p key={b.id} className="alert alert--warn" role="status">
            Free trial of {b.name} ends {relativeDays(daysBetween(today, b.trialEnds!))} — cancel before then if you don't want to pay {formatMoney(b.amount)}.
          </p>
        ))}
        {subs.length === 0 ? (
          <Empty>No subscriptions yet. Add streaming, apps or memberships below.</Empty>
        ) : (
          <>
            <p className="muted small">
              Subscriptions cost <strong>{formatMoney(total(subs, 'month'))}</strong> a month — <strong>{formatMoney(total(subs, 'year'))}</strong> a year.
            </p>
            <ul className="list">{subs.map(row)}</ul>
          </>
        )}
      </Panel>
      <Panel title="Recurring bills" icon="house">
        <p className="muted small">Bills and subscriptions add themselves to your spending on their day. Tap one to change it.</p>
        {bills.length === 0 ? <Empty>No bills yet.</Empty> : <ul className="list">{bills.map(row)}</ul>}
        {data.recurring.length > 0 && (
          <p className="muted small">
            Everything together: about {formatMoney(total(data.recurring, 'month'))} a month.
          </p>
        )}
      </Panel>
      <Panel title="Next 30 days" icon="clock">
        {next30.length === 0 ? (
          <Empty>Nothing to pay in the next 30 days.</Empty>
        ) : (
          <>
            <ul className="list">
              {next30.map(({ date, bill }) => (
                <li key={`${bill.id}-${date}`} className="list__item">
                  <div className="list__main">
                    <span className="list__text">
                      <span>{bill.name}</span>
                      <small className="muted">
                        {formatDay(date)} · {relativeDays(daysBetween(today, date))}
                      </small>
                    </span>
                    <span className="list__amount">{formatMoney(bill.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="small">
              Total: <strong>{formatMoney(roundPennies(next30.reduce((sum, x) => sum + x.bill.amount, 0)))}</strong> ·{' '}
              <a href="#/planner/calendar">See them in the calendar</a>
            </p>
          </>
        )}
      </Panel>
      <div ref={formRef} style={{ scrollMarginTop: 120 }}>
        <Panel title={editing ? `Change ${editing.name}` : 'Add a bill or subscription'} icon="plus">
          <BillForm key={editing?.id ?? 'new'} editing={editing} onDone={() => setEditing(null)} />
        </Panel>
      </div>
    </div>
  );
}

function BillForm({ editing, onDone }: { editing: RecurringBill | null; onDone: () => void }) {
  const { data, update, toast, today } = useStore();
  const [kind, setKind] = useState<'bill' | 'subscription'>(editing?.kind ?? 'bill');
  const [name, setName] = useState(editing?.name ?? '');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? data.categories[0]?.id ?? 'other');
  const [every, setEvery] = useState<'month' | 'year'>(editing?.every ?? 'month');
  const [month, setMonth] = useState(editing?.month ?? Number(today.slice(5, 7)));
  const [day, setDay] = useState(editing?.day ?? 1);
  const [trialEnds, setTrialEnds] = useState(editing?.trialEnds ?? '');
  const [addNow, setAddNow] = useState(false);
  const todayDay = Number(today.slice(8));
  const thisMonth = Number(today.slice(5, 7));
  // Has this month's payment day already passed (and it's paid this month at all)?
  const passed = !editing && !trialEnds && todayDay >= day && (every === 'month' || month === thisMonth);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!name.trim() || !(value > 0)) {
      toast('Give it a name and an amount', 'error');
      return;
    }
    const fields = {
      name: name.trim(),
      amount: value,
      categoryId,
      day,
      kind,
      every,
      ...(every === 'year' ? { month } : {}),
      ...(kind === 'subscription' && trialEnds ? { trialEnds } : {}),
    };
    if (editing) {
      update((d) => {
        const b = d.recurring.find((x) => x.id === editing.id);
        if (!b) return;
        delete b.month;
        delete b.trialEnds;
        Object.assign(b, fields);
      });
      toast(`Saved: ${fields.name}`, 'pop');
      onDone();
      return;
    }
    // If its day already passed this month, only add this month's payment if you ask to
    // (you may have logged it already). Otherwise it adds itself when the day comes.
    const ym = monthOf(today);
    const [y, m] = ym.split('-').map(Number);
    const payDay = String(Math.min(day, daysInMonth(y, m))).padStart(2, '0');
    const id = uid();
    update((d) => {
      d.recurring.push({ id, ...fields, lastAdded: passed ? ym : null, since: today });
      if (passed && addNow) d.expenses.push({ id: uid(), amount: value, categoryId, note: fields.name, date: `${ym}-${payDay}`, recurringId: id });
    });
    toast(`${kind === 'subscription' ? 'Subscription' : 'Bill'} saved: ${fields.name}`, 'pop');
    setName('');
    setAmount('');
    setTrialEnds('');
    setAddNow(false);
  };

  return (
    <form className="form" onSubmit={save}>
      <Segmented
        label="Type"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'bill', label: 'Bill' },
          { value: 'subscription', label: 'Subscription' },
        ]}
      />
      <Field label="Name">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'subscription' ? 'e.g. Music app' : 'e.g. Rent'} />
      </Field>
      <div className="form__row">
        <Field label="Amount ($)" className="grow">
          <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Day">
          <input className="input" type="number" min={1} max={31} value={day} onChange={(e) => setDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))} />
        </Field>
      </div>
      <div className="form__row">
        <Field label="Repeats" className="grow">
          <select className="input" value={every} onChange={(e) => setEvery(e.target.value as 'month' | 'year')}>
            <option value="month">Every month</option>
            <option value="year">Every year</option>
          </select>
        </Field>
        {every === 'year' && (
          <Field label="Month" className="grow">
            <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      <Field label="Category">
        <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {data.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      {kind === 'subscription' && (
        <Field label="Free trial ends (optional)" hint="Nothing is added to spending until after this day. You'll get a heads-up a week before.">
          <input className="input" type="date" value={trialEnds} onChange={(e) => setTrialEnds(e.target.value)} />
        </Field>
      )}
      {passed && (
        <label className="check">
          <input type="checkbox" checked={addNow} onChange={(e) => setAddNow(e.target.checked)} />
          <span>Day {day} has passed — also add this month's payment now</span>
        </label>
      )}
      <div className="form__row">
        <button type="submit" className="btn btn--primary grow">
          <PixelIcon name={editing ? 'check' : 'plus'} size={18} /> {editing ? 'Save changes' : 'Save'}
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

// ---------------------------------------------------------------- Budget setup
function BudgetSetup() {
  const ask = useConfirm();
  const { data, update, toast } = useStore();
  const allocated = roundPennies(data.categories.reduce((s, c) => s + c.limit, 0));
  const diff = roundPennies(data.monthlyBudget - allocated);

  const setCat = (id: string, change: Partial<Category>) =>
    update((d) => {
      const c = d.categories.find((x) => x.id === id);
      if (c) Object.assign(c, change);
    });

  const removeCat = async (c: Category) => {
    if (data.categories.length <= 1) return;
    const used = data.expenses.filter((e) => e.categoryId === c.id).length;
    const fallback = data.categories.find((x) => x.id !== c.id && x.id === 'other') ?? data.categories.find((x) => x.id !== c.id)!;
    if (!(await ask(`Delete "${c.name}"?${used ? ` Its ${used} purchase(s) will move to "${fallback.name}".` : ''}`))) return;
    update((d) => {
      d.categories = d.categories.filter((x) => x.id !== c.id);
      for (const e of d.expenses) if (e.categoryId === c.id) e.categoryId = fallback.id;
      for (const b of d.recurring) if (b.categoryId === c.id) b.categoryId = fallback.id;
    });
    toast(`Deleted ${c.name}`, 'info');
  };

  const addCat = () =>
    update((d) => {
      d.categories.push({ id: uid(), name: 'New category', limit: 0, icon: 'box' });
    });

  return (
    <Panel title="Monthly budget" icon="gear">
      <Field label="Total budget per month ($)">
        <input
          className="input input--big"
          type="number"
          min={0}
          step={10}
          value={data.monthlyBudget}
          onChange={(e) => update((d) => void (d.monthlyBudget = Math.max(0, Number(e.target.value) || 0)))}
        />
      </Field>
      <p className={`alert ${diff === 0 ? 'alert--ok' : 'alert--warn'}`}>
        Category limits add up to {formatMoney(allocated)}.{' '}
        {diff === 0 ? 'Perfect match!' : diff > 0 ? `${formatMoney(diff)} not given to any category yet.` : `That's ${formatMoney(-diff)} more than your budget.`}
      </p>
      <ul className="cat-edit">
        {data.categories.map((c) => (
          <li key={c.id} className="cat-edit__row">
            <select
              className="input cat-edit__icon"
              aria-label={`Icon for ${c.name}`}
              value={c.icon}
              onChange={(e) => setCat(c.id, { icon: e.target.value as CategoryIcon })}
            >
              {ICON_CHOICES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
            <PixelIcon name={c.icon} size={22} />
            <input className="input grow" aria-label="Category name" value={c.name} onChange={(e) => setCat(c.id, { name: e.target.value })} />
            <span className="cat-edit__pound" aria-hidden="true">
              $
            </span>
            <input
              className="input cat-edit__limit"
              aria-label={`Monthly limit for ${c.name}`}
              type="number"
              min={0}
              value={c.limit}
              onChange={(e) => setCat(c.id, { limit: Math.max(0, Number(e.target.value) || 0) })}
            />
            <button type="button" className="icon-btn" onClick={() => removeCat(c)} aria-label={`Delete category ${c.name}`} disabled={data.categories.length <= 1}>
              <PixelIcon name="trash" size={18} />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn" onClick={addCat}>
        <PixelIcon name="plus" size={18} /> Add category
      </button>
    </Panel>
  );
}

// ---------------------------------------------------------------- $ ↔ £ ↔ so'm converter
const formatUZS = (n: number) => `${Math.round(n).toLocaleString('en-GB').replace(/,/g, ' ')} so'm`;

type Currency = 'usd' | 'gbp' | 'uzs';

function Converter() {
  const { data, update } = useStore();
  const { gbpPerUsd, usdToUzs } = data.settings;
  // Everything is worked out from one dollar amount; you can type in any of the three boxes.
  const [usd, setUsd] = useState(10);
  const [editing, setEditing] = useState<{ cur: Currency; text: string } | null>(null);
  const valueOf: Record<Currency, number> = { usd, gbp: usd * gbpPerUsd, uzs: usd * usdToUzs };
  const shown = (cur: Currency) =>
    editing?.cur === cur ? editing.text : cur === 'uzs' ? String(Math.round(valueOf.uzs)) : (Math.round(valueOf[cur] * 100) / 100).toString();
  const type = (cur: Currency, text: string) => {
    setEditing({ cur, text });
    const n = parseFloat(text.replace(/[\s,]/g, '').replace(/^[$£]/, ''));
    if (Number.isFinite(n)) setUsd(cur === 'usd' ? n : cur === 'gbp' ? n / gbpPerUsd : n / usdToUzs);
  };
  const box = (cur: Currency, label: string) => (
    <Field label={label} className="grow">
      <input className="input input--big" inputMode="decimal" value={shown(cur)} onChange={(e) => type(cur, e.target.value)} onBlur={() => setEditing(null)} />
    </Field>
  );

  return (
    <Panel title="Converter" icon="globe">
      <div className="form__row form__row--wrap">
        {box('usd', 'Dollars ($)')}
        {box('gbp', 'Pounds (£)')}
        {box('uzs', "So'm (UZS)")}
      </div>
      <p className="muted">
        {formatMoney(usd)} = <strong>{formatPounds(valueOf.gbp)}</strong> = <strong>{formatUZS(valueOf.uzs)}</strong>
      </p>
      <p className="field__label">Today's rates (type them in yourself, from your bank or a money app)</p>
      <div className="form__row form__row--wrap">
        <Field label="£ for $1" className="grow" hint="Used when you add a purchase paid in £.">
          <input
            className="input"
            type="number"
            step="0.01"
            min={0.01}
            value={gbpPerUsd}
            onChange={(e) => update((d) => void (d.settings.gbpPerUsd = Math.max(0.01, Number(e.target.value) || 0.01)))}
          />
        </Field>
        <Field label="so'm for $1" className="grow">
          <input
            className="input"
            type="number"
            min={1}
            value={usdToUzs}
            onChange={(e) => update((d) => void (d.settings.usdToUzs = Math.max(1, Number(e.target.value) || 1)))}
          />
        </Field>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------- CSV import
const KEYWORDS: [RegExp, string][] = [
  [/tesco|aldi|lidl|sainsbury|asda|co-?op|morrisons|m&s|greggs|deliveroo|just eat|uber eats|mcdonald|kfc|subway|cafe|coffee|costa|starbucks|pret/i, 'food'],
  [/stagecoach|first bus|bus|train|rail|tram|supertram|uber|bolt|taxi|trainline/i, 'transport'],
  [/giffgaff|vodafone|ee |o2|three|lebara|voxi|smarty|lyca/i, 'phone'],
  [/rent|accommodation|unite|letting/i, 'rent'],
  [/cinema|odeon|cineworld|netflix|spotify|steam|playstation|xbox|game/i, 'fun'],
];

function guessCategory(text: string, valid: Set<string>): string {
  for (const [re, id] of KEYWORDS) if (re.test(text) && valid.has(id)) return id;
  return valid.has('other') ? 'other' : [...valid][0];
}

function CsvImport() {
  const { data, update, toast } = useStore();
  const [rows, setRows] = useState<string[][] | null>(null);
  const [cols, setCols] = useState<ColumnGuess>({ date: -1, amount: -1, description: -1 });
  const [negative, setNegative] = useState(true);
  const [choices, setChoices] = useState<{ include: boolean; categoryId: string }[]>([]);
  const [fileName, setFileName] = useState('');

  const header = rows?.[0] ?? [];
  const purchases = useMemo(() => (rows && cols.date >= 0 && cols.amount >= 0 ? rowsToPurchases(rows.slice(1), cols, negative) : []), [rows, cols, negative]);
  const validCats = useMemo(() => new Set(data.categories.map((c) => c.id)), [data.categories]);

  // Every time the preview changes, pre-fill choices (guess category, skip likely duplicates).
  // Only `purchases` should trigger this, so your own ticks are not reset while you edit.
  useEffect(() => {
    setChoices(
      purchases.map((p) => ({
        include: !data.expenses.some((e) => e.date === p.date && Math.abs(e.amount - p.amount) < 0.005),
        categoryId: guessCategory(p.description, validCats),
      })),
    );
  }, [purchases]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const parsed = parseCsv(await file.text());
    if (parsed.length < 2) {
      toast("That CSV looks empty", 'error');
      return;
    }
    setFileName(file.name);
    setRows(parsed);
    setCols(guessColumns(parsed[0]));
  };

  const save = () => {
    const chosen = purchases.map((p, i) => ({ p, c: choices[i] })).filter((x) => x.c?.include);
    if (!chosen.length) return;
    update((d) => {
      for (const { p, c } of chosen) d.expenses.push({ id: uid(), amount: p.amount, categoryId: c.categoryId, note: p.description.slice(0, 80), date: p.date });
    });
    toast(`Imported ${chosen.length} purchase${chosen.length === 1 ? '' : 's'}`, 'pop');
    setRows(null);
    setFileName('');
  };

  const colSelect = (key: keyof ColumnGuess, label: string) => (
    <Field label={label}>
      <select className="input" value={cols[key]} onChange={(e) => setCols({ ...cols, [key]: Number(e.target.value) })}>
        <option value={-1}>— choose —</option>
        {header.map((h, i) => (
          <option key={i} value={i}>
            {h || `Column ${i + 1}`}
          </option>
        ))}
      </select>
    </Field>
  );

  const count = choices.filter((c) => c.include).length;

  return (
    <Panel title="Import bank CSV" icon="scroll">
      <p className="muted small">
        Optional. Export a CSV from your bank app, pick it here, check the preview, then save. Nothing is saved until you press the button.
        The file never leaves your device.
      </p>
      <label className="btn file-btn">
        <PixelIcon name="scroll" size={18} /> {fileName || 'Choose CSV file'}
        <input type="file" accept=".csv,text/csv" className="visually-hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      {rows && (
        <>
          <div className="form__row form__row--wrap">
            {colSelect('date', 'Date column')}
            {colSelect('amount', 'Amount column')}
            {colSelect('description', 'Description column')}
          </div>
          <label className="check">
            <input type="checkbox" checked={negative} onChange={(e) => setNegative(e.target.checked)} />
            <span>Spending shows as negative numbers (−12.50). Untick if your bank shows it as positive.</span>
          </label>
          {purchases.length === 0 ? (
            <Empty>No purchases found — check the columns above.</Empty>
          ) : (
            <div className="csv-preview" role="group" aria-label="Preview of purchases to import">
              {purchases.map((p, i) => {
                const c = choices[i];
                if (!c) return null;
                const dupe = data.expenses.some((e) => e.date === p.date && Math.abs(e.amount - p.amount) < 0.005);
                return (
                  <div key={i} className={`csv-row ${c.include ? '' : 'is-off'}`}>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={c.include}
                        onChange={(e) => setChoices(choices.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)))}
                      />
                      <span>
                        <strong>{formatMoney(p.amount)}</strong> {p.description || '(no description)'}
                        <small className="muted">
                          {' '}
                          · {formatDay(p.date)}
                          {dupe ? ' · maybe already added' : ''}
                        </small>
                      </span>
                    </label>
                    <select
                      className="input input--small"
                      aria-label="Category"
                      value={c.categoryId}
                      onChange={(e) => setChoices(choices.map((x, j) => (j === i ? { ...x, categoryId: e.target.value } : x)))}
                    >
                      {data.categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
          <div className="form__actions">
            <button type="button" className="btn" onClick={() => setRows(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn--primary grow" disabled={count === 0} onClick={save}>
              Save {count} purchase{count === 1 ? '' : 's'}
            </button>
          </div>
        </>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------- Savings jars
const GOAL_ICONS: SavingsGoal['icon'][] = ['plane', 'house', 'book', 'gift', 'heart', 'star', 'coin'];

export { savedIn };

/** A pixel jar that fills up with coins. */
export function Jar({ pct, small = false }: { pct: number; small?: boolean }) {
  const fill = Math.max(0, Math.min(100, pct));
  return (
    <span className={`jar ${small ? 'jar--small' : ''} ${fill >= 100 ? 'is-full' : ''}`} aria-hidden="true">
      <span className="jar__lid" />
      <span className="jar__body">
        <span className="jar__fill" style={{ height: `${fill}%` }} />
      </span>
    </span>
  );
}

/** "At your pace you'll get there around …" from how fast you've been saving. */
function eta(g: SavingsGoal, today: string): string | null {
  const saved = savedIn(g);
  const left = g.target - saved;
  if (left <= 0 || saved <= 0) return null;
  const weeks = Math.max(1, daysBetween(g.created, today) / 7);
  const perWeek = saved / weeks;
  return formatDay(addDays(today, Math.ceil((left / perWeek) * 7)));
}

function GoalCard({ goal }: { goal: SavingsGoal }) {
  const { data, update, today, toast, gainXp } = useStore();
  const ask = useConfirm();
  const [amount, setAmount] = useState('');
  const [countIt, setCountIt] = useState(true);
  const saved = savedIn(goal);
  const pct = goal.target > 0 ? (saved / goal.target) * 100 : 0;
  const savingsCat = data.categories.find((c) => c.id === 'savings') ?? data.categories.find((c) => /saving/i.test(c.name));
  const when = eta(goal, today);

  const move = (sign: 1 | -1) => {
    const value = parseAmount(amount);
    if (!(value > 0)) {
      toast('Type an amount first, like 20', 'error');
      return;
    }
    const delta = sign * value;
    const after = roundPennies(saved + delta);
    const reachedNow = !goal.reached && after >= goal.target;
    update((d) => {
      const g = d.goals.find((x) => x.id === goal.id);
      if (!g) return;
      g.deposits.push({ id: uid(), date: today, amount: delta, note: '' });
      if (reachedNow) g.reached = today;
      // Putting money in the jar also counts towards this month's Savings budget (if you want).
      if (sign > 0 && countIt && savingsCat) d.expenses.push({ id: uid(), amount: value, categoryId: savingsCat.id, note: `Jar: ${goal.name}`, date: today });
    });
    if (sign > 0) sfx('coin');
    toast(sign > 0 ? `${formatMoney(value)} into "${goal.name}"` : `${formatMoney(value)} taken out of "${goal.name}"`, sign > 0 ? 'pop' : 'info');
    if (reachedNow) {
      toast(`Goal reached: ${goal.name}! MashaAllah!`, 'level');
      gainXp(50, 'savings goal reached');
    }
    setAmount('');
  };

  const remove = async () => {
    if (!(await ask(`Delete the "${goal.name}" jar? (Purchases already logged stay in your spending.)`))) return;
    update((d) => {
      d.goals = d.goals.filter((g) => g.id !== goal.id);
    });
  };

  return (
    <Panel title={goal.name} icon={goal.icon} actions={<button type="button" className="icon-btn" onClick={remove} aria-label={`Delete ${goal.name}`}><PixelIcon name="trash" size={16} /></button>}>
      <div className="goal">
        <Jar pct={pct} />
        <div className="goal__info">
          <p className="big-number big-number--small">{formatMoney(saved)}</p>
          <p className="muted">
            of {formatMoney(goal.target)} · {Math.floor(Math.min(100, pct))}%
          </p>
          {goal.reached ? (
            <p className="alert alert--ok">Reached on {formatDay(goal.reached)}!</p>
          ) : (
            <p>
              {formatMoney(Math.max(0, goal.target - saved))} to go
              {when && <small className="muted"> · at your pace, around {when}</small>}
            </p>
          )}
        </div>
      </div>
      <div className="form__row">
        <input className="input grow" inputMode="decimal" aria-label={`Amount for ${goal.name}`} placeholder="$ amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button type="button" className="btn btn--primary" onClick={() => move(1)}>
          <PixelIcon name="coin" size={16} /> Add
        </button>
        <button type="button" className="btn" onClick={() => move(-1)}>
          Take out
        </button>
      </div>
      {savingsCat && (
        <label className="check">
          <input type="checkbox" checked={countIt} onChange={(e) => setCountIt(e.target.checked)} />
          <span className="small">Also count money I add in this month's "{savingsCat.name}" budget</span>
        </label>
      )}
    </Panel>
  );
}

function Savings() {
  const { data, update, today, toast } = useStore();
  const [form, setForm] = useState({ name: '', target: '', icon: 'plane' as SavingsGoal['icon'] });
  const goals = [...data.goals].sort((a, b) => Number(Boolean(a.reached)) - Number(Boolean(b.reached)));

  const add = (e: FormEvent) => {
    e.preventDefault();
    const target = parseAmount(form.target);
    if (!form.name.trim() || !(target > 0)) {
      toast('Give it a name and a target amount', 'error');
      return;
    }
    update((d) => {
      d.goals.push({ id: uid(), name: form.name.trim(), target, icon: form.icon, created: today, deposits: [] });
    });
    toast(`New jar: ${form.name.trim()}`, 'pop');
    setForm({ name: '', target: '', icon: 'plane' });
  };

  return (
    <div className="grid grid--2">
      {goals.map((g) => (
        <GoalCard key={g.id} goal={g} />
      ))}
      <Panel title="New savings jar" icon="plus">
        <form className="form" onSubmit={add}>
          <Field label="What are you saving for?">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Flight home to Tashkent" />
          </Field>
          <Field label="Target ($)">
            <input className="input input--big" inputMode="decimal" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="650" />
          </Field>
          <div className="chip-grid" role="radiogroup" aria-label="Picture">
            {GOAL_ICONS.map((icon) => (
              <button key={icon} type="button" role="radio" aria-checked={form.icon === icon} className="chip" onClick={() => setForm({ ...form, icon })} aria-label={icon}>
                <PixelIcon name={icon} size={22} />
              </button>
            ))}
          </div>
          <button type="submit" className="btn btn--primary">
            <PixelIcon name="plus" size={18} /> Make the jar
          </button>
        </form>
        {goals.length === 0 && <p className="muted small">Saving up for something? Make a jar, then drop money in whenever you can. Watch it fill up.</p>}
      </Panel>
    </div>
  );
}

/** The main jar, small, for Home. */
export function SavingsMini() {
  const { data } = useStore();
  const goal = data.goals.find((g) => !g.reached) ?? data.goals[data.goals.length - 1];
  if (!goal) return null;
  const saved = savedIn(goal);
  return (
    <Panel title="Savings jar" icon="gift">
      <a href="#/money/savings" className="goal goal--mini">
        <Jar pct={(saved / goal.target) * 100} small />
        <span className="goal__info">
          <strong>{goal.name}</strong>
          <span>
            {formatMoney(saved)} <small className="muted">of {formatMoney(goal.target)}</small>
          </span>
        </span>
      </a>
    </Panel>
  );
}
