/**
 * The app shell: top bar, the current screen, bottom tab bar, the big "+"
 * button, toasts, theme (day/night) and background sound.
 *
 * Navigation uses the URL hash: #/home, #/money/charts, #/study/timer …
 * so the browser Back button works and there's no server setup.
 */
import { useEffect, useRef, useState } from 'react';
import { isNightUK } from './lib/dates';
import { startAmbient, stopAmbient } from './lib/sound';
import { levelInfo } from './lib/xp';
import Home from './screens/Home';
import Money, { ExpenseSheet } from './screens/Money';
import More from './screens/More';
import Planner from './screens/Planner';
import Study from './screens/Study';
import { useStore, useTimer } from './state/store';
import { PixelIcon, type IconName } from './ui/icons';
import { Toaster } from './ui/kit';

const SCREENS = ['home', 'money', 'study', 'planner', 'more'] as const;
type Screen = (typeof SCREENS)[number];

const NAV: { id: Screen; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Home', icon: 'house' },
  { id: 'money', label: 'Money', icon: 'chest' },
  { id: 'study', label: 'Study', icon: 'shelf' },
  { id: 'planner', label: 'Planner', icon: 'table' },
  { id: 'more', label: 'More', icon: 'gear' },
];

function readHash(): { screen: Screen; sub?: string } {
  const [, screen, sub] = window.location.hash.split('/');
  return { screen: (SCREENS as readonly string[]).includes(screen) ? (screen as Screen) : 'home', sub };
}

export default function App() {
  const { data, update, openExpense } = useStore();
  const [route, setRoute] = useState(readHash);
  const mainRef = useRef<HTMLElement>(null);

  // ----- Routing -----
  useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  // When the screen (not just a sub-tab) changes: scroll to top and move focus for screen readers.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [route.screen]);

  // ----- Day / night theme (re-checked every minute) -----
  const [, setMinute] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMinute((m) => m + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const night = data.settings.theme === 'night' || (data.settings.theme === 'auto' && isNightUK());
  useEffect(() => {
    document.documentElement.dataset.theme = night ? 'night' : 'day';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', night ? '#1b1722' : '#6e4522');
  }, [night]);

  // ----- Background sound (browsers need a tap before sound can play) -----
  const sound = data.settings.sound;
  useEffect(() => {
    if (sound === 'off') {
      stopAmbient();
      return;
    }
    if (navigator.userActivation?.hasBeenActive) {
      startAmbient(sound);
      return;
    }
    const begin = () => startAmbient(sound);
    window.addEventListener('pointerdown', begin, { once: true });
    return () => window.removeEventListener('pointerdown', begin);
  }, [sound]);

  const lastSound = useRef<'rain' | 'fire'>('rain');
  if (sound !== 'off') lastSound.current = sound;
  const toggleSound = () => update((d) => void (d.settings.sound = sound === 'off' ? lastSound.current : 'off'));
  const toggleTheme = () => update((d) => void (d.settings.theme = night ? 'day' : 'night'));

  const lvl = levelInfo(data.xp);

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <a href="#/home" className="brand" aria-label="Ulu's Base, go home">
          <PixelIcon name="house" size={22} />
          <span>ULU'S BASE</span>
        </a>
        <div className="topbar__right">
          <MiniTimer />
          <a href="#/home" className="lvl" aria-label={`Level ${lvl.level}, ${lvl.into} of ${lvl.needed} XP`}>
            <span className="lvl__num">LV{lvl.level}</span>
            <span className="lvl__bar" aria-hidden="true">
              <span style={{ width: `${(lvl.into / lvl.needed) * 100}%` }} />
            </span>
          </a>
          <button type="button" className="icon-btn icon-btn--bar" onClick={toggleSound} aria-label={sound === 'off' ? `Turn on ${lastSound.current} sound` : 'Mute background sound'} aria-pressed={sound !== 'off'}>
            <PixelIcon name={sound === 'off' ? 'mute' : 'sound'} size={22} />
          </button>
          <button type="button" className="icon-btn icon-btn--bar" onClick={toggleTheme} aria-label={night ? 'Switch to day mode' : 'Switch to night mode'}>
            <PixelIcon name={night ? 'sun' : 'moon'} size={22} />
          </button>
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1} className="main">
        {route.screen === 'home' && <Home />}
        {route.screen === 'money' && <Money sub={route.sub} />}
        {route.screen === 'study' && <Study sub={route.sub} />}
        {route.screen === 'planner' && <Planner sub={route.sub} />}
        {route.screen === 'more' && <More sub={route.sub} />}
      </main>

      <button type="button" className="fab" onClick={() => openExpense()} aria-label="Add a purchase">
        <span aria-hidden="true">+</span>
        <small aria-hidden="true">£</small>
      </button>

      <nav className="tabbar" aria-label="Main">
        {NAV.map((n) => (
          <a key={n.id} href={`#/${n.id}`} className="tabbar__link" aria-current={route.screen === n.id ? 'page' : undefined}>
            <PixelIcon name={n.icon} size={24} />
            <span>{n.label}</span>
          </a>
        ))}
      </nav>

      <ExpenseSheet />
      <Toaster />
    </div>
  );
}

/** Small running-timer badge in the top bar, so you see it on every screen. */
function MiniTimer() {
  const { running, secondsLeft, timer } = useTimer();
  if (!running) return null;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  return (
    <a href="#/study/timer" className={`mini-timer mini-timer--${timer.mode}`} aria-label={`${timer.mode === 'work' ? 'Focus' : 'Break'} timer: ${mm}:${ss} left`}>
      <PixelIcon name="clock" size={16} />
      {mm}:{ss}
    </a>
  );
}
