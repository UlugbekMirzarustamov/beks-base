/**
 * Global search: one index over everything you've written in Bek's Base, plus
 * the app's commands (go to a screen, add a purchase…). It only READS the
 * existing lists — nothing is copied or stored.
 *
 * Privacy: sealed letters to future you are searchable by title only.
 * Matching ignores case and accents; every word you type must appear.
 * Plain functions, so they're easy to test.
 */
import type { AppData } from './types';

export interface SearchEntry {
  /** Unique: kind + id. */
  key: string;
  kind: string;
  title: string;
  /** A short second line (module, date, amount…). */
  sub: string;
  /** Where it lives in the app. */
  href: string;
  /** For sorting recent things first (YYYY-MM-DD or ""). */
  date: string;
  /** Extra searchable text that isn't shown. */
  text?: string;
}

/** Lowercase, no accents, single spaces — so "Café" matches "cafe". */
export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const money = (n: number) => `$${n.toFixed(2)}`;

/** Everything searchable. */
export function buildIndex(d: AppData): SearchEntry[] {
  const moduleName = (id: string | null) => d.subjects.find((s) => s.id === id)?.name ?? '';
  const out: SearchEntry[] = [];
  const add = (e: SearchEntry) => out.push(e);
  for (const t of d.tasks) add({ key: `task-${t.id}`, kind: 'Task', title: t.title, sub: [t.done ? 'done' : 'to do', t.due ? `due ${t.due}` : ''].filter(Boolean).join(' · '), href: '#/planner/today', date: t.due ?? '' });
  for (const a of d.assignments) add({ key: `assignment-${a.id}`, kind: 'Assignment', title: a.title, sub: [moduleName(a.subjectId), `due ${a.due}`, a.status].filter(Boolean).join(' · '), href: '#/study/assignments', date: a.due, text: a.notes });
  for (const t of d.tests) add({ key: `test-${t.id}`, kind: 'Exam', title: t.name, sub: [moduleName(t.subjectId), t.date, t.time, t.room].filter(Boolean).join(' · '), href: '#/study/tests', date: t.date });
  for (const e of d.events) add({ key: `event-${e.id}`, kind: 'Event', title: e.title, sub: [e.date, e.start, e.location].filter(Boolean).join(' · '), href: '#/planner/calendar', date: e.date, text: `${e.kind} ${e.notes}` });
  for (const x of d.expenses) {
    const cat = d.categories.find((c) => c.id === x.categoryId)?.name ?? '';
    add({ key: `expense-${x.id}`, kind: 'Purchase', title: x.note || cat || 'Purchase', sub: [money(x.amount), cat, x.date].filter(Boolean).join(' · '), href: '#/money/spending', date: x.date, text: `${x.amount.toFixed(2)} ${x.paidGbp != null ? `£${x.paidGbp.toFixed(2)}` : ''}` });
  }
  for (const b of d.recurring) add({ key: `bill-${b.id}`, kind: b.kind === 'subscription' ? 'Subscription' : 'Bill', title: b.name, sub: [money(b.amount), b.every === 'year' ? 'every year' : 'every month'].join(' · '), href: '#/money/bills', date: '', text: b.amount.toFixed(2) });
  for (const g of d.groceries) if (!g.done) add({ key: `grocery-${g.id}`, kind: 'Shopping', title: g.text, sub: 'shopping list', href: '#/kitchen/groceries', date: '' });
  for (const p of d.pantry) add({ key: `pantry-${p.id}`, kind: 'Pantry', title: p.name, sub: [p.qty > 0 ? `${p.qty}${p.unit ? ` ${p.unit}` : ''}` : 'run out', p.expires ? `use by ${p.expires}` : ''].filter(Boolean).join(' · '), href: '#/kitchen/pantry', date: p.expires });
  for (const r of d.recipes) add({ key: `recipe-${r.id}`, kind: 'Recipe', title: r.name, sub: r.minutes ? `${r.minutes} min` : `${r.ingredients.length} ingredients`, href: '#/kitchen/recipes', date: '', text: `${r.ingredients.join(' ')} ${r.steps}` });
  for (const a of d.admin) add({ key: `admin-${a.id}`, kind: 'Admin', title: a.title, sub: [a.date ? `${a.dateLabel.toLowerCase()} ${a.date}` : '', a.finished ? 'finished' : `${a.steps.filter((x) => x.done).length}/${a.steps.length} steps`].filter(Boolean).join(' · '), href: '#/planner/admin', date: a.date, text: `${a.steps.map((x) => x.text).join(' ')} ${a.notes}` });
  for (const g of d.planGoals) add({ key: `plangoal-${g.id}`, kind: 'Goal', title: g.title, sub: `${g.level} ${g.period}${g.done ? ' · done' : ''}`, href: '#/planner/goals', date: g.period.length === 4 ? `${g.period}-01-01` : g.period.length === 7 ? `${g.period}-01` : g.period });
  // The good deeds journal is private and never searchable; the learning list and your own duas are.
  for (const l of d.learning) add({ key: `learning-${l.id}`, kind: 'Learning', title: l.title, sub: [l.by, l.status].filter(Boolean).join(' · '), href: '#/prayer/library', date: '', text: l.notes });
  for (const m of d.myDuas) add({ key: `mydua-${m.id}`, kind: 'Dua', title: m.title, sub: 'my duas', href: '#/prayer/library', date: '', text: `${m.text} ${m.note}` });
  for (const q of d.examQuestions) add({ key: `examq-${q.id}`, kind: 'Exam question', title: q.question, sub: `${moduleName(q.subjectId)} · ${q.marks} marks`, href: '#/study/mock', date: '', text: q.answer });
  for (const n of d.lectureNotes) add({ key: `lecture-${n.id}`, kind: 'Lecture note', title: n.title, sub: [moduleName(n.subjectId), n.date].filter(Boolean).join(' · '), href: '#/study/notes', date: n.date, text: n.body });
  for (const n of d.notes) add({ key: `note-${n.id}`, kind: 'Journal', title: n.title || 'Untitled note', sub: n.updated.slice(0, 10), href: '#/more/journal', date: n.updated.slice(0, 10), text: n.body });
  for (const i of d.inbox) if (!i.done) add({ key: `inbox-${i.id}`, kind: 'Inbox', title: i.text, sub: i.kind, href: '#/planner/today', date: i.created, text: i.url });
  for (const v of d.vocab) add({ key: `word-${v.id}`, kind: 'Word', title: v.word, sub: v.meaning, href: '#/more/words', date: '', text: v.sentence });
  for (const f of d.flashcards) add({ key: `card-${f.id}`, kind: 'Formula', title: f.front, sub: f.back, href: '#/study/cards', date: '' });
  for (const m of d.mistakes) add({ key: `mistake-${m.id}`, kind: 'Mistake', title: m.question, sub: m.correctAnswer, href: '#/study/mistakes', date: m.date, text: `${m.wrongAnswer} ${m.why}` });
  for (const t of d.topics) add({ key: `topic-${t.id}`, kind: 'Topic', title: t.name, sub: moduleName(t.subjectId), href: '#/study/topics', date: '' });
  for (const w of d.wishes) add({ key: `wish-${w.id}`, kind: 'Wish', title: w.name, sub: money(w.cost), href: '#/money/wishes', date: w.created });
  for (const g of d.goals) add({ key: `goal-${g.id}`, kind: 'Savings jar', title: g.name, sub: money(g.target), href: '#/money/savings', date: g.created });
  for (const v of d.vision) add({ key: `vision-${v.id}`, kind: 'Vision', title: v.title, sub: v.by ? `by ${v.by}` : 'vision board', href: '#/reflect/vision', date: v.by, text: v.why });
  // Sealed letters: the title only, never the body.
  for (const l of d.letters) add({ key: `letter-${l.id}`, kind: 'Letter', title: l.title || 'Letter to future you', sub: `opens ${l.openOn}`, href: '#/reflect/letters', date: l.written });
  for (const [day, log] of Object.entries(d.nightLogs)) {
    if (log.line.trim()) add({ key: `night-${day}`, kind: 'Night log', title: log.line, sub: day, href: '#/reflect/sky', date: day, text: `${log.good.join(' ')} ${log.tomorrow}` });
  }
  // The archive: older things that otherwise only live inside their own screens.
  for (const [monday, r] of Object.entries(d.reflections)) {
    const title = r.wentWell || r.learned || r.next || r.hard;
    if (title.trim()) add({ key: `week-${monday}`, kind: 'Week review', title, sub: `week of ${monday}`, href: '#/reflect/week', date: monday, text: `${r.wentWell} ${r.hard} ${r.learned} ${r.next}` });
  }
  for (const [monday, c] of Object.entries(d.campfires)) {
    if (c.win.trim() || c.focus.trim()) add({ key: `campfire-${monday}`, kind: 'Campfire', title: c.win || c.focus, sub: c.focus ? `focus: ${c.focus}` : c.date, href: '#/campfire', date: c.date || monday, text: c.focus });
  }
  for (const i of d.inbox) if (i.done) add({ key: `inbox-${i.id}`, kind: 'Inbox (done)', title: i.text, sub: `${i.kind} · done ${i.done}`, href: '#/archive', date: i.created, text: i.url });
  for (const [day, meals] of Object.entries(d.meals)) {
    for (const [slot, meal] of Object.entries(meals)) if (meal?.text) add({ key: `meal-${day}-${slot}`, kind: 'Meal', title: meal.text, sub: `${slot} · ${day}`, href: '#/kitchen/meals', date: day });
  }
  return out;
}

// ---------------------------------------------------------------- Archive
export type ArchiveArea = 'study' | 'money' | 'planner' | 'reflect' | 'kitchen' | 'admin';

export const ARCHIVE_AREAS: { id: ArchiveArea; label: string; kinds: string[] }[] = [
  { id: 'planner', label: 'Planner', kinds: ['Task', 'Goal', 'Event', 'Inbox', 'Inbox (done)'] },
  { id: 'study', label: 'Study', kinds: ['Lecture note', 'Exam question', 'Assignment', 'Exam', 'Mistake', 'Formula', 'Topic', 'Word'] },
  { id: 'money', label: 'Money', kinds: ['Purchase', 'Bill', 'Subscription', 'Wish', 'Savings jar'] },
  { id: 'reflect', label: 'Journal & reflect', kinds: ['Journal', 'Night log', 'Week review', 'Campfire', 'Vision', 'Letter'] },
  { id: 'kitchen', label: 'Kitchen', kinds: ['Recipe', 'Meal', 'Pantry', 'Shopping'] },
  { id: 'admin', label: 'Admin', kinds: ['Admin'] },
];

export interface ArchiveFilter {
  query: string;
  /** Only these areas (empty = everything). */
  areas: ArchiveArea[];
  /** Inclusive date range (YYYY-MM-DD); entries without a date only show when there's no range. */
  from?: string;
  to?: string;
}

/**
 * The archive: everything (or what matches the words typed) in the chosen areas and dates,
 * newest first, undated things last.
 */
export function searchArchive(index: SearchEntry[], f: ArchiveFilter): SearchEntry[] {
  const words = fold(f.query).split(' ').filter(Boolean);
  const kinds = f.areas.length ? new Set(ARCHIVE_AREAS.filter((a) => f.areas.includes(a.id)).flatMap((a) => a.kinds)) : null;
  const ranged = Boolean(f.from || f.to);
  return index
    .filter((e) => {
      if (kinds && !kinds.has(e.kind)) return false;
      if (ranged && (!e.date || (f.from && e.date < f.from) || (f.to && e.date > f.to))) return false;
      return !words.length || matches(fold(`${e.title} ${e.sub} ${e.kind} ${e.text ?? ''}`), words);
    })
    .sort((a, b) => (a.date && b.date ? b.date.localeCompare(a.date) : a.date ? -1 : b.date ? 1 : 0) || a.title.localeCompare(b.title));
}

/** Split an archive list into months ("YYYY-MM"; "" = no date), keeping the order. */
export function groupByMonth(entries: SearchEntry[]): { month: string; entries: SearchEntry[] }[] {
  const groups: { month: string; entries: SearchEntry[] }[] = [];
  for (const e of entries) {
    const month = e.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.entries.push(e);
    else groups.push({ month, entries: [e] });
  }
  return groups;
}

/** The years that have something in them, newest first. */
export const archiveYears = (index: SearchEntry[]) => [...new Set(index.filter((e) => e.date).map((e) => e.date.slice(0, 4)))].sort().reverse();

/** A thing you can DO from the palette. */
export interface Command {
  key: string;
  title: string;
  /** Extra words that should find it ("money", "spend"…). */
  keywords: string;
  href?: string;
  /** Special actions handled by the palette. */
  action?: 'add-purchase' | 'toggle-theme' | 'briefing';
}

const go = (title: string, href: string, keywords = ''): Command => ({ key: `go-${href}`, title, href, keywords });

export const COMMANDS: Command[] = [
  { key: 'add-purchase', title: 'Add a purchase', keywords: 'spend spent money expense buy pay', action: 'add-purchase' },
  { key: 'toggle-theme', title: 'Switch day / night', keywords: 'dark light theme mode', action: 'toggle-theme' },
  { key: 'briefing', title: "Today's briefing", keywords: 'morning summary today', action: 'briefing' },
  go('Home', '#/home', 'cabin dashboard'),
  go('Goals', '#/planner/goals', 'yearly monthly weekly daily goals plan year month week'),
  go('Calendar', '#/planner/calendar', 'schedule events day week month'),
  go('Tasks & inbox', '#/planner/today', 'todo top 3 inbox'),
  go('Timetable', '#/planner/timetable', 'classes school'),
  go('Student admin', '#/planner/admin', 'visa passport documents accommodation tenancy paperwork checklist'),
  go('Assignments & grades', '#/study/assignments', 'coursework grade calculator marks module'),
  go('Tests & bosses', '#/study/tests', 'exams'),
  go('Mock exam', '#/study/mock', 'mock exam practice predicted grade past paper question bank'),
  go('Lecture notes', '#/study/notes', 'notes lecture module linked knowledge garden'),
  go('Revision planner', '#/study/tests', 'revision plan exam schedule'),
  go('Topics', '#/study/topics', 'red amber green subjects modules'),
  go('Mistakes', '#/study/mistakes', 'notebook'),
  go('Formula cards', '#/study/cards', 'flashcards'),
  go('Pomodoro timer', '#/study/timer', 'focus study'),
  go('Engineering tools', '#/study/tools', 'calculator scientific unit converter constants suvat quadratic simultaneous equation solver'),
  go('Money plan', '#/money/plan', 'pot allowance budget'),
  go('Wishes', '#/money/wishes', 'wish fund'),
  go('Spending', '#/money/spending', 'purchases expenses'),
  go('Savings jars', '#/money/savings', 'goals'),
  go('Bills', '#/money/bills', 'recurring subscriptions'),
  go('Prayer times', '#/prayer/today', 'salah namaz lanterns'),
  go("Qur'an", '#/prayer/quran', 'quran pages'),
  go('Tasbih', '#/prayer/tasbih', 'dhikr'),
  go("Jumu'ah", '#/prayer/friday', 'friday jumuah kahf khutbah'),
  go('Islamic library', '#/prayer/library', 'dua duas good deeds journal learning books islam'),
  go('Hifz', '#/prayer/hifz', 'quran memorise memorisation revision surah'),
  go('Islamic calendar', '#/prayer/today', 'hijri eid ramadan arafah ashura date'),
  go('Ramadan', '#/prayer/ramadan', 'fasting iftar suhoor'),
  go('Tonight', '#/reflect/tonight', 'night log stars good things'),
  go('Vision board', '#/reflect/vision', 'goals dreams'),
  go('Letters to future you', '#/reflect/letters', ''),
  go('Year in pixels', '#/reflect/year', ''),
  go('Shopping list', '#/kitchen/groceries', 'groceries kitchen buy food'),
  go('Pantry', '#/kitchen/pantry', 'kitchen food fridge expiry'),
  go('Meal plan', '#/kitchen/meals', 'kitchen food cook week'),
  go('Recipes', '#/kitchen/recipes', 'cookbook cook kitchen what can i cook'),
  go('Archive', '#/archive', 'history past old everything browse months year'),
  go('Rooms', '#/rooms', 'cabin library kitchen workshop bedroom observatory simba'),
  go('Garden of Years', '#/rooms/garden', 'garden flowers months year good days'),
  go('Life Museum', '#/rooms/attic', 'museum attic milestones memories timeline gifts simba'),
  go('Calm corner', '#/calm', 'breathe anxious stress dua'),
  go('Pond', '#/pond', 'fishing fish'),
  go('Journal', '#/more/journal', 'notes'),
  go('Words', '#/more/words', 'vocab vocabulary'),
  go('Habits', '#/more/habits', ''),
  go('Settings & backups', '#/more/settings', 'backup export import restore hard mode'),
];

const matches = (haystack: string, words: string[]) => words.every((w) => haystack.includes(w));

/** Commands whose name or keywords contain every word typed (a few suggestions when empty). */
export function searchCommands(query: string, commands = COMMANDS): Command[] {
  const words = fold(query).split(' ').filter(Boolean);
  if (!words.length) return commands.slice(0, 6);
  return commands.filter((c) => matches(fold(`${c.title} ${c.keywords}`), words));
}

/** Records containing every word typed; title matches first, then newest. */
export function searchIndex(index: SearchEntry[], query: string, limit = 30): SearchEntry[] {
  const words = fold(query).split(' ').filter(Boolean);
  if (!words.length) return [];
  const scored: { e: SearchEntry; score: number }[] = [];
  for (const e of index) {
    if (!matches(fold(`${e.title} ${e.sub} ${e.kind} ${e.text ?? ''}`), words)) continue;
    const title = fold(e.title);
    const score = title.startsWith(words[0]) ? 3 : matches(title, words) ? 2 : 1;
    scored.push({ e, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || b.e.date.localeCompare(a.e.date) || a.e.title.localeCompare(b.e.title))
    .slice(0, limit)
    .map((s) => s.e);
}
