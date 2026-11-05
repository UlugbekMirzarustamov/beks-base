# Changelog

Important milestones, newest first. Feature-level status: [FEATURE_STATUS.md](FEATURE_STATUS.md).
Vision: [MASTER_SPEC.md](MASTER_SPEC.md). Working rules: [../CLAUDE.md](../CLAUDE.md).

## Unreleased
- **Privacy cleanup (Task 1):** removed personal data from the public source code — the real class
  timetable (module names, rooms, staff names) from `lib/timetable.ts`, the personal money-plan
  step and figures from `lib/seed.ts`, the plan form's pre-filled amount, and institution names in
  user-facing text, comments and the README. Tests now use neutral example data (84 passing).
  **User data is unaffected:** data that already contains the timetable and money plan loads
  unchanged (verified; no update step or safety copy triggered). Fresh installs start with no
  timetable and set up their own money plan. Old git history still contains the removed values.
- Permanent project documentation: `CLAUDE.md`, `docs/MASTER_SPEC.md`, `docs/FEATURE_STATUS.md`,
  `docs/CHANGELOG.md`.

## 2026-11-05 — Data-safety hardening (`ac8d47a`)
The foundation for 2.0: existing user data can no longer be silently lost.
- **Safe loading:** autosave starts only after data has loaded and passed validation. If loading,
  validation or an update step fails, a **recovery screen** is shown (try again, restore a safety copy,
  restore a backup file, download the stored data, repair and open), and stored data is left untouched.
- **One storage strategy:** IndexedDB is the only place data is written; every write waits for
  confirmation. The old localStorage fallback is read-only (used if IndexedDB is empty).
- **Visible save errors:** a red banner for failed data or photo saves; success messages only after a
  confirmed write. Photos can't be saved over if they never loaded.
- **Verified snapshots:** before import, full reset, £→$ conversion, app update steps and restores;
  each is read back and compared; newest 3 kept, older ones removed only after a new one verifies.
  Restorable from Settings and from the recovery screen (photos included).
- **Validation:** `normalize()` fills missing fields at every level without dropping unknown ones;
  imports are validated and rejected before anything changes.
- **Files:** `lib/db.ts`, `lib/persist.ts` (new), `lib/backup.ts`, `state/store.tsx`, `ui/Recovery.tsx` (new),
  `screens/Photos.tsx`, `screens/More.tsx`, `screens/Money.tsx`, `styles.css`, `lib/persist.test.ts` (new).
- **Data format:** unchanged (`version: 1`); existing data and old backups stay compatible.
- **Tests:** 83 passed / 0 failed (64 existing + 19 new storage tests). Production build passed
  (only the existing bundle-size warning).
- **Extra verification (real browser storage):** legacy localStorage recovery and its failure case;
  migration failure leaves data untouched and keeps autosave off until recovery; snapshot restore with
  photos; failed photo save; photos protected from an empty or partially loaded state.
- **Deployment:** pushed to `main` (fast-forward `9edb90f..ac8d47a`); GitHub Actions run
  42026546794 — build ✅, deploy ✅; the live site serves the new bundle.

## 2026-11-05 — Push features (`9edb90f`)
Fajr rise with a harsh oversleep call, morning promise, you vs last week, hard mode, vision board.

## 2026-11-05 — Big life update (`9b12947`)
Ramadan mode, Friday campfire, exam bosses, the pond, family photo frame, lo-fi radio,
Simba's needs, real winter, Sunday backups and share-sheet export, year in pixels.

## 2026-11-04 — Money plan (`4d03835`)
A pot over a set number of months → daily allowance, wish fund, wishes, runway and money calendar.

## 2026-11-04 — Everyday growth (`d69cc59`, `d96a34f`)
Daily 1% quest, calm corner, wind-down, morning recall, money insights, study garden,
word of the day, gratitude jar (tap to open full screen).

## 2026-11-04 — Living cabin (`a5af81d` → `2de556b`)
Simba, autumn, real weather, sound mixer, savings jars, morning briefing, tasbih, Qur'an tracker;
app feel (title screen, icon, shortcuts, install card, badges); Bek character; cabin shop.

## 2026-11-04 — Prayer, timetable and dollars (`fababfb`, `8774c3b`)
Prayer times and five lanterns with a full-screen call, real school timetable, sound mixer,
example data removed (user data kept); money shown in US dollars with a £ option.

## 2026-11-04 — Bek's Base and hosting (`af100fe` → `a1947c8`)
Renamed to Bek's Base; Reflect (telescope) station; full-screen Pomodoro; delete fixes;
GitHub Pages deploy workflow; full-width layout.

## 2026-11-04 — Original app (`9cf0be0`, `eedca4b`)
- **Phase 1:** cozy pixel cabin home with Money, Study and Planner stations; local IndexedDB
  storage; JSON export/import; installable offline PWA; a tested safe-to-spend calculation.
- **Phase 2:** vocabulary, habits, mood, journal, UK/Tashkent clocks; offline on first visit.

## Known follow-ups (from the 2.0 technical audit)
- Personal data is out of the current code (Task 1), but still in old git history, and every commit
  shows the author's university email. Fixing that needs a history rewrite or a private repo (Bek to decide).
- Consolidate duplicated helpers: three streak functions, three week-stats functions, two
  `fullPrayerDay`, several UK-clock helpers, repeated localStorage wrappers, per-overlay Escape handling.
- Performance: one ~510 KB bundle (lazy-load rarely used screens); vision-board photos inside `AppData`;
  year-in-pixels recomputation.
- Time-based cards (Fajr rise, Ramadan) only refresh on re-render.
- Two open tabs: the last save wins.
