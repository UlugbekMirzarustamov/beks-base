/**
 * Quick Capture: type one line, and it goes to the right place.
 *
 *   "£4.50 coffee"                  → a purchase (in your money, like any other)
 *   "essay due fri"                 → a task due on Friday
 *   "remind me to call home at 6pm" → a reminder in the inbox
 *   "https://…"                     → a link in the inbox
 *   "idea: …" / "note: …"           → the inbox
 *
 * Tasks and purchases go straight into their own lists (one source of truth);
 * ideas, notes, links and reminders wait in the inbox until you sort them.
 * Plain functions, so they're easy to test.
 */
import { addDays, weekdayOf } from './dates';
import { poundsToDollars, roundPennies } from './money';
import type { AppData, Category, InboxKind } from './types';

export type CaptureKind = 'task' | 'expense' | InboxKind;

export const CAPTURE_KINDS: { value: CaptureKind; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'expense', label: 'Spent' },
  { value: 'idea', label: 'Idea' },
  { value: 'note', label: 'Note' },
  { value: 'link', label: 'Link' },
  { value: 'reminder', label: 'Reminder' },
];

export interface Parsed {
  kind: CaptureKind;
  /** The text left after taking out the amount, date, time and so on. */
  title: string;
  /** For purchases: the amount as typed, and in which currency. */
  amount: number | null;
  currency: 'USD' | 'GBP';
  /** YYYY-MM-DD or "" */
  date: string;
  /** HH:MM or "" */
  time: string;
  url: string;
}

const PREFIX = /^(idea|note|task|todo|link|remind(?:er)?|spent|expense)\s*:\s*/i;
const PREFIX_KIND: Record<string, CaptureKind> = { idea: 'idea', note: 'note', task: 'task', todo: 'task', link: 'link', remind: 'reminder', reminder: 'reminder', spent: 'expense', expense: 'expense' };
const URL_RE = /\b(https?:\/\/\S+|www\.\S+)/i;
const MONEY_BEFORE = /(£|\$)\s?(\d+(?:[.,]\d{1,2})?)/;
const MONEY_AFTER = /\b(\d+(?:[.,]\d{1,2})?)\s?(gbp|usd|pounds?|dollars?|quid)\b/i;
const SPEND_VERB = /^(spent|paid|bought)\s+(\d+(?:[.,]\d{1,2})?)\b/i;
const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_RE = /\b(?:on\s+|by\s+|due\s+)?(today|tonight|tomorrow|tmrw|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i;
const TIME_RE = /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/i;

/** The next date (today included) that falls on the given weekday name. */
function nextWeekday(word: string, today: string): string {
  const target = DAY_NAMES.findIndex((d) => d.startsWith(word.toLowerCase().slice(0, 3)));
  return addDays(today, (target - weekdayOf(today) + 7) % 7);
}

const tidy = (s: string) =>
  s
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,:;-]+|[\s,:;-]+$/g, '')
    .replace(/\s+(on|at|by|due|for)$/i, '')
    .trim();

/** Work out what a captured line is. `nowMins` (minutes after midnight) decides if a time without a day means today or tomorrow. */
export function parseCapture(input: string, today: string, nowMins = 0): Parsed {
  let text = input.trim();
  let kind: CaptureKind | null = null;
  const prefix = text.match(PREFIX);
  if (prefix) {
    kind = PREFIX_KIND[prefix[1].toLowerCase()];
    text = text.slice(prefix[0].length);
  }

  let url = '';
  const link = text.match(URL_RE);
  if (link) {
    url = link[1].startsWith('www.') ? `https://${link[1]}` : link[1];
    text = text.replace(link[0], ' ');
    kind ??= 'link';
  }

  let amount: number | null = null;
  let currency: 'USD' | 'GBP' = 'USD';
  const before = text.match(MONEY_BEFORE);
  const after = text.match(MONEY_AFTER);
  const verb = text.match(SPEND_VERB);
  if (before) {
    amount = roundPennies(Number(before[2].replace(',', '.')));
    currency = before[1] === '£' ? 'GBP' : 'USD';
    text = text.replace(before[0], ' ');
  } else if (after) {
    amount = roundPennies(Number(after[1].replace(',', '.')));
    currency = /usd|dollar/i.test(after[2]) ? 'USD' : 'GBP';
    text = text.replace(after[0], ' ');
  } else if (verb) {
    amount = roundPennies(Number(verb[2].replace(',', '.')));
    text = text.replace(verb[2], ' ');
  }
  text = text.replace(/^\s*(spent|paid|bought)\s+(on\s+)?/i, '');
  if (amount !== null && amount > 0) kind ??= 'expense';

  if (/^\s*remind me( to)?\s+/i.test(text)) {
    text = text.replace(/^\s*remind me( to)?\s+/i, '');
    kind ??= 'reminder';
  }

  let time = '';
  const t = text.match(TIME_RE);
  if (t) {
    let h = Number(t[1] ?? t[4]);
    const m = Number(t[2] ?? t[5] ?? 0);
    if (t[3]) {
      if (t[3].toLowerCase() === 'pm' && h < 12) h += 12;
      if (t[3].toLowerCase() === 'am' && h === 12) h = 0;
    }
    if (h <= 23 && m <= 59) {
      time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      text = text.replace(t[0], ' ');
    }
  }

  let date = '';
  const d = text.match(DAY_RE);
  if (d) {
    const word = d[1].toLowerCase();
    date = word === 'today' || word === 'tonight' ? today : word === 'tomorrow' || word === 'tmrw' ? addDays(today, 1) : nextWeekday(word, today);
    text = text.replace(d[0], ' ');
  }
  if (time && !date) {
    const [h, m] = time.split(':').map(Number);
    date = h * 60 + m > nowMins ? today : addDays(today, 1);
  }

  kind ??= time ? 'reminder' : 'task';
  return { kind, title: tidy(text) || (kind === 'link' ? url : ''), amount, currency, date, time, url };
}

/** Category for a purchase, from words in its note (falls back to "Other"). */
export function guessCategory(note: string, categories: Category[]): string {
  const words: [RegExp, string][] = [
    [/coffee|tea|lunch|dinner|breakfast|food|meal|snack|tesco|aldi|lidl|asda|sainsbury|co-?op|groceries|grocery|kebab|pizza|halal|restaurant|cafe|café/i, 'food'],
    [/bus|train|tram|taxi|uber|bolt|ticket|travel|fuel|metro/i, 'transport'],
    [/phone|sim|data|top.?up|giffgaff|voxi|lebara/i, 'phone'],
    [/cinema|film|movie|game|netflix|spotify|concert|bowling|football/i, 'fun'],
    [/rent|room|accommodation|bills?|electric|gas|water/i, 'rent'],
  ];
  const ids = new Set(categories.map((c) => c.id));
  const hit = words.find(([re, id]) => re.test(note) && ids.has(id));
  if (hit) return hit[1];
  return ids.has('other') ? 'other' : (categories[0]?.id ?? 'other');
}

/**
 * Put a parsed capture where it belongs (call inside `update(draft => …)`).
 * Returns a short message saying where it went. Throws if something essential is missing.
 */
export function captureInto(d: AppData, p: Parsed, today: string, id: () => string): string {
  const title = p.title.trim();
  switch (p.kind) {
    case 'task':
      if (!title) throw new Error('Type what the task is');
      d.tasks.push({ id: id(), title, due: p.date || null, done: false });
      return p.date ? `Task added, due ${p.date === today ? 'today' : p.date}` : 'Task added';
    case 'expense': {
      if (p.amount === null || !(p.amount > 0)) throw new Error('Add an amount, e.g. "£4.50 coffee"');
      const amount = p.currency === 'GBP' ? poundsToDollars(p.amount, d.settings.gbpPerUsd) : p.amount;
      const categoryId = guessCategory(title, d.categories);
      d.expenses.push({ id: id(), amount, categoryId, note: title, date: p.date || today, ...(p.currency === 'GBP' ? { paidGbp: p.amount } : {}) });
      const cat = d.categories.find((c) => c.id === categoryId)?.name ?? categoryId;
      return `Spent $${amount.toFixed(2)} added to ${cat}`;
    }
    default: {
      if (!title && !p.url) throw new Error('Type something to capture');
      const remindAt = p.kind === 'reminder' ? `${p.date || today}T${p.time || '09:00'}` : '';
      d.inbox.push({ id: id(), kind: p.kind, text: title || p.url, url: p.url, remindAt, created: today });
      return p.kind === 'reminder' ? `Reminder set for ${remindAt.replace('T', ' ')}` : 'Saved to your inbox';
    }
  }
}

// ---------------------------------------------------------------- sorting the inbox
/** What's still in the inbox: reminders first (soonest first), then newest first. */
export function openInbox(d: AppData) {
  return d.inbox
    .filter((i) => !i.done)
    .sort((a, b) => (a.remindAt && b.remindAt ? a.remindAt.localeCompare(b.remindAt) : a.remindAt ? -1 : b.remindAt ? 1 : b.created.localeCompare(a.created)));
}

/** Reminders whose time has come (now = local "YYYY-MM-DDTHH:MM"). */
export const dueReminders = (d: AppData, now: string) => d.inbox.filter((i) => !i.done && i.kind === 'reminder' && i.remindAt !== '' && i.remindAt <= now);

const take = (d: AppData, itemId: string, today: string) => {
  const item = d.inbox.find((i) => i.id === itemId);
  if (!item || item.done) throw new Error('That inbox item is gone');
  item.done = today;
  return item;
};

/** Turn an inbox item into a task (a reminder keeps its day as the due date). */
export function inboxToTask(d: AppData, itemId: string, today: string, id: () => string) {
  const item = take(d, itemId, today);
  d.tasks.push({ id: id(), title: item.text, due: item.remindAt ? item.remindAt.slice(0, 10) : null, done: false });
}

/** Turn an inbox item into a journal note (links keep their address in the note). */
export function inboxToNote(d: AppData, itemId: string, today: string, id: () => string, nowIso: string) {
  const item = take(d, itemId, today);
  d.notes.push({ id: id(), title: item.text.slice(0, 60), body: item.url && item.url !== item.text ? `${item.text}\n${item.url}` : item.text, updated: nowIso });
}

/** Turn an inbox item into a calendar event (a reminder keeps its day and time). */
export function inboxToEvent(d: AppData, itemId: string, today: string, id: () => string) {
  const item = take(d, itemId, today);
  const [date, time] = item.remindAt ? item.remindAt.split('T') : [today, ''];
  d.events.push({ id: id(), title: item.text, kind: 'event', date, start: time, end: '', endDate: '', repeat: 'none', until: '', location: '', notes: item.url });
}

/** Mark an inbox item as dealt with. */
export function inboxDone(d: AppData, itemId: string, today: string) {
  take(d, itemId, today);
}
