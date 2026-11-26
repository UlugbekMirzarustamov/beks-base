/**
 * 💷 MONEY: Today (the money plan), Spending, Bills and Wishes. Kept simple on purpose.
 * Also exports <ExpenseSheet> (the quick "add purchase" pop-up used by the big + button)
 * and <SafeToSpendCard> (also shown on Home).
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { addDays, addMonths, daysBetween, daysInMonth, formatDay, formatMonth, monthOf, relativeDays } from '../lib/dates';
import { uid } from '../lib/id';
import { barLevel, billCost, billsBetween, convertPoundsToDollars, formatMoney, formatPounds, parseAmount, poundsToDollars, roundPennies, safeToSpend, spentInMonth } from '../lib/money';
import { PlanTab, PotToday, Wishes } from './Plan';
import type { Category, CategoryIcon, Expense, RecurringBill } from '../lib/types';
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

const TABS = ['plan', 'spending', 'bills', 'wishes'] as const;
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
          { id: 'plan', label: 'Today', icon: 'coin' },
          { id: 'spending', label: 'Spending', icon: 'chest' },
          { id: 'bills', label: 'Bills', icon: 'house' },
          { id: 'wishes', label: 'Wishes', icon: 'star' },
        ]}
      />
      {tab === 'plan' && <PlanTab />}
      {tab === 'wishes' && <Wishes />}
      {tab === 'spending' && <SpendingList />}
      {tab === 'bills' && <Bills />}
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
