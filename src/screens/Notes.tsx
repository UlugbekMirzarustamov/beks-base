/**
 * 📝 Study → Notes: lecture notes per module, as a list or as a knowledge garden (KnowledgeGarden). Write [[Another note]] to link notes together;
 * each note shows what links back to it. A link to one of your topics shows how confident you are.
 * Images, PDFs, links and formulas can be attached (NoteAttachments). The link logic lives in lib/notes.ts.
 */
import { useState, type FormEvent } from 'react';
import { formatDay } from '../lib/dates';
import { uid } from '../lib/id';
import { backlinks, findNote, linksIn, splitLinks } from '../lib/notes';
import { fold } from '../lib/search';
import type { LectureNote } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Empty, Field, Panel, Segmented, Sheet, useConfirm } from '../ui/kit';
import { KnowledgeGarden } from './KnowledgeGarden';
import { useLessonFiles } from '../state/lessonFiles';
import { NoteAttachments, removeNoteFiles } from './NoteAttachments';

type Draft = Omit<LectureNote, 'id' | 'updated'> & { id?: string };
const CONFIDENCE_COLOUR = { red: '#d64541', amber: '#e8a317', green: '#5fa83b' } as const;

export default function Notes() {
  const { data, today } = useStore();
  const { files } = useLessonFiles();
  const [q, setQ] = useState('');
  const [module, setModule] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [view, setView] = useState<'list' | 'garden'>('list');
  const open = data.lectureNotes.find((n) => n.id === openId);
  const subjectName = (id: string | null) => data.subjects.find((s) => s.id === id)?.name ?? 'No module';

  const words = fold(q).split(' ').filter(Boolean);
  const list = data.lectureNotes
    .filter((n) => module === 'all' || (n.subjectId ?? 'none') === module)
    .filter((n) => words.every((w) => fold(`${n.title} ${n.body}`).includes(w)))
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

  const blank = (title = '', subjectId: string | null = module !== 'all' && module !== 'none' ? module : null): Draft => ({ title, subjectId, date: today, body: '' });

  return (
    <div className="grid grid--2">
      <Panel
        title="Lecture notes"
        icon="scroll"
        actions={
          <button type="button" className="btn btn--small" onClick={() => setEditing(blank())}>
            <PixelIcon name="plus" size={14} /> Note
          </button>
        }
      >
        <div className="form">
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your notes…" aria-label="Search lecture notes" />
          <select className="input" value={module} onChange={(e) => setModule(e.target.value)} aria-label="Module">
            <option value="all">All modules</option>
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="none">No module</option>
          </select>
        </div>
        <Segmented<'list' | 'garden'>
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: 'List' },
            { value: 'garden', label: '🌱 Garden' },
          ]}
        />
        {view === 'garden' ? (
          <KnowledgeGarden
            onOpen={setOpenId}
            // A seed grows in the same module as the note that links to it.
            onCreate={(title) => setEditing(blank(title, data.lectureNotes.find((n) => linksIn(n.body).some((t) => fold(t) === fold(title)))?.subjectId ?? null))}
          />
        ) : data.lectureNotes.length === 0 ? (
          <Empty>No notes yet. Write one after each lecture — type [[Another note]] to link ideas together.</Empty>
        ) : list.length === 0 ? (
          <Empty>No notes match.</Empty>
        ) : (
          <ul className="list">
            {list.map((n) => (
              <li key={n.id} className="list__item">
                <button type="button" className="list__main" onClick={() => setOpenId(n.id)}>
                  <span className="list__text">
                    <span>{n.title}</span>
                    <small className="muted">
                      {subjectName(n.subjectId)} · {formatDay(n.date)}
                      {(() => {
                        const count = files.filter((f) => f.noteId === n.id).length + (n.links?.length ?? 0) + (n.formulas?.length ?? 0);
                        return count ? ` · 📎 ${count}` : '';
                      })()}
                      {n.body ? ` · ${n.body.replace(/\s+/g, ' ').slice(0, 60)}${n.body.length > 60 ? '…' : ''}` : ''}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Sheet open={Boolean(open)} onClose={() => setOpenId(null)} title={open?.title ?? 'Note'}>
        {open && (
          <NoteView
            note={open}
            onOpen={(id) => setOpenId(id)}
            onCreate={(title) => {
              setOpenId(null);
              setEditing(blank(title, open.subjectId));
            }}
            onEdit={() => {
              setEditing({ ...open });
              setOpenId(null);
            }}
            onDeleted={() => setOpenId(null)}
          />
        )}
      </Sheet>
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? 'Edit note' : 'New note'}>
        {editing && (
          <NoteForm
            key={editing.id ?? `new-${editing.title}`}
            initial={editing}
            onDone={(id) => {
              setEditing(null);
              if (id) setOpenId(id);
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

function NoteView({ note, onOpen, onCreate, onEdit, onDeleted }: { note: LectureNote; onOpen: (id: string) => void; onCreate: (title: string) => void; onEdit: () => void; onDeleted: () => void }) {
  const ask = useConfirm();
  const { data, update } = useStore();
  const { files } = useLessonFiles();
  const back = backlinks(data.lectureNotes, note);
  const remove = async () => {
    const attached = files.filter((f) => f.noteId === note.id).length;
    if (!(await ask(`Delete the note "${note.title}"${attached ? ` and its ${attached} attached file${attached === 1 ? '' : 's'}` : ''}? (Links to it will show as missing.)`))) return;
    update((d) => void (d.lectureNotes = d.lectureNotes.filter((n) => n.id !== note.id)));
    await removeNoteFiles(note.id, files);
    onDeleted();
  };

  const link = (title: string, i: number) => {
    const target = findNote(data.lectureNotes, title);
    if (target)
      return (
        <button key={i} type="button" className="wiki-link" onClick={() => onOpen(target.id)}>
          {title}
        </button>
      );
    const topic = data.topics.find((t) => fold(t.name) === fold(title));
    if (topic)
      return (
        <a key={i} href="#/study/topics" className="wiki-link">
          <span className="cal-dot" style={{ background: topic.confidence ? CONFIDENCE_COLOUR[topic.confidence] : '#9a9a9a' }} aria-hidden="true" />
          {title}
          <span className="visually-hidden"> (topic{topic.confidence ? `, ${topic.confidence}` : ', not rated'})</span>
        </a>
      );
    return (
      <button key={i} type="button" className="wiki-link is-missing" onClick={() => onCreate(title)}>
        {title}
        <span className="visually-hidden"> (no note yet: create it)</span>
      </button>
    );
  };

  return (
    <div className="form">
      <p className="muted small">
        {data.subjects.find((s) => s.id === note.subjectId)?.name ?? 'No module'} · {formatDay(note.date)}
      </p>
      <div className="note-body">{note.body ? splitLinks(note.body).map((part, i) => ('link' in part ? link(part.link, i) : <span key={i}>{part.text}</span>)) : <span className="muted">Empty note.</span>}</div>
      <NoteAttachments note={note} />
      {back.length > 0 && (
        <div>
          <p className="muted small">Linked from:</p>
          <div className="kitchen-chips">
            {back.map((n) => (
              <button key={n.id} type="button" className="wiki-link" onClick={() => onOpen(n.id)}>
                {n.title}
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="muted small">Dashed links have no note yet — tap one to write it.</p>
      <div className="form__actions">
        <button type="button" className="btn btn--danger" onClick={remove} aria-label={`Delete ${note.title}`}>
          <PixelIcon name="trash" size={16} />
        </button>
        <button type="button" className="btn btn--primary grow" onClick={onEdit}>
          <PixelIcon name="pencil" size={16} /> Edit
        </button>
      </div>
    </div>
  );
}

function NoteForm({ initial, onDone }: { initial: Draft; onDone: (id?: string) => void }) {
  const { data, update, toast } = useStore();
  const [f, setF] = useState(initial);
  const set = (patch: Partial<Draft>) => setF((x) => ({ ...x, ...patch }));

  const save = (e: FormEvent) => {
    e.preventDefault();
    const title = f.title.trim();
    if (!title || !f.date) {
      toast('Give the note a title and a date', 'error');
      return;
    }
    if (title.includes('[') || title.includes(']')) {
      toast('Titles can’t contain [ or ] (they’re used for links)', 'error');
      return;
    }
    const clash = findNote(data.lectureNotes, title);
    if (clash && clash.id !== f.id) {
      toast('You already have a note with that title (links use titles)', 'error');
      return;
    }
    const id = f.id ?? uid();
    const value: LectureNote = { id, subjectId: f.subjectId, title, date: f.date, body: f.body, updated: new Date().toISOString() };
    update((d) => {
      const i = d.lectureNotes.findIndex((n) => n.id === id);
      if (i >= 0) {
        // Renaming keeps links working: [[Old title]] in other notes becomes [[New title]].
        const old = d.lectureNotes[i].title;
        if (fold(old) !== fold(title)) {
          const pattern = new RegExp(`\\[\\[\\s*${old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\]\\]`, 'gi');
          for (const n of d.lectureNotes) n.body = n.body.replace(pattern, `[[${title}]]`);
        }
        // Keep what the form doesn't edit (links and formulas).
        d.lectureNotes[i] = { ...d.lectureNotes[i], ...value };
      } else d.lectureNotes.push(value);
    });
    toast(f.id ? 'Note saved' : 'Note added', 'pop');
    onDone(id);
  };

  return (
    <form className="form" onSubmit={save}>
      <Field label="Title">
        <input className="input" value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Lecture 4 — Momentum" maxLength={80} data-autofocus />
      </Field>
      <div className="form__row">
        <Field label="Module" className="grow">
          <select className="input" value={f.subjectId ?? ''} onChange={(e) => set({ subjectId: e.target.value || null })}>
            <option value="">No module</option>
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Lecture date" className="grow">
          <input className="input" type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
        </Field>
      </div>
      <Field label="Notes" hint="Type [[Note title]] to link to another note or to one of your topics.">
        <textarea className="input" rows={12} value={f.body} onChange={(e) => set({ body: e.target.value })} />
      </Field>
      <button type="submit" className="btn btn--primary">
        {f.id ? 'Save note' : 'Add note'}
      </button>
    </form>
  );
}
