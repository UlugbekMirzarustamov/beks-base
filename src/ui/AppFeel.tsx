/**
 * Things that make Bek's Base feel like a real app, not just a web page:
 *  - <Splash>       a short title screen when the app opens (tap to skip)
 *  - <InstallCard>  "Add to your home screen" help (or a real Install button
 *                   on browsers that support it), hidden once installed
 */
import { useEffect, useState } from 'react';
import { PixelIcon } from './icons';

// ---------------------------------------------------------------- title screen
const SPLASH_KEY = 'beks-splash';

/** Shown once each time the app is opened (not on every page change). */
export function Splash() {
  const [show, setShow] = useState(() => {
    try {
      return !sessionStorage.getItem(SPLASH_KEY);
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!show) return;
    try {
      sessionStorage.setItem(SPLASH_KEY, '1');
    } catch {
      /* ignore */
    }
    const quick = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setShow(false), quick ? 900 : 1900);
    return () => clearTimeout(t);
  }, [show]);
  if (!show) return null;
  return (
    <div className="splash-screen" onClick={() => setShow(false)} role="presentation">
      <img className="splash-screen__icon" src="./icon-192.png" alt="" width={112} height={112} />
      <h1 className="splash-screen__title">BEK'S BASE</h1>
      <p className="splash-screen__sub">a cosy cabin in Sheffield</p>
      <span className="splash-screen__bar" aria-hidden="true">
        <span />
      </span>
      <p className="splash-screen__hint">
        <PixelIcon name="cat" size={14} /> Simba is waking up…
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- install
/** Chrome/Edge/Android give us this event so we can show our own Install button. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // we show our own button instead of the browser's mini-bar
  deferredPrompt = e as BeforeInstallPromptEvent;
  promptListeners.forEach((l) => l());
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  promptListeners.forEach((l) => l());
});

const DISMISS_KEY = 'beks-install-dismissed';

export function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * compact = the dismissible banner on Home; otherwise the full card (Settings).
 * Hidden when the app is already installed and opened from the home screen.
 */
export function InstallCard({ compact = false }: { compact?: boolean }) {
  const [, rerender] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const l = () => rerender((n) => n + 1);
    promptListeners.add(l);
    return () => void promptListeners.delete(l);
  }, []);

  if (isInstalled()) {
    return compact ? null : (
      <p className="install install--done">
        <PixelIcon name="check" size={18} /> Installed — you're using the app version.
      </p>
    );
  }
  if (compact && dismissed) return null;

  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    deferredPrompt = null;
    rerender((n) => n + 1);
  };
  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div className={`install ${compact ? 'install--banner' : ''}`}>
      <img className="install__icon" src="./icon-192.png" alt="" width={48} height={48} />
      <div className="install__text">
        <strong>Make it a real app</strong>
        <span>Put Bek's Base on your home screen: it opens full-screen with its own cabin icon and works offline.</span>
        {!deferredPrompt &&
          (iOS ? (
            <span className="install__steps">
              In Safari tap <strong>Share</strong> (the square with an arrow) → <strong>Add to Home Screen</strong>.
            </span>
          ) : (
            <span className="install__steps">
              Browser menu <strong>⋮</strong> → <strong>Install app</strong> (or <strong>Add to Home screen</strong>).
            </span>
          ))}
      </div>
      <div className="install__actions">
        {deferredPrompt && (
          <button type="button" className="btn btn--primary btn--small" onClick={install}>
            Install
          </button>
        )}
        {compact && (
          <button type="button" className="btn btn--ghost btn--small" onClick={dismiss}>
            Not now
          </button>
        )}
      </div>
    </div>
  );
}
