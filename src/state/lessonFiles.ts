/**
 * The lesson files store: images and PDFs attached to lecture notes, kept in their own IndexedDB
 * key ("lessonFiles"), like family photos, so the main data stays small. Loaded once; if loading
 * fails, saving is switched off so nothing can overwrite files we couldn't read.
 */
import { useEffect, useState } from 'react';
import { isLessonFile, type LessonFile } from '../lib/backup';
import { loadFileList, saveFileList } from '../lib/db';

let files: LessonFile[] = [];
let loaded = false;
let started = false;
const listeners = new Set<(f: LessonFile[]) => void>();
const publish = () => listeners.forEach((l) => l(files));
const reportError = (text: string) => window.dispatchEvent(new CustomEvent('beks:save-error', { detail: text }));

function start() {
  if (started) return;
  started = true;
  loadFileList().then(
    (list) => {
      files = Array.isArray(list) ? list.filter(isLessonFile) : [];
      loaded = true;
      publish();
    },
    () => reportError("Your lesson files couldn't be loaded, so file changes are switched off for now"),
  );
}

/** Replace the whole list (returns false and changes nothing if the files never loaded). */
export async function setLessonFiles(next: LessonFile[]): Promise<boolean> {
  if (!loaded) {
    reportError("Your lesson files haven't loaded, so this change wasn't saved");
    return false;
  }
  try {
    await saveFileList(next);
  } catch {
    reportError("Your lesson file change couldn't be saved (the phone may be out of space)");
    return false;
  }
  files = next;
  publish();
  return true;
}

/** All lesson files, and whether they've loaded yet. */
export function useLessonFiles(): { files: LessonFile[]; loaded: boolean } {
  const [list, setList] = useState(files);
  const [ok, setOk] = useState(loaded);
  useEffect(() => {
    start();
    const on = (f: LessonFile[]) => {
      setList(f);
      setOk(loaded);
    };
    listeners.add(on);
    on(files);
    return () => void listeners.delete(on);
  }, []);
  return { files: list, loaded: ok };
}
