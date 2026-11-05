/**
 * Money maths. These are plain functions (no React) so they are easy to test.
 */
import { daysInMonth, monthOf } from './dates';
import type { AppData, Expense, RecurringBill } from './types';

/**
 * All money in the app is in US dollars (that's what Bek's bank account uses).
 * Purchases paid in pounds are converted to dollars when they're added.
 * formatMoney(1234.5) → "$1,234.50"
 */
export function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/** "£4.50" — only used to show what was actually paid in pounds. */
export function formatPounds(n: number): string {
  return n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
}

/** Pounds → dollars, given how many pounds one dollar buys (e.g. 0.76). */
export const poundsToDollars = (gbp: number, gbpPerUsd: number) => roundPennies(gbp / gbpPerUsd);

/** Round to pennies, to avoid 0.1 + 0.2 = 0.30000000000000004 problems. */
export const roundPennies = (n: number) => Math.round(n * 100) / 100;

/** Money in a savings jar so far (deposits minus withdrawals). */
export const savedIn = (g: { deposits: { amount: number }[] }) => roundPennies(g.deposits.reduce((sum, d) => sum + d.amount, 0));

/** Total spent in a month ("YYYY-MM"), optionally only for one category. */
export function spentInMonth(expenses: Expense[], month: string, categoryId?: string): number {
  let total = 0;
  for (const e of expenses) {
    if (monthOf(e.date) === month && (!categoryId || e.categoryId === categoryId)) total += e.amount;
  }
  return roundPennies(total);
}

export interface SafeToSpend {
  /** Money left this month (can be negative if over budget). */
  left: number;
  /** Days left in the month, INCLUDING today. */
  daysLeft: number;
  /** left ÷ daysLeft, never below 0. */
  perDay: number;
}

/**
 * SAFE TO SPEND TODAY = (money left this month) ÷ (days left in the month).
 *
 * "Days left" includes today: on the 1st of a 30-day month there are 30 days
 * left, and on the 30th there is 1 (today), so everything left is spendable.
 * The result is rounded DOWN to the penny so it never tells you too much.
 */
export function safeToSpend(monthlyBudget: number, expenses: Expense[], today: string): SafeToSpend {
  const [y, m, d] = today.split('-').map(Number);
  const daysLeft = daysInMonth(y, m) - d + 1;
  const left = roundPennies(monthlyBudget - spentInMonth(expenses, monthOf(today)));
  const perDay = left > 0 ? Math.floor(roundPennies((left / daysLeft) * 100)) / 100 : 0;
  return { left, daysLeft, perDay };
}

/** How full a budget bar is: green, warning at 80%, red alert at 100%. */
export function barLevel(spent: number, limit: number): 'ok' | 'warn' | 'over' {
  if (limit <= 0) return spent > 0 ? 'over' : 'ok';
  const pct = spent / limit;
  if (pct >= 1) return 'over';
  if (pct >= 0.8) return 'warn';
  return 'ok';
}

/** Spending per day of a month: index 0 = day 1. */
export function spendingByDay(expenses: Expense[], month: string): number[] {
  const [y, m] = month.split('-').map(Number);
  const days = new Array<number>(daysInMonth(y, m)).fill(0);
  for (const e of expenses) {
    if (monthOf(e.date) === month) days[Number(e.date.slice(8, 10)) - 1] += e.amount;
  }
  return days.map(roundPennies);
}

/**
 * Add recurring bills (rent, phone…) whose day has come this month and that
 * haven't been added yet. Only the CURRENT month is added: if the app wasn't
 * opened for a few months we don't flood the list with old bills.
 *
 * Returns new arrays (it doesn't change the ones passed in).
 */
export function applyRecurring(
  bills: RecurringBill[],
  expenses: Expense[],
  today: string,
  makeId: () => string,
): { bills: RecurringBill[]; expenses: Expense[]; added: Expense[] } {
  const month = monthOf(today);
  const [y, m, d] = today.split('-').map(Number);
  const added: Expense[] = [];

  const newBills = bills.map((bill) => {
    const payDay = Math.min(bill.day, daysInMonth(y, m)); // 31st → 30th in November
    if (bill.lastAdded === month || d < payDay) return bill;
    added.push({
      id: makeId(),
      amount: bill.amount,
      categoryId: bill.categoryId,
      note: bill.name,
      date: `${month}-${String(payDay).padStart(2, '0')}`,
      recurringId: bill.id,
      ...(bill.example ? { example: true } : {}),
    });
    return { ...bill, lastAdded: month };
  });

  return { bills: newBills, expenses: [...expenses, ...added], added };
}

/** Parse what someone typed as money: "4.5", "$4.50", "£4.50", "4,50" → 4.5. Returns NaN if it isn't a number. */
export function parseAmount(text: string): number {
  const cleaned = text.trim().replace(/[$£\s]/g, '').replace(',', '.');
  if (!/^(\d+\.?\d*|\.\d+)$/.test(cleaned)) return NaN;
  return roundPennies(Number(cleaned));
}

/**
 * One-time fix after switching the app to dollars: amounts that were typed in
 * as pounds are converted to dollars. Each purchase keeps the original pounds in `paidGbp`.
 */
export function convertPoundsToDollars(d: AppData, gbpPerUsd: number): AppData {
  const usd = (gbp: number) => poundsToDollars(gbp, gbpPerUsd);
  return {
    ...d,
    monthlyBudget: Math.round(usd(d.monthlyBudget)),
    categories: d.categories.map((c) => ({ ...c, limit: Math.round(usd(c.limit)) })),
    expenses: d.expenses.map((e) => ({ ...e, amount: usd(e.amount), paidGbp: e.paidGbp ?? e.amount })),
    recurring: d.recurring.map((b) => ({ ...b, amount: usd(b.amount) })),
    settings: { ...d.settings, currencyChecked: true },
  };
}
