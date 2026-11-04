/**
 * Small reusable building blocks: wooden panels, pixel health bars, tabs,
 * pop-up sheets and toasts. Styling lives in styles.css.
 */
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useStore, type ToastKind } from '../state/store';
import { PixelIcon, type IconName } from './icons';

/** A chunky wooden/stone window. */
export function Panel(props: { title?: ReactNode; icon?: IconName; actions?: ReactNode; className?: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section className={`panel ${props.className ?? ''}`} aria-labelledby={props.title ? headingId : undefined}>
      {props.title && (
        <header className="panel__head">
          <h2 id={headingId} className="panel__title">
            {props.icon && <PixelIcon name={props.icon} size={20} />}
            {props.title}
          </h2>
          {props.actions && <div className="panel__actions">{props.actions}</div>}
        </header>
      )}
      {props.children}
    </section>
  );
}

/** A segmented pixel bar, like a health/hunger bar. */
export function Bar(props: { value: number; max: number; level?: 'ok' | 'warn' | 'over'; label: string; color?: string }) {
  const { value, max, level = 'ok', label } = props;
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : value > 0 ? 100 : 0;
  return (
    <div
      className={`bar bar--${level}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.max(max, value)}
      aria-valuenow={value}
    >
      <div className="bar__fill" style={{ width: `${pct}%`, background: level === 'ok' ? props.color : undefined }} />
    </div>
  );
}

export interface TabDef<T extends string> {
  id: T;
  label: string;
  icon?: IconName;
}

/** Row of chunky tab buttons. Left/Right arrow keys move between them. */
export function Tabs<T extends string>(props: { tabs: TabDef<T>[]; active: T; onChange: (id: T) => void; label: string }) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = props.tabs.findIndex((t) => t.id === props.active);
    const next = props.tabs[(i + (e.key === 'ArrowRight' ? 1 : props.tabs.length - 1)) % props.tabs.length];
    props.onChange(next.id);
    (e.currentTarget.querySelector(`[data-tab="${next.id}"]`) as HTMLElement | null)?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={props.label} onKeyDown={onKey}>
      {props.tabs.map((t) => (
        <button
          key={t.id}
          data-tab={t.id}
          role="tab"
          type="button"
          aria-selected={t.id === props.active}
          tabIndex={t.id === props.active ? 0 : -1}
          className="tab"
          onClick={() => props.onChange(t.id)}
        >
          {t.icon && <PixelIcon name={t.icon} size={18} />}
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** A pick-one row of buttons (e.g. Auto / Day / Night). */
export function Segmented<T extends string | number>(props: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={props.label}>
      {props.options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === props.value}
          className="segmented__btn"
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A pop-up window (bottom sheet on phones). Uses the native <dialog>, which
 * traps keyboard focus and closes with Esc for free.
 */
export function Sheet(props: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (props.open && !d.open) {
      d.showModal();
      // showModal() moves focus to the first button (✕). Jump to the field marked
      // data-autofocus instead, so you can start typing straight away.
      d.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!props.open && d.open) d.close();
  }, [props.open]);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={props.onClose}
      onClick={(e) => e.target === ref.current && props.onClose()} // tap outside to close
    >
      {props.open && (
        <div className="sheet__inner">
          <header className="sheet__head">
            <h2 id={titleId} className="panel__title">
              {props.title}
            </h2>
            <button type="button" className="btn btn--small btn--ghost" onClick={props.onClose} aria-label="Close">
              ✕
            </button>
          </header>
          {props.children}
        </div>
      )}
    </dialog>
  );
}

/* ---------------------------------------------------------------------------
 * "Are you sure?" window.
 * We don't use the browser's confirm() because some browsers and in-app web
 * views block it (it silently answers "no", so Delete buttons did nothing).
 *
 *   const ask = useConfirm();
 *   if (!(await ask('Delete this task?'))) return;
 * ------------------------------------------------------------------------- */
interface ConfirmOptions {
  /** Text on the "yes" button. */
  ok?: string;
  /** Red "yes" button (for deleting). Default true. */
  danger?: boolean;
}
type Ask = (message: string, options?: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<Ask>(async () => false);

export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<{ message: string; ok: string; danger: boolean; resolve: (yes: boolean) => void } | null>(null);
  const ask = useCallback<Ask>(
    (message, options = {}) =>
      new Promise((resolve) => setRequest({ message, ok: options.ok ?? 'Delete', danger: options.danger ?? true, resolve })),
    [],
  );
  const answer = (yes: boolean) => {
    request?.resolve(yes);
    setRequest(null);
  };
  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <Sheet open={request !== null} onClose={() => answer(false)} title="Are you sure?">
        <p className="confirm__text">{request?.message}</p>
        <div className="form__actions">
          <button type="button" className="btn grow" onClick={() => answer(false)} data-autofocus>
            Cancel
          </button>
          <button type="button" className={`btn grow ${request?.danger ? 'btn--danger' : 'btn--primary'}`} onClick={() => answer(true)}>
            {request?.ok}
          </button>
        </div>
      </Sheet>
    </ConfirmContext.Provider>
  );
}

/** Label + input wrapper. */
export function Field(props: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`field ${props.className ?? ''}`}>
      <span className="field__label">{props.label}</span>
      {props.children}
      {props.hint && <span className="field__hint">{props.hint}</span>}
    </label>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

const TOAST_ICON: Record<ToastKind, IconName> = {
  pop: 'coin',
  xp: 'star',
  level: 'star',
  warn: 'flame',
  error: 'cross',
  info: 'scroll',
};

/** The little pop-up messages ("+10 XP", "Saved!") at the top of the screen. */
export function Toaster() {
  const { toasts } = useStore();
  return (
    <div className="toaster" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          <PixelIcon name={TOAST_ICON[t.kind]} size={22} />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/** Lets a screen read/write its sub-tab from the URL hash, e.g. #/money/charts */
export function useSubRoute<T extends string>(screen: string, sub: string | undefined, valid: readonly T[]): [T, (t: T) => void] {
  const active = (valid.includes(sub as T) ? sub : valid[0]) as T;
  const set = (t: T) => {
    window.location.hash = `#/${screen}/${t}`;
  };
  return [active, set];
}
