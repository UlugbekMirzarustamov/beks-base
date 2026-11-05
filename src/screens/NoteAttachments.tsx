/**
 * Things attached to a lecture note: images (made smaller), PDFs, links and formulas.
 * Files are kept on this device only, in their own storage (state/lessonFiles.ts) — included in
 * safety copies and backup files. Formulas can be sent to your formula cards in one tap.
 */
import { useRef, useState, type FormEvent } from 'react';
import type { LessonFile } from '../lib/backup';
import { uid } from '../lib/id';
import type { LectureNote } from '../lib/types';
import { setLessonFiles, useLessonFiles } from '../state/lessonFiles';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { useConfirm } from '../ui/kit';
import { shrink } from './Photos';

/** Biggest PDF we keep (phone storage is shared with everything else). */
const MAX_PDF = 8 * 1024 * 1024;
const size = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

/** Open a stored file in a new tab (a blob URL, because browsers block opening data: URLs). */
async function openFile(f: LessonFile) {
  const blob = await (await fetch(f.data)).blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function NoteAttachments({ note }: { note: LectureNote }) {
  const ask = useConfirm();
  const { update, toast, today } = useStore();
  const { files, loaded } = useLessonFiles();
  const mine = files.filter((f) => f.noteId === note.id);
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<LessonFile | null>(null);
  const [link, setLink] = useState({ title: '', url: '' });
  const [formula, setFormula] = useState({ name: '', expr: '' });
  const [adding, setAdding] = useState<'link' | 'formula' | null>(null);

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    const added: LessonFile[] = [];
    try {
      for (const file of Array.from(list)) {
        if (file.type.startsWith('image/')) {
          const data = await shrink(file, 1600);
          added.push({ id: uid(), noteId: note.id, name: file.name || 'image', type: 'image/jpeg', size: Math.round((data.length * 3) / 4), data, added: today });
        } else if (file.type === 'application/pdf') {
          if (file.size > MAX_PDF) {
            toast(`${file.name} is over 8 MB — too big to keep on the phone`, 'error');
            continue;
          }
          added.push({ id: uid(), noteId: note.id, name: file.name || 'document.pdf', type: file.type, size: file.size, data: await readAsDataUrl(file), added: today });
        } else toast(`${file.name}: only images and PDFs can be attached`, 'error');
      }
      if (added.length && (await setLessonFiles([...files, ...added]))) toast(`Attached ${added.length} file${added.length === 1 ? '' : 's'}`, 'pop');
    } catch {
      toast("That file couldn't be read", 'error');
    } finally {
      setBusy(false);
      if (picker.current) picker.current.value = '';
    }
  };
  const removeFile = async (f: LessonFile) => {
    if (!(await ask(`Remove ${f.name} from this note?`, { ok: 'Remove' }))) return false;
    return setLessonFiles(files.filter((x) => x.id !== f.id));
  };

  const change = (fn: (n: LectureNote) => void) =>
    update((d) => {
      const n = d.lectureNotes.find((x) => x.id === note.id);
      if (n) fn(n);
    });
  const addLink = (e: FormEvent) => {
    e.preventDefault();
    const url = link.url.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      toast('Links must start with http:// or https://', 'error');
      return;
    }
    change((n) => void (n.links = [...(n.links ?? []), { id: uid(), title: link.title.trim() || url, url }]));
    setLink({ title: '', url: '' });
    setAdding(null);
  };
  const addFormula = (e: FormEvent) => {
    e.preventDefault();
    if (!formula.expr.trim()) {
      toast('Write the formula', 'error');
      return;
    }
    change((n) => void (n.formulas = [...(n.formulas ?? []), { id: uid(), name: formula.name.trim(), expr: formula.expr.trim() }]));
    setFormula({ name: '', expr: '' });
    setAdding(null);
  };
  const toCards = (name: string, expr: string) => {
    update((d) => void d.flashcards.push({ id: uid(), front: name || expr, back: expr, box: 1 }));
    toast('Added to your formula cards', 'pop');
  };

  const images = mine.filter((f) => f.type.startsWith('image/'));
  const pdfs = mine.filter((f) => f.type === 'application/pdf');
  return (
    <div className="attachments">
      <p className="field__label">Attached to this lesson</p>
      {images.length > 0 && (
        <div className="attachments__images">
          {images.map((f) => (
            <button key={f.id} type="button" className="attachments__thumb" onClick={() => setViewing(f)} aria-label={`Open image ${f.name}`}>
              <img src={f.data} alt="" />
            </button>
          ))}
        </div>
      )}
      <ul className="list">
        {pdfs.map((f) => (
          <li key={f.id} className="list__item">
            <button type="button" className="list__main" onClick={() => openFile(f)}>
              <PixelIcon name="scroll" size={20} />
              <span className="list__text">
                <span>{f.name}</span>
                <small className="muted">PDF · {size(f.size)} · tap to open</small>
              </span>
            </button>
            <button type="button" className="icon-btn" onClick={() => removeFile(f)} aria-label={`Remove ${f.name}`}>
              <PixelIcon name="trash" size={16} />
            </button>
          </li>
        ))}
        {(note.links ?? []).map((l) => (
          <li key={l.id} className="list__item">
            <a className="list__main" href={l.url} target="_blank" rel="noopener noreferrer">
              <PixelIcon name="globe" size={20} />
              <span className="list__text">
                <span>{l.title}</span>
                <small className="muted">{l.url.replace(/^https?:\/\//, '').slice(0, 40)} ↗</small>
              </span>
            </a>
            <button type="button" className="icon-btn" onClick={() => change((n) => void (n.links = (n.links ?? []).filter((x) => x.id !== l.id)))} aria-label={`Remove link ${l.title}`}>
              <PixelIcon name="trash" size={16} />
            </button>
          </li>
        ))}
        {(note.formulas ?? []).map((f) => (
          <li key={f.id} className="list__item">
            <div className="list__main">
              <PixelIcon name="card" size={20} />
              <span className="list__text">
                {f.name && <small className="muted">{f.name}</small>}
                <span className="formula">{f.expr}</span>
              </span>
            </div>
            <button type="button" className="btn btn--small" onClick={() => toCards(f.name, f.expr)}>
              + card
            </button>
            <button type="button" className="icon-btn" onClick={() => change((n) => void (n.formulas = (n.formulas ?? []).filter((x) => x.id !== f.id)))} aria-label={`Remove formula ${f.name || f.expr}`}>
              <PixelIcon name="trash" size={16} />
            </button>
          </li>
        ))}
      </ul>
      {!mine.length && !note.links?.length && !note.formulas?.length && <p className="muted small">Nothing yet — add photos of the board, slides as PDFs, links or formulas.</p>}

      <div className="kitchen-chips">
        <button type="button" className="btn btn--small" onClick={() => picker.current?.click()} disabled={!loaded || busy}>
          <PixelIcon name="photo" size={14} /> {busy ? 'Adding…' : 'Image / PDF'}
        </button>
        <button type="button" className="btn btn--small" onClick={() => setAdding(adding === 'link' ? null : 'link')} aria-expanded={adding === 'link'}>
          <PixelIcon name="globe" size={14} /> Link
        </button>
        <button type="button" className="btn btn--small" onClick={() => setAdding(adding === 'formula' ? null : 'formula')} aria-expanded={adding === 'formula'}>
          <PixelIcon name="card" size={14} /> Formula
        </button>
      </div>
      <input ref={picker} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => addFiles(e.target.files)} aria-label="Choose images or PDFs" />
      {adding === 'link' && (
        <form className="form" onSubmit={addLink}>
          <input className="input" value={link.title} onChange={(e) => setLink({ ...link, title: e.target.value })} placeholder="Title (e.g. Lecture recording)" aria-label="Link title" />
          <input className="input" type="url" value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} placeholder="https://…" aria-label="Link address" />
          <button type="submit" className="btn btn--primary">
            Add link
          </button>
        </form>
      )}
      {adding === 'formula' && (
        <form className="form" onSubmit={addFormula}>
          <input className="input" value={formula.name} onChange={(e) => setFormula({ ...formula, name: e.target.value })} placeholder="Name (e.g. Kinetic energy)" aria-label="Formula name" />
          <input className="input formula" value={formula.expr} onChange={(e) => setFormula({ ...formula, expr: e.target.value })} placeholder="KE = ½mv²" aria-label="Formula" />
          <button type="submit" className="btn btn--primary">
            Add formula
          </button>
        </form>
      )}
      {!loaded && <p className="muted small">Loading files…</p>}

      {viewing && (
        <div className="image-viewer" role="dialog" aria-modal="true" aria-label={viewing.name} onClick={() => setViewing(null)}>
          <img src={viewing.data} alt={viewing.name} />
          <div className="form__row" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="btn btn--small btn--danger"
              onClick={async () => {
                if (await removeFile(viewing)) setViewing(null);
              }}
            >
              Remove
            </button>
            <button type="button" className="btn btn--small" onClick={() => setViewing(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Remove every file attached to a note (used when the note is deleted). */
export async function removeNoteFiles(noteId: string, all: LessonFile[]) {
  if (all.some((f) => f.noteId === noteId)) await setLessonFiles(all.filter((f) => f.noteId !== noteId));
}
