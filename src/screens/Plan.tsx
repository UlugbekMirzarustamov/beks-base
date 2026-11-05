/**
 * 💰 The money plan: one pot (e.g. $2,000) that has to last N months.
 *  - <PotToday>     today's allowance, what's left today, the pot and the wish fund
 *  - <PlanTab>      the pot, a "runway" to the end date, and a money calendar
 *  - <Wishes>       things you're saving for with the money you don't spend
 *  - <PotCloseout>  each new day: "Yesterday you saved $X → wish fund"
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { addDays, daysBetween, formatDay } from '../lib/dates';
import { uid } from '../lib/id';
import { formatMoney, parseAmount } from '../lib/money';
import { daysUntil, potStatus, spendByDay, type Pot } from '../lib/pot';
import { sfx } from '../lib/sound';
import type { Wish } from '../lib/types';
import { wishReady } from '../lib/push';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Bar, Empty, Field, Panel, useConfirm } from '../ui/kit';

const WISH_ICONS: Wish['icon'][] = ['gift', 'phone', 'plane', 'book', 'heart', 'star', 'house', 'globe'];

// ---------------------------------------------------------------- today (Home + Money)
export function PotToday() {
  const { data, today, openExpense } = useStore();
  const pot = data.pot!;
  const s = potStatus(pot, data.expenses, today);
  const over = s.leftToday < 0;
  return (
    <Panel title="Today's money" icon="coin" className="safe pot-today">
      <p className={`big-number ${over ? 'is-zero' : ''}`}>{formatMoney(Math.abs(s.leftToday))}</p>
      <p className="muted">
        {over ? 'over today’s allowance' : 'left to spend today'} · allowance {formatMoney(s.daily)} a day
      </p>
      <Bar value={s.spentToday} max={s.daily} level={over ? 'over' : s.spentToday >= s.daily * 0.8 ? 'warn' : 'ok'} label="Spent today" />
      <div className="pot-today__row">
        <span>
          <PixelIcon name="chest" size={16} /> Pot: <strong>{formatMoney(s.remaining)}</strong> <small className="muted">of {formatMoney(pot.total)}</small>
        </span>
        <span className="muted small">{s.daysLeft} days to go</span>
      </div>
      <a href="#/money/wishes" className={`pot-today__fund ${s.fund < 0 ? 'is-negative' : ''}`}>
        <PixelIcon name="star" size={16} /> Wish fund: <strong>{formatMoney(s.fund)}</strong>
        {s.leftToday > 0 && <small> (+{formatMoney(s.leftToday)} tonight if you stop here)</small>}
      </a>
      <button type="button" className="btn btn--primary btn--wide" onClick={() => openExpense()}>
        <PixelIcon name="plus" size={18} /> I spent something
      </button>
    </Panel>
  );
}

// ---------------------------------------------------------------- plan tab
export function PlanTab() {
  const { data, update, today, toast } = useStore();
  const pot = data.pot;
  if (!pot) return <PlanSetup />;
  const s = potStatus(pot, data.expenses, today);
  const pct = (d: string) => Math.min(100, Math.max(0, (daysBetween(pot.start, d) / s.totalDays) * 100));
  const spareDays = s.avgPerDay ? Math.floor(s.remaining / s.avgPerDay) - s.daysLeft : null;
  const byDay = spendByDay(data.expenses, pot.start, today);
  const days = Array.from({ length: Math.min(s.totalDays, daysBetween(pot.start, today) + 1) }, (_, i) => addDays(pot.start, i));

  return (
    <div className="grid grid--2">
      <PotToday />

      <Panel title="The pot" icon="chest">
        <div className="pot-stats">
          <div>
            <span className="big-number big-number--small">{formatMoney(s.remaining)}</span>
            <small className="muted">left of {formatMoney(pot.total)}</small>
          </div>
          <div>
            <span className="big-number big-number--small">{s.daysLeft}</span>
            <small className="muted">days left · until {formatDay(s.end)}</small>
          </div>
        </div>
        <Bar value={pot.total - s.remaining} max={pot.total} label="Pot used" level={s.fund < 0 ? 'warn' : 'ok'} />
        <ul className="insights">
          <li>
            <PixelIcon name="coin" size={14} /> Plan: <strong>{formatMoney(s.daily)}</strong> a day ({formatMoney(pot.total)} ÷ {s.totalDays} days).
          </li>
          <li>
            <PixelIcon name="star" size={14} /> If you used your savings too, you could spend <strong>{formatMoney(s.evenPerDay)}</strong> a day from now on.
          </li>
          {s.avgPerDay !== null && (
            <li>
              <PixelIcon name="calendar" size={14} /> You've averaged <strong>{formatMoney(s.avgPerDay)}</strong> a day so far.
            </li>
          )}
          <li>
            <PixelIcon name="flame" size={14} /> <strong>{s.underStreak}</strong>-day streak within your allowance.
          </li>
        </ul>
      </Panel>

      <Panel title="Money runway" icon="plane">
        <p className="muted small">Where your money takes you at your current pace.</p>
        <div className="runway" aria-hidden="true">
          <span className="runway__road" />
          <span className="runway__done" style={{ width: `${pct(today)}%` }} />
          <span className="runway__you" style={{ left: `${pct(today)}%` }} title="Today">
            <PixelIcon name="cat" size={18} />
          </span>
          {s.runsOutOn && <span className="runway__empty" style={{ left: `${pct(s.runsOutOn)}%` }} title="Money runs out" />}
          <span className="runway__flag" title="End of the plan">
            <PixelIcon name="house" size={18} />
          </span>
        </div>
        <div className="runway__labels">
          <span>{formatDay(pot.start)}</span>
          <span>{formatDay(s.end)}</span>
        </div>
        <p className={`alert ${s.runsOutOn ? 'alert--over' : 'alert--ok'}`}>
          {s.avgPerDay === null
            ? 'Log a few days of spending and your runway will appear.'
            : s.runsOutOn
              ? `At ${formatMoney(s.avgPerDay)}/day your money runs out on ${formatDay(s.runsOutOn)} — ${daysBetween(s.runsOutOn, s.end)} days too early. Aim for ${formatMoney(s.evenPerDay)}/day.`
              : `At ${formatMoney(s.avgPerDay)}/day your money lasts the whole plan${spareDays && spareDays > 0 ? ` with about ${spareDays} days to spare` : ''}.`}
        </p>
      </Panel>

      <Panel title="Money calendar" icon="calendar">
        <p className="muted small">Each square is a day: green = within {formatMoney(s.daily)}, red = over.</p>
        <ol className="money-cal">
          {days.map((d) => {
            const spent = byDay.get(d) ?? 0;
            const state = d === today ? 'today' : spent <= s.daily ? (spent <= s.daily / 2 ? 'great' : 'ok') : 'over';
            return <li key={d} className={`money-cal__day is-${state}`} title={`${formatDay(d)}: ${formatMoney(spent)}`} aria-label={`${formatDay(d)}: spent ${formatMoney(spent)}`} />;
          })}
        </ol>
        <details className="details">
          <summary>Change the plan</summary>
          <PlanSetup
            current={pot}
            onSaved={(p) => {
              update((x) => void (x.pot = { ...p, lastCloseout: x.pot?.lastCloseout ?? today }));
              toast('Plan updated', 'pop');
            }}
          />
        </details>
      </Panel>
    </div>
  );
}

function PlanSetup({ current, onSaved }: { current?: Pot; onSaved?: (p: Pot) => void }) {
  const { update, today, toast } = useStore();
  const [form, setForm] = useState({ total: current ? String(current.total) : '', start: current?.start ?? today, months: String(current?.months ?? 5) });
  const save = (e: FormEvent) => {
    e.preventDefault();
    const total = parseAmount(form.total);
    const months = Math.round(Number(form.months));
    if (!(total > 0) || !(months >= 1 && months <= 24) || !form.start) {
      toast('Check the amount, start date and months', 'error');
      return;
    }
    const p: Pot = { total, start: form.start, months };
    if (onSaved) onSaved(p);
    else {
      update((d) => void (d.pot = { ...p, lastCloseout: today }));
      toast('Money plan started!', 'pop');
    }
  };
  return (
    <form className="form" onSubmit={save}>
      <div className="form__row form__row--wrap">
        <Field label="Money in the pot ($)" className="grow">
          <input className="input" inputMode="decimal" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} placeholder="e.g. 2000" />
        </Field>
        <Field label="Starting">
          <input className="input" type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
        </Field>
        <Field label="Months">
          <input className="input" type="number" min={1} max={24} value={form.months} onChange={(e) => setForm({ ...form, months: e.target.value })} />
        </Field>
      </div>
      <button type="submit" className="btn btn--primary">
        {current ? 'Save plan' : 'Start my money plan'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------- wishes
export function Wishes() {
  const { data, update, today, toast, gainXp } = useStore();
  const ask = useConfirm();
  const [form, setForm] = useState({ name: '', cost: '', icon: 'gift' as Wish['icon'] });
  const [extra, setExtra] = useState(0); // "what if I spend $X less a day?"
  if (!data.pot) return <Empty>Start a money plan first (Money → Plan).</Empty>;
  const s = potStatus(data.pot, data.expenses, today);
  // How much you've been saving per day on average (only counts if positive).
  const savingPerDay = s.daysPassed > 0 ? Math.max(0, s.fund / s.daysPassed) : 0;
  const open = data.wishes.filter((w) => !w.bought).sort((a, b) => a.cost - b.cost);
  const done = data.wishes.filter((w) => w.bought).sort((a, b) => (b.bought ?? '').localeCompare(a.bought ?? ''));

  const add = (e: FormEvent) => {
    e.preventDefault();
    const cost = parseAmount(form.cost);
    if (!form.name.trim() || !(cost > 0)) {
      toast('Tell me what you wish for and roughly how much it costs', 'error');
      return;
    }
    update((d) => void d.wishes.push({ id: uid(), name: form.name.trim(), cost, icon: form.icon, created: today }));
    toast(`Wish added: ${form.name.trim()} ✨`, 'pop');
    sfx('twinkle');
    setForm({ name: '', cost: '', icon: 'gift' });
  };

  const grant = async (w: Wish) => {
    if (!(await ask(`Buy "${w.name}" for about ${formatMoney(w.cost)}? It comes out of your pot and wish fund.`, { ok: 'Make it come true', danger: false }))) return;
    const cat = data.categories.find((c) => c.id === 'fun') ?? data.categories.find((c) => c.id === 'other') ?? data.categories[0];
    update((d) => {
      const item = d.wishes.find((x) => x.id === w.id);
      if (item) item.bought = today;
      d.expenses.push({ id: uid(), amount: w.cost, categoryId: cat.id, note: `Wish: ${w.name}`, date: today, fromWish: true });
    });
    sfx('levelup');
    toast(`Wish come true: ${w.name}! You earned it.`, 'level');
    gainXp(30, 'a wish came true');
  };

  const remove = async (w: Wish) => {
    if (!(await ask(`Remove the wish "${w.name}"?`, { ok: 'Remove' }))) return;
    update((d) => void (d.wishes = d.wishes.filter((x) => x.id !== w.id)));
  };

  const perDay = savingPerDay + extra;
  return (
    <div className="grid grid--2">
      <Panel title="Wish fund" icon="star" className="wish-fund">
        <p className={`big-number ${s.fund < 0 ? 'is-zero' : ''}`}>{formatMoney(s.fund)}</p>
        <p className="muted">
          Every day you spend less than {formatMoney(s.daily)}, the rest lands here. Overspending takes from it.
          {s.leftToday > 0 && ` Today could add ${formatMoney(s.leftToday)} more.`}
        </p>
        <Field label={`What if I spend ${formatMoney(extra)} less every day?`}>
          <input className="slider" type="range" min={0} max={15} step={1} value={extra} onChange={(e) => setExtra(Number(e.target.value))} />
        </Field>
        <p className="small">
          {perDay > 0 ? (
            <>
              Saving about <strong>{formatMoney(perDay)}</strong> a day{extra > 0 && ' (with the what-if)'}.
            </>
          ) : (
            'Spend a little less than your allowance for a few days and estimates will appear.'
          )}
        </p>
      </Panel>

      <Panel title="Make a wish" icon="plus">
        <form className="form" onSubmit={add}>
          <Field label="What do you wish for?">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. AirPods, a winter coat, a trip to London" />
          </Field>
          <Field label="About how much? ($)">
            <input className="input input--big" inputMode="decimal" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="120" />
          </Field>
          <div className="chip-grid" role="radiogroup" aria-label="Picture">
            {WISH_ICONS.map((icon) => (
              <button key={icon} type="button" role="radio" aria-checked={form.icon === icon} className="chip" onClick={() => setForm({ ...form, icon })} aria-label={icon}>
                <PixelIcon name={icon} size={22} />
              </button>
            ))}
          </div>
          <button type="submit" className="btn btn--primary">
            <PixelIcon name="star" size={16} /> Add to my wishes
          </button>
        </form>
      </Panel>

      {open.map((w) => {
        // Hard mode: a wish only unlocks once the fund covers it + 10% safety.
        const target = data.settings.hardMode ? Math.round(w.cost * 110) / 100 : w.cost;
        const pct = Math.max(0, Math.min(100, (s.fund / target) * 100));
        const wait = daysUntil(target, s.fund, perDay);
        const ready = wishReady(s.fund, w.cost, data.settings.hardMode);
        const sooner = !ready && savingPerDay > 0 ? daysUntil(target, s.fund, savingPerDay + 3) : null;
        const now = !ready && savingPerDay > 0 ? daysUntil(target, s.fund, savingPerDay) : null;
        return (
          <Panel key={w.id} title={w.name} icon={w.icon} className={`wish ${ready ? 'is-ready' : ''}`} actions={<button type="button" className="icon-btn" onClick={() => remove(w)} aria-label={`Remove ${w.name}`}><PixelIcon name="trash" size={16} /></button>}>
            <div className="wish__stars" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={`wish__star ${i < Math.floor(pct / 10) ? 'is-on' : ''}`} />
              ))}
            </div>
            <p>
              <strong>{formatMoney(Math.max(0, s.fund))}</strong> of about {formatMoney(w.cost)} · {Math.floor(pct)}%
            </p>
            {ready ? (
              <>
                <p className="alert alert--ok">Your wish fund can cover this now — without touching the money you need.</p>
                <button type="button" className="btn btn--primary" onClick={() => grant(w)}>
                  <PixelIcon name="star" size={16} /> Make it come true
                </button>
              </>
            ) : wait !== null ? (
              <p>
                At this pace: around <strong>{formatDay(addDays(today, wait))}</strong> ({wait} day{wait === 1 ? '' : 's'}).
                {sooner !== null && now !== null && now - sooner > 0 && (
                  <small className="muted"> One $3 coffee less a day → {now - sooner} days sooner.</small>
                )}
              </p>
            ) : (
              <p className="muted small">Spend a little under {formatMoney(s.daily)} a day and this starts filling up.</p>
            )}
          </Panel>
        );
      })}

      {done.length > 0 && (
        <Panel title="Wishes come true" icon="gift">
          <ul className="wish-shelf">
            {done.map((w) => (
              <li key={w.id}>
                <PixelIcon name={w.icon} size={22} />
                <span>
                  <strong>{w.name}</strong>
                  <small className="muted"> · {formatMoney(w.cost)} · {formatDay(w.bought!)}</small>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- the nightly "you saved…"
/** On the first open of a new day: tell Bek what yesterday added to (or took from) the wish fund. */
export function PotCloseout() {
  const { data, update, today, toast } = useStore();
  const pot = data.pot;
  const doneFor = useRef('');
  useEffect(() => {
    // The ref makes sure the message shows once per day (React may run effects twice in development).
    if (!pot || !pot.lastCloseout || pot.lastCloseout >= today || doneFor.current === today) return;
    doneFor.current = today;
    const yesterday = addDays(today, -1);
    if (yesterday >= pot.start) {
      const s = potStatus(pot, data.expenses, today);
      const spent = spendByDay(data.expenses, yesterday, yesterday).get(yesterday) ?? 0;
      const diff = Math.round((s.daily - spent) * 100) / 100;
      if (diff > 0) {
        toast(`Yesterday you saved ${formatMoney(diff)} → wish fund is now ${formatMoney(s.fund)}`, 'pop');
        setTimeout(() => sfx('coin'), 300);
      } else if (diff < 0) toast(`Yesterday was ${formatMoney(-diff)} over. Today's a fresh ${formatMoney(s.daily)}.`, 'info');
    }
    update((d) => void (d.pot && (d.pot.lastCloseout = today)));
  }, [pot, today, data.expenses, toast, update]);
  return null;
}
