/**
 * The app shell: top bar, the current screen, bottom tab bar, the big "+"
 * button, toasts, theme (day/night), the sound mixer and the prayer strip/call.
 *
 * Navigation uses the URL hash: #/home, #/money/charts, #/study/timer …
 * so the browser Back button works and there's no server setup.
 */
import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { isNightUK } from './lib/dates';
import { applyMixer, setSfxEnabled, sfx } from './lib/sound';
import { levelInfo } from './lib/xp';
import Home from './screens/Home';
import Money, { ExpenseSheet } from './screens/Money';
import { MorningBriefing } from './screens/Briefing';
import CalmCorner, { JarOverlay } from './screens/Calm';
import { PotCloseout } from './screens/Plan';
import Campfire from './screens/Campfire';
import { PhotoWall } from './screens/Photos';
import { HardBadge, OversleptCall } from './screens/Push';
import { ReminderWatcher } from './screens/Capture';
import { CommandPalette, openSearch } from './screens/Search';
import Planner from './screens/Planner';
import PrayerPage, { PrayerBar, PrayerCall } from './screens/Prayer';
import Study from './screens/Study';
import { useStore, useTimer } from './state/store';
import { PixelIcon, type IconName } from './ui/icons';
import { Toaster } from './ui/kit';
import { Splash } from './ui/AppFeel';
import { SoundMixer } from './ui/SoundMixer';

// Screens nothing else needs are loaded on first visit (smaller start-up). `prefetchScreens`
// fetches them in the background once the app is idle, so they're cached for offline use.
const loadReflect = () => import('./screens/Reflect');
const loadMore = () => import('./screens/More');
const loadPond = () => import('./screens/Pond');
const loadKitchen = () => import('./screens/Kitchen');
const loadArchive = () => import('./screens/Archive');
const Reflect = lazy(loadReflect);
const More = lazy(loadMore);
const Pond = lazy(loadPond);
const Kitchen = lazy(loadKitchen);
const Archive = lazy(loadArchive);
export function prefetchScreens() {
  void Promise.all([loadReflect(), loadMore(), loadPond(), loadKitchen(), loadArchive(), import('./screens/Calendar'), import('./screens/Assignments'), import('./screens/Admin'), import('./screens/Toolbox'), import('./screens/Notes'), import('./screens/Revision'), import('./screens/Deen')]).catch(() => {
    /* offline: they'll be fetched next time */
  });
}

/** If a screen's code can't be downloaded (offline before it was ever cached), say so instead of crashing. */
class ScreenBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="panel">
        <p>This part of the app isn't downloaded yet. Connect to the internet once and open it again.</p>
        <a href="#/home" className="btn" onClick={() => this.setState({ failed: false })}>
          Back home
        </a>
      </div>
    );
  }
}

const SCREENS = ['home', 'money', 'study', 'planner', 'reflect', 'more', 'prayer', 'calm', 'pond', 'campfire', 'kitchen', 'archive'] as const;
type Screen = (typeof SCREENS)[number];

const NAV: { id: Screen; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Home', icon: 'house' },
  { id: 'money', label: 'Money', icon: 'chest' },
  { id: 'study', label: 'Study', icon: 'shelf' },
  { id: 'planner', label: 'Planner', icon: 'table' },
  { id: 'reflect', label: 'Reflect', icon: 'telescope' },
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
  // Home-screen shortcut "Add purchase" opens #/add → open the sheet, then show Home.
  useEffect(() => {
    if (window.location.hash !== '#/add') return;
    openExpense();
    history.replaceState(null, '', '#/home');
    setRoute(readHash());
  }, [route, openExpense]);

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

  // ----- Background sound mixer (browsers need a tap before sound can play) -----
  const { rain, fire, wind, lofi } = data.settings.mixer;
  useEffect(() => {
    const levels = { rain, fire, wind, lofi };
    if (navigator.userActivation?.hasBeenActive || rain + fire + wind + lofi === 0) {
      applyMixer(levels);
      return;
    }
    const begin = () => applyMixer(levels);
    window.addEventListener('pointerdown', begin, { once: true });
    return () => window.removeEventListener('pointerdown', begin);
  }, [rain, fire, wind, lofi]);
  const soundOn = rain + fire + wind + lofi > 0;
  const sfxOn = data.settings.sfx;
  useEffect(() => setSfxEnabled(sfxOn), [sfxOn]);

  // The sound button opens a small mixer panel; Esc or a tap outside closes it.
  const [mixerOpen, setMixerOpen] = useState(false);
  const mixerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mixerOpen) return;
    const onDown = (e: PointerEvent) => !mixerRef.current?.contains(e.target as Node) && setMixerOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMixerOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [mixerOpen]);

  const toggleTheme = () => update((d) => void (d.settings.theme = night ? 'day' : 'night'));

  const lvl = levelInfo(data.xp);

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <a href="#/home" className="brand" aria-label="Bek's Base, go home">
          <PixelIcon name="house" size={22} />
          <span>BEK'S BASE</span>
        </a>
        <div className="topbar__right">
          <HardBadge />
          <MiniTimer />
          <a href="#/home" className="lvl" aria-label={`Level ${lvl.level}, ${lvl.into} of ${lvl.needed} XP`}>
            <span className="lvl__num">LV{lvl.level}</span>
            <span className="lvl__bar" aria-hidden="true">
              <span style={{ width: `${(lvl.into / lvl.needed) * 100}%` }} />
            </span>
          </a>
          <button type="button" className="icon-btn icon-btn--bar" onClick={openSearch} aria-label="Search and commands (Ctrl+K)" aria-keyshortcuts="Control+K Meta+K">
            <PixelIcon name="search" size={22} />
          </button>
          <div className="mixer-pop" ref={mixerRef}>
            <button
              type="button"
              className="icon-btn icon-btn--bar"
              onClick={() => setMixerOpen(!mixerOpen)}
              aria-label="Sound mixer"
              aria-expanded={mixerOpen}
              aria-controls="mixer-panel"
            >
              <PixelIcon name={soundOn ? 'sound' : 'mute'} size={22} />
            </button>
            {mixerOpen && (
              <div id="mixer-panel" className="mixer-pop__panel" role="dialog" aria-label="Sound mixer">
                <p className="panel__title">Sound mixer</p>
                <SoundMixer />
              </div>
            )}
          </div>
          <button type="button" className="icon-btn icon-btn--bar" onClick={toggleTheme} aria-label={night ? 'Switch to day mode' : 'Switch to night mode'}>
            <PixelIcon name={night ? 'sun' : 'moon'} size={22} />
          </button>
        </div>
      </header>
      <PrayerBar />

      <main id="main" ref={mainRef} tabIndex={-1} className="main">
        <ScreenBoundary key={route.screen}>
          <Suspense fallback={<p className="muted center">Opening…</p>}>
            {route.screen === 'home' && <Home />}
            {route.screen === 'money' && <Money sub={route.sub} />}
            {route.screen === 'study' && <Study sub={route.sub} />}
            {route.screen === 'planner' && <Planner sub={route.sub} />}
            {route.screen === 'reflect' && <Reflect sub={route.sub} />}
            {route.screen === 'more' && <More sub={route.sub} />}
            {route.screen === 'prayer' && <PrayerPage sub={route.sub} />}
            {route.screen === 'calm' && <CalmCorner />}
            {route.screen === 'pond' && <Pond />}
            {route.screen === 'kitchen' && <Kitchen sub={route.sub} />}
            {route.screen === 'archive' && <Archive key={route.sub ?? ''} sub={route.sub} />}
            {route.screen === 'campfire' && <Campfire />}
          </Suspense>
        </ScreenBoundary>
      </main>

      <button type="button" className="fab" onClick={() => openExpense()} aria-label="Add a purchase">
        <span aria-hidden="true">+</span>
        <small aria-hidden="true">$</small>
      </button>

      <nav className="tabbar" aria-label="Main">
        {NAV.map((n) => (
          <a key={n.id} href={`#/${n.id}`} className="tabbar__link" aria-current={route.screen === n.id ? 'page' : undefined} onClick={() => sfx('tick')}>
            <PixelIcon name={n.icon} size={24} />
            <span>{n.label}</span>
          </a>
        ))}
      </nav>

      <ExpenseSheet />
      <MorningBriefing />
      <PotCloseout />
      <JarOverlay />
      <PhotoWall />
      <Splash />
      <PrayerCall />
      <OversleptCall />
      <ReminderWatcher />
      <CommandPalette />
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
