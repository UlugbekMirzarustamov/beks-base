/**
 * "1% better every day": small daily picks that stay the same all day
 * (today's quest, word of the day, the mistake to recall), plus money insights.
 * Plain functions so they're easy to test.
 */
import { addDays, monthOf, weekdayOf, WEEKDAYS_LONG } from './dates';
import { formatMoney, roundPennies, safeToSpend, spentInMonth } from './money';
import type { AppData, Mistake, VocabWord } from './types';

/** A number from a date + salt that's the same all day, so picks don't jump around. */
export function dayHash(date: string, salt = ''): number {
  let h = 2166136261;
  for (const ch of date + salt) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
const pickFor = <T,>(list: T[], date: string, salt: string): T | null => (list.length ? list[dayHash(date, salt) % list.length] : null);

// ---------------------------------------------------------------- daily quest
export interface Quest {
  id: string;
  text: string;
}

/** Today's one small challenge, chosen from where you need it most (the same all day). */
export function todaysQuest(d: AppData, today: string): Quest {
  const red = d.topics.filter((t) => t.confidence === 'red');
  const perDay = safeToSpend(d.monthlyBudget, d.expenses, today).perDay;
  const calledRecently = [0, 1, 2].some((i) => d.habitLog[addDays(today, -i)]?.includes('family'));
  const candidates: (Quest | false)[] = [
    red.length > 0 && { id: 'red-topic', text: `Spend 25 minutes on "${pickFor(red, today, 'topic')!.name}" — one of your red topics.` },
    d.mistakes.some((m) => m.reviewAgain) && { id: 'mistake', text: 'Re-do one question from your mistake notebook without looking.' },
    !calledRecently && { id: 'family', text: 'Call or send a voice message to your family today.' },
    perDay > 0 && perDay < 15 ? { id: 'budget', text: `Keep today's spending under ${formatMoney(perDay)}.` } : { id: 'no-spend', text: 'Have a no-spend day: pack food from home.' },
    { id: 'water', text: 'Drink 2 glasses of water before your first class.' },
    { id: 'classmate', text: 'Ask a classmate one thing you’re unsure about.' },
    { id: 'walk', text: 'Take a 15-minute walk outside — Weston Park is lovely.' },
    { id: 'phone-away', text: 'Put your phone away 30 minutes before bed tonight.' },
    { id: 'quran', text: 'Read 2 extra pages of Qur’an today.' },
    { id: 'vocab', text: 'Add 2 new physics or maths words to your word list.' },
    { id: 'tidy', text: 'Tidy your desk for 5 minutes.' },
    { id: 'early', text: 'Arrive at your first class 5 minutes early.' },
    { id: 'thanks', text: 'Thank someone today — a teacher, a friend, a shopkeeper.' },
  ];
  return pickFor(candidates.filter(Boolean) as Quest[], today, 'quest')!;
}

// ---------------------------------------------------------------- word of the day
export function wordOfTheDay(d: AppData, today: string): VocabWord | null {
  return pickFor(d.vocab, today, 'word');
}

// ---------------------------------------------------------------- morning recall
/**
 * One mistake to answer again from memory. Prefers ones marked "review again"
 * and skips any recalled in the last 3 days. Once picked, it stays for the day.
 */
export function recallPick(d: AppData, today: string): Mistake | null {
  const kept = d.recall[today];
  if (kept) return d.mistakes.find((m) => m.id === kept.id) ?? null;
  const recent = new Set([1, 2, 3].map((i) => d.recall[addDays(today, -i)]?.id).filter(Boolean));
  const pool = d.mistakes.filter((m) => !recent.has(m.id));
  const tricky = pool.filter((m) => m.reviewAgain);
  return pickFor(tricky.length ? tricky : pool, today, 'recall');
}

// ---------------------------------------------------------------- money insights
/** A few honest, useful observations about your spending (empty if there's not enough data yet). */
export function moneyInsights(d: AppData, today: string): string[] {
  const out: string[] = [];
  const month = monthOf(today);
  const total = d.expenses.filter((e) => monthOf(e.date) === month).reduce((a, e) => a + e.amount, 0);
  if (total <= 0) return out;

  // 1. Where most of the money went this month
  const byCat = d.categories.map((c) => ({ c, spent: spentInMonth(d.expenses, month, c.id) })).sort((a, b) => b.spent - a.spent);
  if (byCat[0]?.spent > 0) out.push(`Most of this month's money went on ${byCat[0].c.name}: ${formatMoney(byCat[0].spent)} (${Math.round((byCat[0].spent / total) * 100)}%).`);

  // 2. This month so far vs the same days last month
  const day = Number(today.slice(8, 10));
  const lastMonthDate = addDays(`${month}-01`, -1).slice(0, 7);
  const lastSoFar = d.expenses.filter((e) => monthOf(e.date) === lastMonthDate && Number(e.date.slice(8, 10)) <= day).reduce((a, e) => a + e.amount, 0);
  if (lastSoFar > 0) {
    const diff = roundPennies(total - lastSoFar);
    out.push(diff <= 0 ? `You've spent ${formatMoney(-diff)} less than at this point last month. Nice!` : `You've spent ${formatMoney(diff)} more than at this point last month.`);
  }

  // 3. The weekday you spend most on (last 8 weeks)
  const since = addDays(today, -56);
  const byDay = new Array(7).fill(0);
  for (const e of d.expenses) if (e.date >= since && e.date <= today && !e.recurringId) byDay[weekdayOf(e.date)] += e.amount;
  const top = byDay.indexOf(Math.max(...byDay));
  if (byDay[top] > 0 && d.expenses.length >= 8) out.push(`You spend the most on ${WEEKDAYS_LONG[top]}s. Plan those days ahead.`);

  // 4. Small buys add up
  const small = d.expenses.filter((e) => monthOf(e.date) === month && e.amount < 5);
  if (small.length >= 3) out.push(`${small.length} small buys under $5 this month add up to ${formatMoney(roundPennies(small.reduce((a, e) => a + e.amount, 0)))}.`);

  // 5. Fun spending measured in savings-jar terms
  const goal = d.goals.find((g) => !g.reached);
  const fun = byCat.find((x) => x.c.id === 'fun' || /fun/i.test(x.c.name));
  if (goal && fun && fun.spent > 0) out.push(`This month's ${fun.c.name} (${formatMoney(fun.spent)}) = ${Math.round((fun.spent / goal.target) * 100)}% of "${goal.name}".`);

  return out;
}
