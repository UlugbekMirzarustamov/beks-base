# Ulu's Base 🏠

A cozy, blocky pixel-art home base for life as an international student:
**money** (the Chest), **study** (the Bookshelf), **planning** (the Crafting table),
plus words, habits, mood and a journal.

- No accounts, no bank connection, no tracking. **Your data stays on your device.**
- Works offline and can be installed on your phone like an app (a "PWA").

---

## 1. Run it on your laptop

You need [Node.js](https://nodejs.org) (the "LTS" version) installed once.

Open a terminal **in this folder** and run:

```bash
npm install
```

(only the first time — it downloads the building blocks), then:

```bash
npm run dev
```

Open the link it prints (usually http://localhost:5173). Edit any file in `src/` and
the page updates by itself. Press `Ctrl + C` in the terminal to stop.

Other useful commands:

| Command | What it does |
| --- | --- |
| `npm test` | Runs the automatic checks (e.g. "safe to spend" maths, backups). |
| `npm run build` | Makes the final, fast version in the `dist/` folder. |
| `npm run preview` | Shows that final version at http://localhost:4173. |
| `npm run icons` | Re-draws the app icons from `scripts/make-icons.mjs`. |

---

## 2. Open it on your phone

### Quick test (same Wi-Fi)

1. On the laptop run `npm run dev:phone`.
2. It prints a "Network" address like `http://192.168.1.23:5173`.
3. Type that address into your phone's browser (phone and laptop on the same Wi-Fi).

This is good for trying things out, but it only works while your laptop is running,
and phones only allow "install" + offline mode on a secure (`https://`) website.

### Proper install (free, takes 5 minutes)

Put the finished app on a free static host so it has an `https://` address:

1. Run `npm run build`. This creates a `dist` folder.
2. Go to **https://app.netlify.com/drop** (free account) and **drag the `dist` folder** onto the page.
3. You get a link like `https://ulus-base-123.netlify.app`. Open it on your phone.
4. Install it:
   - **iPhone (Safari):** Share button → **Add to Home Screen**.
   - **Android (Chrome):** menu ⋮ → **Install app** / **Add to Home screen**.

Now it opens full-screen from your home screen and works offline (e.g. on the bus).
The website only holds the *app*, never your data — your data is saved inside your phone's browser.

To update the app later: `npm run build` again and drag the new `dist` folder onto your
Netlify site's "Deploys" page.

> ⚠️ Each device (and each browser) keeps its **own** data. Your phone and laptop don't sync.
> To move data between them, use Export on one and Import on the other (see below).

---

## 3. Backups (please do this!)

Your data lives only in the browser on that device. If you clear browser data, lose the phone,
or uninstall the app, it's gone — unless you have a backup.

**Make a backup:** More → Settings → **Export backup**.
It downloads a file like `ulus-base-backup-2026-11-04.json`. Keep it somewhere safe:
Google Drive, iCloud, or email it to yourself.

**Restore a backup:** More → Settings → **Import backup** → pick the file.
This *replaces* everything in the app with what's in the file.

Good habit: export every Sunday evening (maybe add it as a weekly task in the Planner 😉).

**Start fresh:** the app begins with a few items marked "(example)". Remove them with
More → Settings → **Clear example data**. Your own items are kept.

---

## 4. How it's built (for when you want to change things)

- **Vite + React + TypeScript**, plain CSS. No UI libraries.
- Data: one object saved in **IndexedDB** (the browser's built-in database).
- Pixel art: icons are tiny text drawings in `src/ui/icons.tsx`; the cabin is drawn on a
  160×96 canvas in `src/scene/Cabin.tsx`. All original — no game assets.
- Fonts: Press Start 2P, VT323 and Pixelify Sans (Google Fonts, bundled so they work offline).

```
src/
  lib/          plain logic, no React (easy to test)
    types.ts      the shape of all data
    money.ts      safe-to-spend, recurring bills, budgets  (+ money.test.ts)
    dates.ts      UK-time date helpers
    db.ts         IndexedDB save/load
    backup.ts     export / import
    seed.ts       starter topics, formulas and example data
    csv.ts        bank CSV import
    sound.ts      rain / fire background sound (made in code)
    xp.ts         XP and levels
  state/store.tsx the app's memory: data, auto-save, XP, toasts, Pomodoro timer
  ui/           reusable pixel pieces (panels, bars, tabs, pop-ups, icons)
  scene/        the canvas cabin on the Home screen
  screens/      Home, Money, Study, Planner, More (+ Extras for phase 2)
  styles.css    all the styling (colours at the top)
public/
  sw.js         service worker = offline support
  manifest.webmanifest  makes it installable
```

Want to change the colours? Edit the variables at the top of `src/styles.css`.
Want different starter topics or formulas? Edit `src/lib/seed.ts`
(they're only used the first time the app opens, or after "Delete everything").
