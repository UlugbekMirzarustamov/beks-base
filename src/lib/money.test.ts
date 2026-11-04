import { describe, expect, it } from 'vitest';
import { applyRecurring, barLevel, convertPoundsToDollars, formatMoney, parseAmount, poundsToDollars, safeToSpend, spendingByDay, spentInMonth } from './money';
import { emptyData } from './seed';
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
