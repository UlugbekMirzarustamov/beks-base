/**
 * 🕌 Prayer → Jumu'ah and Prayer → Hifz, plus the Islamic calendar panel (loaded on demand).
 *  - Jumu'ah: the Friday sunnahs as a gentle checklist, with your mosque's khutbah time.
 *  - Hifz: the surahs you're memorising, and which ones to revise today (spaced out as they stay solid).
 * Private worship: no XP, coins, streaks or scores anywhere here. Logic lives in lib/islamic.ts.
 */
import { useState } from 'react';
import { daysBetween, formatDay, relativeDays } from '../lib/dates';
import { afterRevision, dueForRevision, FRIDAY_STEPS, hijriLabel, nextFriday, nextOccasions } from '../lib/islamic';
import { minsToClock, prayerTimes } from '../lib/prayer';
import { SURAHS } from '../lib/surahs';
import type { HifzItem } from '../lib/types';
import { useStore } from '../state/store';
import { Bar, Empty, Field, Panel, useConfirm } from '../ui/kit';

// ---------------------------------------------------------------- Jumu'ah
export function JumuahTab() {
  const { data, update, today } = useStore();
  const friday = nextFriday(today);
  const isToday = friday === today;
  const done = data.friday[friday] ?? [];
  const times = prayerTimes(friday, data.settings.prayer);
  const toggle = (id: string) =>
    update((d) => {
      const list = d.friday[friday] ?? [];
      d.friday[friday] = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    });

  return (
    <div className="grid grid--2">
      <Panel title={isToday ? "Jumu'ah Mubarak" : `Next Jumu'ah · ${formatDay(friday)}`} icon="mat">
        <p className="muted small">
          {isToday ? 'Today is Friday, the best day of the week.' : `It's ${relativeDays(daysBetween(today, friday))}; the checklist opens on the day.`} A gentle checklist for you
          only — nothing is counted.
        </p>
        <ul className="tasks">
          {FRIDAY_STEPS.map((s) => (
            <li key={s.id} className={`task ${done.includes(s.id) ? 'is-done' : ''}`}>
              <input type="checkbox" className="pixel-check" checked={done.includes(s.id)} disabled={!isToday} onChange={() => toggle(s.id)} aria-label={s.text} />
              <span className="task__title grow">{s.text}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Times" icon="clock">
        <ul className="mini-list">
          <li>
            Dhuhr starts <strong>{minsToClock(times.dhuhr)}</strong>
          </li>
          <li>
            Khutbah at my mosque: <strong>{data.settings.prayer.jumuah || 'not set'}</strong>
          </li>
          <li>
            Last hour for dua: <strong>{minsToClock(times.maghrib - 60)}</strong> – {minsToClock(times.maghrib)} (Maghrib)
          </li>
        </ul>
        <Field label="My mosque's khutbah time" hint="Mosques set their own Jumu'ah time — type yours so it's always here.">
          <input
            className="input"
            type="time"
            value={data.settings.prayer.jumuah ?? ''}
            onChange={(e) =>
              update((d) => {
                if (e.target.value) d.settings.prayer.jumuah = e.target.value;
                else delete d.settings.prayer.jumuah;
              })
            }
          />
        </Field>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- Islamic calendar
export function IslamicCalendar() {
  const { today } = useStore();
  const next = nextOccasions(today);
  return (
    <Panel title="Islamic calendar" icon="moon">
      <p>
        Today is <strong>{hijriLabel(today)}</strong>.
      </p>
      <ul className="mini-list">
        {next.map((o) => (
          <li key={o.name}>
            <strong>{o.name}</strong>{' '}
            <small className="muted">
              · {formatDay(o.date)} · {o.daysLeft === 0 ? 'today' : relativeDays(o.daysLeft)}
            </small>
          </li>
        ))}
      </ul>
      <p className="muted small">From the Umm al-Qura calendar; the real day can differ by one with the moon sighting.</p>
    </Panel>
  );
}

// ---------------------------------------------------------------- Hifz
export function HifzTab() {
  const ask = useConfirm();
  const { data, update, today, toast } = useStore();
  const [pick, setPick] = useState('');
  const due = dueForRevision(data.hifz, today);
  const list = [...data.hifz].sort((a, b) => a.surah - b.surah);
  const totalAyahs = data.hifz.reduce((n, i) => n + i.learned, 0);
  const started = data.hifz.filter((h) => h.learned > 0).length;
  const name = (n: number) => SURAHS[n - 1]?.[0] ?? `Surah ${n}`;
  const size = (n: number) => SURAHS[n - 1]?.[1] ?? 0;

  const change = (id: string, fn: (h: HifzItem) => HifzItem | null) =>
    update((d) => {
      const i = d.hifz.findIndex((h) => h.id === id);
      if (i < 0) return;
      const next = fn(d.hifz[i]);
      if (next) d.hifz[i] = next;
      else d.hifz.splice(i, 1);
    });

  const add = () => {
    const n = Number(pick);
    if (!n || data.hifz.some((h) => h.surah === n)) return;
    update((d) => void d.hifz.push({ id: String(n), surah: n, learned: 0, revised: '', interval: 1 }));
    setPick('');
    toast(`Added ${name(n)}`, 'pop');
  };
  const remove = async (h: HifzItem) => {
    if (!(await ask(`Stop tracking ${name(h.surah)}?`, { ok: 'Remove' }))) return;
    change(h.id, () => null);
  };
  const revised = (h: HifzItem, solid: boolean) => {
    change(h.id, (x) => afterRevision(x, today, solid));
    toast(solid ? `${name(h.surah)}: solid — it comes back later` : `${name(h.surah)}: back tomorrow`, 'pop');
  };

  return (
    <div className="grid grid--2">
      <Panel title="Revise today" icon="quran">
        {due.length === 0 ? (
          <Empty>{data.hifz.some((h) => h.learned > 0) ? 'Nothing due — your memorised surahs are fresh.' : 'Add a surah below and mark the ayahs you know.'}</Empty>
        ) : (
          <ul className="list">
            {due.map((h) => (
              <li key={h.id} className="list__item hifz-due">
                <span className="list__text">
                  <strong>{name(h.surah)}</strong>
                  <small className="muted">{h.revised ? `last revised ${relativeDays(daysBetween(today, h.revised))}` : 'not revised yet'}</small>
                </span>
                <button type="button" className="btn btn--small" onClick={() => revised(h, false)}>
                  Shaky
                </button>
                <button type="button" className="btn btn--small btn--primary" onClick={() => revised(h, true)}>
                  Solid
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small">Solid surahs come back after 3, 7, 14, 30 and 60 days; shaky ones come back tomorrow. Private — never scored.</p>
      </Panel>
      <Panel title="My hifz" icon="book">
        <p className="small">{data.hifz.length ? `${totalAyahs} ayah${totalAyahs === 1 ? '' : 's'} in ${started} surah${started === 1 ? '' : 's'}.` : 'Pick the surahs you are learning.'}</p>
        <div className="form__row">
          <select className="input grow" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Surah to add">
            <option value="">Add a surah…</option>
            {SURAHS.map(([n, ayahs], i) =>
              data.hifz.some((h) => h.surah === i + 1) ? null : (
                <option key={n} value={i + 1}>
                  {i + 1}. {n} ({ayahs})
                </option>
              ),
            )}
          </select>
          <button type="button" className="btn btn--primary" onClick={add} disabled={!pick}>
            Add
          </button>
        </div>
        <ul className="list">
          {list.map((h) => (
            <li key={h.id} className="list__item hifz-item">
              <div className="hifz-item__main">
                <strong>
                  {h.surah}. {name(h.surah)}
                </strong>
                <small className="muted">
                  {h.learned >= size(h.surah) ? 'Memorised' : `${h.learned} of ${size(h.surah)} ayahs`}
                  {h.revised ? ` · revised ${formatDay(h.revised)}` : ''}
                </small>
                <Bar value={h.learned} max={size(h.surah)} label={`${name(h.surah)}: ${h.learned} of ${size(h.surah)} ayahs`} />
              </div>
              <label className="hifz-item__count">
                <span className="visually-hidden">Ayahs memorised in {name(h.surah)}</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={size(h.surah)}
                  value={h.learned}
                  onChange={(e) => change(h.id, (x) => ({ ...x, learned: Math.max(0, Math.min(size(x.surah), Math.round(Number(e.target.value)) || 0)) }))}
                />
              </label>
              <button type="button" className="btn btn--small" onClick={() => change(h.id, (x) => ({ ...x, learned: size(x.surah) }))} disabled={h.learned >= size(h.surah)}>
                All
              </button>
              <button type="button" className="icon-btn" onClick={() => remove(h)} aria-label={`Stop tracking ${name(h.surah)}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
