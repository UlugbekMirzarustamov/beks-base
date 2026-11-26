/**
 * Getting a bit better every day:
 *  - <FocusMode>     a dimmed full-screen focus timer (uses the normal study timer)
 *  - <MonthStory>    a look back over a month (Reflect → Month)
 *  - <MonthNudge>    on the 1st–3rd, a card on Home saying last month's story is ready
 *  - <QuickAdd>      the big + button's menu: spend, note, reminder or today's goals
 */
import { useEffect, useState } from 'react';
import { addMonths, formatDay, formatMonth, monthOf } from '../lib/dates';
import { MOOD_NAMES, monthStory } from '../lib/growth';
import { hoursLabel, monthStats } from '../lib/quests';
import { formatMoney } from '../lib/money';
import type { CaptureKind } from '../lib/capture';
import type { Mood } from '../lib/types';
import { useStore, useTimer } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Empty, Panel, Sheet } from '../ui/kit';
import { QuickCapture } from './Capture';
import { TopThree } from './Planner';

const mins = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ''}`.trim() : `${m} min`);

export const openFocus = () => window.dispatchEvent(new Event('beks:focus'));

// ---------------------------------------------------------------- focus mode
export function FocusMode() {
  const { data, update } = useStore();
  const { timer, secondsLeft, running, start, pause, skip } = useTimer();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => {
      setOpen(true);
      if (!running) {
        if (timer.mode === 'break') skip();
        start();
      }
    };
    window.addEventListener('beks:focus', show);
    return () => window.removeEventListener('beks:focus', show);
  }, [running, timer.mode, skip, start]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const done = timer.mode === 'break';
  const rain = data.settings.mixer.rain > 0;

  return (
    <div className="focus-mode" role="dialog" aria-modal="true" aria-label="Focus mode">
      <div className="focus-mode__glow" aria-hidden="true" />
      <p className="focus-mode__label">{done ? 'Well done. Take a break' : running ? 'Focus. One thing only' : 'Paused'}</p>
      <p className="focus-mode__time" aria-live="off">
        {mm}:{ss}
      </p>
      <p className="focus-mode__goal">{data.priorities.items.find((t, i) => t.trim() && !data.priorities.done[i]) ?? 'Put your phone face down.'}</p>
      <div className="focus-mode__row">
        {!done && (
          <button type="button" className="btn" onClick={running ? pause : start}>
            {running ? 'Pause' : 'Carry on'}
          </button>
        )}
        <button type="button" className="btn" aria-pressed={rain} onClick={() => update((d) => void (d.settings.mixer.rain = rain ? 0 : 4))}>
          <PixelIcon name={rain ? 'sound' : 'mute'} size={16} /> Rain
        </button>
        <button type="button" className="btn btn--primary" onClick={() => setOpen(false)}>
          {done ? 'Close' : 'Hide'}
        </button>
      </div>
      {!done && <p className="small focus-mode__hint">Hide keeps the timer running. It shows in the top bar.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- month story
export function MonthStoryView() {
  const { data, today } = useStore();
  const thisMonth = monthOf(today);
  const [month, setMonth] = useState(() => (Number(today.slice(8)) <= 3 ? addMonths(thisMonth, -1) : thisMonth));
  const s = monthStory(data, month, today);
  const q = monthStats(data, month);
  const moodTotal = (Object.values(s.moods) as number[]).reduce((a, b) => a + b, 0);
  const pct = s.goalsSet ? Math.round((s.goalsDone / s.goalsSet) * 100) : 0;

  return (
    <Panel
      title={`${formatMonth(month)} story`}
      icon="scroll"
      actions={
        <>
          <button type="button" className="btn btn--small" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">
            ←
          </button>
          <button type="button" className="btn btn--small" disabled={month >= thisMonth} onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
            →
          </button>
        </>
      }
    >
      {!s.daysWithGoals && !s.evenings && !moodTotal && !s.focusMin && !q.count ? (
        <Empty>Nothing written this month yet. Your story fills in as you set goals and do evening check-ins.</Empty>
      ) : (
        <>
          <div className="story-stats">
            <div>
              <strong>
                {s.goalsDone}/{s.goalsSet}
              </strong>
              <span>goals done ({pct}%)</span>
            </div>
            <div>
              <strong>{s.daysWithGoals}</strong>
              <span>days with a top 3</span>
            </div>
            <div>
              <strong>{s.evenings}</strong>
              <span>evening check-ins</span>
            </div>
            <div>
              <strong>{mins(s.focusMin)}</strong>
              <span>focused</span>
            </div>
            <div>
              <strong>{formatMoney(s.spent)}</strong>
              <span>spent</span>
            </div>
            <div>
              <strong>{s.usualMood ? MOOD_NAMES[s.usualMood] : '–'}</strong>
              <span>usual mood</span>
            </div>
            <div>
              <strong>{q.count}</strong>
              <span>quests done</span>
            </div>
            <div>
              <strong>{hoursLabel(q.minutes)}</strong>
              <span>away from the screen</span>
            </div>
          </div>
          {moodTotal > 0 && (
            <div className="story-moods" aria-label="Moods this month">
              {([5, 4, 3, 2, 1] as Mood[]).map((m) =>
                s.moods[m] ? (
                  <span key={m} className={`story-moods__bar mood-${m}`} style={{ flexGrow: s.moods[m] }}>
                    {MOOD_NAMES[m]} {s.moods[m]}
                  </span>
                ) : null,
              )}
            </div>
          )}
          {s.bestDay && (
            <p>
              <PixelIcon name="star" size={16} /> Best day: <strong>{formatDay(s.bestDay)}</strong>
            </p>
          )}
          {s.highlights.length > 0 && (
            <div>
              <p className="small muted">From your happiest days:</p>
              <ul className="story-lines">
                {s.highlights.map((h) => (
                  <li key={h.date}>
                    <span className="muted small">{formatDay(h.date)}</span> “{h.line}”
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

/** On the 1st–3rd of a month, Home says last month's story is ready. */
export function MonthNudge() {
  const { today } = useStore();
  if (Number(today.slice(8)) > 3) return null;
  const last = addMonths(monthOf(today), -1);
  return (
    <a href="#/reflect/month" className="month-nudge">
      <PixelIcon name="scroll" size={22} />
      <span>
        <strong>Your {formatMonth(last)} story is ready</strong>
        <span className="small"> See how your month went →</span>
      </span>
    </a>
  );
}

// ---------------------------------------------------------------- the + menu
type AddKind = 'note' | 'reminder' | 'goals';
const ADD_KINDS: { id: AddKind; label: string; capture?: CaptureKind }[] = [
  { id: 'note', label: 'Note / idea', capture: 'note' },
  { id: 'reminder', label: 'Reminder', capture: 'reminder' },
  { id: 'goals', label: 'Today’s goals' },
];

export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { openExpense } = useStore();
  const [kind, setKind] = useState<AddKind>('note');
  const current = ADD_KINDS.find((k) => k.id === kind)!;
  return (
    <Sheet open={open} onClose={onClose} title="Add something">
      <div className="quick-add">
        <button
          type="button"
          className="btn btn--primary btn--wide"
          onClick={() => {
            onClose();
            openExpense();
          }}
        >
          <PixelIcon name="chest" size={18} /> I spent money
        </button>
        <div className="quick-add__kinds" role="tablist" aria-label="What to add">
          {ADD_KINDS.map((k) => (
            <button key={k.id} type="button" role="tab" aria-selected={kind === k.id} className="tab" onClick={() => setKind(k.id)}>
              {k.label}
            </button>
          ))}
        </div>
        {current.capture ? <QuickCapture key={kind} kind={current.capture} /> : <TopThree editable />}
      </div>
    </Sheet>
  );
}
