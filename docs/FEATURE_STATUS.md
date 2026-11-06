# Feature status

What **actually exists** in the codebase, checked against the vision in [MASTER_SPEC.md](MASTER_SPEC.md).
Last verified: **2026-11-06** — Money plan in days with a daily maximum + dream room: 208 tests passing, production build passing.
Update this file whenever a feature changes (see [../CLAUDE.md](../CLAUDE.md)).

**Statuses**
- **Implemented** — in the code and exercised (tests and/or checked in the browser).
- **Partially implemented** — some of the spec item exists; the gap is stated.
- **Planned** — agreed next step, not built yet.
- **Not started** — in the spec (often *Proposed* or *To be defined*), no code.
- **Needs verification** — code exists, but hasn't been checked in the real situation (usually a real phone or a real date).

Paths are relative to `src/`.

## Life Command Centre
| Feature | Status | Evidence |
|---|---|---|
| Cabin home with station links | Implemented | `scene/Cabin.tsx` (`stations()`), `screens/Home.tsx` |
| Daily dashboard "Today" card: top 3, now/next class, next prayer, money left today, deadlines & exams this week, goal progress | Implemented | `TodayCard` in `screens/Daily.tsx`, `lib/today.ts` (tests in `lib/today.test.ts`) |
| Sleep & energy check-in (not scored) | Implemented | `checkins` in `lib/types.ts`; suggestion from bedtime + Fajr rise (`sleptHours`) |
| Calm Home: Today + 1% quest + only what matters now (dates when close, Jumu'ah on Fridays, Fajr/promise in the morning, week review Fri–Sun, backup when due); the rest in "More for today" | Implemented | `cardsIn`, `placeOf` in `lib/home.ts` (tests in `lib/home.test.ts`); `screens/Home.tsx` |
| Customisable dashboard: Arrange Home (pin / auto / hide every card) | Implemented | `ArrangeHome` in `screens/Home.tsx`; `settings.home` |
| Discover shelf: up to 3 features not used yet, each with Open / Not now | Implemented | `DISCOVER`, `discoverTips` in `lib/home.ts` |
| Grouped tabs (about 4 per station, pages as a small second row; every old link still works) | Implemented | `GroupedTabs` in `ui/kit.tsx`; Study, Prayer, Money, Planner, Reflect, More |
| Softer look: warm accent per room, more spacing, sleeping-cat empty states, time-of-day light, glowing lit lanterns | Implemented | Cozy layer in `styles.css`; `data-room` and `data-daypart` set in `App.tsx`; `Empty` in `ui/kit.tsx` |
| Morning briefing (incl. photo, focus, vision goal, quote of the day) | Implemented | `screens/Briefing.tsx`; `QUOTES`, `quoteOfTheDay` in `lib/daily.ts` |
| Goals: yearly, monthly, weekly (each can support one a level up, year goals a vision-board dream), daily = top 3; carry over unfinished; week progress on Home | Implemented | `screens/Goals.tsx` (Planner → Goals); `lib/goals.ts` (tests in `lib/goals.test.ts`); `goalProgress` in `lib/today.ts` |
| Today cards (classes now/next, money, weather, next test, top 3, due, mood, level) | Implemented | `screens/Home.tsx` |
| 1% quest, word of the day, morning recall | Implemented | `screens/Daily.tsx`, `lib/daily.ts` |
| Night wind-down | Implemented | `screens/Daily.tsx` (`WindDown`) |
| UK / Tashkent clocks | Implemented | `screens/Extras.tsx` (`Clocks`) |
| Friday campfire review | Implemented | `screens/Campfire.tsx` |
| Universal calendar: day / week / month views | Implemented | `screens/Calendar.tsx` (Planner → Calendar), `lib/calendar.ts` (tests in `lib/calendar.test.ts`) |
| Calendar events: classes, appointments, travel (multi-day), birthdays, events; daily/weekly/monthly/yearly repeats | Implemented | `lib/calendar.ts` (`occursOn`), `CalEvent` in `lib/types.ts` |
| One calendar for everything (classes, exams, deadlines, study blocks read from their own lists) | Implemented | `itemsOn()` in `lib/calendar.ts`; exams and deadlines added in the calendar go to Tests / tasks |
| Conflict detection | Implemented | `conflicts()` in `lib/calendar.ts`; flagged in day/week/month views and on Home |
| Important dates & birthdays: "Important date" kind (yearly), "remind me on Home" N days before (birthdays and important dates default to a week), notes such as gift ideas shown with it | Implemented | `dateReminders()`, `remindDays()` in `lib/calendar.ts` (tests in `lib/calendar.test.ts`); `ImportantDates` in `screens/Home.tsx`; reminder field in `EventForm` (`screens/Calendar.tsx`) |
| "Coming up" card on Home (next 14 days) | Implemented | `ComingUp` in `screens/Home.tsx` |
| Quick Capture (one line → task, purchase, idea, note, link or reminder, with a live preview) | Implemented | `lib/capture.ts` (tests in `lib/capture.test.ts`), `QuickCapture` in `screens/Capture.tsx` (Home) |
| Inbox: sort into task, calendar event or journal note, or mark done | Implemented | `InboxPanel` in `screens/Capture.tsx` (Home card + Planner → Today) |
| In-app reminders (pop up while the app is open) | Implemented | `ReminderWatcher` in `screens/Capture.tsx` |
| Global search across the app (sealed letters by title only) | Implemented | `lib/search.ts` (tests in `lib/search.test.ts`) |
| Searchable archive: everything newest first by month; search words, area filters (Planner, Study, Money, Journal & reflect, Kitchen, Admin), any time / this month / a year | Implemented | `screens/Archive.tsx` (`#/archive`, from the palette, Reflect and "See everything … in the archive"); `searchArchive`, `groupByMonth`, `archiveYears` in `lib/search.ts` (tests in `lib/search.test.ts`) |
| Search also covers bills, kitchen, admin, week reviews, campfires, finished inbox items and planned meals | Implemented | `buildIndex()` in `lib/search.ts` |
| Command palette: Ctrl/⌘ K + top-bar magnifier; go anywhere, quick actions, "Capture: …" | Implemented | `CommandPalette` in `screens/Search.tsx`, mounted in `App.tsx` |
| Opening the exact record (not just its screen) from a search result | Not started | Results open the screen where the item lives |
| Phone notifications when the app is closed | Not started | Needs a push service — Phase 5, ask Bek first |
| Campfire "due" card on a real Friday evening | Needs verification | `campfireDue()` in `screens/Campfire.tsx` — only the review page was checked |

## University and engineering tools
| Feature | Status | Evidence |
|---|---|---|
| Tests & countdowns | Implemented | `screens/Study.tsx` (`Tests`) |
| Exam bosses (HP from topics + Pomodoros) | Implemented | `lib/boss.ts`, `BossCard` in `screens/Study.tsx`, tests in `lib/new.test.ts` |
| Topics red/amber/green, mistakes notebook, formula flashcards | Implemented | `screens/Study.tsx` |
| Vocabulary | Implemented | `screens/Extras.tsx` (`Vocab`) |
| Pomodoro + full-screen focus | Implemented | `state/store.tsx` (`TimerProvider`), `screens/Study.tsx` (`FocusScreen`) |
| Real timetable, week view, study blocks | Implemented | Dated classes live in the user's data (`sessions`); shown by `screens/Planner.tsx`. `lib/timetable.ts` keeps only the generic builder |
| Entering classes in the app (instead of in code) | Implemented | Calendar "Class" events (weekly, with an end date) appear in Today's classes, briefing and wind-down via `classesOn()` in `screens/Planner.tsx` |
| Assignment manager (module, deadline + time, priority, status, weighting, mark, notes) | Implemented | `screens/Assignments.tsx` (Study → Assignments), `Assignment` in `lib/types.ts` |
| Grade calculator (weighted average, secured points, mark needed for a target, UK band guide) | Implemented | `lib/grades.ts` (tests in `lib/grades.test.ts`); exams count via optional weight/mark on tests |
| Assignment deadlines in the calendar and Coming up | Implemented | `itemsOn()` in `lib/calendar.ts` |
| Knowledge garden: notes as plants in module beds (taller with more links), [[links]] as vines, seeds (linked but unwritten notes) and lonely notes | Implemented | `screens/KnowledgeGarden.tsx` (Study → Notes → Garden); `gardenGraph` in `lib/notes.ts` (tests in `lib/notes.test.ts`) |
| Attach images (made smaller), PDFs (up to 8 MB), links and formulas to a lecture note; formulas → formula cards; files removed with the note | Implemented | `screens/NoteAttachments.tsx`; `state/lessonFiles.ts`; storage key `lessonFiles` in safety copies, backup files and restores (`lib/persist.ts`, `lib/backup.ts`; tests in `lib/persist.test.ts`) |
| Lecture notes per module (lecture date, search, module filter) with [[links]] between notes and to topics, backlinks, rename keeps links | Implemented | `screens/Notes.tsx` (Study → Notes, loads on demand); `lib/notes.ts` (tests in `lib/notes.test.ts`) |
| Revision planner: 30-min sessions before exams (weak topics and close exams first) → week plan + calendar, replace or remove | Implemented | `screens/Revision.tsx` (Study → Tests); `lib/revision.ts` (tests in `lib/notes.test.ts`); `StudyBlock.revision` |
| Exam start time, length and room (shown on countdowns; timed in the calendar, so clashes are flagged) | Implemented | `Tests` in `screens/Study.tsx`; `itemsOn()` in `lib/calendar.ts` |
| Mock exams in exam conditions (full screen, countdown, auto hand-in, question grid, leaving the app noted without penalty), self-marking against model answers, lost marks → mistakes | Implemented | `screens/Mock.tsx` (Study → Mock exam); `questionPool`, `pickQuestions`, `suggestedMinutes` in `lib/mock.ts` (tests in `lib/mock.test.ts`) |
| Question bank per module/topic (past-paper questions + model answers + marks) | Implemented | `QuestionBank` in `screens/Mock.tsx`; `examQuestions` in `lib/types.ts` |
| Predicted grade (recent mocks 60%, topic confidence 25%, coursework 15%; shows how sure it is) | Implemented | `predictGrade` in `lib/mock.ts` |
| Physics: formula sheet (44 formulas, 8 topics, every symbol + unit, → formula cards), solve any formula for any quantity, endless practice problems checked within 2% (missed → mistakes), uncertainty calculator | Implemented | `screens/PhysicsTools.tsx` (Study → Tools → Physics); `lib/physics.ts` (tests in `lib/physics.test.ts`: every formula solved for every quantity) |
| Engineering toolbox: scientific calculator (safe parser, DEG/RAD, ans, history), unit converter (12 kinds), constants, solvers (SUVAT with both answers, quadratic, 2×2/3×3 simultaneous, f(x) = 0) | Implemented | `screens/Toolbox.tsx` (Study → Tools, loads on demand); `lib/engineering.ts` (tests in `lib/engineering.test.ts`) |
| MATLAB snippets, graph plotting, lab checklist | Not started | Not requested for now |
| Focus guard, speaking practice | Not started | Spec: *Proposed* (past papers: use the mock exam question bank) |

## Finance
| Feature | Status | Evidence |
|---|---|---|
| USD amounts with £ entry; so'm converter | Implemented | `screens/Money.tsx`, `lib/money.ts` |
| Money plan (pot → daily allowance) for N days or months, with an optional daily maximum (e.g. $15) | Implemented | `lib/pot.ts` (`days`, `cap`), `screens/Plan.tsx`, tests in `lib/money.test.ts` |
| Dream room jar (the share above the maximum for the whole plan, all there from day one) + Dream room: pieces with prices, blueprint → ready → bought, "I bought it" records the purchase from the jar | Implemented | `potStatus().dreamJar` in `lib/pot.ts`; `lib/dream.ts` (tests in `lib/dream.test.ts`); `screens/DreamRoom.tsx` (Money → Plan & save → Dream room) |
| Wish fund, wishes, ETA, slider, buy from fund | Implemented | `screens/Plan.tsx` (`Wishes`), `lib/pot.ts` |
| Runway, money calendar, nightly "you saved" | Implemented | `screens/Plan.tsx` |
| Budget & category limits, savings jars, bills, charts, CSV import, insights | Implemented | `screens/Money.tsx`, `lib/csv.ts`, `lib/daily.ts` (`moneyInsights`) |
| Subscription tracker: bill vs subscription, monthly or yearly, free-trial end with a 7-day heads-up, cost per month and per year, edit | Implemented | `Bills`/`BillForm` in `screens/Money.tsx` (Money → Bills); `billDueOn`, `billsBetween`, `billCost` in `lib/money.ts` (tests in `lib/money.test.ts`) |
| Financial calendar: bill payments and trial ends in the universal calendar and Coming up; "Next 30 days" list with total | Implemented | `itemsOn()` in `lib/calendar.ts` reads `recurring` (never copied; test in `lib/calendar.test.ts`) |
| Yearly bills and free trials respected when payments add themselves | Implemented | `applyRecurring()` in `lib/money.ts` |
| Hard-mode wish buffer (+10%) | Implemented | `lib/push.ts` (`wishReady`), `screens/Plan.tsx` |
| Cook-at-home counter | Not started | Spec: *Proposed* |

## Health, fitness and football
| Feature | Status | Evidence |
|---|---|---|
| Simba needs you (meals, water, sleep → hearts, hungry mood) | Implemented | `lib/care.ts`, `screens/Daily.tsx` (`SimbaNeeds`), `lib/cabin.ts` |
| Mood check-in & week, calm corner | Implemented | `screens/Extras.tsx`, `screens/Calm.tsx` |
| Fitness | Partially implemented | Only an "Exercise" habit (default habits in `lib/seed.ts`); no fitness features |
| Football | Not started | Spec: *To be defined* |
| Move quests | Not started | Spec: *Proposed* |

## Deen and personal development
| Feature | Status | Evidence |
|---|---|---|
| Prayer times, lanterns, strip, full-screen call, qibla, offsets | Implemented | `lib/prayer.ts` (tests in `lib/prayer.test.ts`), `screens/Prayer.tsx` |
| Prayer calculation methods (MWL default, ISNA, Egyptian, Karachi, Umm al-Qura) | Implemented | `METHODS` in `lib/prayer.ts` (tests in `lib/islamic.test.ts`); Prayer settings |
| Hijri date (Home greeting, Prayer page) + Islamic calendar of the next occasions | Implemented | `hijriLabel`, `nextOccasions` in `lib/islamic.ts`; `IslamicCalendar` in `screens/Deen.tsx` |
| Jumu'ah routine: Friday checklist (private), mosque khutbah time, last hour before Maghrib | Implemented | `JumuahTab` in `screens/Deen.tsx` (Prayer → Jumu'ah); `FRIDAY_STEPS` in `lib/islamic.ts` |
| Friday card on Home on a real Friday | Implemented | `FridayCard` in `screens/Home.tsx` — seen on Home on Friday 6 Nov |
| Qur'an memorisation (hifz) per surah + spaced revision (solid → 3/7/14/30/60 days, shaky → tomorrow), never scored | Implemented | `HifzTab` in `screens/Deen.tsx` (Prayer → Hifz); `dueForRevision`, `afterRevision` in `lib/islamic.ts`; `lib/surahs.ts` |
| Dua collection (20 duas by situation: Arabic, transliteration, meaning, source), starred duas, my own duas | Implemented | `IslamicLibrary.tsx` (Prayer → Library); `lib/duas.ts` (tests in `lib/duas.test.ts`) |
| Private good deeds journal (hidden until tapped; never counted, searched or shown elsewhere) | Implemented | `Deeds` in `screens/IslamicLibrary.tsx`; excluded from `buildIndex` (test) |
| Islamic learning library (books/courses/lectures, want/studying/finished, notes, links, starter classics) | Implemented | `Learning` in `screens/IslamicLibrary.tsx` |
| Tasbih, Qur'an tracker | Implemented | `screens/Devotion.tsx`, `lib/quran.ts` |
| Ramadan mode (countdown, preview, times, fasts, taraweeh, juz, dua, lanterns) | Implemented | `lib/ramadan.ts` (tests), `screens/Ramadan.tsx`, `scene/Cabin.tsx` |
| Ramadan mode switching on during the real Ramadan | Needs verification | Checked only with the preview; the calendar maths is tested |
| Fajr rise + harsh oversleep call (words only, no XP loss) | Implemented | `lib/push.ts` (tests), `screens/Push.tsx` (`FajrRise`, `OversleptCall`) |
| Worship never scored (no XP for prayer, fasting, taraweeh, tasbih, Qur'an) | Implemented | `screens/Prayer.tsx`, `screens/Ramadan.tsx`, `screens/Devotion.tsx` |
| Fajr rise "I'm up" before sunrise | Needs verification | Only the after-sunrise path was checked in the browser |
| Reflect: tonight & stars, my sky, week, year in pixels, vision board, letters | Implemented | `screens/Reflect.tsx`, `lib/pixels.ts`, `screens/Push.tsx` (`VisionBoard`) |
| Gratitude jar, journal, habits | Implemented | `screens/Calm.tsx`, `screens/Extras.tsx` |
| Morning promise (no penalty unless hard mode), you vs last week, hard mode | Implemented | `lib/push.ts` (tests), `screens/Push.tsx` |
| XP, levels, coins, 25 badges | Implemented | `lib/xp.ts`, `lib/badges.ts`, `screens/Badges.tsx` |
| Adhkar, sadaqah jar, if-then plans, family report card, weekly challenges | Not started | Spec: *Proposed* (good deeds journal covers private sadaqah notes) |

## Everyday life
| Feature | Status | Evidence |
|---|---|---|
| Real weather (7-day) in window and on Home | Implemented | `lib/weather.ts`, `ui/Weather.tsx` |
| Planner: top 3, tasks, week | Implemented | `screens/Planner.tsx` |
| Student admin: visa, documents, accommodation… as checklists with a key date, dated steps, notes, finished/reopen; 6 generic starter checklists | Implemented | `screens/Admin.tsx` (Planner → Admin, loads on demand); `lib/admin.ts` (tests in `lib/admin.test.ts`) |
| Admin dates in the calendar and on Home (inside each item's reminder window, with step progress) | Implemented | `itemsOn()` in `lib/calendar.ts` reads `admin`; `ImportantDates` in `screens/Home.tsx` (`adminReminders`) |
| Kitchen: shopping list ("500g pasta" lines), tick off → put in the pantry (quantities merge) | Implemented | `Groceries` in `screens/Kitchen.tsx` (Home → Kitchen, `#/kitchen`); `parseQty`, `stockUp`, `newGroceryLines` in `lib/kitchen.ts` (tests in `lib/kitchen.test.ts`) |
| Pantry with quantities, units and use-by dates; "use soon" / "past its date" first; ran-out items one tap to the list | Implemented | `Pantry` in `screens/Kitchen.tsx`; `freshness`, `toUseSoon` in `lib/kitchen.ts` |
| Meal plan (week, breakfast/lunch/dinner, free text or a recipe) + missing ingredients to shopping | Implemented | `Meals` in `screens/Kitchen.tsx`; `meals` in `lib/types.ts` |
| Personal cookbook + "What can I cook?" from the pantry (fewest missing first, uses up food expiring soon) | Implemented | `Recipes` in `screens/Kitchen.tsx`; `checkRecipe`, `suggestRecipes` in `lib/kitchen.ts` |
| Kitchen card on Home (today's meals, food to use soon) | Implemented | `KitchenCard` in `screens/Home.tsx` |
| Family photo wall, photo of the day | Implemented | `screens/Photos.tsx`, `scene/Cabin.tsx` (mantel frame) |
| Explore-the-city map | Not started | Spec: *Proposed* |

## Projects and career
| Feature | Status | Evidence |
|---|---|---|
| Projects and career | Not started | Spec: *To be defined* |

## Cabin, rooms and Simba
| Feature | Status | Evidence |
|---|---|---|
| Responsive cabin, day/night sky, seasons, real weather effects | Implemented | `scene/Cabin.tsx` |
| Real winter (snow, snowman, frost, scarf, hot chocolate) | Implemented | `scene/Cabin.tsx`, `screens/Home.tsx` |
| Winter triggered by real local snow | Needs verification | Checked only with a simulated forecast |
| Simba moods & petting, Bek avatar & editor | Implemented | `lib/cabin.ts` (tests), `scene/Cabin.tsx`, `screens/More.tsx` (`AvatarEditor`) |
| Unlocks, cabin shop (10 items), growth (tulips, books, garden, jar) | Implemented | `lib/cabin.ts`, `lib/shop.ts`, `screens/Shop.tsx` |
| Pond & 15-fish book | Implemented | `lib/fish.ts` (tests), `screens/Pond.tsx` |
| Sound mixer, lo-fi radio, effects | Implemented | `lib/sound.ts`, `ui/SoundMixer.tsx` |
| Lo-fi radio sound on a phone | Needs verification | Toggle checked; audio not listened to on a device |
| More rooms: Library, Kitchen, Workshop, Bedroom, Observatory, Garden of Years, attic Life Museum — each drawn from real data (books = notes/words/cards/recipes, jars = pantry, finished work, last night's bedtime, stars = night logs) | Implemented | `screens/Rooms.tsx` (`#/rooms`, Home → Rooms; loads on demand); `roomStats` in `lib/rooms.ts` (tests in `lib/rooms.test.ts`) |
| Garden of Years (a flower per month, growing with good days; past years) | Implemented | `gardenOfYear`, `gardenYears` in `lib/rooms.ts` |
| Life Museum / memory timeline (badges, savings reached, dreams reached, graded work, campfire wins, first catches, Simba's gifts; worship never displayed) | Implemented | `museum()` in `lib/rooms.ts` |
| Simba activities per room (reading, waiting by the bowl, batting a bolt, napping, stargazing, chasing a butterfly, exploring), tap reactions, a daily gift | Implemented | `ROOMS`, `giftFor` in `lib/rooms.ts`; `simbaGifts` in `lib/types.ts` |
| Break reminders after N minutes in the app (off / 30–90 min; waits during Pomodoro; time away counts as a break) | Implemented | `ui/BreakReminder.tsx` (mounted in `App.tsx`); setting in More → Settings and the Bedroom |
| Break reminder after a real 50 minutes on a phone | Needs verification | Checked in the browser with sped-up timers only |

## AI and automation
| Feature | Status | Evidence |
|---|---|---|
| AI and automation | Not started | Spec: *To be defined*; no AI code exists |

## Technical foundations, privacy and backups
| Feature | Status | Evidence |
|---|---|---|
| Vite + React + TS, plain CSS, static hosting | Implemented | `package.json`, `.github/workflows/deploy.yml` |
| Tests + build gate before deploy | Implemented | `deploy.yml` (`npm test`, `npm run build`) |
| Offline service worker, manifest, shortcuts, splash, install card | Implemented | `public/sw.js`, `public/manifest.webmanifest`, `ui/AppFeel.tsx` |
| Install and offline on Bek's real phone after this update | Needs verification | Verified only in a desktop browser |
| Safe loading + recovery screen | Implemented | `lib/persist.ts`, `ui/Recovery.tsx`, `state/store.tsx`; tests in `lib/persist.test.ts` |
| Visible save errors (data and photos) | Implemented | `state/store.tsx`, `screens/Photos.tsx` |
| Verified snapshots (newest 3) + restore | Implemented | `lib/persist.ts`, `screens/More.tsx` (`SafetyCopies`) |
| Automatic daily backups (newest 7, once per UK day) + restore | Implemented | `lib/persist.ts` (`dailyBackup`), `state/store.tsx`; tests in `lib/persist.test.ts` |
| Numbered schema migrations; newer data refused | Implemented | `lib/migrate.ts`, `lib/seed.ts` (`upgrade`), `lib/backup.ts` (`normalize`); tests in `lib/persist.test.ts` |
| Separate storage for large domains | Planned | Revised decision: only for large domains (notes, receipts); the calendar's small `events` list lives in AppData |
| Deep normalise + import validation | Implemented | `lib/backup.ts` (`normalize`, `validateData`) |
| JSON export/import incl. photos; Sunday reminder | Implemented | `lib/backup.ts`, `screens/Daily.tsx` (`shareBackup`, `BackupCard`) |
| Share-sheet backup (AirDrop) on iPhone | Needs verification | Uses `navigator.share` with files; only the download fallback was exercised |
| Personal data removed from the public repo (current code) | Implemented | Task 1: no real timetable, money figures or institution names in `src/`, `README.md` or docs |
| Future commits use the GitHub noreply email | Implemented | Local git config of this repo |
| Personal data removed from old git history | Not started | Decided not to rewrite history (a force push can't erase GitHub's cached copies and risks the deploy) |
| Consolidate duplicated helpers (streaks, week stats, clocks) | Planned | See "Known follow-ups" in [CHANGELOG.md](CHANGELOG.md) |
| Lazy-load screens (with offline prefetch) | Partially implemented | Reflect, More and Pond load on demand and are prefetched for offline (`App.tsx`, `main.tsx`); other screens are imported by Home so stay in the main bundle (~433 KB) |
| Move vision-board photos out of AppData | Planned | |
