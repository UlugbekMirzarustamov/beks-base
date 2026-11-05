/**
 * 🔍 The command palette: Cmd+K / Ctrl+K anywhere (or the magnifier in the top
 * bar). Search everything you've written, jump to any screen, run a quick
 * action, or send what you typed straight to Quick Capture.
 * The search logic lives in lib/search.ts; this file is only the window.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { captureInto, parseCapture } from '../lib/capture';
import { isNightUK } from '../lib/dates';
import { uid } from '../lib/id';
import { buildIndex, searchCommands, searchIndex, type Command, type SearchEntry } from '../lib/search';
import { sfx } from '../lib/sound';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';

/** Open the palette from anywhere (the top-bar button uses this). */
export const openSearch = () => window.dispatchEvent(new Event('beks:search'));

type Row = { id: string; group: string; title: string; sub: string; run: () => void };

export function CommandPalette() {
  const { data, update, today, toast, openExpense } = useStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const show = () => {
      returnFocus.current = document.activeElement as HTMLElement | null;
      setOpen(true);
      setQuery('');
      setActive(0);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) setOpen(false);
        else show();
      }
    };
    window.addEventListener('beks:search', show);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('beks:search', show);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  useEffect(() => {
    if (open) inputRef.current?.focus();
    else returnFocus.current?.focus?.();
  }, [open]);

  // Rebuilt only when your data changes while the palette is open.
  const index = useMemo(() => (open ? buildIndex(data) : []), [open, data]);
  if (!open) return null;

  const close = () => setOpen(false);
  const runCommand = (c: Command) => {
    close();
    if (c.href) location.hash = c.href;
    else if (c.action === 'add-purchase') openExpense();
    else if (c.action === 'briefing') window.dispatchEvent(new Event('beks:briefing'));
    else if (c.action === 'toggle-theme') {
      const night = data.settings.theme === 'night' || (data.settings.theme === 'auto' && isNightUK());
      update((d) => void (d.settings.theme = night ? 'day' : 'night'));
    }
  };
  const capture = () => {
    const p = parseCapture(query, today);
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
    close();
  };
  const openRecord = (e: SearchEntry) => {
    close();
    location.hash = e.href;
  };

  const rows: Row[] = [
    ...searchCommands(query)
      .slice(0, query.trim() ? 6 : 8)
      .map((c) => ({ id: `cmd-${c.key}`, group: 'Go & do', title: c.title, sub: c.href ? 'Open' : 'Action', run: () => runCommand(c) })),
    ...(query.trim() ? [{ id: 'capture', group: 'Capture', title: `Capture: “${query.trim()}”`, sub: 'Quick Capture guesses where it goes', run: capture }] : []),
    ...searchIndex(index, query, 20).map((e) => ({ id: `rec-${e.key}`, group: 'Found in your base', title: e.title, sub: `${e.kind}${e.sub ? ` · ${e.sub}` : ''}`, run: () => openRecord(e) })),
    ...(query.trim()
      ? [{ id: 'archive', group: 'Found in your base', title: `See everything for “${query.trim()}” in the archive`, sub: 'By month, with filters', run: () => ((location.hash = `#/archive/${encodeURIComponent(query.trim())}`), close()) }]
      : []),
  ];
  const current = Math.min(active, Math.max(0, rows.length - 1));

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((current + 1) % Math.max(1, rows.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((current - 1 + rows.length) % Math.max(1, rows.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      rows[current]?.run();
    }
  };

  let lastGroup = '';
  return (
    <div className="palette" role="dialog" aria-modal="true" aria-label="Search and commands" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="palette__box">
        <div className="palette__field">
          <PixelIcon name="search" size={20} />
          <input
            ref={inputRef}
            className="palette__input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search everything, or type a command…"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={rows[current] ? `palette-${rows[current].id}` : undefined}
            aria-label="Search everything or run a command"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="btn btn--small btn--ghost" onClick={close} aria-label="Close search">
            Esc
          </button>
        </div>
        <ul id="palette-list" className="palette__list" role="listbox" aria-label="Results">
          {rows.length === 0 && <li className="palette__empty">Nothing found. Try fewer words.</li>}
          {rows.map((r, i) => {
            const header = r.group !== lastGroup ? r.group : '';
            lastGroup = r.group;
            return (
              <li key={r.id} role="presentation">
                {header && (
                  <p className="palette__group" aria-hidden="true">
                    {header}
                  </p>
                )}
                <button
                  type="button"
                  id={`palette-${r.id}`}
                  role="option"
                  aria-selected={i === current}
                  className={`palette__row ${i === current ? 'is-active' : ''}`}
                  onMouseMove={() => setActive(i)}
                  onClick={r.run}
                  tabIndex={-1}
                >
                  <strong>{r.title}</strong>
                  <small className="muted">{r.sub}</small>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="palette__hint muted small">↑ ↓ to move · Enter to open · Esc to close · Ctrl/⌘ K anywhere</p>
      </div>
    </div>
  );
}
