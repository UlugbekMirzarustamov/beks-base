/**
 * 🖼️ The family photo wall. Your photos hang in the frame on the cabin mantel
 * (a different one each day, in tiny pixels). Tap the frame → they open full
 * screen over a blurred cabin, like photos pinned on a wall.
 *
 * Photos are made smaller (max 1000 px) and kept ONLY on this device, in their
 * own spot in IndexedDB. They are never uploaded anywhere.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Photo } from '../lib/backup';
import { dayHash } from '../lib/daily';
import { clockIn, formatDay, TASHKENT_TZ, zonedParts } from '../lib/dates';
import { loadPhotoList, savePhotoList } from '../lib/db';
import { uid } from '../lib/id';
import { sfx } from '../lib/sound';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { useConfirm } from '../ui/kit';

// ---------------------------------------------------------------- a tiny shared photo store
let photos: Photo[] = [];
let loaded = false;
const listeners = new Set<(p: Photo[]) => void>();
const publish = () => listeners.forEach((l) => l(photos));

void loadPhotoList().then((list) => {
  photos = Array.isArray(list) ? (list as Photo[]) : [];
  loaded = true;
  publish();
});

export function setPhotos(next: Photo[]) {
  photos = next;
  publish();
  void savePhotoList(next);
}

/** All family photos (newest last). */
export function usePhotos(): Photo[] {
  const [list, setList] = useState(photos);
  useEffect(() => {
    listeners.add(setList);
    if (loaded) setList(photos);
    return () => void listeners.delete(setList);
  }, []);
  return list;
}

/** The same photo all day, a different one tomorrow. */
export const photoOfTheDay = (list: Photo[], today: string): Photo | null => (list.length ? list[dayHash(today, 'photo') % list.length] : null);

/** Shrink a picture to at most `max` px on its longest side, as a JPEG data: URL. */
export async function shrink(file: File, max = 1000): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Open the full-screen photo wall from anywhere (the cabin frame, the calm corner…). */
export const openPhotos = () => window.dispatchEvent(new Event('beks:photos'));

const TILTS = [-3, 2, -1, 3, -2, 1];

export function PhotoWall() {
  const list = usePhotos();
  const { today, toast } = useStore();
  const ask = useConfirm();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const swipeStart = useRef<number | null>(null);

  useEffect(() => {
    const show = () => {
      setOpen(true);
      setEditing(false);
      const todays = photoOfTheDay(photos, today);
      setIndex(todays ? photos.indexOf(todays) : 0);
    };
    window.addEventListener('beks:photos', show);
    return () => window.removeEventListener('beks:photos', show);
  }, [today]);

  const go = (step: number) => {
    if (list.length < 2) return;
    sfx('tick');
    setEditing(false);
    setIndex((i) => (i + step + list.length) % list.length);
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!open) return null;

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const added: Photo[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith('image/')) continue;
        added.push({ id: uid(), src: await shrink(f), caption: '', added: today });
      }
      if (added.length) {
        setPhotos([...list, ...added]);
        setIndex(list.length);
        setEditing(true);
        sfx('pop');
        toast(added.length === 1 ? 'Photo hung on the wall' : `${added.length} photos hung on the wall`, 'pop');
      }
    } catch {
      toast("Couldn't open that picture. Try a JPG or PNG.", 'error');
    } finally {
      setBusy(false);
    }
  };

  const photo = list[Math.min(index, list.length - 1)];
  const setCaption = (caption: string) => setPhotos(list.map((p) => (p.id === photo.id ? { ...p, caption } : p)));
  const remove = async () => {
    if (!(await ask('Take this photo off the wall? (It is deleted from the app.)', { ok: 'Remove' }))) return;
    setPhotos(list.filter((p) => p.id !== photo.id));
    setIndex(0);
  };

  const tashHour = zonedParts(new Date(), TASHKENT_TZ).hour;
  const onDown = (e: ReactPointerEvent) => void (swipeStart.current = e.clientX);
  const onUp = (e: ReactPointerEvent) => {
    if (swipeStart.current === null) return;
    const dx = e.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  return (
    <div className="jar-overlay photo-wall" role="dialog" aria-modal="true" aria-label="Family photos" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <p className="jar-overlay__title">Family</p>
      {photo ? (
        <>
          <figure
            key={photo.id}
            className="polaroid"
            style={{ transform: `rotate(${TILTS[index % TILTS.length]}deg)` }}
            onPointerDown={onDown}
            onPointerUp={onUp}
          >
            <span className="polaroid__pin" aria-hidden="true" />
            <img src={photo.src} alt={photo.caption || 'Family photo'} className="polaroid__img" draggable={false} />
            <figcaption className="polaroid__caption">
              {editing ? (
                <input
                  className="input polaroid__input"
                  value={photo.caption}
                  onChange={(e) => setCaption(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
                  placeholder="Write a caption… (e.g. Graduation day 2026)"
                  maxLength={60}
                  autoFocus
                  aria-label="Caption"
                />
              ) : (
                <button type="button" className="polaroid__text" onClick={() => setEditing(true)} aria-label="Edit caption">
                  {photo.caption || 'Tap to write a caption'}
                </button>
              )}
            </figcaption>
          </figure>
          <p className="jar-overlay__hint">
            {list.length > 1 ? `${index + 1} of ${list.length} · swipe or use the arrows` : 'Add more photos to fill the wall'} · It's {clockIn(TASHKENT_TZ)} in Tashkent
            {tashHour >= 8 && tashHour < 22 ? ' — a good time to call them' : ''}
          </p>
          {list.length > 1 && (
            <ol className="photo-strip" aria-label="All photos">
              {list.map((p, i) => (
                <li key={p.id}>
                  <button type="button" className={`photo-strip__thumb ${i === index ? 'is-on' : ''}`} onClick={() => setIndex(i)} aria-label={`Photo ${i + 1}${p.caption ? `: ${p.caption}` : ''}`}>
                    <img src={p.src} alt="" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <div className="photo-empty">
          <PixelIcon name="photo" size={64} />
          <p>
            Hang your family photos here. They show in the frame on the cabin mantel, and they stay <strong>only on this phone</strong>, never uploaded.
          </p>
        </div>
      )}

      <div className="jar-overlay__actions">
        {list.length > 1 && (
          <button type="button" className="btn" onClick={() => go(-1)} aria-label="Previous photo">
            <PixelIcon name="arrowL" size={16} />
          </button>
        )}
        <label className={`btn btn--primary file-btn ${busy ? 'is-busy' : ''}`}>
          <PixelIcon name="plus" size={16} /> {busy ? 'Hanging…' : 'Add photos'}
          <input type="file" accept="image/*" multiple className="visually-hidden" onChange={(e) => void add(e.target.files)} disabled={busy} />
        </label>
        {photo && (
          <button type="button" className="btn" onClick={remove} aria-label="Remove this photo">
            <PixelIcon name="trash" size={16} />
          </button>
        )}
        {list.length > 1 && (
          <button type="button" className="btn" onClick={() => go(1)} aria-label="Next photo">
            <PixelIcon name="arrowR" size={16} />
          </button>
        )}
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      {photo && <p className="muted small photo-wall__date">Added {formatDay(photo.added)}</p>}
    </div>
  );
}
