/**
 * 🎯 Planner → Goals: three simple lists, this year, this month and this week. Tick them off;
 * carry unfinished ones over. (Today's goals are your top 3 on the Today tab.) No points.
 */
import { useState, type FormEvent } from 'react';
import { addDays, formatDay, formatMonth } from '../lib/dates';
import { carryOverCandidates, goalsIn, levelProgress, periodOf } from '../lib/goals';
import { uid } from '../lib/id';
import type { GoalLevel } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Empty, Panel } from '../ui/kit';

const TITLES: Record<GoalLevel, (period: string) => string> = {
  year: (p) => `Goals for ${p}`,
  month: (p) => `Goals for ${formatMonth(p)}`,
  week: (p) => `This week · ${formatDay(p)} – ${formatDay(addDays(p, 6))}`,
};
const PLACEHOLDER: Record<GoalLevel, string> = {
  year: 'e.g. Get a First in Physics',
  month: 'e.g. Finish the mechanics chapter',
  week: 'e.g. Do the SUVAT question sheet',
};

export default function Goals() {
  return (
    <div className="grid grid--2">
      <LevelPanel level="year" />
      <LevelPanel level="month" />
      <LevelPanel level="week" />
    </div>
  );
}

function LevelPanel({ level }: { level: GoalLevel }) {
  const { data, update, today, toast } = useStore();
  const period = periodOf(level, today);
  const goals = goalsIn(data.planGoals, level, period);
  const { done, total } = levelProgress(data.planGoals, level, period);
  const carry = carryOverCandidates(data.planGoals, level, today);
  const [title, setTitle] = useState('');

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    update((d) => void d.planGoals.push({ id: uid(), level, period, title: title.trim(), done: false, parentId: null }));
    setTitle('');
  };
  const toggle = (id: string) =>
    update((d) => {
      const g = d.planGoals.find((x) => x.id === id);
      if (g) g.done = !g.done;
    });
  const remove = (id: string) =>
    update((d) => {
      d.planGoals = d.planGoals.filter((x) => x.id !== id);
      for (const g of d.planGoals) if (g.parentId === id) g.parentId = null;
    });
  const carryOver = () => {
    update((d) => {
      for (const g of carry) d.planGoals.push({ id: uid(), level, period, title: g.title, done: false, parentId: null });
    });
    toast(`Carried over ${carry.length} goal${carry.length === 1 ? '' : 's'}`, 'pop');
  };

  return (
    <Panel title={TITLES[level](period)} icon={level === 'year' ? 'star' : level === 'month' ? 'calendar' : 'check'}>
      {total > 0 && (
        <p className="muted small">
          {done} of {total} done
        </p>
      )}
      {goals.length === 0 && <Empty>No {level} goals yet.</Empty>}
      <ul className="tasks">
        {goals.map((g) => {
          return (
            <li key={g.id} className={`task ${g.done ? 'is-done' : ''}`}>
              <input type="checkbox" className="pixel-check" checked={g.done} onChange={() => toggle(g.id)} aria-label={`Done: ${g.title}`} />
              <span className="grow goal-row">
                <span className="task__title">{g.title}</span>
              </span>
              <button type="button" className="icon-btn" onClick={() => remove(g.id)} aria-label={`Delete ${g.title}`}>
                <PixelIcon name="trash" size={16} />
              </button>
            </li>
          );
        })}
      </ul>
      {carry.length > 0 && (
        <button type="button" className="btn btn--small" onClick={carryOver}>
          Carry over {carry.length} unfinished from last {level}
        </button>
      )}
      <form className="form" onSubmit={add}>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={PLACEHOLDER[level]} aria-label={`New ${level} goal`} maxLength={100} />
        <button type="submit" className="btn btn--primary">
          <PixelIcon name="plus" size={16} /> Add {level} goal
        </button>
      </form>
    </Panel>
  );
}
