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
  for (const t of d.tests) add({ key: `test-${t.id}`, kind: 'Exam', title: t.name, sub: [moduleName(t.subjectId), t.date, t.time, t.room].filter(Boolean).join(' · '), href: '#/study/tests', date: t.date });
  for (const e of d.events) add({ key: `event-${e.id}`, kind: 'Event', title: e.title, sub: [e.date, e.start, e.location].filter(Boolean).join(' · '), href: '#/planner/calendar', date: e.date, text: `${e.kind} ${e.notes}` });
  for (const x of d.expenses) {
    const cat = d.categories.find((c) => c.id === x.categoryId)?.name ?? '';
    add({ key: `expense-${x.id}`, kind: 'Purchase', title: x.note || cat || 'Purchase', sub: [money(x.amount), cat, x.date].filter(Boolean).join(' · '), href: '#/money/spending', date: x.date, text: `${x.amount.toFixed(2)} ${x.paidGbp != null ? `£${x.paidGbp.toFixed(2)}` : ''}` });
  }
  for (const b of d.recurring) add({ key: `bill-${b.id}`, kind: b.kind === 'subscription' ? 'Subscription' : 'Bill', title: b.name, sub: [money(b.amount), b.every === 'year' ? 'every year' : 'every month'].join(' · '), href: '#/money/bills', date: '', text: b.amount.toFixed(2) });
  for (const g of d.planGoals) add({ key: `plangoal-${g.id}`, kind: 'Goal', title: g.title, sub: `${g.level} ${g.period}${g.done ? ' · done' : ''}`, href: '#/planner/goals', date: g.period.length === 4 ? `${g.period}-01-01` : g.period.length === 7 ? `${g.period}-01` : g.period });
  // The good deeds journal is private and never searchable; the learning list and your own duas are.
  for (const l of d.learning) add({ key: `learning-${l.id}`, kind: 'Learning', title: l.title, sub: [l.by, l.status].filter(Boolean).join(' · '), href: '#/prayer/library', date: '', text: l.notes });
  for (const m of d.myDuas) add({ key: `mydua-${m.id}`, kind: 'Dua', title: m.title, sub: 'my duas', href: '#/prayer/library', date: '', text: `${m.text} ${m.note}` });
  for (const e of d.diary) add({ key: `diary-${e.id}`, kind: 'Diary', title: e.text.slice(0, 80), sub: e.time ? `${e.date} ${e.time}` : e.date, href: '#/reflect/diary', date: e.date, text: e.text });
  for (const i of d.inbox) if (!i.done) add({ key: `inbox-${i.id}`, kind: 'Inbox', title: i.text, sub: i.kind, href: '#/planner/today', date: i.created, text: i.url });
  for (const w of d.wishes) add({ key: `wish-${w.id}`, kind: 'Wish', title: w.name, sub: money(w.cost), href: '#/money/wishes', date: w.created });
  for (const [day, log] of Object.entries(d.nightLogs)) {
    if (log.line.trim()) add({ key: `night-${day}`, kind: 'Night log', title: log.line, sub: day, href: '#/reflect/tonight', date: day, text: `${log.good.join(' ')} ${log.tomorrow}` });
  }
  // The archive: older things that otherwise only live inside their own screens.
  for (const [monday, r] of Object.entries(d.reflections)) {
    const title = r.wentWell || r.learned || r.next || r.hard;
    if (title.trim()) add({ key: `week-${monday}`, kind: 'Week review', title, sub: `week of ${monday}`, href: '#/reflect/week', date: monday, text: `${r.wentWell} ${r.hard} ${r.learned} ${r.next}` });
  }
  for (const i of d.inbox) if (i.done) add({ key: `inbox-${i.id}`, kind: 'Inbox (done)', title: i.text, sub: `${i.kind} · done ${i.done}`, href: '#/archive', date: i.created, text: i.url });
  return out;
}

// ---------------------------------------------------------------- Archive
export type ArchiveArea = 'study' | 'money' | 'planner' | 'reflect';

export const ARCHIVE_AREAS: { id: ArchiveArea; label: string; kinds: string[] }[] = [
  { id: 'planner', label: 'Planner', kinds: ['Task', 'Goal', 'Event', 'Inbox', 'Inbox (done)'] },
  { id: 'study', label: 'Study', kinds: ['Exam'] },
  { id: 'money', label: 'Money', kinds: ['Purchase', 'Bill', 'Subscription', 'Wish'] },
  { id: 'reflect', label: 'Diary & reflect', kinds: ['Diary', 'Night log', 'Week review'] },
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
  go('Exams', '#/study/tests', 'exams tests countdown'),
  go('Focus timer', '#/study/timer', 'focus study pomodoro timer'),
  go('Money plan', '#/money/plan', 'pot allowance budget'),
  go("Bek's Quest", '#/quest', 'quest bored mission adventure scroll sos side quest'),
  go('Quest projects', '#/quest/projects', 'project parks 5k book film surah dishes'),
  go('Field journal', '#/quest/journal', 'quest journal log history photos'),
  go('Wishes', '#/money/wishes', 'wish fund'),
  go('Spending', '#/money/spending', 'purchases expenses'),
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
  go('Archive', '#/archive', 'history past old everything browse months year'),
  go('Calm corner', '#/calm', 'breathe anxious stress dua'),
  go('Settings & backups', '#/more/settings', 'backup export import restore'),
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
