/**
 * 📝 Study → Assignments: coursework with deadlines, priority and status, plus
 * the grade calculator for each module (subject): weighted average so far, how
 * much of the final mark is secured, and what you still need for your target.
 * Exams stay in Tests (with their bosses) — their weight and mark are edited here
 * on the test itself, so nothing is stored twice. Logic lives in lib/grades.ts.
 */
import { useState, type FormEvent } from 'react';
import { daysBetween, formatDay, relativeDays } from '../lib/dates';
import { assessmentsFor, band, moduleGrade, openAssignments, type Assessment } from '../lib/grades';
import { uid } from '../lib/id';
import { sfx } from '../lib/sound';
import type { Assignment } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Empty, Field, Panel, Segmented, Sheet, useConfirm } from '../ui/kit';

const STATUS: { value: Assignment['status']; label: string }[] = [
  { value: 'todo', label: 'To do' },
  { value: 'doing', label: 'Doing' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'graded', label: 'Graded' },
];
const PRIORITY: { value: Assignment['priority']; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

/** A % typed by hand: empty (or not a number) = not set. */
const pct = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || !Number.isFinite(n) ? undefined : Math.max(0, Math.min(1000, n));
};

/** A small % box that keeps what you type (e.g. "12.") and saves when you leave it or press Enter. */
function PctInput({ value, onCommit, label, placeholder }: { value: number | undefined; onCommit: (v: string) => void; label: string; placeholder?: string }) {
  const [text, setText] = useState(value !== undefined ? String(value) : '');
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    // The stored value changed elsewhere: show it.
    setPrev(value);
    setText(value !== undefined ? String(value) : '');
  }
  const commit = () => {
    if (pct(text) !== value) onCommit(text);
  };
  return (
    <input
      className="input"
      inputMode="decimal"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
      aria-label={label}
      placeholder={placeholder}
    />
  );
}

const blank = (today: string, subjectId: string | null): Omit<Assignment, 'id'> => ({ title: '', subjectId, due: today, dueTime: '', priority: 'medium', status: 'todo', notes: '' });

export default function AssignmentsTab() {
  const { data, update, today } = useStore();
  const [editing, setEditing] = useState<(Omit<Assignment, 'id'> & { id?: string }) | null>(null);
  const open = openAssignments(data);
  const finished = data.assignments.filter((a) => a.status === 'submitted' || a.status === 'graded').sort((a, b) => b.due.localeCompare(a.due));
  const moduleName = (id: string | null) => data.subjects.find((s) => s.id === id)?.name ?? '';

  const setStatus = (a: Assignment, status: Assignment['status']) => {
    update((d) => {
      const x = d.assignments.find((y) => y.id === a.id);
      if (x) x.status = status;
    });
    if (status === 'submitted') sfx('pop');
  };

  const row = (a: Assignment) => {
    const days = daysBetween(today, a.due);
    const isOpen = a.status === 'todo' || a.status === 'doing';
    const late = days < 0 && isOpen;
    return (
      <li key={a.id} className={`assignment assignment--${a.priority} ${late ? 'is-late' : ''}`}>
        <button type="button" className="assignment__main" onClick={() => setEditing({ ...a })}>
          <strong>{a.title}</strong>
          <small className="muted">{[moduleName(a.subjectId), `${formatDay(a.due)}${a.dueTime ? ` ${a.dueTime}` : ''}`, a.weight ? `${a.weight}%` : ''].filter(Boolean).join(' · ')}</small>
          {isOpen && <small className={`assignment__due ${days <= 2 ? 'is-soon' : ''}`}>{late ? `${-days} day${days === -1 ? '' : 's'} late` : relativeDays(days)}</small>}
          {a.status === 'graded' && a.mark !== undefined && <small className="assignment__due">Mark: {a.mark}%</small>}
        </button>
        <select className="input assignment__status" value={a.status} onChange={(e) => setStatus(a, e.target.value as Assignment['status'])} aria-label={`Status of ${a.title}`}>
          {STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </li>
    );
  };

  return (
    <div className="grid grid--2">
      <Panel
        title={`Coursework · ${open.length} open`}
        icon="scroll"
        actions={
          <button type="button" className="btn btn--small btn--primary" onClick={() => setEditing(blank(today, data.subjects[0]?.id ?? null))}>
            <PixelIcon name="plus" size={14} /> Add
          </button>
        }
      >
        {open.length === 0 ? <Empty>Nothing due. Add coursework with its deadline, weighting and priority.</Empty> : <ul className="assignment-list">{open.map(row)}</ul>}
        {finished.length > 0 && (
          <details className="details">
            <summary>Submitted & graded ({finished.length})</summary>
            <ul className="assignment-list">{finished.map(row)}</ul>
          </details>
        )}
      </Panel>
      <Grades />
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? 'Edit assignment' : 'Add assignment'}>
        {editing && <AssignmentForm key={editing.id ?? 'new'} initial={editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </div>
  );
}

function AssignmentForm({ initial, onDone }: { initial: Omit<Assignment, 'id'> & { id?: string }; onDone: () => void }) {
  const { data, update, toast } = useStore();
  const ask = useConfirm();
  const [f, setF] = useState(initial);
  const [weight, setWeight] = useState(initial.weight !== undefined ? String(initial.weight) : '');
  const [mark, setMark] = useState(initial.mark !== undefined ? String(initial.mark) : '');
  const set = (patch: Partial<Assignment>) => setF((x) => ({ ...x, ...patch }));

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!f.title.trim() || !f.due) {
      toast('Give it a name and a due date', 'error');
      return;
    }
    const m = pct(mark);
    if (m !== undefined && m > 100) {
      toast('A mark is out of 100%', 'error');
      return;
    }
    const value: Assignment = {
      ...f,
      id: f.id ?? uid(),
      title: f.title.trim(),
      notes: f.notes.trim(),
      weight: pct(weight),
      mark: m,
      // Entering a mark means it's been graded.
      status: m !== undefined ? 'graded' : f.status === 'graded' ? 'submitted' : f.status,
    };
    update((d) => {
      const i = d.assignments.findIndex((x) => x.id === value.id);
      if (i >= 0) d.assignments[i] = value;
      else d.assignments.push(value);
    });
    sfx('pop');
    toast(f.id ? 'Assignment updated' : 'Assignment added — it’s in your calendar too', 'pop');
    onDone();
  };
  const remove = async () => {
    if (!f.id || !(await ask(`Delete "${f.title}"?`))) return;
    update((d) => void (d.assignments = d.assignments.filter((x) => x.id !== f.id)));
    toast('Deleted', 'info');
    onDone();
  };

  return (
    <form className="form" onSubmit={save}>
      <Field label="Assignment">
        <input className="input" value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Lab report 2" data-autofocus maxLength={80} />
      </Field>
      <Field label="Module" hint={data.subjects.length ? undefined : 'Add modules in Study → Topics.'}>
        <select className="input" value={f.subjectId ?? ''} onChange={(e) => set({ subjectId: e.target.value || null })}>
          <option value="">—</option>
          {data.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="form__row">
        <Field label="Due" className="grow">
          <input className="input" type="date" value={f.due} onChange={(e) => set({ due: e.target.value })} />
        </Field>
        <Field label="Time (optional)" className="grow">
          <input className="input" type="time" value={f.dueTime} onChange={(e) => set({ dueTime: e.target.value })} />
        </Field>
      </div>
      <p className="field__label">Priority</p>
      <Segmented<Assignment['priority']> label="Priority" value={f.priority} onChange={(v) => set({ priority: v })} options={PRIORITY} />
      <Field label="Status">
        <select className="input" value={f.status} onChange={(e) => set({ status: e.target.value as Assignment['status'] })}>
          {STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="form__row">
        <Field label="Weighting % (optional)" className="grow">
          <input className="input" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 25" />
        </Field>
        <Field label="Mark % (once marked)" className="grow">
          <input className="input" inputMode="decimal" value={mark} onChange={(e) => setMark(e.target.value)} placeholder="e.g. 68" />
        </Field>
      </div>
      <Field label="Notes (optional)">
        <textarea className="input" rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Brief, word count, submission link…" />
      </Field>
      <div className="form__actions">
        {f.id && (
          <button type="button" className="btn btn--danger" onClick={remove}>
            <PixelIcon name="trash" size={16} /> Delete
          </button>
        )}
        <button type="submit" className="btn btn--primary grow">
          {f.id ? 'Save' : 'Add'}
        </button>
      </div>
    </form>
  );
}

/** One grade calculator per module. */
function Grades() {
  const { data } = useStore();
  if (!data.subjects.length) {
    return (
      <Panel title="Grades" icon="star">
        <Empty>Add your modules in Study → Topics to work out grades.</Empty>
      </Panel>
    );
  }
  return (
    <div className="grades">
      {data.subjects.map((s) => (
        <ModuleCard key={s.id} subjectId={s.id} />
      ))}
    </div>
  );
}

function ModuleCard({ subjectId }: { subjectId: string }) {
  const { data, update } = useStore();
  const subject = data.subjects.find((s) => s.id === subjectId)!;
  const items = assessmentsFor(data, subjectId);
  const g = moduleGrade(items, subject.target);

  /** Edit weight or mark on the assignment or test it belongs to. */
  const edit = (i: Assessment, key: 'weight' | 'mark', value: string) =>
    update((d) => {
      const v = pct(value);
      const owner = i.source === 'assignment' ? d.assignments.find((x) => x.id === i.id) : d.tests.find((x) => x.id === i.id);
      if (!owner) return;
      if (v === undefined) delete owner[key];
      else owner[key] = key === 'mark' ? Math.min(100, v) : v;
      if (key === 'mark' && i.source === 'assignment' && v !== undefined) (owner as Assignment).status = 'graded';
    });
  const setTarget = (value: string) =>
    update((d) => {
      const s = d.subjects.find((x) => x.id === subjectId);
      if (!s) return;
      const v = pct(value);
      if (v === undefined) delete s.target;
      else s.target = Math.min(100, v);
    });

  const message =
    g.status === 'no-weights'
      ? 'Add the weighting (%) of each assessment to see your grade.'
      : g.status === 'done'
        ? `Final mark: ${g.average}% (${band(g.average ?? 0)}).`
        : g.status === 'no-target'
          ? 'Set a target to see what you need on the rest.'
          : g.status === 'safe'
            ? `Your ${subject.target}% target is already secured. Anything more is a bonus.`
            : g.status === 'impossible'
              ? `${subject.target}% is out of reach now (it would need ${g.needed}% on the rest). Pick a new target — every mark still counts.`
              : `You need about ${g.needed}% on the remaining ${g.remainingWeight}% to reach ${subject.target}%.`;

  return (
    <Panel title={subject.name} icon="book" className="module-card">
      <div className="module-card__summary">
        <span>
          <small className="muted">Average so far</small>
          <strong>{g.average !== null ? `${g.average}%` : '—'}</strong>
          {g.average !== null && <small className="muted">{band(g.average)} (guide)</small>}
        </span>
        <span>
          <small className="muted">Secured</small>
          <strong>{g.secured}</strong>
          <small className="muted">of 100</small>
        </span>
        <label className="module-card__target">
          <small className="muted">Target %</small>
          <PctInput value={subject.target} onCommit={setTarget} label={`Target mark for ${subject.name}`} placeholder="60" />
        </label>
      </div>
      <p className={`module-card__msg ${g.status === 'impossible' ? 'is-warn' : g.status === 'safe' ? 'is-good' : ''}`}>{message}</p>
      {g.totalWeight > 0 && g.totalWeight !== 100 && (
        <p className="muted small">Weights entered add up to {g.totalWeight}%{g.totalWeight < 100 ? ' — the rest counts as still to come.' : ' — they’re scaled to 100.'}</p>
      )}
      {items.length === 0 ? (
        <p className="muted small">No coursework or exams for this module yet.</p>
      ) : (
        <table className="grade-table">
          <thead>
            <tr>
              <th scope="col">Assessment</th>
              <th scope="col">Weight %</th>
              <th scope="col">Mark %</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={`${i.source}-${i.id}`}>
                <th scope="row">
                  {i.title}
                  <small className="muted"> · {i.source === 'test' ? 'exam' : 'coursework'}</small>
                </th>
                <td>
                  <PctInput value={i.weight ?? undefined} onCommit={(v) => edit(i, 'weight', v)} label={`Weight of ${i.title}`} />
                </td>
                <td>
                  <PctInput value={i.mark ?? undefined} onCommit={(v) => edit(i, 'mark', v)} label={`Mark for ${i.title}`} placeholder="—" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
