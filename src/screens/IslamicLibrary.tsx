/**
 * 📚 Prayer → Library: the dua collection (plus your own duas), a private good deeds journal,
 * and a learning library of books, courses and lectures. Friday routine lives in Prayer → Jumu'ah.
 * Private worship: nothing here is counted or scored, and good deeds never leave this page.
 */
import { useState, type FormEvent } from 'react';
import { formatDay } from '../lib/dates';
import { DUA_TOPICS, DUAS, STARTER_BOOKS, type Dua, type DuaTopic } from '../lib/duas';
import { uid } from '../lib/id';
import { fold } from '../lib/search';
import type { LearningItem } from '../lib/types';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Empty, Field, Panel, Segmented, useConfirm } from '../ui/kit';

type Section = 'duas' | 'deeds' | 'learning';

export default function IslamicLibrary() {
  const [section, setSection] = useState<Section>('duas');
  return (
    <div className="grid">
      <Segmented<Section>
        label="Library section"
        value={section}
        onChange={setSection}
        options={[
          { value: 'duas', label: 'Duas' },
          { value: 'deeds', label: 'Good deeds' },
          { value: 'learning', label: 'Learning' },
        ]}
      />
      {section === 'duas' && <Duas />}
      {section === 'deeds' && <Deeds />}
      {section === 'learning' && <Learning />}
    </div>
  );
}

// ---------------------------------------------------------------- Duas
function DuaCard({ dua, starred, onStar }: { dua: Dua; starred: boolean; onStar: () => void }) {
  return (
    <li className="dua-card">
      <div className="dua-card__head">
        <strong>{dua.title}</strong>
        <button type="button" className="icon-btn" onClick={onStar} aria-pressed={starred} aria-label={starred ? `Unstar ${dua.title}` : `Star ${dua.title}`}>
          {starred ? '★' : '☆'}
        </button>
      </div>
      <p className="dua-card__arabic" lang="ar" dir="rtl">
        {dua.arabic}
      </p>
      <p className="dua-card__translit">{dua.translit}</p>
      <p className="small">{dua.meaning}</p>
      <small className="muted">{dua.source}</small>
    </li>
  );
}

function Duas() {
  const ask = useConfirm();
  const { data, update, toast } = useStore();
  const [topic, setTopic] = useState<DuaTopic | 'starred' | 'all'>('all');
  const [q, setQ] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const words = fold(q).split(' ').filter(Boolean);
  const list = DUAS.filter((d) => (topic === 'all' ? true : topic === 'starred' ? data.duaFavs.includes(d.id) : d.topic === topic)).filter((d) =>
    words.every((w) => fold(`${d.title} ${d.translit} ${d.meaning} ${d.source} ${DUA_TOPICS[d.topic]}`).includes(w)),
  );
  const star = (id: string) =>
    update((d) => {
      d.duaFavs = d.duaFavs.includes(id) ? d.duaFavs.filter((x) => x !== id) : [...d.duaFavs, id];
    });
  const addMine = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      toast('Give your dua a title and the words', 'error');
      return;
    }
    update((d) => void d.myDuas.push({ id: uid(), title: title.trim(), text: text.trim(), note: '' }));
    setTitle('');
    setText('');
    toast('Saved to my duas', 'pop');
  };
  const removeMine = async (id: string, name: string) => {
    if (!(await ask(`Delete "${name}"?`))) return;
    update((d) => void (d.myDuas = d.myDuas.filter((x) => x.id !== id)));
  };

  return (
    <div className="grid grid--2">
      <Panel title="Dua collection" icon="quran">
        <div className="form">
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, e.g. exam, sleep, parents" aria-label="Search duas" />
          <select className="input" value={topic} onChange={(e) => setTopic(e.target.value as DuaTopic | 'starred' | 'all')} aria-label="Topic">
            <option value="all">All topics</option>
            <option value="starred">★ Starred</option>
            {(Object.keys(DUA_TOPICS) as DuaTopic[]).map((t) => (
              <option key={t} value={t}>
                {DUA_TOPICS[t]}
              </option>
            ))}
          </select>
        </div>
        {list.length === 0 && <Empty>{topic === 'starred' ? 'Tap ☆ on a dua to keep it here.' : 'No dua matches.'}</Empty>}
        <ul className="dua-list">
          {list.map((d) => (
            <DuaCard key={d.id} dua={d} starred={data.duaFavs.includes(d.id)} onStar={() => star(d.id)} />
          ))}
        </ul>
        <p className="muted small">Each dua shows its source. Transliteration is only a guide — learn the words from the Arabic or a teacher.</p>
      </Panel>
      <Panel title="My own duas" icon="heart">
        <p className="muted small">Duas you want to remember — for your family, your exams, anything. Private.</p>
        <ul className="list">
          {data.myDuas.map((m) => (
            <li key={m.id} className="list__item">
              <div className="list__main">
                <span className="list__text">
                  <strong>{m.title}</strong>
                  <span className="note-body">{m.text}</span>
                </span>
              </div>
              <button type="button" className="icon-btn" onClick={() => removeMine(m.id, m.title)} aria-label={`Delete ${m.title}`}>
                <PixelIcon name="trash" size={16} />
              </button>
            </li>
          ))}
        </ul>
        <form className="form" onSubmit={addMine}>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title, e.g. For my family" aria-label="Dua title" maxLength={80} />
          <textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="The words (any language)" aria-label="Dua words" />
          <button type="submit" className="btn btn--primary">
            <PixelIcon name="plus" size={16} /> Save dua
          </button>
        </form>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- Good deeds
function Deeds() {
  const ask = useConfirm();
  const { data, update, today } = useStore();
  const [text, setText] = useState('');
  const [shown, setShown] = useState(false);
  const list = [...data.deeds].sort((a, b) => b.date.localeCompare(a.date));
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    update((d) => void d.deeds.push({ id: uid(), date: today, text: text.trim() }));
    setText('');
  };
  const remove = async (id: string) => {
    if (!(await ask('Delete this entry?'))) return;
    update((d) => void (d.deeds = d.deeds.filter((x) => x.id !== id)));
  };
  return (
    <Panel title="Private good deeds journal" icon="lantern">
      <p className="muted small">Between you and Allah. Nothing here is counted, scored, searchable or shown anywhere else in the app — just a quiet reminder of the good you were able to do.</p>
      <form className="form" onSubmit={add}>
        <textarea className="input" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Called grandma, gave sadaqah, helped a classmate" aria-label="Good deed" />
        <button type="submit" className="btn btn--primary">
          Write it down
        </button>
      </form>
      {list.length > 0 &&
        (shown ? (
          <>
            <ul className="list">
              {list.map((x) => (
                <li key={x.id} className="list__item">
                  <div className="list__main">
                    <span className="list__text">
                      <span className="note-body">{x.text}</span>
                      <small className="muted">{formatDay(x.date)}</small>
                    </span>
                  </div>
                  <button type="button" className="icon-btn" onClick={() => remove(x.id)} aria-label="Delete entry">
                    <PixelIcon name="trash" size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn--small" onClick={() => setShown(false)}>
              Hide
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--small" onClick={() => setShown(true)}>
            Show my entries
          </button>
        ))}
    </Panel>
  );
}

// ---------------------------------------------------------------- Learning library
const STATUS: { value: LearningItem['status']; label: string }[] = [
  { value: 'want', label: 'Want to' },
  { value: 'reading', label: 'Studying' },
  { value: 'done', label: 'Finished' },
];
const EMPTY_FORM = { title: '', by: '', kind: 'book' as LearningItem['kind'], link: '' };

function Learning() {
  const ask = useConfirm();
  const { data, update, toast } = useStore();
  const [f, setF] = useState(EMPTY_FORM);
  const [openId, setOpenId] = useState<string | null>(null);
  const order = { reading: 0, want: 1, done: 2 };
  const list = [...data.learning].sort((a, b) => order[a.status] - order[b.status] || a.title.localeCompare(b.title));
  const have = new Set(data.learning.map((l) => fold(l.title)));

  const add = (item: typeof EMPTY_FORM) => {
    if (!item.title.trim()) {
      toast('Give it a title', 'error');
      return false;
    }
    const link = item.link.trim();
    if (link && !/^https?:\/\//i.test(link)) {
      toast('Links must start with http:// or https://', 'error');
      return false;
    }
    update((d) => void d.learning.push({ id: uid(), title: item.title.trim(), by: item.by.trim(), kind: item.kind, status: 'want', link, notes: '' }));
    return true;
  };
  const change = (id: string, patch: Partial<LearningItem>) =>
    update((d) => {
      const l = d.learning.find((x) => x.id === id);
      if (l) Object.assign(l, patch);
    });
  const remove = async (l: LearningItem) => {
    if (!(await ask(`Remove "${l.title}"?`))) return;
    update((d) => void (d.learning = d.learning.filter((x) => x.id !== l.id)));
  };

  return (
    <div className="grid grid--2">
      <Panel title="My learning" icon="book">
        {list.length === 0 && <Empty>Add a book, course or lecture series — or start with one of the classics.</Empty>}
        <ul className="list">
          {list.map((l) => (
            <li key={l.id} className="list__item learning-item">
              <button type="button" className="list__main" onClick={() => setOpenId(openId === l.id ? null : l.id)} aria-expanded={openId === l.id}>
                <span className="list__text">
                  <span>{l.title}</span>
                  <small className="muted">{[l.by, l.kind, STATUS.find((s) => s.value === l.status)?.label].filter(Boolean).join(' · ')}</small>
                </span>
              </button>
              {openId === l.id && (
                <div className="form learning-item__more">
                  <Segmented<LearningItem['status']> label="Status" value={l.status} onChange={(v) => change(l.id, { status: v })} options={STATUS} />
                  {l.link && (
                    <a href={l.link} target="_blank" rel="noopener noreferrer">
                      Open link ↗
                    </a>
                  )}
                  <Field label="My notes">
                    <textarea className="input" rows={4} value={l.notes} onChange={(e) => change(l.id, { notes: e.target.value })} />
                  </Field>
                  <button type="button" className="btn btn--small btn--danger" onClick={() => remove(l)}>
                    Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Add to my learning" icon="plus">
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (add(f)) setF(EMPTY_FORM);
          }}
        >
          <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Title" aria-label="Title" maxLength={100} />
          <input className="input" value={f.by} onChange={(e) => setF({ ...f, by: e.target.value })} placeholder="By (author or teacher)" aria-label="Author or teacher" maxLength={60} />
          <select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as LearningItem['kind'] })} aria-label="Kind">
            <option value="book">Book</option>
            <option value="course">Course</option>
            <option value="lecture">Lecture series</option>
            <option value="other">Other</option>
          </select>
          <input className="input" type="url" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="Link (optional)" aria-label="Link" />
          <button type="submit" className="btn btn--primary">
            Add
          </button>
        </form>
        <p className="field__label">Classics to start with</p>
        <ul className="list">
          {STARTER_BOOKS.filter((b) => !have.has(fold(b.title))).map((b) => (
            <li key={b.title} className="list__item">
              <button
                type="button"
                className="list__main"
                onClick={() => {
                  if (add({ title: b.title, by: b.by, kind: 'book', link: '' })) toast(`Added ${b.title}`, 'pop');
                }}
              >
                <span className="list__text">
                  <span>{b.title}</span>
                  <small className="muted">
                    {b.by} · {b.about}
                  </small>
                </span>
                <PixelIcon name="plus" size={16} />
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
