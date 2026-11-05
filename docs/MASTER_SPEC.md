# Bek's Base 2.0 — Master Specification

The product vision for Bek's Base. This document says **what the product should be**.
What exists today, with evidence, is tracked in [FEATURE_STATUS.md](FEATURE_STATUS.md);
working rules for developers are in [../CLAUDE.md](../CLAUDE.md); history is in [CHANGELOG.md](CHANGELOG.md).

**How to read this spec**
- Items without a label are part of the agreed vision.
- *(Proposed)* — an idea suggested during development that Bek has **not yet approved**.
- *(To be defined)* — an area Bek has named for 2.0 whose requirements have **not been written down yet**.
  Do not invent features for these; ask Bek first.

---

## 1. Purpose and product rules

**Purpose.** A cozy, blocky pixel-art "home base" that helps one international student run his
life — study, money, deen, health and wellbeing — and become 1% better every day, while
making being far from home feel warmer.

**Product rules**
1. **Data belongs to Bek and stays on his device.** No accounts, no tracking, no ads.
2. **No bank connection, ever.** Purchases are typed in by hand on purpose.
3. **Never lose data.** No silent overwrite or reset; risky actions take a verified safety copy first.
4. **Offline-first, installable PWA, mobile-first** (usable at 375 px wide, no sideways scroll).
5. **Original art.** Minecraft-inspired blocky style, but no Mojang/Minecraft assets and no recreation of an existing game.
6. **Cozy, motivating, honest.** Rewards are earned (XP, coins, casts); feedback can be tough
   (e.g. the Fajr wake-up call) but targets choices, never self-worth.
7. **Simple to maintain.** Few dependencies, plain CSS, small focused changes, tests for logic.

## 2. Life Command Centre (Home)
- The **cabin** is the home screen and hub: each object opens a station (bookshelf → Study,
  chest → Money, crafting table → Planner, telescope → Reflect, prayer mat → Prayer, window → Pond).
- **Morning briefing** once per day: weather, classes, prayers, money for today, upcoming tests,
  top 3, today's 1% quest, Qur'an goal, a family photo, this week's focus, one vision goal.
- **Today at a glance** cards: prayer lanterns and strip, today's classes (live "now / next"), today's
  money, weather, savings, next test (with its boss), top 3, due tasks, mood check-in, level and coins.
- **Daily nudges:** today's 1% quest, word of the day, morning mistake recall, night wind-down,
  morning promise, Fajr rise, "you vs last week", Friday campfire, Sunday backup reminder.
- Clocks for the UK and home (Tashkent), with a "good time to call?" hint.

## 3. University and engineering tools
- **Tests and countdowns**, each shown as an **exam boss** whose HP falls as topics turn green and
  Pomodoros are done for that subject.
- **Topics** rated red / amber / green per subject; **mistakes notebook** with review; **formula
  flashcards** (Leitner boxes); **vocabulary** with example sentences.
- **Pomodoro timer** with full-screen focus mode, running across screens.
- **Real school timetable** shown day by day (it updates itself), weekly view, study blocks.
- *(Proposed)* Revision plan that writes itself from each boss's weak topics.
- *(Proposed)* Focus guard: a Pomodoro "cracks" if you leave the app.
- *(Proposed)* Past-paper score tracker towards a target grade.
- *(Proposed)* Daily speaking practice with voice recording.
- *(To be defined)* **Engineering tools** — specific calculators or references beyond the formula cards.

## 4. Finance
- Money in **US dollars**, with a **£ entry option** (converted at a rate Bek sets); so'm converter.
- **Money plan ("pot")**: a fixed total that must last N months → a fixed **daily allowance**;
  every purchase comes out of the pot.
- **Wish fund**: unspent allowance accumulates, overspending takes from it, nightly "you saved $X".
- **Wishes**: items with an approximate cost, star progress, ETA, "spend $X less a day" slider,
  bought from the wish fund (not the day's allowance).
- Runway (does the money last?), money calendar, monthly budget and category limits, savings
  jars, recurring bills, charts, CSV import, money insights.
- *(Proposed)* Cook-at-home counter showing money saved vs eating out.

## 5. Health, fitness and football
- **Simba needs you**: meals, water and last night's bedtime → Simba's hearts and moods.
- Night **wind-down** with a suggested bedtime from tomorrow's first class and Fajr.
- Mood check-in and weekly mood; **calm corner** (breathing, duas, call home); habits (incl. exercise).
- *(Proposed)* Move quests (walks, workouts, hikes) with Bek getting fitter in the cabin.
- *(To be defined)* **Fitness** and **football** features — not yet specified.

## 6. Deen and personal development
**Deen**
- Five daily prayers with times calculated for the UK location (Hanafi Asr by default, per-prayer
  offsets), five lanterns, a prayer strip on every screen, a full-screen call when a prayer is due, qibla.
- Tasbih counter; Qur'an page tracker with a daily goal and khatm count.
- **Ramadan mode** (switches on from the Islamic calendar): suhoor/iftar times and countdown,
  fasting and taraweeh tracker, juz-a-day, iftar dua, cabin lanterns, and a countdown with preparation beforehand.
- **Fajr rise**: "I'm up" before sunrise builds a streak; oversleeping triggers a deliberately harsh,
  full-screen wake-up call followed by concrete next steps.
- *(Proposed)* Morning/evening adhkar checklist; sadaqah jar.

**Personal development**
- Reflect: nightly one-line log + three good things (lights a star), "my sky" constellations,
  weekly look back, **Friday campfire** (week in numbers → one win → one focus → postcard),
  **year in pixels**, **vision board** (goal, why, date, picture), sealed **letters to future you**,
  **gratitude jar**, journal, habits.
- Push systems: **morning promise** (kept → XP, broken → coins), **you vs last week** ghost race,
  **hard mode** (stricter rules), XP, levels, coins and badges.
- *(Proposed)* If-then plans; weekly report card to share with family; progressive weekly challenges.

## 7. Everyday life
- Real local weather (7-day forecast) shown in the cabin window and on Home.
- Planner: today's top 3, tasks with due dates, week view.
- **Family photo wall** (photos stay on the device), photo of the day in the mantel frame and briefing.
- Calling home: Tashkent time and nudges.
- *(Proposed)* Explore-the-city map of places visited.

## 8. Projects and career
- *(To be defined)* No requirements recorded yet.

## 9. Cabin, rooms and Simba
- One cozy cabin room that fills the screen at any width; day/night sky from real sunrise/sunset;
  seasons; real weather (rain, fog, storm, snow → snowy hills, snowman, frost, scarf, hot chocolate).
- **Simba** the ginger cat with moods (sleep, study, prayer, worried, hungry, cosy), a name sign and
  petting; **Bek**, a customisable blocky character with poses.
- Growth: tulips (prayer streak), book pile (study streak), study garden (Pomodoros), gratitude jar.
- Level-up unlocks; **cabin shop** for decorations bought with earned coins.
- Pond behind the cabin: fishing with earned casts and a 15-fish book.
- Sound: rain/fire/wind mixer, lo-fi radio, small sound effects; Ramadan and winter decorations.
- *(To be defined)* **Rooms** — additional rooms beyond the single cabin.

## 10. AI and automation
- *(To be defined)* No requirements recorded yet. Any AI feature must respect the product rules
  (privacy-first: personal data must not leave the device without Bek's explicit consent; offline-first).

## 11. Technical foundations, privacy and backups
- Vite + React + TypeScript, plain CSS, no backend. Hosted as static files (GitHub Pages).
- All data in IndexedDB on the device: one `AppData` object plus a separate photo store.
- Offline service worker; installable with icon, splash screen and home-screen shortcuts.
- **Data safety:** autosave only after a successful load; recovery screen on load failure; visible
  save errors; verified automatic snapshots (newest 3) before import, reset, conversion, update steps
  and restores; validated imports; one storage strategy.
- **Backups:** JSON export/import including photos, share-sheet export (e.g. AirDrop to a laptop),
  Sunday reminder, snapshot restore in Settings and on the recovery screen.
- Quality bar: no console errors; 375 px wide with no sideways scroll; data persists; export → import
  round-trips; logic covered by tests; tests + build must pass before deploy.

## 12. Development phases
Completed (details in [CHANGELOG.md](CHANGELOG.md)):
1. **Phase 1** — Money, Study, Planner stations and the cabin home.
2. **Phase 2** — words, habits, mood, journal, clocks, offline on first visit.
3. **Life features** — Reflect, prayer, timetable, living cabin, money plan, 1% features, push features.
4. **2.0 foundation: data safety** — done (commit `ac8d47a`).

Recommended order for 2.0 (from the technical audit):
1. Permanent documentation (this set of files).
2. Move personal data out of the public repository (or make it private).
3. Small consolidation of duplicated helpers, without behaviour changes.
4. Performance: lazy-load rarely used screens; keep photos out of the main data object.
5. New features, one at a time, each with tests and (if needed) a safe upgrade step —
   starting with the *(To be defined)* areas once Bek writes their requirements.
