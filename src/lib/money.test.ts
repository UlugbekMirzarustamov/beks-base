import { describe, expect, it } from 'vitest';
import { applyRecurring, barLevel, billCost, billDueOn, billsBetween, convertPoundsToDollars, formatMoney, parseAmount, poundsToDollars, safeToSpend, spendingByDay, spentInMonth } from './money';
import { emptyData } from './seed';
import { daysUntil, potStatus } from './pot';
import type { Expense, RecurringBill } from './types';

const exp = (amount: number, date: string, categoryId = 'food'): Expense => ({ id: date + amount, amount, date, categoryId, note: '' });

describe('safeToSpend', () => {
  it('splits the whole budget over the whole month on the 1st', () => {
    // November has 30 days. $600 / 30 days = $20 a day.
    const r = safeToSpend(600, [], '2026-11-01');
    expect(r.daysLeft).toBe(30);
    expect(r.left).toBe(600);
    expect(r.perDay).toBe(20);
  });

  it('counts today as a day left, and subtracts this month only', () => {
    const expenses = [exp(100, '2026-11-02'), exp(50, '2026-11-03'), exp(999, '2026-10-31')];
    // Nov 3rd → 28 days left (3rd…30th). $650 − $150 = $500. 500 / 28 = 17.857… → $17.85 (rounded down)
    const r = safeToSpend(650, expenses, '2026-11-03');
    expect(r.daysLeft).toBe(28);
    expect(r.left).toBe(500);
    expect(r.perDay).toBe(17.85);
  });

  it('on the last day you can spend everything left', () => {
    const r = safeToSpend(650, [exp(600, '2026-11-10')], '2026-11-30');
    expect(r.daysLeft).toBe(1);
    expect(r.perDay).toBe(50);
  });

  it('is 0 (never negative) when over budget', () => {
    const r = safeToSpend(100, [exp(130, '2026-11-05')], '2026-11-06');
    expect(r.left).toBe(-30);
    expect(r.perDay).toBe(0);
  });

  it('handles February in a leap year', () => {
    expect(safeToSpend(290, [], '2028-02-01').daysLeft).toBe(29);
    expect(safeToSpend(290, [], '2028-02-01').perDay).toBe(10);
  });

  it('avoids floating-point pennies', () => {
    const r = safeToSpend(0.3, [exp(0.1, '2026-11-01'), exp(0.1, '2026-11-01')], '2026-11-30');
    expect(r.left).toBe(0.1);
    expect(r.perDay).toBe(0.1);
  });
});

describe('budget helpers', () => {
  it('filters spending by month and category', () => {
    const list = [exp(10, '2026-11-01', 'food'), exp(5, '2026-11-02', 'fun'), exp(7, '2026-12-01', 'food')];
    expect(spentInMonth(list, '2026-11')).toBe(15);
    expect(spentInMonth(list, '2026-11', 'food')).toBe(10);
  });

  it('warns at 80% and alerts at 100%', () => {
    expect(barLevel(79, 100)).toBe('ok');
    expect(barLevel(80, 100)).toBe('warn');
    expect(barLevel(100, 100)).toBe('over');
  });

  it('groups spending by day', () => {
    const days = spendingByDay([exp(3, '2026-11-02'), exp(2, '2026-11-02')], '2026-11');
    expect(days).toHaveLength(30);
    expect(days[1]).toBe(5);
  });

  it('parses typed amounts', () => {
    expect(parseAmount('4.5')).toBe(4.5);
    expect(parseAmount('£12')).toBe(12);
    expect(parseAmount('$7.25')).toBe(7.25);
    expect(parseAmount('3,20')).toBe(3.2);
    expect(parseAmount('abc')).toBeNaN();
    expect(parseAmount('')).toBeNaN();
  });
});

describe('applyRecurring', () => {
  const rent: RecurringBill = { id: 'rent', name: 'Rent', amount: 350, categoryId: 'rent', day: 1, lastAdded: '2026-10' };
  let n = 0;
  const makeId = () => `id${n++}`;

  it('adds a bill once its day arrives, only once per month', () => {
    const first = applyRecurring([rent], [], '2026-11-03', makeId);
    expect(first.added).toHaveLength(1);
    expect(first.added[0].date).toBe('2026-11-01');
    const second = applyRecurring(first.bills, first.expenses, '2026-11-04', makeId);
    expect(second.added).toHaveLength(0);
  });

  it('waits until the pay day', () => {
    const phone = { ...rent, id: 'phone', day: 15 };
    expect(applyRecurring([phone], [], '2026-11-14', makeId).added).toHaveLength(0);
    expect(applyRecurring([phone], [], '2026-11-15', makeId).added).toHaveLength(1);
  });

  it('moves day 31 to the last day of short months', () => {
    const late = { ...rent, day: 31 };
    const r = applyRecurring([late], [], '2026-11-30', makeId);
    expect(r.added[0].date).toBe('2026-11-30');
  });
});

describe('subscriptions and yearly bills', () => {
  const sub: RecurringBill = { id: 'music', name: 'Music app', amount: 10, categoryId: 'fun', day: 12, lastAdded: null, kind: 'subscription' };
  const yearly: RecurringBill = { ...sub, id: 'box', name: 'Storage', amount: 120, day: 31, every: 'year', month: 2 };
  let n = 0;
  const makeId = () => `s${n++}`;

  it('knows the dates a bill is paid', () => {
    expect(billDueOn(sub, '2026-11-12')).toBe(true);
    expect(billDueOn(sub, '2026-11-13')).toBe(false);
    // Yearly: only in its month, and the 31st falls on the last day of February.
    expect(billDueOn(yearly, '2027-02-28')).toBe(true);
    expect(billDueOn(yearly, '2026-11-30')).toBe(false);
  });

  it('shows no payment before it was added or during a free trial', () => {
    expect(billDueOn({ ...sub, since: '2026-11-20' }, '2026-11-12')).toBe(false);
    expect(billDueOn({ ...sub, since: '2026-11-20' }, '2026-12-12')).toBe(true);
    const trial = { ...sub, trialEnds: '2026-12-12' };
    expect(billDueOn(trial, '2026-12-12')).toBe(false);
    expect(billDueOn(trial, '2027-01-12')).toBe(true);
  });

  it('lists payments in a date range, soonest first', () => {
    const list = billsBetween([yearly, sub], '2026-11-01', '2026-12-31');
    expect(list.map((x) => x.date)).toEqual(['2026-11-12', '2026-12-12']);
  });

  it('spreads yearly costs over the months', () => {
    expect(billCost(yearly)).toEqual({ month: 10, year: 120 });
    expect(billCost(sub)).toEqual({ month: 10, year: 120 });
  });

  it('adds a yearly bill only in its month, and nothing during a trial', () => {
    expect(applyRecurring([yearly], [], '2026-11-30', makeId).added).toHaveLength(0);
    const feb = applyRecurring([yearly], [], '2027-02-28', makeId);
    expect(feb.added[0].date).toBe('2027-02-28');
    expect(applyRecurring([{ ...sub, trialEnds: '2026-11-20' }], [], '2026-11-25', makeId).added).toHaveLength(0);
    expect(applyRecurring([{ ...sub, trialEnds: '2026-11-20' }], [], '2026-12-12', makeId).added).toHaveLength(1);
  });
});

describe('dollars', () => {
  it('shows money in US dollars', () => {
    expect(formatMoney(1234.5)).toBe('$1,234.50');
  });

  it('turns pounds paid into dollars', () => {
    // £4.50 when £0.75 buys $1 → $6.00
    expect(poundsToDollars(4.5, 0.75)).toBe(6);
  });

  it('converts old pound amounts once, keeping what was paid in £', () => {
    const d = emptyData('2026-11-04');
    d.monthlyBudget = 650;
    d.expenses = [{ id: 'a', amount: 3, categoryId: 'food', note: '', date: '2026-11-04' }];
    const out = convertPoundsToDollars(d, 0.75);
    expect(out.monthlyBudget).toBe(867);
    expect(out.expenses[0]).toMatchObject({ amount: 4, paidGbp: 3 });
    expect(out.settings.currencyChecked).toBe(true);
  });
});

describe('money plan (a pot that must last 5 months)', () => {
  // Example figures only: $3,020 over 151 days = exactly $20 a day.
  const pot = { total: 3020, start: '2026-11-04', months: 5 };

  it('splits the pot into a daily allowance', () => {
    const s = potStatus(pot, [], '2026-11-04');
    expect(s.end).toBe('2027-04-03');
    expect(s.totalDays).toBe(151);
    expect(s.daily).toBe(20);
    expect(s.remaining).toBe(3020);
    expect(s.leftToday).toBe(20);
    expect(s.fund).toBe(0);
  });

  it('takes purchases out of the pot and saves what you do not spend', () => {
    const spent = [exp(10, '2026-11-04'), exp(30, '2026-11-05'), exp(4.5, '2026-11-06')];
    const s = potStatus(pot, spent, '2026-11-06');
    expect(s.remaining).toBe(2975.5); // 3020 − 44.50
    expect(s.leftToday).toBe(15.5); // 20 − 4.50
    // Day 1: saved 10; day 2: overspent 10 → fund = 0
    expect(s.fund).toBe(0);
    expect(s.underStreak).toBe(0); // yesterday was over
  });

  it('takes wishes out of the wish fund, not out of the day', () => {
    const coat: Expense = { ...exp(40, '2026-11-06'), fromWish: true };
    const s = potStatus(pot, [exp(10, '2026-11-04'), exp(30, '2026-11-05'), exp(4.5, '2026-11-06'), coat], '2026-11-06');
    expect(s.fund).toBe(0 - 40); // the coat comes straight out of the fund
    expect(s.leftToday).toBe(15.5); // today's allowance is untouched
    expect(s.remaining).toBe(2935.5); // but it still comes out of the pot
  });

  it('overspending today lowers the wish fund straight away', () => {
    const s = potStatus(pot, [exp(30, '2026-11-04')], '2026-11-04');
    expect(s.leftToday).toBe(-10);
    expect(s.fund).toBe(-10);
  });

  it('ignores spending from before the plan started', () => {
    expect(potStatus(pot, [exp(500, '2026-11-01')], '2026-11-04').remaining).toBe(3020);
  });

  it('says when the money would run out at your pace', () => {
    const s = potStatus(pot, [exp(100, '2026-11-04')], '2026-11-05');
    expect(s.runsOutOn).not.toBeNull(); // $100/day on average → runs out long before April
    expect(daysUntil(100, 40, 5)).toBe(12);
    expect(daysUntil(100, 120, 5)).toBe(0);
    expect(daysUntil(100, 40, 0)).toBeNull();
  });
});

describe('plan in days with a daily cap and a dream room jar', () => {
  const pot = { total: 4200, start: '2026-11-01', months: 5, days: 140, cap: 15 };
  const buy = (amount: number, date: string, extra: Partial<Expense> = {}): Expense => ({ id: `${date}-${amount}-${extra.fromDream ? 'd' : ''}`, amount, date, categoryId: 'other', note: '', ...extra });

  it('lasts exactly 140 days, gives $15 a day, and saves the rest in the dream jar', () => {
    const s = potStatus(pot, [], '2026-11-11');
    expect(s.totalDays).toBe(140);
    expect(s.end).toBe('2027-03-20');
    expect(s.daily).toBe(15);
    expect(s.dreamPerDay).toBe(15); // $4200 / 140 = $30 a day: $15 to spend, $15 to the jar
    expect(s.dreamJar).toBe(150); // 10 finished days
    expect(s.dreamTotal).toBe(2100);
  });

  it('dream purchases come out of the jar, never out of the daily allowance or the wish fund', () => {
    const plain = potStatus(pot, [buy(10, '2026-11-05')], '2026-11-11');
    const withDream = potStatus(pot, [buy(10, '2026-11-05'), buy(100, '2026-11-08', { fromDream: true })], '2026-11-11');
    expect(withDream.dreamJar).toBe(50);
    expect(withDream.fund).toBe(plain.fund);
    expect(withDream.leftToday).toBe(plain.leftToday);
    expect(withDream.remaining).toBe(plain.remaining - 100);
  });

  it('keeps the old behaviour without a cap, and never raises the allowance above what the pot allows', () => {
    const old = potStatus({ total: 2000, start: '2026-11-01', months: 4 }, [], '2026-11-11');
    expect(old.dreamPerDay).toBe(0);
    expect(old.dreamJar).toBe(0);
    const small = potStatus({ total: 1000, start: '2026-11-01', months: 5, days: 140, cap: 15 }, [], '2026-11-11');
    expect(small.daily).toBe(7.14); // $1000 / 140 is below the cap
    expect(small.dreamPerDay).toBe(0);
  });
});
