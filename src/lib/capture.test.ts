import { describe, expect, it } from 'vitest';
import { captureInto, dueReminders, guessCategory, inboxDone, inboxToEvent, inboxToNote, inboxToTask, openInbox, parseCapture } from './capture';
import { emptyData } from './seed';

const TODAY = '2026-11-05'; // Thursday
let n = 0;
const id = () => `id${++n}`;

describe('reading a captured line', () => {
  it('spots purchases in pounds or dollars', () => {
    expect(parseCapture('£4.50 coffee', TODAY)).toMatchObject({ kind: 'expense', amount: 4.5, currency: 'GBP', title: 'coffee' });
    expect(parseCapture('lunch $12', TODAY)).toMatchObject({ kind: 'expense', amount: 12, currency: 'USD', title: 'lunch' });
    expect(parseCapture('bus 2,40 pounds', TODAY)).toMatchObject({ kind: 'expense', amount: 2.4, currency: 'GBP', title: 'bus' });
    expect(parseCapture('spent 7 on groceries', TODAY)).toMatchObject({ kind: 'expense', amount: 7, title: 'groceries' });
  });

  it('turns day words into dates (the next one, today included)', () => {
    expect(parseCapture('essay due fri', TODAY)).toMatchObject({ kind: 'task', title: 'essay', date: '2026-11-06' });
    expect(parseCapture('call bank tomorrow', TODAY)).toMatchObject({ kind: 'task', date: '2026-11-06', title: 'call bank' });
    expect(parseCapture('lab report thursday', TODAY).date).toBe(TODAY);
    expect(parseCapture('gym on monday', TODAY).date).toBe('2026-11-09');
  });

  it('makes reminders from times, today or tomorrow depending on the clock', () => {
    expect(parseCapture('remind me to call home at 6pm', TODAY, 10 * 60)).toMatchObject({ kind: 'reminder', title: 'call home', date: TODAY, time: '18:00' });
    expect(parseCapture('take meds at 8:30am', TODAY, 20 * 60)).toMatchObject({ kind: 'reminder', date: '2026-11-06', time: '08:30' });
    expect(parseCapture('meeting fri 14:15', TODAY)).toMatchObject({ kind: 'reminder', date: '2026-11-06', time: '14:15', title: 'meeting' });
  });

  it('respects prefixes and finds links', () => {
    expect(parseCapture('idea: pixel garden for habits', TODAY)).toMatchObject({ kind: 'idea', title: 'pixel garden for habits' });
    expect(parseCapture('note: £5 is what Ali owes me', TODAY)).toMatchObject({ kind: 'note' });
    expect(parseCapture('MATLAB tips https://example.com/matlab', TODAY)).toMatchObject({ kind: 'link', url: 'https://example.com/matlab', title: 'MATLAB tips' });
    expect(parseCapture('www.example.org', TODAY)).toMatchObject({ kind: 'link', url: 'https://www.example.org', title: 'https://www.example.org' });
    expect(parseCapture('buy milk', TODAY)).toMatchObject({ kind: 'task', title: 'buy milk', date: '' });
  });

  it('guesses a sensible category, falling back to Other', () => {
    const cats = emptyData(TODAY).categories;
    expect(guessCategory('Tesco shop', cats)).toBe('food');
    expect(guessCategory('train to Leeds', cats)).toBe('transport');
    expect(guessCategory('birthday present', cats)).toBe('other');
  });
});

describe('putting captures where they belong', () => {
  it('tasks and purchases go straight into their own lists', () => {
    const d = emptyData(TODAY);
    expect(captureInto(d, parseCapture('essay due fri', TODAY), TODAY, id)).toMatch(/Task added/);
    expect(d.tasks.at(-1)).toMatchObject({ title: 'essay', due: '2026-11-06', done: false });
    d.settings.gbpPerUsd = 0.8;
    captureInto(d, parseCapture('£4 coffee', TODAY), TODAY, id);
    expect(d.expenses.at(-1)).toMatchObject({ amount: 5, paidGbp: 4, categoryId: 'food', note: 'coffee', date: TODAY });
    expect(d.inbox).toHaveLength(0);
  });

  it('ideas, links and reminders wait in the inbox', () => {
    const d = emptyData(TODAY);
    captureInto(d, parseCapture('idea: study garden', TODAY), TODAY, id);
    captureInto(d, parseCapture('remind me to pay rent fri at 9am', TODAY), TODAY, id);
    captureInto(d, parseCapture('https://example.com', TODAY), TODAY, id);
    expect(openInbox(d).map((i) => i.kind)).toEqual(['reminder', 'idea', 'link']);
    expect(d.inbox.find((i) => i.kind === 'reminder')?.remindAt).toBe('2026-11-06T09:00');
  });

  it('refuses captures that are missing the essentials', () => {
    const d = emptyData(TODAY);
    expect(() => captureInto(d, { ...parseCapture('coffee', TODAY), kind: 'expense' }, TODAY, id)).toThrow(/amount/);
    expect(() => captureInto(d, parseCapture('   ', TODAY), TODAY, id)).toThrow();
    expect(d.tasks).toHaveLength(0);
    expect(d.expenses).toHaveLength(0);
  });
});

describe('sorting the inbox', () => {
  it('reminders become due at their time', () => {
    const d = emptyData(TODAY);
    captureInto(d, parseCapture('remind me to call home at 6pm', TODAY), TODAY, id);
    expect(dueReminders(d, `${TODAY}T17:59`)).toHaveLength(0);
    expect(dueReminders(d, `${TODAY}T18:00`)).toHaveLength(1);
  });

  it('turns items into tasks, notes or calendar events, and they leave the inbox', () => {
    const d = emptyData(TODAY);
    captureInto(d, parseCapture('remind me to book flights fri at 10:00', TODAY), TODAY, id);
    captureInto(d, parseCapture('idea: cabin garden', TODAY), TODAY, id);
    captureInto(d, parseCapture('Notes https://example.com/notes', TODAY), TODAY, id);
    captureInto(d, parseCapture('note: Ali owes me lunch', TODAY), TODAY, id);
    const [reminder, idea, link, note] = d.inbox;
    inboxToEvent(d, reminder.id, TODAY, id);
    expect(d.events.at(-1)).toMatchObject({ title: 'book flights', date: '2026-11-06', start: '10:00' });
    inboxToTask(d, idea.id, TODAY, id);
    expect(d.tasks.at(-1)).toMatchObject({ title: 'cabin garden', due: null });
    inboxToNote(d, link.id, TODAY, id, '2026-11-05T12:00:00.000Z');
    expect(d.notes.at(-1)).toMatchObject({ title: 'Notes', body: 'Notes\nhttps://example.com/notes' });
    inboxDone(d, note.id, TODAY);
    expect(openInbox(d)).toHaveLength(0);
    expect(() => inboxDone(d, note.id, TODAY)).toThrow(/gone/);
  });
});
