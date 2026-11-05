# Changelog

Important milestones, newest first. Feature-level status: [FEATURE_STATUS.md](FEATURE_STATUS.md).
Vision: [MASTER_SPEC.md](MASTER_SPEC.md). Working rules: [../CLAUDE.md](../CLAUDE.md).

## Unreleased
- **Mock exams + predicted grade:** Study → **Mock exam**. Build a question bank (past-paper questions with
  model answers and marks, per module and topic); your mistakes notebook and formula cards can join the pool,
  and weak topics come up more often. A mock runs in **exam conditions**: full screen, a countdown (about
  1.5 minutes per mark), no notes, a question grid, a warning if you try to leave, automatic hand-in when time
  is up, and leaving the app is noted honestly (never a penalty). Then you **mark your paper** against the model
  answers, see your score, and send lost-mark questions to the mistakes notebook. A **predicted grade** combines
  recent mocks (60%), topic confidence (25%) and coursework marks (15%), shows the breakdown and how sure it is.
  Tests: 191 passing.
- **Islamic library** (Prayer → Library, all private, nothing scored): a **dua collection** of 20 well-known duas
  by situation (study, daily life, hard times, travel, family, forgiveness, mosque, Ramadan) with Arabic,
  transliteration, meaning and source; search, star favourites, and save your own duas. A **private good deeds
  journal** (hidden until you tap "Show", never counted, searched or shown anywhere else). An **Islamic learning
  library** for books, courses and lectures (want to / studying / finished, notes, links) with six classics to
  start. The Friday routine stays in Prayer → Jumu'ah.
  **Fixed during testing:** saved data with a starred dua was refused on the next load (the recovery screen
  showed and nothing was lost) because the start-up check expected every list to hold records; it now knows
  `duaFavs` is a list of words. A new storage test fills every list added since Phase 2 and checks it loads.
  Tests: 187 passing.
- **Goals at every level + morning quote:** Planner → **Goals** with yearly, monthly and weekly goals; each can
  say which bigger goal it helps (a year goal can help a dream on the vision board), shown as a chain like
  "SUVAT sheet → Finish mechanics → Get a First in Physics". Daily goals are your top 3 (one list, not two).
  Unfinished goals from last week/month/year can be carried over in one tap, and this week's progress shows
  in Home's Today card. The morning briefing now has a **quote of the day** under the family photo (Qur'an,
  sahih hadith with sources, or the app's own words). Tests: 184 passing.
- **Rooms, Life Museum, Garden of Years, Simba, breaks:** a new **Rooms** button on Home opens seven more
  rooms in original pixel art, each drawn from your real life: the **Library** fills with a book for every
  lecture note, word, formula card and recipe; the **Kitchen** shelf holds a jar for each thing in your pantry
  and the pot steams when a meal is planned; the **Workshop** bench shows finished coursework and admin; the
  **Bedroom** bed is made when you were in bed on time; the **Observatory** has a star for every night you
  wrote; the **Garden of Years** grows a flower per month from your good days (with past years); and the
  attic's **Life Museum** is a timeline of milestones (badges, savings and dreams reached, graded work,
  campfire wins, first catches) — prayer and Qur'an are never put on display. **Simba** does something
  different in each room, answers when tapped, and leaves you a small gift once a day (kept in the museum).
  **Break reminders** suggest a short break after 50 minutes in the app (change or switch off in Settings or
  the Bedroom; they wait during a Pomodoro). No points or penalties. Tests: 180 passing.
- **Deen: Jumu'ah, hifz, calculation methods, Hijri date** (all private — nothing scored): Prayer settings
  can switch the **Fajr/Isha method** (Muslim World League stays the default, so times don't change unless you
  pick another: ISNA, Egyptian, Karachi or Umm al-Qura). The **Hijri date** shows on Home and the Prayer page,
  with an **Islamic calendar** of the next occasions (Ramadan, Eid al-Fitr, Arafah, Eid al-Adha, New Year,
  Ashura). New **Jumu'ah** tab: the Friday sunnahs as a gentle checklist, your mosque's khutbah time and the
  last hour before Maghrib; on Fridays a small card on Home. New **Hifz** tab: all 114 surahs, ayahs memorised
  per surah, and a revision list that spaces solid surahs further apart (3, 7, 14, 30, 60 days) and brings
  shaky ones back tomorrow. Existing data gets the default method with no update step. Tests: 175 passing.
- **Lecture notes, revision planner, exam times:** Study → **Notes**: notes per module and lecture date,
  with search and a module filter. Type `[[Another note]]` to link notes; links to a missing note offer to
  create it, links to one of your topics show its red/amber/green colour, each note lists the notes linking
  back to it, and renaming a note updates the links. Study → Tests gains a **revision planner** (30-minute
  sessions each day until your exams in the next four weeks, more time for red topics and close exams; one
  tap puts them in the week plan and calendar, and a new plan replaces the old one), and exams can have a
  **start time, length and room** (shown on the countdown and timed in the calendar, so clashes are
  flagged). Lecture notes are searchable and in the archive. Tests: 169 passing.
- **Engineering toolbox:** Study → Tools. A **scientific calculator** (keypad or typing: brackets, powers,
  sin/cos/tan in degrees or radians, ln/log, √, n!, %, π, e, "2pi"-style multiplying, `ans` and a tap-to-reuse
  history; it uses its own small parser, never `eval`), a **unit converter** (length, mass, time, speed, force,
  energy, power, pressure, area, volume, angle, temperature), a searchable list of **constants** (tap to use
  in the calculator), and **solvers**: SUVAT (any three of s, u, v, a, t, giving both answers when there are
  two), quadratics (incl. complex roots), 2×2 / 3×3 simultaneous equations, and "solve f(x) = 0" for any
  expression in x. Tests: 162 passing.
- **Phase 2 handover:** done — subscriptions & financial calendar, important dates & birthday reminders,
  kitchen (shopping, pantry, meals, cookbook, what-can-I-cook), student admin checklists, searchable
  archive. Each feature was checked at 375 px with real typing, saving and a reload. Still waiting on
  Bek: none.
- **Searchable archive (Phase 2, feature 5):** a new **Archive** (palette → "Archive", the link at the top
  of Reflect, or "See everything for … in the archive" under any palette search). With no words it's a
  timeline of everything you've written, newest first and grouped by month; type words to search it.
  Filter by area (Planner, Study, Money, Journal & reflect, Kitchen, Admin) and by time (any time, this
  month, or a year). Search now also finds weekly reviews, Friday campfires, finished inbox items and
  planned meals. Sealed letters still show their title only. Nothing is copied: it reads the same index
  as the palette. Tests: 152 passing.
- **Student admin (Phase 2, feature 4):** Planner → Admin. Visa, passport, accommodation, council tax,
  GP and enrolment as **checklists with dates**: each item has a key date ("Expires", "Deadline",
  "Ends"…), steps you tick off (each can have its own date), notes, and a *Finished* switch (finished
  items are kept for the record). Six ready-made, generic checklists to start from. Key dates and step
  dates appear in the calendar, and items show in Home's **Important dates** card from their reminder
  window (e.g. 3 months before a visa expires) with "2/8 steps". Search finds them ("visa",
  "passport"…). Notes stay on the device. Tests: 150 passing.
- **Kitchen (Phase 2, feature 3):** a new Kitchen screen (button on Home, or search "pantry", "recipes"…).
  **Shopping**: type lines like "500g pasta" or "6 eggs", tick them off, then *Put in the pantry* (amounts
  add to what's already there). **Pantry**: amounts, units and use-by dates; food to use soon or past its
  date goes to the top; − / + buttons; things that ran out are one tap from the list. **Meals**: plan the
  week (breakfast, lunch, dinner) with free text or one of your recipes, and add the missing ingredients
  to shopping in one tap. **Recipes**: your own cookbook, plus **What can I cook?**, which ranks recipes by
  what you have (fewest missing first) and prefers ones that use up food expiring soon. A small Kitchen
  card on Home shows today's meals and what to use soon. No XP or coins (a life tool). New lists start
  empty for existing data (no update step); the screen loads on demand and is prefetched for offline use.
  Tests: 145 passing.
- **Important dates & birthdays (Phase 2, feature 2):** a new **Important date** kind in the calendar
  (anniversaries and other yearly dates) next to Birthday. Every event except classes can **remind you on
  Home** on the day, 1 / 3 / 7 / 14 days or a month before; birthdays and important dates remind a week
  before unless you change it (existing birthdays included — nothing is changed in your data). A new
  **Important dates** card on Home shows what's coming with its notes (e.g. gift ideas); those dates
  aren't repeated in "Coming up". Tests: 137 passing.
- **Subscriptions & financial calendar (Phase 2, feature 1):** Money → Bills now tells bills and
  **subscriptions** apart, handles **yearly** payments (e.g. insurance in November) and **free trials**
  (nothing is charged until the trial is over, with a "cancel before then" heads-up a week before).
  Subscriptions show what they cost per month and per year; tap any bill to change it. A **Next 30 days**
  list shows every payment coming with the total. Bill payments and trial ends also appear in the
  universal calendar and the Home "Coming up" card, read straight from the bills list (never copied),
  and bills are searchable. New fields are optional, so existing bills keep working with no update step.
  Tests: 135 passing.
- **Daily dashboard — Phase 1 complete:** a compact **Today** card at the top of Home: top-3 progress, the
  class happening now or next, the next prayer, money left today (from the money plan or the monthly
  budget), exams and deadlines this week, and progress on your nearest goals (dated vision goals and
  savings jars). Every row links to its full screen. New one-tap **sleep & energy check-in** (not scored),
  with a suggestion from last night's bedtime and this morning's Fajr-rise time. `savedIn` now lives in
  `lib/money.ts` (shared, not duplicated). Tests: 129 passing.
- **Phase 1 handover:** done — data foundation, universal calendar, Quick Capture + inbox, assignments &
  grade calculator, global search + command palette, daily dashboard. Next (Phase 2, everyday
  usefulness): groceries & meals, recipes & pantry, subscription tracker, financial calendar, student
  admin, important dates, searchable archive. Still waiting on Bek: none.
- **Global search & command palette:** press Ctrl/⌘ K anywhere, or tap the new magnifier in the top bar.
  Search everything you've written — tasks, assignments, exams, events, purchases (also by amount),
  journal notes, inbox, words, formula cards, mistakes, topics, wishes, savings jars, vision goals and
  nightly logs (sealed letters by title only, so they stay sealed). Matching ignores case and accents and
  needs every word. Jump to any screen, run quick actions (add a purchase, switch day/night, today's
  briefing), or send what you typed to Quick Capture. Full keyboard use (↑ ↓ Enter Esc) with screen-reader
  roles; the search index is rebuilt only when your data changes. Tests: 124 passing.
- **Assignments & grades:** Study → Assignments. Coursework with module, deadline (and time), priority,
  status (to do → doing → submitted → graded), weighting and mark; overdue and due-soon items stand out,
  and entering a mark marks it graded. Each module (your subjects) gets a **grade calculator**: weighted
  average so far, points of the final mark already secured, and the average needed on the rest for your
  target — saying plainly when it's already safe or out of reach, with a rough UK band guide and a note
  when weights don't add up to 100%. Exams stay in Tests (bosses unchanged) and just gain an optional
  weight and mark, edited from the grade table — nothing is stored twice. Deadlines show in the calendar
  and Coming up. Tests: 119 passing.
- **Quick Capture:** one box on Home — type a line and it goes to the right place, with a live preview
  and one-tap kind chips to correct the guess. "£4.50 coffee" → a purchase (pounds converted to dollars
  as usual, category guessed), "essay due fri" → a task due Friday, "remind me to … at 6pm" → a reminder,
  links and "idea:"/"note:" lines → the **Inbox** (Home card + Planner → Today), where each item can become
  a task, a calendar event or a journal note, or be marked done. Reminders pop up while the app is open
  (phone notifications need a push service — Phase 5). No XP (new life tools add no gamification).
  Tests: 111 passing.
- **Universal calendar (Task 3):** Planner → Calendar with Day / Week / Month views. One calendar for
  everything: your own events (classes, appointments, multi-day travel, birthdays, events, with daily /
  weekly / monthly / yearly repeats and an optional end date) merged with the classes, exams, task
  deadlines and study blocks that already exist — read from their own lists, never copied. Overlaps are
  flagged (with a heads-up when saving). Adding an "Exam" creates a test (so its boss works) and a
  "Deadline" creates a task. Classes added here appear in Today's classes, the briefing and wind-down,
  so new timetables no longer need code. New "Coming up" card on Home. The calendar loads on demand and
  is prefetched for offline use. Storage decision revised: small domains stay in AppData; separate keys
  only for large ones. Tests: 101 passing.
- **Product decisions:** worship is never scored (no XP for prayer, fasting, taraweeh, tasbih or Qur'an;
  XP already earned is kept); nothing takes XP or coins away unless hard mode is on (a broken promise now
  costs nothing by default, and oversleeping Fajr never costs XP); new life tools add no gamification.
  Future commits use Bek's GitHub noreply email; old history is not rewritten.
- **Data foundation (Task 2):** numbered schema migrations (`lib/migrate.ts`, schema version 2; data from
  a newer app version is refused instead of overwritten); automatic verified **daily backups** (newest 7,
  separate from the 3 safety copies, restorable in Settings and on the recovery screen); Reflect, More
  and Pond load on demand with an offline prefetch (main bundle 519 KB → 433 KB, size warning gone).
  Found and fixed during browser testing: two daily backups starting at once could make each other fail,
  and the "already done today" check used UTC instead of the UK date. Tests: 93 passing.
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
- Performance: vision-board photos inside `AppData`; year-in-pixels recomputation; most screens are still
  in the main bundle because Home imports from them.
- Time-based cards (Fajr rise, Ramadan) only refresh on re-render.
- Two open tabs: the last save wins.
