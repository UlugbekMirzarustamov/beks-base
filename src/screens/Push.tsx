/**
 * 💪 The "push me" features:
 *  - Fajr rise: tap "I'm up" each morning. Sleep through Fajr and you get the
 *    brutal wake-up call (OversleptCall): harsh on purpose, because you asked.
 *  - Morning promise: promise Simba one hard thing. Keep it → XP. Break it → coins.
 *  - You vs last week: race last week's ghost, day by day.
 *  - Hard mode: stricter rules (see HARD_RULES).
 *  - Vision board: your big goals with a picture and a "why".
 */
import { useState, type FormEvent } from 'react';
import { dayHash } from '../lib/daily';
import { addDays, daysBetween, formatDay, UK_TZ, zonedParts } from '../lib/dates';
import { uid } from '../lib/id';
import { formatMoney } from '../lib/money';
import { minsToClock, prayerTimes } from '../lib/prayer';
import {
  brutalLine,
  ghostRace,
  HARD_RULES,
  OVERSLEPT_XP,
  oversleptRecently,
  PROMISE_XP,
  promiseIdeas,
  promisePenalty,
  riseOnTime,
  riseStreak,
  unresolvedPromise,
} from '../lib/push';
import { buzz, sfx } from '../lib/sound';
import type { AppData, VisionGoal } from '../lib/types';
import { useStore } from '../state/store';
import { PixelArt, PixelIcon } from '../ui/icons';
import { Empty, Field, Panel, useConfirm } from '../ui/kit';
import { shrink } from './Photos';

const RISE_XP = 15;
const ukNow = () => {
  const p = zonedParts(new Date(), UK_TZ);
  return { mins: p.hour * 60 + p.minute, hhmm: `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}` };
};

// ---------------------------------------------------------------- Fajr rise
/** Home card in the morning (from Fajr until noon) until you say when you got up. */
export function FajrRise() {
  const { data, update, today, gainXp, toast } = useStore();
  const t = prayerTimes(today, data.settings.prayer);
  const now = ukNow();
  const streak = riseStreak(data, today);
  if (data.rise[today] || now.mins < t.fajr || now.mins >= 12 * 60) return null;

  const up = (wasUpForFajr: boolean) => {
    const onTime = wasUpForFajr || riseOnTime(now.hhmm, t.sunrise);
    update((d) => void (d.rise[today] = { time: now.hhmm, onTime }));
    if (onTime) {
      sfx('bell');
      buzz(20);
      gainXp(RISE_XP, 'up for Fajr');
      toast(streak > 0 ? `Up for Fajr, ${streak + 1} mornings in a row. That's discipline.` : 'Up for Fajr. That’s how winners start.', 'level');
    } else if (data.settings.hardMode) gainXp(-OVERSLEPT_XP);
  };

  if (now.mins < t.sunrise) {
    return (
      <Panel title="Fajr rise" icon="sun" className="rise-card">
        <p>
          Fajr is now, until sunrise at <strong>{minsToClock(t.sunrise)}</strong>. Get up, make wudu, pray.
        </p>
        <button type="button" className="btn btn--primary btn--wide" onClick={() => up(false)}>
          <PixelIcon name="sun" size={18} /> I'm up!
        </button>
        {streak > 0 && <p className="muted small">{streak} morning{streak === 1 ? '' : 's'} in a row. Don't break it.</p>}
      </Panel>
    );
  }
  return (
    <Panel title="Fajr rise" icon="sun" className="rise-card is-late">
      <p>
        The sun rose at <strong>{minsToClock(t.sunrise)}</strong>. Were you up for Fajr at {minsToClock(t.fajr)}? Be honest.
      </p>
      <div className="form__actions">
        <button type="button" className="btn grow" onClick={() => up(true)}>
          I was up, forgot to tap
        </button>
        <button type="button" className="btn btn--danger grow" onClick={() => up(false)}>
          I overslept
        </button>
      </div>
    </Panel>
  );
}

const SEEN_KEY = 'beks-overslept-seen';

/** Full screen, red, no softening: shown once on a day you slept through Fajr. */
export function OversleptCall() {
  const { data, today } = useStore();
  const [, setTick] = useState(0);
  const rise = data.rise[today];
  let seen = false;
  try {
    seen = localStorage.getItem(SEEN_KEY) === today;
  } catch {
    /* storage blocked: show it */
  }
  if (!rise || rise.onTime || seen) return null;

  const t = prayerTimes(today, data.settings.prayer);
  const fajr = minsToClock(t.fajr);
  const sunrise = minsToClock(t.sunrise);
  const times = oversleptRecently(data, today);
  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, today);
    } catch {
      /* ignore */
    }
    setTick((n) => n + 1);
  };
  return (
    <div className="overslept" role="alertdialog" aria-modal="true" aria-labelledby="overslept-title">
      <p className="overslept__label">{formatDay(today)}</p>
      <h2 id="overslept-title" className="overslept__title">
        You slept through Fajr.
      </h2>
      <p className="overslept__line">{brutalLine(today, fajr, sunrise)}</p>
      <ul className="overslept__facts">
        <li>Fajr {fajr}</li>
        <li>Sunrise {sunrise}</li>
        <li>You got up {rise.time}</li>
        <li>
          {times}× in 30 days
        </li>
      </ul>
      {data.settings.hardMode && <p className="overslept__penalty">Hard mode: −{OVERSLEPT_XP} XP.</p>}
      <div className="overslept__now">
        <p>
          <strong>Now fix it:</strong>
        </p>
        <ol>
          <li>Pray Fajr now as qada. Before anything else.</li>
          <li>Tonight: phone across the room, in bed by 23:30.</li>
          <li>Two alarms: one at Fajr, one 5 minutes later.</li>
        </ol>
      </div>
      <button type="button" className="btn btn--primary btn--wide" onClick={close} autoFocus>
        I'll pray it now. Tomorrow I'm up.
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- morning promise
export function MorningPromise() {
  const { data, update, today, gainXp, toast } = useStore();
  const [text, setText] = useState('');
  const hard = data.settings.hardMode;
  const penalty = promisePenalty(hard);
  const pending = unresolvedPromise(data, today);
  const promise = data.promises[today];

  const answer = (day: string, kept: boolean) => {
    update((d) => {
      d.promises[day] = { ...d.promises[day], kept };
      if (!kept) d.shop.spent += penalty;
    });
    if (kept) {
      sfx('levelup');
      gainXp(PROMISE_XP, 'promise kept');
      toast('Simba: "You kept your word. I knew you would."', 'level');
    } else {
      buzz([40, 60, 40]);
      toast(`−${penalty} coins. Simba: "You promised me…"`, 'warn');
    }
  };
  const make = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    update((d) => void (d.promises[today] = { text: text.trim() }));
    sfx('pop');
    toast('Promise made. Simba is watching.', 'info');
    setText('');
  };
  const buttons = (day: string) => (
    <div className="form__actions">
      <button type="button" className="btn btn--primary grow" onClick={() => answer(day, true)}>
        I kept it ✓
      </button>
      <button type="button" className="btn btn--danger grow" onClick={() => answer(day, false)}>
        I broke it (−{penalty} coins)
      </button>
    </div>
  );

  if (pending) {
    return (
      <Panel title="Did you keep your promise?" icon="cat" className="promise-card">
        <p className="promise-card__text">“{data.promises[pending].text}”</p>
        <p className="muted small">You promised this on {formatDay(pending)}. Be honest. Simba knows.</p>
        {buttons(pending)}
      </Panel>
    );
  }
  if (promise) {
    return (
      <Panel title="Today's promise" icon="cat" className={`promise-card ${promise.kept === undefined ? '' : promise.kept ? 'is-kept' : 'is-broken'}`}>
        <p className="promise-card__text">“{promise.text}”</p>
        {promise.kept === undefined ? buttons(today) : <p className="muted small">{promise.kept ? `Kept. +${PROMISE_XP} XP. Simba is proud.` : 'Broken. Tomorrow, make it count.'}</p>}
      </Panel>
    );
  }
  return (
    <Panel title="Promise Simba one hard thing" icon="cat" className="promise-card">
      <form className="form" onSubmit={make}>
        <p className="muted small">
          Keep it: +{PROMISE_XP} XP. Break it: −{penalty} coins. Pick something a bit hard.
        </p>
        <div className="chips">
          {promiseIdeas(data, today).map((idea) => (
            <button key={idea} type="button" className={`chip ${text === idea ? 'is-on' : ''}`} onClick={() => setText(idea)}>
              {idea}
            </button>
          ))}
        </div>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Today I promise to…" aria-label="Your promise for today" maxLength={80} />
        <button type="submit" className="btn btn--primary" disabled={!text.trim()}>
          I promise
        </button>
      </form>
    </Panel>
  );
}

// ---------------------------------------------------------------- you vs last week
const GHOST = ['..kkkk..', '.kwwwwk.', 'kwkwwkwk', 'kwwwwwwk', 'kwwkkwwk', 'kwwwwwwk', 'kwkwwkwk', 'k.k..k.k'];

export function GhostRace() {
  const { data, today } = useStore();
  const hard = data.settings.hardMode;
  const { rows, ahead } = ghostRace(data, today, hard);
  const behind = rows.filter((r) => r.status === 'behind').length;
  const show = (n: number, money: boolean) => (money ? formatMoney(n) : String(Math.round(n * 10) / 10));
  return (
    <Panel title={`You vs last week${hard ? ' (+10%)' : ''}`} icon="star" className="ghost-race">
      <p className="ghost-race__score">
        <PixelArt rows={GHOST} palette={{ k: '#2b1d0e', w: '#e8eef5' }} size={28} />
        <span>
          {ahead > behind ? (
            <>
              You're <strong>ahead</strong> of last week's ghost in {ahead} of {rows.length}. Keep the lead.
            </>
          ) : ahead === behind ? (
            <>Neck and neck with last week's ghost. Push today.</>
          ) : (
            <>
              Last week's ghost is <strong>beating you</strong> in {behind} of {rows.length}. Catch it.
            </>
          )}
        </span>
      </p>
      <ul className="ghost-rows">
        {rows.map((r) => {
          const money = r.id === 'spent';
          const max = Math.max(r.you, r.ghost, 1);
          return (
            <li key={r.id} className={`ghost-row is-${r.status}`}>
              <span className="ghost-row__label">
                {r.label}
                {r.lowerIsBetter ? ' (less wins)' : ''}
              </span>
              <span className="ghost-row__bars" role="img" aria-label={`You ${show(r.you, money)}, ghost ${show(r.ghost, money)}`}>
                <span className="ghost-row__bar ghost-row__bar--you" style={{ width: `${(r.you / max) * 100}%` }} />
                <span className="ghost-row__bar ghost-row__bar--ghost" style={{ width: `${(r.ghost / max) * 100}%` }} />
              </span>
              <span className="ghost-row__nums">
                <strong>{show(r.you, money)}</strong>
                <small>{show(r.ghost, money)}</small>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="muted small">Gold = you this week so far. Grey = you last week by the same day{hard ? ', +10% in hard mode' : ''}.</p>
    </Panel>
  );
}

// ---------------------------------------------------------------- hard mode
export function HardModeToggle() {
  const { data, update, toast } = useStore();
  const ask = useConfirm();
  const on = data.settings.hardMode;
  const flip = async () => {
    if (!on && !(await ask('Turn on hard mode? The rules get stricter until you turn it off.', { ok: 'Go hard', danger: true }))) return;
    update((d) => void (d.settings.hardMode = !on));
    sfx(on ? 'tick' : 'levelup');
    toast(on ? 'Hard mode off. Rest is part of training too.' : 'Hard mode ON. No excuses this week.', on ? 'info' : 'level');
  };
  return (
    <Panel title="Hard mode" icon="sword" className={`hard-mode ${on ? 'is-on' : ''}`}>
      <p>For weeks when you want to go all in:</p>
      <ul className="ready-list">
        {HARD_RULES.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <button type="button" className={`btn btn--wide ${on ? '' : 'btn--danger'}`} onClick={flip} aria-pressed={on}>
        {on ? 'Turn hard mode off' : 'Turn on hard mode'}
      </button>
    </Panel>
  );
}

/** The little red badge in the top bar while hard mode is on. */
export function HardBadge() {
  const { data } = useStore();
  if (!data.settings.hardMode) return null;
  return (
    <a href="#/more/settings" className="hard-badge" aria-label="Hard mode is on">
      HARD
    </a>
  );
}

// ---------------------------------------------------------------- vision board
/** One of your goals for today's briefing (the same all day). */
export const visionOfTheDay = (d: AppData, today: string): VisionGoal | null => {
  const open = d.vision.filter((g) => !g.done);
  return open.length ? open[dayHash(today, 'vision') % open.length] : null;
};

const emptyGoal = { title: '', why: '', by: '', photo: '' };

export function VisionBoard() {
  const { data, update, today, toast, gainXp } = useStore();
  const ask = useConfirm();
  const [form, setForm] = useState(emptyGoal);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const photo = await shrink(file, 600);
      setForm((f) => ({ ...f, photo }));
    } catch {
      toast("Couldn't open that picture.", 'error');
    } finally {
      setBusy(false);
    }
  };
  const reset = () => {
    setForm(emptyGoal);
    setEditing(null);
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast('Give your goal a name', 'error');
      return;
    }
    update((d) => {
      const value = { title: form.title.trim(), why: form.why.trim(), by: form.by, photo: form.photo };
      if (editing) Object.assign(d.vision.find((g) => g.id === editing) ?? {}, value);
      else d.vision.push({ id: uid(), ...value });
    });
    sfx('pop');
    toast(editing ? 'Goal updated' : 'Pinned to your vision board', 'pop');
    reset();
  };
  const achieve = async (g: VisionGoal) => {
    if (!(await ask(`Did you really achieve "${g.title}"?`, { ok: 'Yes, I did it!', danger: false }))) return;
    update((d) => void (d.vision.find((x) => x.id === g.id)!.done = today));
    sfx('levelup');
    gainXp(100, `goal achieved: ${g.title}`);
    toast('ALHAMDULILLAH! You did it!', 'level');
  };
  const remove = async (g: VisionGoal) => {
    if (!(await ask(`Take "${g.title}" off your vision board?`))) return;
    update((d) => void (d.vision = d.vision.filter((x) => x.id !== g.id)));
    if (editing === g.id) reset();
  };

  const open = data.vision.filter((g) => !g.done);
  const done = data.vision.filter((g) => g.done);
  return (
    <div className="grid grid--2">
      <Panel title="Your vision board" icon="star" className="vision">
        {open.length === 0 && <Empty>Pin your big goals here: the university offer, the grade, what you'll do for your parents one day. One shows up every morning.</Empty>}
        <ul className="vision__grid">
          {open.map((g) => {
            const days = g.by ? daysBetween(today, g.by) : null;
            return (
              <li key={g.id} className="vision-card">
                {g.photo ? (
                  <img src={g.photo} alt="" className="vision-card__img" />
                ) : (
                  <span className="vision-card__img vision-card__img--empty" aria-hidden="true">
                    <PixelIcon name="star" size={40} />
                  </span>
                )}
                <strong className="vision-card__title">{g.title}</strong>
                {g.why && <p className="vision-card__why">Why: {g.why}</p>}
                {days !== null && <small className="muted">{days >= 0 ? `${days} days left · ${formatDay(g.by)}` : `Target was ${formatDay(g.by)}`}</small>}
                <div className="vision-card__actions">
                  <button type="button" className="btn btn--small btn--primary" onClick={() => achieve(g)}>
                    Achieved!
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => {
                      setEditing(g.id);
                      setForm({ title: g.title, why: g.why, by: g.by, photo: g.photo });
                    }}
                    aria-label={`Edit ${g.title}`}
                  >
                    <PixelIcon name="pencil" size={16} />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => remove(g)} aria-label={`Remove ${g.title}`}>
                    <PixelIcon name="trash" size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {done.length > 0 && (
          <details className="details">
            <summary>Achieved ({done.length})</summary>
            <ul className="list">
              {done.map((g) => (
                <li key={g.id}>
                  ✓ <strong>{g.title}</strong> <small className="muted">· {formatDay(g.done!)}</small>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Panel>
      <Panel title={editing ? 'Edit goal' : 'Pin a goal'} icon="plus">
        <form className="form" onSubmit={save}>
          <Field label="The goal">
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Get an offer from Sheffield Uni" maxLength={70} />
          </Field>
          <Field label="Why it matters to you">
            <textarea className="input" rows={2} value={form.why} onChange={(e) => setForm({ ...form, why: e.target.value })} placeholder="e.g. So Mum and Dad see it was worth it" />
          </Field>
          <Field label="By when (optional)">
            <input className="input" type="date" value={form.by} min={addDays(today, 1)} onChange={(e) => setForm({ ...form, by: e.target.value })} />
          </Field>
          <label className="btn file-btn">
            <PixelIcon name="photo" size={16} /> {busy ? 'Loading…' : form.photo ? 'Change picture' : 'Add a picture'}
            <input type="file" accept="image/*" className="visually-hidden" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
          </label>
          {form.photo && <img src={form.photo} alt="" className="vision-card__img vision-card__img--preview" />}
          <div className="form__actions">
            {editing && (
              <button type="button" className="btn" onClick={reset}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn--primary grow">
              {editing ? 'Save' : 'Pin it'}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
