/**
 * ✏️ Quick Capture (Home) and the Inbox (Home + Planner → Today).
 * Type one line; it guesses where it belongs (see lib/capture.ts) and shows you
 * before saving — tap a chip to change the guess. Reminders pop up while the app
 * is open (ReminderWatcher); phone notifications come later (Phase 5).
 */
import { useEffect, useState, type FormEvent } from 'react';
import { CAPTURE_KINDS, captureInto, dueReminders, inboxDone, inboxToEvent, inboxToNote, inboxToTask, openInbox, parseCapture, type CaptureKind } from '../lib/capture';
import { formatDay, UK_TZ, zonedParts } from '../lib/dates';
import { uid } from '../lib/id';
import { sfx } from '../lib/sound';
import type { AppData, InboxItem } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Empty, Panel } from '../ui/kit';

/** UK minutes after midnight, and local "YYYY-MM-DDTHH:MM" for reminders. */
function ukNow(today: string) {
  const p = zonedParts(new Date(), UK_TZ);
  const hhmm = `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
  return { mins: p.hour * 60 + p.minute, stamp: `${today}T${hhmm}` };
}

const whenLabel = (date: string, time: string, today: string) => `${date === today ? 'today' : formatDay(date)}${time ? ` at ${time}` : ''}`;

export function QuickCapture() {
  const { data, update, today, toast } = useStore();
  const [text, setText] = useState('');
  const [chosen, setChosen] = useState<CaptureKind | null>(null);
  const parsed = parseCapture(text, today, ukNow(today).mins);
  const p = { ...parsed, kind: chosen ?? parsed.kind };

  const preview = !text.trim()
    ? 'Try: "£4.50 coffee", "essay due fri", "remind me to call home at 6pm", "idea: …"'
    : p.kind === 'expense'
      ? p.amount
        ? `→ Spent ${p.currency === 'GBP' ? '£' : '$'}${p.amount.toFixed(2)}${p.title ? ` on "${p.title}"` : ''}, ${whenLabel(p.date || today, '', today)}`
        : '→ Spent: add an amount, e.g. £4.50'
      : p.kind === 'task'
        ? `→ Task "${p.title}"${p.date ? `, due ${whenLabel(p.date, '', today)}` : ''}`
        : p.kind === 'reminder'
          ? `→ Reminder "${p.title}", ${whenLabel(p.date || today, p.time || '09:00', today)}`
          : `→ ${CAPTURE_KINDS.find((k) => k.value === p.kind)?.label} in your inbox`;

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    let message: string;
    try {
      // Try it on a copy first, so a mistake shows a message and never half-saves.
      message = captureInto(structuredClone(data), p, today, uid);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not capture that', 'error');
      return;
    }
    update((d) => void captureInto(d, p, today, uid));
    sfx('pop');
    toast(message, 'pop');
    setText('');
    setChosen(null);
  };

  return (
    <form className="capture" onSubmit={save} aria-label="Quick capture">
      <div className="capture__row">
        <input
          className="input capture__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Capture anything…"
          aria-label="Capture a task, purchase, idea, note, link or reminder"
          enterKeyHint="done"
          maxLength={200}
        />
        <button type="submit" className="btn btn--primary" disabled={!text.trim()}>
          Save
        </button>
      </div>
      {text.trim() && (
        <div className="capture__kinds" role="radiogroup" aria-label="What is it?">
          {CAPTURE_KINDS.map((k) => (
            <button key={k.value} type="button" role="radio" aria-checked={p.kind === k.value} className={`chip ${p.kind === k.value ? 'is-on' : ''}`} onClick={() => setChosen(k.value)}>
              {k.label}
            </button>
          ))}
        </div>
      )}
      <p className="capture__preview muted small" aria-live="polite">
        {preview}
      </p>
    </form>
  );
}

const KIND_ICON: Record<InboxItem['kind'], 'star' | 'scroll' | 'globe' | 'clock'> = { idea: 'star', note: 'scroll', link: 'globe', reminder: 'clock' };

/** The inbox: sort each item into a task, a calendar event or a journal note, or mark it done. */
export function InboxPanel({ compact = false }: { compact?: boolean }) {
  const { data, update, today, toast } = useStore();
  const items = openInbox(data);
  const now = ukNow(today).stamp;
  if (compact && items.length === 0) return null;
  const act = (fn: (d: AppData) => void, message: string) => {
    update(fn);
    sfx('tick');
    toast(message, 'info');
  };
  const shown = compact ? items.slice(0, 3) : items;
  return (
    <Panel title={`Inbox · ${items.length}`} icon="box" className="inbox">
      {items.length === 0 ? (
        <Empty>All sorted. Capture ideas, notes, links and reminders from Home — they wait here.</Empty>
      ) : (
        <ul className="inbox__list">
          {shown.map((i) => {
            const due = i.kind === 'reminder' && i.remindAt <= now;
            return (
              <li key={i.id} className={`inbox__item ${due ? 'is-due' : ''}`}>
                <PixelIcon name={KIND_ICON[i.kind]} size={18} />
                <span className="inbox__text">
                  {i.url ? (
                    <a href={i.url} target="_blank" rel="noopener noreferrer">
                      {i.text}
                    </a>
                  ) : (
                    <strong>{i.text}</strong>
                  )}
                  <small className="muted">
                    {i.kind === 'reminder' ? `${due ? '⏰ Due · ' : ''}${whenLabel(i.remindAt.slice(0, 10), i.remindAt.slice(11), today)}` : `${i.kind} · ${formatDay(i.created)}`}
                  </small>
                </span>
                {!compact && (
                  <span className="inbox__actions">
                    <button type="button" className="btn btn--small" onClick={() => act((d) => inboxToTask(d, i.id, today, uid), 'Moved to your tasks')}>
                      Task
                    </button>
                    <button type="button" className="btn btn--small" onClick={() => act((d) => inboxToEvent(d, i.id, today, uid), 'Added to the calendar')}>
                      Calendar
                    </button>
                    <button type="button" className="btn btn--small" onClick={() => act((d) => inboxToNote(d, i.id, today, uid, new Date().toISOString()), 'Saved in your journal')}>
                      Note
                    </button>
                    <button type="button" className="btn btn--small btn--primary" onClick={() => act((d) => inboxDone(d, i.id, today), 'Done')} aria-label={`Mark "${i.text}" done`}>
                      ✓
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {compact && (
        <a href="#/planner/today" className="more-link">
          {items.length > shown.length ? `All ${items.length} →` : 'Sort them →'}
        </a>
      )}
    </Panel>
  );
}

/** While the app is open: pop up each reminder once, when its time comes. */
export function ReminderWatcher() {
  const { data, update, today, toast } = useStore();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const fresh = dueReminders(data, ukNow(today).stamp).filter((i) => !i.notified);
  const ids = fresh.map((i) => i.id).join(',');
  useEffect(() => {
    if (!ids) return;
    for (const i of fresh) toast(`⏰ Reminder: ${i.text}`, 'level');
    sfx('bell');
    const shownIds = new Set(ids.split(','));
    update((d) => {
      for (const i of d.inbox) if (shownIds.has(i.id)) i.notified = true;
    });
  }, [ids, tick]); // `fresh` is derived from `ids`, so this runs once per new due reminder
  return null;
}
