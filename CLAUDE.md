# Bek's Base — instructions for Claude Code

Bek's Base is a cozy, original blocky pixel-art **life command centre** for one person:
an international student. It runs as an installable, offline web app (PWA) on his phone.

- Full product vision: [docs/MASTER_SPEC.md](docs/MASTER_SPEC.md)
- What actually exists today (with evidence): [docs/FEATURE_STATUS.md](docs/FEATURE_STATUS.md)
- History of milestones: [docs/CHANGELOG.md](docs/CHANGELOG.md)
- How to run, install and deploy (for Bek): [README.md](README.md)

## Core principles
1. **Protect user data above everything.** Never silently overwrite, discard or reset it.
2. **Preserve what exists.** Every feature and the visual identity (cozy cabin, Simba, Bek,
   pixel fonts, bevelled panels) stays unless Bek explicitly asks otherwise.
3. **Mobile-first** (check 375 px wide, no sideways scroll), **offline-first**, **privacy-first**
   (no accounts, no tracking, no bank connection — purchases are typed in by hand on purpose).
4. **Original art only.** Minecraft-*inspired*, but never Mojang/Minecraft assets or a recreation.
5. **Explain simply.** Bek is a beginner developer: plain words, short reasons, no jargon dumps.
6. **Never punish, never score worship.** No XP for prayers, fasting, tasbih or Qur'an (lanterns are a
   private record). Nothing takes XP or coins away unless Bek switched on hard mode himself.
   XP, coins and fish belong to the cabin world; new life tools don't add more gamification.

## How to work
- **Inspect before changing, plan before implementing.** Read the relevant files first; for
  anything non-trivial, state a short plan before editing.
- **Minimal, targeted changes.** No unrelated refactors, no drive-by renames, no new
  dependencies unless clearly necessary (runtime deps today: React + 3 font packages).
- **Reuse before writing.** Check `src/lib/` and `src/ui/kit.tsx` for an existing helper
  (streaks, dates, money, pixel icons, panels, confirm dialog) before adding a new one.
- **Verify.** Run `npm test` and `npm run build`; for UI changes also check the screen in the
  browser at phone width with no console errors. Report failures honestly.
- **Update docs after implementing:** `docs/FEATURE_STATUS.md` (with file evidence) and
  `docs/CHANGELOG.md`.
- **Git:** commit/push only when Bek asks. Deploys happen automatically on every push to
  `main` (GitHub Actions runs the tests, builds, then publishes to GitHub Pages). This repo commits
  with Bek's GitHub noreply email (local git config) — never his university email.

## Data safety rules (non-negotiable)
Storage design lives in `src/lib/db.ts` and `src/lib/persist.ts`; read them before touching data.
- IndexedDB (`ulus-base` → store `kv`) is the **only** place data is written. Keys: `appdata`,
  `photos`, `lessonFiles` (images/PDFs on lecture notes), `snapshot:*` (safety copies, newest 3; include
  photos and lesson files), `daily:<date>:*` (automatic daily backups, newest 7; data only),
  `unreadable:*` (never auto-deleted). Backup files carry photos and lesson files too.
- Saving is disabled until a load succeeds; load failures show the recovery screen
  (`src/ui/Recovery.tsx`) and must never fall back to fresh data.
- Anything that replaces data in bulk goes through `replaceAll(next, reason)` in
  `src/state/store.tsx`, which takes a verified snapshot first.
- **Schema changes:** add fields with defaults in `emptyData()` (`src/lib/seed.ts`) — `normalize()`
  fills them in for old data. Anything that reshapes existing data is a **numbered migration** in
  `src/lib/migrate.ts` (bump `SCHEMA_VERSION`, add a step, add a test); never edit a shipped one.
  Data from a newer app version is refused, not overwritten.
- **New domains:** small ones (like the calendar's `events`) live in `AppData` — `emptyData()` default,
  automatically in snapshots, backups and import validation. Separate storage keys are only for large
  domains (notes, receipts) and must then be added to snapshots, backups and validation too.
- **One source of truth:** the calendar (`src/lib/calendar.ts`) *reads* classes, tests, task deadlines
  and study blocks — never copy them into another list.
- Imports must pass `validateData()` (`src/lib/backup.ts`) before anything changes.
- Never put personal data (finances, timetable, photos, contacts) into tests, docs or commits
  beyond what already exists; the GitHub repo is **public**.
- Tests for storage live in `src/lib/persist.test.ts`; extend them when changing storage.

## Code map (short)
- `src/App.tsx` — shell + hash routes (`#/screen/sub`), `SCREENS` list.
- `src/state/store.tsx` — `useStore()`: `data`, `update(draft => …)`, `gainXp`, `toast`, `replaceAll`.
- `src/lib/` — pure logic (money, pot, prayer, ramadan, boss, fish, push, pixels…) + tests.
- `src/screens/` — one file per station/feature; `src/scene/Cabin.tsx` — the canvas cabin.
- `src/ui/` — shared UI kit, pixel icons (`PixelIcon`, `PixelArt`), mixer, weather, recovery.
- `src/styles.css` — one stylesheet; colours are CSS variables on `:root` (+ night theme).
- `public/sw.js` — offline service worker; bump `VERSION` when changing cached behaviour.

## Token efficiency
- Search with `grep` and targeted reads; don't read whole large files (`Cabin.tsx`,
  `Money.tsx`, `styles.css`) unless needed — read the relevant range.
- Don't paste whole files or long logs into replies; summarise and cite `file:line`.
- Prefer one well-scoped change over several speculative ones.
