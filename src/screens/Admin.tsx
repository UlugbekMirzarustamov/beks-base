/**
 * 🗂️ Planner → Admin: visa, documents, accommodation and other paperwork as checklists with dates.
 * Key dates and step dates show in the calendar (read from here, never copied) and on Home when
 * they get close. Logic lives in lib/admin.ts. A life tool: no XP or coins.
 */
import { useState, type FormEvent } from 'react';
import { adminStatus, AREAS, DATE_LABELS, nextStep, progress, sortAdmin, TEMPLATES } from '../lib/admin';
import { daysBetween, formatDay, relativeDays } from '../lib/dates';
import { uid } from '../lib/id';
import type { AdminArea, AdminItem } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Bar, Empty, Field, Panel, Sheet, useConfirm } from '../ui/kit';

const REMIND = [7, 14, 30, 60, 90, 180];

/** "Expires Sun 8 Feb · in 95 days" / "Deadline was Tue 3 Nov (2 days ago)". */
function dateLine(item: AdminItem, today: string): string {
  if (!item.date) return 'No date';
  const left = daysBetween(today, item.date);
  if (left < 0) return `${item.dateLabel} was ${formatDay(item.date)} (${-left} days ago)`;
  return `${item.dateLabel} ${formatDay(item.date)} · ${left === 0 ? 'today' : relativeDays(left)}`;
}

export default function AdminTab() {
  const { data, today } = useStore();
  const [editing, setEditing] = useState<AdminItem | 'new' | null>(null);
  const sorted = sortAdmin(data.admin, today);
  const active = sorted.filter((i) => !i.finished);
  const finished = sorted.filter((i) => i.finished);

  return (
    <div className="grid">
      <Panel
        title="Student admin"
        icon="scroll"
        actions={
          <button type="button" className="btn btn--small" onClick={() => setEditing('new')}>
            <PixelIcon name="plus" size={14} /> New
          </button>
        }
      >
        <p className="muted small">Visa, passport, accommodation, registrations… each with its key date and the steps to get it done. Dates show in your calendar, and on Home when they get close.</p>
        {active.length === 0 && <Empty>Nothing on your admin list. Tap New — there are ready-made checklists for visa, passport, tenancy and more.</Empty>}
      </Panel>
      {active.map((item) => (
        <AdminCard key={item.id} item={item} onEdit={() => setEditing(item)} />
      ))}
      {finished.length > 0 && (
        <details className="details">
          <summary>Finished ({finished.length})</summary>
          <div className="grid">
            {finished.map((item) => (
              <AdminCard key={item.id} item={item} onEdit={() => setEditing(item)} />
            ))}
          </div>
        </details>
      )}
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New admin item' : 'Edit admin item'}>
        {editing !== null && <AdminForm key={editing === 'new' ? 'new' : editing.id} editing={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </div>
  );
}

function AdminCard({ item, onEdit }: { item: AdminItem; onEdit: () => void }) {
  const ask = useConfirm();
  const { update, today, toast } = useStore();
  const status = adminStatus(item, today);
  const [open, setOpen] = useState(status === 'overdue' || status === 'soon');
  const [stepText, setStepText] = useState('');
  const [stepDue, setStepDue] = useState('');
  const p = progress(item);
  const next = nextStep(item);

  const change = (fn: (a: AdminItem) => void) =>
    update((d) => {
      const a = d.admin.find((x) => x.id === item.id);
      if (a) fn(a);
    });
  const addStep = (e: FormEvent) => {
    e.preventDefault();
    if (!stepText.trim()) return;
    change((a) => void a.steps.push({ id: uid(), text: stepText.trim(), done: false, due: stepDue }));
    setStepText('');
    setStepDue('');
  };
  const remove = async () => {
    if (!(await ask(`Delete "${item.title}" and its checklist?`))) return;
    update((d) => void (d.admin = d.admin.filter((x) => x.id !== item.id)));
    toast('Deleted', 'info');
  };

  return (
    <section className={`panel admin-card is-${status}`}>
      <button type="button" className="admin-card__head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <PixelIcon name={AREAS[item.area].icon} size={24} />
        <span className="admin-card__title">
          <strong>{item.title}</strong>
          <small className={status === 'overdue' ? 'pantry-warn' : 'muted'}>
            {item.finished ? 'Finished' : dateLine(item, today)}
            {p.total ? ` · ${p.done}/${p.total} steps` : ''}
          </small>
        </span>
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {p.total > 0 && <Bar value={p.done} max={p.total} label={`${item.title}: ${p.done} of ${p.total} steps done`} />}
      {!open && next && !item.finished && (
        <p className="small">
          Next: {next.text}
          {next.due ? ` (by ${formatDay(next.due)})` : ''}
        </p>
      )}
      {open && (
        <div className="form">
          <ul className="tasks">
            {item.steps.map((st) => {
              const late = !st.done && st.due && st.due < today;
              return (
                <li key={st.id} className={`task ${st.done ? 'is-done' : ''} ${late ? 'is-overdue' : ''}`}>
                  <input
                    type="checkbox"
                    className="pixel-check"
                    checked={st.done}
                    onChange={() =>
                      change((a) => {
                        const s = a.steps.find((x) => x.id === st.id);
                        if (s) s.done = !s.done;
                      })
                    }
                    aria-label={`Done: ${st.text}`}
                  />
                  <span className="task__title grow">{st.text}</span>
                  {st.due && <span className="task__due">{st.done ? formatDay(st.due) : relativeDays(daysBetween(today, st.due))}</span>}
                  <button type="button" className="icon-btn" onClick={() => change((a) => void (a.steps = a.steps.filter((x) => x.id !== st.id)))} aria-label={`Delete step ${st.text}`}>
                    <PixelIcon name="trash" size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
          <form className="form__row form__row--wrap" onSubmit={addStep}>
            <input className="input grow" value={stepText} onChange={(e) => setStepText(e.target.value)} placeholder="Add a step…" aria-label={`Add a step to ${item.title}`} />
            <input className="input" type="date" value={stepDue} onChange={(e) => setStepDue(e.target.value)} aria-label="Step date (optional)" />
            <button type="submit" className="btn">
              Add
            </button>
          </form>
          {item.notes && <p className="recipe-steps small">{item.notes}</p>}
          {!item.finished && p.total > 0 && p.done === p.total && <p className="alert alert--ok">Every step is done. Mark it finished?</p>}
          <div className="form__actions">
            <button type="button" className="btn btn--danger" onClick={remove} aria-label={`Delete ${item.title}`}>
              <PixelIcon name="trash" size={16} />
            </button>
            <button type="button" className="btn" onClick={onEdit}>
              <PixelIcon name="pencil" size={16} /> Edit
            </button>
            <button type="button" className="btn btn--primary grow" onClick={() => change((a) => void (a.finished = !a.finished))}>
              {item.finished ? 'Reopen' : 'Finished'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function AdminForm({ editing, onDone }: { editing: AdminItem | null; onDone: () => void }) {
  const { update, toast } = useStore();
  const [title, setTitle] = useState(editing?.title ?? '');
  const [area, setArea] = useState<AdminArea>(editing?.area ?? 'documents');
  const [dateLabel, setDateLabel] = useState(editing?.dateLabel ?? 'Deadline');
  const [date, setDate] = useState(editing?.date ?? '');
  const [remind, setRemind] = useState(editing?.remind ?? 30);
  const [steps, setSteps] = useState('');
  const [notes, setNotes] = useState(editing?.notes ?? '');

  const fromTemplate = (i: number) => {
    const t = TEMPLATES[i];
    if (!t) return;
    setTitle(t.title);
    setArea(t.area);
    setDateLabel(t.dateLabel);
    setRemind(t.remind);
    setSteps(t.steps.join('\n'));
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast('Give it a name', 'error');
      return;
    }
    const fields = { title: title.trim(), area, dateLabel, date, remind, notes: notes.trim() };
    update((d) => {
      const a = editing && d.admin.find((x) => x.id === editing.id);
      if (a) Object.assign(a, fields);
      else
        d.admin.push({
          id: uid(),
          ...fields,
          finished: false,
          steps: steps
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((text) => ({ id: uid(), text, done: false, due: '' })),
        });
    });
    toast(editing ? 'Saved' : `Added: ${fields.title}`, 'pop');
    onDone();
  };

  return (
    <form className="form" onSubmit={save}>
      {!editing && (
        <Field label="Start from a checklist (optional)">
          <select className="input" defaultValue="" onChange={(e) => fromTemplate(Number(e.target.value))}>
            <option value="" disabled>
              Choose…
            </option>
            {TEMPLATES.map((t, i) => (
              <option key={t.title} value={i}>
                {t.title}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="What">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Visa renewal" maxLength={80} />
      </Field>
      <Field label="Area">
        <select className="input" value={area} onChange={(e) => setArea(e.target.value as AdminArea)}>
          {(Object.keys(AREAS) as AdminArea[]).map((a) => (
            <option key={a} value={a}>
              {AREAS[a].label}
            </option>
          ))}
        </select>
      </Field>
      <div className="form__row">
        <Field label="Key date" className="grow">
          <select className="input" value={dateLabel} onChange={(e) => setDateLabel(e.target.value)}>
            {DATE_LABELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date (optional)" className="grow">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Remind me on Home">
        <select className="input" value={remind} onChange={(e) => setRemind(Number(e.target.value))}>
          {REMIND.map((n) => (
            <option key={n} value={n}>
              {n < 30 ? `${n} days before` : n === 30 ? 'A month before' : `${n / 30} months before`}
            </option>
          ))}
        </select>
      </Field>
      {!editing && (
        <Field label="Steps (one per line)" hint="You can tick, date, add and remove steps later.">
          <textarea className="input" rows={6} value={steps} onChange={(e) => setSteps(e.target.value)} />
        </Field>
      )}
      <Field label="Notes (optional)" hint="e.g. where the papers are. Stays on this device.">
        <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <button type="submit" className="btn btn--primary">
        {editing ? 'Save' : 'Add'}
      </button>
    </form>
  );
}
