import { describe, expect, it } from 'vitest';
import { emptyData } from './seed';
import { deadlinesSoon, goalProgress, moneyToday, sleptHours } from './today';

const TODAY = '2026-11-05';

describe('the daily dashboard', () => {
  it('lists exams and deadlines in the next week, not events or done work', () => {
    const d = emptyData(TODAY);
    d.tests.push({ id: 'x', name: 'Mock exam', date: '2026-11-09', subjectId: null });
    d.tasks.push({ id: 't', title: 'Essay', due: '2026-11-06', done: false }, { id: 'done', title: 'Old', due: '2026-11-06', done: true });
    d.assignments.push({ id: 'a', title: 'Lab report', subjectId: null, due: '2026-11-20', dueTime: '', priority: 'high', status: 'todo', notes: '' });
    d.events.push({ id: 'e', title: 'Dentist', kind: 'appointment', date: '2026-11-06', start: '', end: '', endDate: '', repeat: 'none', until: '', location: '', notes: '' });
    expect(deadlinesSoon(d, TODAY).map((i) => i.title)).toEqual(['Essay', 'Mock exam']);
  });

  it('uses the money plan when there is one', () => {
    const d = emptyData(TODAY);
    d.pot = { total: 3020, start: '2026-11-04', months: 5 }; // $20 a day
    d.expenses.push({ id: 'e', amount: 7.5, categoryId: 'food', note: '', date: TODAY });
    expect(moneyToday(d, TODAY)).toEqual({ left: 12.5, spent: 7.5, source: 'plan' });
  });

  it('otherwise uses the monthly budget, as it stood this morning', () => {
    const d = emptyData(TODAY);
    d.monthlyBudget = 260; // 26 days left in November from the 5th → $10/day
    d.expenses.push({ id: 'e', amount: 4, categoryId: 'food', note: '', date: TODAY });
    expect(moneyToday(d, TODAY)).toEqual({ left: 6, spent: 4, source: 'month' });
  });

  it('shows the nearest dated goal, then the fullest savings jars', () => {
    const d = emptyData(TODAY);
    d.vision.push({ id: 'v', title: 'University offer', why: '', by: '2027-06-30', photo: '' }, { id: 'old', title: 'Past', why: '', by: '2026-01-01', photo: '' });
    d.goals.push(
      { id: 'g1', name: 'Flight home', target: 600, icon: 'plane', created: TODAY, deposits: [{ id: 'd', date: TODAY, amount: 450, note: '' }] },
      { id: 'g2', name: 'Laptop', target: 1000, icon: 'star', created: TODAY, deposits: [{ id: 'd', date: TODAY, amount: 100, note: '' }] },
    );
    expect(goalProgress(d, TODAY).map((g) => [g.title, g.pct, g.daysLeft])).toEqual([
      ['University offer', null, 237],
      ['Flight home', 0.75, null],
      ['Laptop', 0.1, null],
    ]);
  });

  it('works out sleep from bedtime and the Fajr-rise time', () => {
    const d = emptyData(TODAY);
    expect(sleptHours(d, TODAY)).toBeNull();
    d.sleepLog['2026-11-04'] = '23:20';
    d.rise[TODAY] = { time: '06:45', onTime: true };
    expect(sleptHours(d, TODAY)).toBe(7.5);
  });
});
