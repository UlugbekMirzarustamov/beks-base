# Feature status

What **actually exists** in the codebase, checked against the vision in [MASTER_SPEC.md](MASTER_SPEC.md).
Last verified: **2026-11-26** — Simplified app (Study = focus timer + exams; Planner, Money, Reflect and More cut to the essentials; admin, kitchen, rooms, pond, campfire removed): 217 tests passing, production build passing.
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
| Calm Home: Today card, Bek's Quest card, only what matters now (dates when close, Jumu'ah, Fajr, week review Fri–Sun, backup when due); the rest in "More for today" (classes, coming up, next test, top 3, due, inbox, money, weather) | Implemented | `cardsIn`, `placeOf` in `lib/home.ts` (tests in `lib/home.test.ts`); `screens/Home.tsx` |
| Customisable dashboard: Arrange Home (pin / auto / hide every card) | Implemented | `ArrangeHome` in `screens/Home.tsx`; `settings.home` |
| Discover shelf: up to 3 features not used yet, each with Open / Not now | Removed (2026-11-26) | `DISCOVER`, `discoverTips` in `lib/home.ts` |
| Grouped tabs (about 4 per station, pages as a small second row; every old link still works) | Implemented | `GroupedTabs` in `ui/kit.tsx`; Study, Prayer, Money, Planner, Reflect, More |
| Softer look: warm accent per room, more spacing, sleeping-cat empty states, time-of-day light, glowing lit lanterns | Implemented | Cozy layer in `styles.css`; `data-room` and `data-daypart` set in `App.tsx`; `Empty` in `ui/kit.tsx` |
| Morning briefing (incl. photo, quote of the day) | Implemented | `screens/Briefing.tsx` |
| Goals: three simple lists (this year, this month, this week), tick off, carry over unfinished; daily = top 3 | Implemented | `screens/Goals.tsx` (Planner → Goals); `lib/goals.ts` |
| Today cards (classes now/next, money, weather, next test, top 3, due, mood) | Implemented | `screens/Home.tsx` |
| 1% quest, word of the day, morning recall | Removed (2026-11-26) | `screens/Daily.tsx`, `lib/daily.ts` |
| Night wind-down | Implemented | `screens/Daily.tsx` (`WindDown`) |
| UK / Tashkent clocks | Removed (2026-11-26) | `screens/Extras.tsx` (`Clocks`) |
| Friday campfire review | Removed (2026-11-26) | `screens/Campfire.tsx` |
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
| Search covers tasks, exams, events, purchases, bills, goals, wishes, diary, inbox, night logs and week reviews (removed features are left out; their data is kept) | Implemented | `buildIndex` in `lib/search.ts` (tests in `lib/search.test.ts`) |
| Command palette: Ctrl/⌘ K + top-bar magnifier; go anywhere, quick actions, "Capture: …" | Implemented | `CommandPalette` in `screens/Search.tsx`, mounted in `App.tsx` |
| Opening the exact record (not just its screen) from a search result | Not started | Results open the screen where the item lives |
| Phone notifications when the app is closed | Not started | Needs a push service — Phase 5, ask Bek first |
| Campfire "due" card on a real Friday evening | Removed (2026-11-26) | `campfireDue()` in `screens/Campfire.tsx` — only the review page was checked |

## University and engineering tools
| Feature | Status | Evidence |
|---|---|---|
| Tests & countdowns | Implemented | `screens/Study.tsx` (`Tests`) |
| Exam bosses (HP from topics + Pomodoros) | Removed (2026-11-26) | `lib/boss.ts`, `BossCard` in `screens/Study.tsx`, tests in `lib/new.test.ts` |
| Topics red/amber/green, mistakes notebook, formula flashcards | Removed (2026-11-26) | `screens/Study.tsx` |
| Vocabulary | Removed (2026-11-26) | `screens/Extras.tsx` (`Vocab`) |
| Pomodoro + full-screen focus | Implemented | `state/store.tsx` (`TimerProvider`), `screens/Study.tsx` (`FocusScreen`) |
| Real timetable, week view, study blocks | Implemented | Dated classes live in the user's data (`sessions`); shown by `screens/Planner.tsx`. `lib/timetable.ts` keeps only the generic builder |
| Entering classes in the app (instead of in code) | Implemented | Calendar "Class" events (weekly, with an end date) appear in Today's classes, briefing and wind-down via `classesOn()` in `screens/Planner.tsx` |
| Assignment manager (module, deadline + time, priority, status, weighting, mark, notes) | Removed (2026-11-26) | `screens/Assignments.tsx` (Study → Assignments), `Assignment` in `lib/types.ts` |
| Grade calculator (weighted average, secured points, mark needed for a target, UK band guide) | Implemented | `lib/grades.ts` (tests in `lib/grades.test.ts`); exams count via optional weight/mark on tests |
| Assignment deadlines in the calendar and Coming up | Implemented | `itemsOn()` in `lib/calendar.ts` |
| Knowledge garden: notes as plants in module beds (taller with more links), [[links]] as vines, seeds (linked but unwritten notes) and lonely notes | Removed (2026-11-26) | `screens/KnowledgeGarden.tsx` (Study → Notes → Garden); `gardenGraph` in `lib/notes.ts` (tests in `lib/notes.test.ts`) |
| Attach images (made smaller), PDFs (up to 8 MB), links and formulas to a lecture note; formulas → formula cards; files removed with the note | Implemented | `screens/NoteAttachments.tsx`; `state/lessonFiles.ts`; storage key `lessonFiles` in safety copies, backup files and restores (`lib/persist.ts`, `lib/backup.ts`; tests in `lib/persist.test.ts`) |
| Lecture notes per module (lecture date, search, module filter) with [[links]] between notes and to topics, backlinks, rename keeps links | Removed (2026-11-26) | `screens/Notes.tsx` (Study → Notes, loads on demand); `lib/notes.ts` (tests in `lib/notes.test.ts`) |
| Revision planner: 30-min sessions before exams (weak topics and close exams first) → week plan + calendar, replace or remove | Removed (2026-11-26) | `screens/Revision.tsx` (Study → Tests); `lib/revision.ts` (tests in `lib/notes.test.ts`); `StudyBlock.revision` |
| Exam start time, length and room (shown on countdowns; timed in the calendar, so clashes are flagged) | Implemented | `Tests` in `screens/Study.tsx`; `itemsOn()` in `lib/calendar.ts` |
| Mock exams in exam conditions (full screen, countdown, auto hand-in, question grid, leaving the app noted without penalty), self-marking against model answers, lost marks → mistakes | Removed (2026-11-26) | `screens/Mock.tsx` (Study → Mock exam); `questionPool`, `pickQuestions`, `suggestedMinutes` in `lib/mock.ts` (tests in `lib/mock.test.ts`) |
| Question bank per module/topic (past-paper questions + model answers + marks) | Removed (2026-11-26) | `QuestionBank` in `screens/Mock.tsx`; `examQuestions` in `lib/types.ts` |
| Predicted grade (recent mocks 60%, topic confidence 25%, coursework 15%; shows how sure it is) | Removed (2026-11-26) | `predictGrade` in `lib/mock.ts` |
| Physics: formula sheet (44 formulas, 8 topics, every symbol + unit, → formula cards), solve any formula for any quantity, endless practice problems checked within 2% (missed → mistakes), uncertainty calculator | Removed (2026-11-26) | `screens/PhysicsTools.tsx` (Study → Tools → Physics); `lib/physics.ts` (tests in `lib/physics.test.ts`: every formula solved for every quantity) |
| Engineering toolbox: scientific calculator (safe parser, DEG/RAD, ans, history), unit converter (12 kinds), constants, solvers (SUVAT with both answers, quadratic, 2×2/3×3 simultaneous, f(x) = 0) | Removed (2026-11-26) | `screens/Toolbox.tsx` (Study → Tools, loads on demand); `lib/engineering.ts` (tests in `lib/engineering.test.ts`) |
| MATLAB snippets, graph plotting, lab checklist | Not started | Not requested for now |
| Focus guard, speaking practice | Not started | Spec: *Proposed* (past papers: use the mock exam question bank) |

## Finance
| Feature | Status | Evidence |
|---|---|---|
| USD amounts with £ entry; so'm converter | Implemented | `screens/Money.tsx`, `lib/money.ts` |
| Money plan (pot → daily allowance) for N days or months, with an optional daily maximum (e.g. $15) | Implemented | `lib/pot.ts` (`days`, `cap`), `screens/Plan.tsx`, tests in `lib/money.test.ts` |
| Money plan from today: "money I have now" + money set aside for one big bill (e.g. rent) + last day; (money − set aside) ÷ days = the same allowance each day; each day's leftover goes into **Saved** at the end of the day; "Paid rent" takes from the set-aside money, never from the day. Wishes come true can be removed (with their purchase), and "Set Saved to $0" zeroes Saved (`savedAdjust`). The $15 daily maximum, dream room jar and Dream room screen were removed (the old dream room list stays in saved data) | Implemented | `freshPot`, `potStatus` in `lib/pot.ts` (tests in `lib/money.test.ts`); `PlanSetup`, `SetAsideLine` in `screens/Plan.tsx` |
| Morning door (top 3 required to enter, typed or suggested) + evening check-in (what you did, how you felt) + week view of goals done and evening words | Implemented | `lib/dayDoor.ts` (tests in `lib/dayDoor.test.ts`); `screens/DayDoor.tsx`; `WeekReflect` in `screens/Extras.tsx` |
| Living world: sky behind every screen that follows Sheffield sunrise/sunset (sun or moon, clouds, birds, stars, real rain/snow) and a pixel landscape per section (cabin, forest, library, town, peaks, mosque, lake, garden, meadow); panels float like signs; the morning door is a wooden door that swings open | Implemented | `ui/SkyWorld.tsx`; door in `screens/DayDoor.tsx`; `.world`, `.door-*` in `styles.css` |
| Streak flame, yesterday-vs-today line | Removed (2026-11-26) | Replaced on Home by the Bek's Quest card (`QuestHome` in `screens/Quest.tsx`); the Focus timer button moved there |
| Focus mode: dimmed full-screen countdown using the normal study timer, shows your next goal, rain sound toggle | Implemented | `FocusMode` in `screens/Growth.tsx` |
| Month story (Reflect → Month story): goals done, days with a top 3, evening check-ins, focus time, money spent, usual mood, best day, lines from happiest days; Home nudge on the 1st–3rd | Implemented | `monthStory` in `lib/growth.ts`; `MonthStoryView`, `MonthNudge` in `screens/Growth.tsx` |
| + button menu: spent money, note/idea, reminder, edit today's top 3 | Implemented | `QuickAdd` in `screens/Growth.tsx`; `QuickCapture({ kind })` in `screens/Capture.tsx` |
| Wish fund, wishes, ETA, slider, buy from fund | Implemented | `screens/Plan.tsx` (`Wishes`), `lib/pot.ts` |
| Runway, money calendar, nightly "you saved" | Implemented | `screens/Plan.tsx` |
| Bills & subscriptions, spending list (budget limits, savings jars, charts, CSV import and insights removed 2026-11-26) | Implemented | `screens/Money.tsx` (Money → Today, Spending, Bills, Wishes) |
| Subscription tracker: bill vs subscription, monthly or yearly, free-trial end with a 7-day heads-up, cost per month and per year, edit | Implemented | `Bills`/`BillForm` in `screens/Money.tsx` (Money → Bills); `billDueOn`, `billsBetween`, `billCost` in `lib/money.ts` (tests in `lib/money.test.ts`) |
| Financial calendar: bill payments and trial ends in the universal calendar and Coming up; "Next 30 days" list with total | Implemented | `itemsOn()` in `lib/calendar.ts` reads `recurring` (never copied; test in `lib/calendar.test.ts`) |
| Yearly bills and free trials respected when payments add themselves | Implemented | `applyRecurring()` in `lib/money.ts` |
| Hard-mode wish buffer (+10%) | Implemented | `lib/push.ts` (`wishReady`), `screens/Plan.tsx` |
| Cook-at-home counter | Not started | Spec: *Proposed* |

## Health, fitness and football
| Feature | Status | Evidence |
|---|---|---|
| Simba needs you (meals, water, sleep → hearts, hungry mood) | Implemented | `lib/care.ts`, `screens/Daily.tsx` (`SimbaNeeds`), `lib/cabin.ts` |
| Calm corner ("A minute") | Implemented | `screens/Calm.tsx` (mood check-in removed 2026-11-26) |
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
| Reflect: Tonight, Diary, Week, Month story (my sky, year in pixels, vision board and letters removed 2026-11-26) | Implemented | `screens/Reflect.tsx` |
| Live diary: connected device posts entries to the public site; Diary pulls them on open | Implemented | `lib/publish.ts`, `lib/publish.test.ts`, `screens/Reflect.tsx`, `public/sw.js` |
| Diary with automatic date and time; add older entries from a private file; searchable | Implemented | `lib/diary.ts`, `screens/Reflect.tsx` (`Diary`), `lib/diary.test.ts` |
| Gratitude jar, journal, habits | Implemented | `screens/Calm.tsx`, `screens/Extras.tsx` |
| Morning promise (no penalty unless hard mode), you vs last week, hard mode | Removed (2026-11-26) | `lib/push.ts` (tests), `screens/Push.tsx` |
| XP, levels, coins, badges | Removed (2026-11-26) at Bek's request: no game points anywhere. `gainXp` in `state/store.tsx` is now a no-op; old XP and badge data stay saved but unused | `lib/xp.ts` (constants only); `lib/badges.ts` and `screens/Badges.tsx` deleted |
| Adhkar, sadaqah jar, if-then plans, family report card, weekly challenges | Not started | Spec: *Proposed* (good deeds journal covers private sadaqah notes) |

## Everyday life
| Feature | Status | Evidence |
|---|---|---|
| Real weather (7-day) in window and on Home | Implemented | `lib/weather.ts`, `ui/Weather.tsx` |
| Planner: top 3, tasks, week | Implemented | `screens/Planner.tsx` |
| Student admin: visa, documents, accommodation… as checklists with a key date, dated steps, notes, finished/reopen; 6 generic starter checklists | Removed (2026-11-26) | `screens/Admin.tsx` (Planner → Admin, loads on demand); `lib/admin.ts` (tests in `lib/admin.test.ts`) |
| Admin dates in the calendar and on Home (inside each item's reminder window, with step progress) | Removed (2026-11-26) | `itemsOn()` in `lib/calendar.ts` reads `admin`; `ImportantDates` in `screens/Home.tsx` (`adminReminders`) |
| Kitchen: shopping list ("500g pasta" lines), tick off → put in the pantry (quantities merge) | Removed (2026-11-26) | `Groceries` in `screens/Kitchen.tsx` (Home → Kitchen, `#/kitchen`); `parseQty`, `stockUp`, `newGroceryLines` in `lib/kitchen.ts` (tests in `lib/kitchen.test.ts`) |
| Pantry with quantities, units and use-by dates; "use soon" / "past its date" first; ran-out items one tap to the list | Removed (2026-11-26) | `Pantry` in `screens/Kitchen.tsx`; `freshness`, `toUseSoon` in `lib/kitchen.ts` |
| Meal plan (week, breakfast/lunch/dinner, free text or a recipe) + missing ingredients to shopping | Removed (2026-11-26) | `Meals` in `screens/Kitchen.tsx`; `meals` in `lib/types.ts` |
| Personal cookbook + "What can I cook?" from the pantry (fewest missing first, uses up food expiring soon) | Removed (2026-11-26) | `Recipes` in `screens/Kitchen.tsx`; `checkRecipe`, `suggestRecipes` in `lib/kitchen.ts` |
| Kitchen card on Home (today's meals, food to use soon) | Removed (2026-11-26) | `KitchenCard` in `screens/Home.tsx` |
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
| Cabin items (all unlocked), Decorate the cabin (10 items, free to display or put away), growth (tulips, books, garden, jar) | Implemented | `lib/cabin.ts`, `lib/shop.ts`, `screens/Shop.tsx` (More → Cabin → Decorate) |
| Pond & 15-fish book | Removed (2026-11-26) | `lib/fish.ts` (tests), `screens/Pond.tsx` |
| Sound mixer, lo-fi radio, effects | Implemented | `lib/sound.ts`, `ui/SoundMixer.tsx` |
| Lo-fi radio sound on a phone | Needs verification | Toggle checked; audio not listened to on a device |
| More rooms: Library, Kitchen, Workshop, Bedroom, Observatory, Garden of Years, attic Life Museum — each drawn from real data (books = notes/words/cards/recipes, jars = pantry, finished work, last night's bedtime, stars = night logs) | Removed (2026-11-26) | `screens/Rooms.tsx` (`#/rooms`, Home → Rooms; loads on demand); `roomStats` in `lib/rooms.ts` (tests in `lib/rooms.test.ts`) |
| Garden of Years (a flower per month, growing with good days; past years) | Implemented | `gardenOfYear`, `gardenYears` in `lib/rooms.ts` |
| Life Museum / memory timeline (finished Bek's Quest projects, savings reached, dreams reached, graded work, campfire wins, first catches, Simba's gifts; worship never displayed) | Removed (2026-11-26) | `museum()` in `lib/rooms.ts` |
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

## Bek's Quest (real-life side quests)
| Feature | Status | Evidence |
|---|---|---|
| Quest library: 111 quests in six areas (Explorer, Creator, Athlete, Scholar, Spiritual, Human), each with description, minutes, energy, difficulty, place and exact "done when" criteria; Sheffield-specific where it fits | Implemented | `QUESTS` in `lib/questLibrary.ts` (checked in `lib/quests.test.ts`) |
| "I'm bored" button: time (5/15/30/60/120), energy, optional place → ONE mission (at most two re-rolls); avoids last 3 days, keeps you indoors late at night or in the rain unless you choose outdoors | Implemented | `pickQuest`, `fits` in `lib/quests.ts`; `BoredSheet` in `screens/Quest.tsx` (Home card + Quest screen) |
| "I'm about to scroll" button: kind, non-shaming message → how much time → one replacement quest, or a 10-minute emergency mission | Implemented | `emergencyQuest` in `lib/quests.ts`; `ScrollSos` in `screens/Quest.tsx` |
| Daily missions (3 a day: move/explore, think/make, people/faith; swap allowed), weekly challenge (measured in real things), monthly totals | Implemented | `dailyMissions`, `swapMission`, `challengeProgress`, `monthStats` in `lib/quests.ts`; `Today` in `screens/Quest.tsx`; Month story shows quests and time |
| Rewards without points: time away from the screen (week/month), life totals per area (Spiritual kept private, never counted), scroll moments turned into action, a short celebration after each quest | Implemented | `stats`, `weekStats`, `lifeStats`, `hoursLabel` in `lib/quests.ts`; `Celebration` in `screens/Quest.tsx` |
| Field journal (one line and an optional photo per quest; the photo also goes on the cabin photo wall), one month at a time | Implemented | `completeQuest`, `removeEntry` in `lib/quests.ts`; `DoneSheet`, `Journal` in `screens/Quest.tsx` |
| Projects with real results (20 Sheffield green spaces, Peak District days, 60-second film, 5k, a whole book, a program, a surah, five dishes from home); finished ones go in the Life Museum (faith project stays private) | Implemented | `PROJECTS` in `lib/questLibrary.ts`; `startProject`, `toggleStep` in `lib/quests.ts`; `museum()` in `lib/rooms.ts` |
| One recommended next action (mission in progress → a daily mission → a project step; late at night: sleep) | Implemented | `nextAction` in `lib/quests.ts`; `NextUp` in `screens/Quest.tsx` |
| Saved with everything else (in `AppData.quest`, in snapshots, backups and import checks; old data gets an empty quest record) | Implemented | `QuestState` in `lib/types.ts`; `emptyData()` in `lib/seed.ts`; persistence tests in `lib/quests.test.ts` |
