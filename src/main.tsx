/**
 * Entry point: loads the fonts and styles, starts the app, and (in the built
 * version only) registers the service worker that makes it work offline.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fonts are bundled with the app (no internet needed): Google Fonts, served locally via Fontsource.
import '@fontsource/press-start-2p/400.css';
import '@fontsource/vt323/400.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import './styles.css';
import App, { prefetchScreens } from './App';
import { StoreProvider } from './state/store';
import { ConfirmProvider } from './ui/kit';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </StoreProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        // On the very first visit the app's JS/CSS loaded before the service worker
        // existed, so hand it the list of files to save — then offline works right away.
        const urls = performance
          .getEntriesByType('resource')
          .map((e) => e.name)
          .filter((u) => u.startsWith(location.origin));
        reg.active?.postMessage({ type: 'CACHE_URLS', urls });
        // Download the screens that load on demand, so the service worker caches them for offline use.
        const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 2000));
        idle(() => prefetchScreens());
      })
      .catch(() => {
        /* offline support is a bonus — the app still works without it */
      });
  });
}
