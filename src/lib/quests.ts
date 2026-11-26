/**
 * Bek's Quest logic: pick ONE mission that fits your time, energy and place; the three daily
 * missions; the weekly challenge; real totals (time away from the screen, things done); and the
 * one recommended next action. Plain functions, so they are easy to test.
 *
 * No XP, no levels, no streaks. Nothing is ever taken away for a missed day.
 * Spiritual quests go in your journal but are never counted in totals or challenges.
 */
import { addDays, daysBetween, monthOf, startOfWeek, weekdayOf } from './dates';
import { dayHash } from './daily';
import { PROJECTS, QUESTS, WEEKLY, type Energy, type Place, type Quest, type QuestCategory, type WeeklyChallenge } from './questLibrary';
import type { AppData, QuestDone, QuestFrom, QuestProject } from './types';

export const TIME_CHOICES = [5, 15, 30, 60, 120] as const;
const RANK: Record<Energy, number> = { low: 0, medium: 1, high: 2 };
const isDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

export const questById = (id: string): Quest | undefined => QUESTS.find((q) => q.id === id);
export const projectTemplate = (id: string) => PROJECTS.find((p) => p.id === id);

/** What you told the "I'm bored" button. */
export interface Ask {
  minutes: number;
  energy: Energy;
  place: Place;
}
/** The world right now: UK hour, weekday (0 = Monday), and whether it's raining. */
export interface Ctx {
  hour: number;
  weekday: number;
  wet?: boolean;
}

/** The finished quests, skipping any half-saved entries. */
export function questLog(d: AppData): QuestDone[] {
  const log = Array.isArray(d.quest?.log) ? d.quest.log : [];
  return log.filter((e) => e && typeof e.questId === 'string' && isDay(e.date) && typeof e.minutes === 'number' && Number.isFinite(e.minutes));
}

/** Late at night (or raining), "anywhere" doesn't send you out of the door. */
const late = (hour: number) => hour >= 22 || hour < 6;

/** Can this quest be done right now, with this much time, energy and place? */
export function fits(q: Quest, ask: Ask, ctx: Ctx): boolean {
  if (q.minutes > ask.minutes) return false;
  if (RANK[q.energy] > RANK[ask.energy]) return false;
  if (ask.place === 'indoors' && q.place === 'outdoors') return false;
  if (ask.place === 'outdoors' && q.place === 'indoors') return false;
  if (q.days && !q.days.includes(ctx.weekday)) return false;
  if (q.hours && (ctx.hour < q.hours[0] || ctx.hour >= q.hours[1])) return false;
  if (ask.place === 'anywhere' && q.place === 'outdoors' && (ctx.wet || late(ctx.hour))) return false;
  return true;
}

/** Quest ids finished in the last `days` days (including today). */
function recentIds(d: AppData, today: string, days: number): Set<string> {
  const from = addDays(today, -(days - 1));
  return new Set(questLog(d).filter((e) => e.date >= from && e.date <= today).map((e) => e.questId));
}

export const periodLog = (d: AppData, from: string, to: string) => questLog(d).filter((e) => e.date >= from && e.date <= to);

/** How often each area was done this week (to keep things balanced). */
function areaCounts(d: AppData, today: string): Partial<Record<QuestCategory, number>> {
  const out: Partial<Record<QuestCategory, number>> = {};
  for (const e of periodLog(d, startOfWeek(today), today)) {
    const q = questById(e.questId);
    if (q) out[q.category] = (out[q.category] ?? 0) + 1;
  }
  return out;
}

/**
 * ONE mission for the "I'm bored" button. Prefers: the energy you said, using most of the time
 * you have, areas you haven't done much this week, and nothing you did in the last 3 days.
 * `rand` returns 0–1 (Math.random in the app, fixed in tests). `skip` = ids already shown.
 */
export function pickQuest(d: AppData, ask: Ask, ctx: Ctx, today: string, rand: () => number = Math.random, skip: string[] = []): Quest | null {
  let pool = QUESTS.filter((q) => fits(q, ask, ctx) && !skip.includes(q.id));
  if (!pool.length) pool = QUESTS.filter((q) => fits(q, { ...ask, energy: 'high' }, ctx) && !skip.includes(q.id));
  if (!pool.length) return null;
  const recent = recentIds(d, today, 3);
  const fresh = pool.filter((q) => !recent.has(q.id));
  if (fresh.length) pool = fresh;
  const done = areaCounts(d, today);
  const score = (q: Quest) => 3 - Math.abs(RANK[q.energy] - RANK[ask.energy]) + (q.minutes / ask.minutes) * 3 - (done[q.category] ?? 0) * 0.5;
  const best = pool
    .map((q) => ({ q, s: score(q) }))
    .sort((a, b) => b.s - a.s || a.q.id.localeCompare(b.q.id))
    .slice(0, 5);
  return best[Math.min(best.length - 1, Math.floor(rand() * best.length))].q;
}

/** The 10-minute emergency mission: quick, low-barrier, and mostly away from the screen. */
export function emergencyQuest(d: AppData, ctx: Ctx, today: string, rand: () => number = Math.random, skip: string[] = []): Quest {
  const all = QUESTS.filter((q) => q.emergency && !skip.includes(q.id) && (!q.days || q.days.includes(ctx.weekday)));
  const safe = all.filter((q) => q.place !== 'outdoors' || !(ctx.wet || late(ctx.hour)));
  const pool = safe.length ? safe : all.length ? all : QUESTS.filter((q) => q.emergency);
  const recent = recentIds(d, today, 1);
  const fresh = pool.filter((q) => !recent.has(q.id));
  const list = fresh.length ? fresh : pool;
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
}

// ---------------------------------------------------------------- daily missions
/** Three missions a day: move or explore, think or make, people or faith. */
const SLOTS: { cats: QuestCategory[]; max: number }[] = [
  { cats: ['athlete', 'explorer'], max: 60 },
  { cats: ['scholar', 'creator'], max: 60 },
  { cats: ['human', 'spiritual'], max: 30 },
];

/** Today's three missions: the same all day, different tomorrow, never something done in the last week. */
export function dailyMissions(d: AppData, today: string): Quest[] {
  const weekday = weekdayOf(today);
  const lastWeek = new Set(questLog(d).filter((e) => e.date >= addDays(today, -7) && e.date < today).map((e) => e.questId));
  const swapped = Array.isArray(d.quest?.swaps?.[today]) ? d.quest.swaps[today] : [];
  const out: Quest[] = [];
  SLOTS.forEach((slot, i) => {
    const pool = QUESTS.filter((q) => slot.cats.includes(q.category) && q.minutes <= slot.max && !q.hours && (!q.days || q.days.includes(weekday)) && !lastWeek.has(q.id) && !swapped.includes(q.id));
    pool.sort((a, b) => dayHash(today, a.id + i) - dayHash(today, b.id + i));
    if (pool[0]) out.push(pool[0]);
  });
  return out;
}

export const doneOn = (d: AppData, questId: string, day: string) => questLog(d).some((e) => e.questId === questId && e.date === day);

// ---------------------------------------------------------------- totals
export interface Stats {
  count: number;
  /** Minutes spent on quests (time taken back from the screen). */
  minutes: number;
  byArea: Record<QuestCategory, { count: number; minutes: number }>;
  outdoors: number;
  /** Areas with at least one quest, Spiritual not counted. */
  areas: number;
  /** Scroll moments turned into a finished quest. */
  fromScroll: number;
}

const emptyAreas = (): Stats['byArea'] => ({
  explorer: { count: 0, minutes: 0 },
  creator: { count: 0, minutes: 0 },
  athlete: { count: 0, minutes: 0 },
  scholar: { count: 0, minutes: 0 },
  spiritual: { count: 0, minutes: 0 },
  human: { count: 0, minutes: 0 },
});

export function stats(entries: QuestDone[]): Stats {
  const s: Stats = { count: 0, minutes: 0, byArea: emptyAreas(), outdoors: 0, areas: 0, fromScroll: 0 };
  for (const e of entries) {
    const q = questById(e.questId);
    const m = Math.max(0, Math.round(e.minutes));
    s.count++;
    s.minutes += m;
    if (e.from === 'sos') s.fromScroll++;
    if (!q) continue;
    s.byArea[q.category].count++;
    s.byArea[q.category].minutes += m;
    if (q.place === 'outdoors') s.outdoors++;
  }
  s.areas = (Object.keys(s.byArea) as QuestCategory[]).filter((c) => c !== 'spiritual' && s.byArea[c].count > 0).length;
  return s;
}

export const weekStats = (d: AppData, today: string) => stats(periodLog(d, startOfWeek(today), today));
export const monthStats = (d: AppData, month: string) => stats(questLog(d).filter((e) => monthOf(e.date) === month));
export const lifeStats = (d: AppData) => stats(questLog(d));

/** "3h 40m" / "45 min". */
export function hoursLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ---------------------------------------------------------------- weekly challenge
/** This week's challenge (the same for the whole week, Monday to Sunday). */
export function weeklyChallenge(today: string): WeeklyChallenge {
  const week = Math.floor(daysBetween('2026-01-05', startOfWeek(today)) / 7);
  return WEEKLY[((week % WEEKLY.length) + WEEKLY.length) % WEEKLY.length];
}

export function challengeProgress(d: AppData, today: string): { challenge: WeeklyChallenge; value: number; done: boolean } {
  const challenge = weeklyChallenge(today);
  const s = weekStats(d, today);
  const value = challenge.measure === 'minutes' ? s.minutes : challenge.measure === 'areas' ? s.areas : challenge.measure === 'outdoors' ? s.outdoors : s.byArea[challenge.measure].count;
  return { challenge, value, done: value >= challenge.target };
}

// ---------------------------------------------------------------- projects
export const projectsOf = (d: AppData): QuestProject[] => (Array.isArray(d.quest?.projects) ? d.quest.projects : []).filter((p) => p && projectTemplate(p.templateId) && Array.isArray(p.steps));
export const stepsDone = (p: QuestProject) => p.steps.filter(Boolean).length;
export const nextStep = (p: QuestProject): number => p.steps.findIndex((s) => !s);

// ---------------------------------------------------------------- next action
export type NextAction =
  | { kind: 'active'; quest: Quest }
  | { kind: 'rest' }
  | { kind: 'daily'; quest: Quest }
  | { kind: 'project'; project: QuestProject; step: string }
  | { kind: 'free' };

/** The ONE thing to do next. */
export function nextAction(d: AppData, today: string, hour: number): NextAction {
  const active = d.quest?.active ? questById(d.quest.active.questId) : undefined;
  if (active) return { kind: 'active', quest: active };
  if (hour >= 23 || hour < 5) return { kind: 'rest' };
  const daily = dailyMissions(d, today).find((q) => !doneOn(d, q.id, today));
  if (daily) return { kind: 'daily', quest: daily };
  const project = projectsOf(d).find((p) => !p.finished && nextStep(p) >= 0);
  if (project) return { kind: 'project', project, step: projectTemplate(project.templateId)!.steps[nextStep(project)] };
  return { kind: 'free' };
}

// ---------------------------------------------------------------- changes (used inside update(draft => …))
export function acceptQuest(d: AppData, questId: string, from: QuestFrom, nowIso: string): void {
  d.quest.active = { questId, from, started: nowIso };
}

export function dropActive(d: AppData): void {
  d.quest.active = null;
}

export interface Finish {
  id: string;
  questId: string;
  date: string;
  minutes: number;
  note: string;
  from: QuestFrom;
  photoId?: string;
}

/** Record a finished quest in the journal. Clears the active mission if it was this one. */
export function completeQuest(d: AppData, f: Finish): QuestDone {
  const entry: QuestDone = { id: f.id, questId: f.questId, date: f.date, minutes: Math.max(1, Math.min(600, Math.round(f.minutes))), note: f.note.trim().slice(0, 280), from: f.from };
  if (f.photoId) entry.photoId = f.photoId;
  d.quest.log.push(entry);
  if (d.quest.active?.questId === f.questId) d.quest.active = null;
  return entry;
}

export function removeEntry(d: AppData, id: string): void {
  d.quest.log = d.quest.log.filter((e) => e.id !== id);
}

/** Swap one of today's missions for another (it won't come back today). */
export function swapMission(d: AppData, today: string, questId: string): void {
  // Keep only the last two weeks of swaps, so this never grows for ever.
  const keep = addDays(today, -14);
  for (const day of Object.keys(d.quest.swaps)) if (day < keep) delete d.quest.swaps[day];
  d.quest.swaps[today] = [...(d.quest.swaps[today] ?? []), questId];
}

export function startProject(d: AppData, templateId: string, today: string, id: string): QuestProject | null {
  const t = projectTemplate(templateId);
  if (!t || projectsOf(d).some((p) => p.templateId === templateId && !p.finished)) return null;
  const p: QuestProject = { id, templateId, started: today, steps: t.steps.map(() => null) };
  d.quest.projects.push(p);
  return p;
}

/** Tick or untick one step; the project is finished when every step is done. */
export function toggleStep(d: AppData, projectId: string, index: number, today: string): void {
  const p = d.quest.projects.find((x) => x.id === projectId);
  if (!p || index < 0 || index >= p.steps.length) return;
  p.steps[index] = p.steps[index] ? null : today;
  if (p.steps.every(Boolean)) p.finished = p.finished ?? today;
  else delete p.finished;
}

export function dropProject(d: AppData, projectId: string): void {
  d.quest.projects = d.quest.projects.filter((p) => p.id !== projectId);
}
