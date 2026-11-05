/**
 * 📅 The revision planner (in Study → Tests): suggests 30-minute revision sessions before your
 * exams — more for red topics and close exams — and puts them in your week plan in one tap.
 * The planning maths lives in lib/revision.ts.
 */
import { useMemo, useState } from 'react';
import { formatDay } from '../lib/dates';
import { uid } from '../lib/id';
import { planRevision } from '../lib/revision';
import { useStore } from '../state/store';
import { Empty, Field, Panel, useConfirm } from '../ui/kit';

export default function RevisionPlanner() {
  const ask = useConfirm();
  const { data, update, today, toast } = useStore();
  const [minutes, setMinutes] = useState(60);
  const [start, setStart] = useState('18:00');
  const plan = useMemo(() => planRevision(data, today, { minutesPerDay: minutes, startTime: start || '18:00' }), [data, today, minutes, start]);
  const days = [...new Set(plan.map((s) => s.date))];
  const oldBlocks = data.studyBlocks.filter((b) => b.revision && b.date > today);

  const apply = async () => {
    if (oldBlocks.length && !(await ask(`Replace your current revision plan (${oldBlocks.length} sessions) with this one? Study blocks you made yourself stay.`, { ok: 'Replace' }))) return;
    update((d) => {
      d.studyBlocks = d.studyBlocks.filter((b) => !(b.revision && b.date > today));
      for (const s of plan) d.studyBlocks.push({ id: uid(), date: s.date, start: s.start, end: s.end, title: `Revise: ${s.title}`, revision: true });
    });
    toast(`${plan.length} revision sessions added to your week plan and calendar`, 'pop');
  };
  const clearPlan = async () => {
    if (!(await ask(`Remove the ${oldBlocks.length} planned revision sessions? (Past ones and your own study blocks stay.)`, { ok: 'Remove' }))) return;
    update((d) => void (d.studyBlocks = d.studyBlocks.filter((b) => !(b.revision && b.date > today))));
  };

  return (
    <Panel title="Revision planner" icon="calendar">
      <p className="muted small">Short sessions until each exam (next 4 weeks). Red topics and close exams get the most time; rate topics in Study → Topics.</p>
      <div className="form__row">
        <Field label="Per day" className="grow">
          <select className="input" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {[30, 60, 90, 120, 180].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} min` : `${m / 60} h`}
              </option>
            ))}
          </select>
        </Field>
        <Field label="From" className="grow">
          <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
      </div>
      {plan.length === 0 ? (
        <Empty>No exams in the next four weeks — nothing to plan yet.</Empty>
      ) : (
        <>
          <ul className="mini-list revision-plan">
            {days.slice(0, 7).map((day) => (
              <li key={day}>
                <strong>{formatDay(day)}</strong>
                <span className="muted small">
                  {plan
                    .filter((s) => s.date === day)
                    .map((s) => `${s.start} ${s.title}`)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ul>
          {days.length > 7 && <p className="muted small">…and {days.length - 7} more days.</p>}
          <button type="button" className="btn btn--primary" onClick={apply}>
            Put {plan.length} sessions in my week plan
          </button>
        </>
      )}
      {oldBlocks.length > 0 && (
        <button type="button" className="btn btn--small" onClick={clearPlan}>
          Remove planned revision ({oldBlocks.length})
        </button>
      )}
    </Panel>
  );
}
