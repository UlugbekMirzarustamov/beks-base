import { describe, expect, it } from 'vitest';
import { exportJson, normalize, parseBackup, validateData } from './backup';
import { CATEGORIES, PROJECTS, QUESTS, WEEKLY, type QuestCategory } from './questLibrary';
import {
  acceptQuest,
  challengeProgress,
  completeQuest,
  dailyMissions,
  doneOn,
  emergencyQuest,
  fits,
  hoursLabel,
  lifeStats,
  nextAction,
  pickQuest,
  questById,
  questLog,
  startProject,
  swapMission,
  toggleStep,
  weekStats,
  weeklyChallenge,
  type Ctx,
  type Finish,
} from './quests';
import { emptyData } from './seed';
import type { AppData } from './types';

const TODAY = '2026-11-26'; // a Thursday
const day: Ctx = { hour: 14, weekday: 3 };
const fixed = (n: number) => () => n;
const finish = (d: AppData, questId: string, date = TODAY, extra: Partial<Finish> = {}) =>
  completeQuest(d, { id: `${questId}-${date}`, questId, date, minutes: questById(questId)!.minutes, note: '', from: 'bored', ...extra });

describe('the quest library', () => {
  it('has at least 100 quests, at least 15 in every area, with unique ids', () => {
    expect(QUESTS.length).toBeGreaterThanOrEqual(100);
    for (const c of Object.keys(CATEGORIES) as QuestCategory[]) expect(QUESTS.filter((q) => q.category === c).length).toBeGreaterThanOrEqual(15);
    expect(new Set(QUESTS.map((q) => q.id)).size).toBe(QUESTS.length);
  });
  it('gives every quest a full description and exact completion criteria', () => {
    for (const q of QUESTS) {
      expect(q.title.length, q.id).toBeGreaterThan(3);
      expect(q.description.length, q.id).toBeGreaterThan(20);
      expect(q.done.length, q.id).toBeGreaterThan(5);
      expect(q.minutes, q.id).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(q.energy);
      expect(['easy', 'steady', 'hard']).toContain(q.difficulty);
      expect(['indoors', 'outdoors', 'anywhere']).toContain(q.place);
    }
  });
  it('avoids filler tasks and has no points anywhere', () => {
    const text = JSON.stringify(QUESTS).toLowerCase();
    for (const filler of ['drink water', 'make your bed', ' xp', 'level up']) expect(text).not.toContain(filler);
  });
  it('has emergency missions of about ten minutes, and sensible projects and challenges', () => {
    const sos = QUESTS.filter((q) => q.emergency);
    expect(sos.length).toBeGreaterThanOrEqual(6);
    for (const q of sos) expect(q.minutes).toBeLessThanOrEqual(20);
    for (const p of PROJECTS) expect(p.steps.length).toBeGreaterThanOrEqual(5);
    expect(new Set(WEEKLY.map((w) => w.id)).size).toBe(WEEKLY.length);
  });
});

describe('filtering', () => {
  const q = (id: string) => questById(id)!;
  it('never gives a quest longer than the time you have, or harder than your energy', () => {
    expect(fits(q('at-5k'), { minutes: 30, energy: 'high', place: 'anywhere' }, day)).toBe(false);
    expect(fits(q('at-5k'), { minutes: 60, energy: 'medium', place: 'anywhere' }, day)).toBe(false);
    expect(fits(q('at-5k'), { minutes: 60, energy: 'high', place: 'anywhere' }, day)).toBe(true);
  });
  it('respects indoors and outdoors', () => {
    expect(fits(q('ex-crookes-valley'), { minutes: 60, energy: 'high', place: 'indoors' }, day)).toBe(false);
    expect(fits(q('at-core'), { minutes: 60, energy: 'high', place: 'outdoors' }, day)).toBe(false);
    expect(fits(q('at-stairs'), { minutes: 60, energy: 'high', place: 'outdoors' }, day)).toBe(true);
  });
  it('keeps you indoors late at night or in the rain unless you ask to go out', () => {
    const anywhere = { minutes: 60, energy: 'high' as const, place: 'anywhere' as const };
    expect(fits(q('ex-crookes-valley'), anywhere, { ...day, hour: 23 })).toBe(false);
    expect(fits(q('ex-crookes-valley'), anywhere, { ...day, wet: true })).toBe(false);
    expect(fits(q('ex-crookes-valley'), { ...anywhere, place: 'outdoors' }, { ...day, wet: true })).toBe(true);
  });
  it('knows weekday and time-of-day quests', () => {
    const ask = { minutes: 60, energy: 'high' as const, place: 'anywhere' as const };
    expect(fits(q('sp-kahf'), ask, day)).toBe(false);
    expect(fits(q('sp-kahf'), ask, { ...day, weekday: 4 })).toBe(true);
    expect(fits(q('ex-night-sky'), { ...ask, place: 'outdoors' }, day)).toBe(false);
    expect(fits(q('ex-night-sky'), { ...ask, place: 'outdoors' }, { ...day, hour: 20 })).toBe(true);
  });
});

describe('quest generation: one mission', () => {
  it('returns exactly one quest that fits', () => {
    const ask = { minutes: 15, energy: 'low' as const, place: 'indoors' as const };
    for (const r of [0, 0.3, 0.6, 0.99]) {
      const q = pickQuest(emptyData(TODAY), ask, day, TODAY, fixed(r))!;
      expect(q).toBeTruthy();
      expect(fits(q, ask, day)).toBe(true);
    }
  });
  it('is repeatable with the same random number, and skips what was already shown', () => {
    const ask = { minutes: 30, energy: 'medium' as const, place: 'anywhere' as const };
    const d = emptyData(TODAY);
    const first = pickQuest(d, ask, day, TODAY, fixed(0))!;
    expect(pickQuest(d, ask, day, TODAY, fixed(0))!.id).toBe(first.id);
    expect(pickQuest(d, ask, day, TODAY, fixed(0), [first.id])!.id).not.toBe(first.id);
  });
  it('avoids quests done in the last three days', () => {
    const ask = { minutes: 30, energy: 'medium' as const, place: 'anywhere' as const };
    const d = emptyData(TODAY);
    const first = pickQuest(d, ask, day, TODAY, fixed(0))!;
    finish(d, first.id, '2026-11-25');
    expect(pickQuest(d, ask, day, TODAY, fixed(0))!.id).not.toBe(first.id);
  });
  it('prefers using the time you have', () => {
    const q = pickQuest(emptyData(TODAY), { minutes: 120, energy: 'high', place: 'anywhere' }, day, TODAY, fixed(0))!;
    expect(q.minutes).toBeGreaterThanOrEqual(60);
  });
  it('the emergency mission is quick and stays indoors late at night', () => {
    for (const r of [0, 0.5, 0.99]) {
      const q = emergencyQuest(emptyData(TODAY), { ...day, hour: 23 }, TODAY, fixed(r));
      expect(q.emergency).toBe(true);
      expect(q.place).not.toBe('outdoors');
    }
  });
});

describe('daily missions', () => {
  it('gives three missions from three different kinds of area, the same all day', () => {
    const d = emptyData(TODAY);
    const m = dailyMissions(d, TODAY);
    expect(m).toHaveLength(3);
    expect(['athlete', 'explorer']).toContain(m[0].category);
    expect(['scholar', 'creator']).toContain(m[1].category);
    expect(['human', 'spiritual']).toContain(m[2].category);
    expect(dailyMissions(d, TODAY).map((q) => q.id)).toEqual(m.map((q) => q.id));
    expect(dailyMissions(d, '2026-11-27').map((q) => q.id)).not.toEqual(m.map((q) => q.id));
  });
  it('keeps a mission once done today, and can swap one for another', () => {
    const d = emptyData(TODAY);
    const [first] = dailyMissions(d, TODAY);
    finish(d, first.id, TODAY, { from: 'daily' });
    expect(dailyMissions(d, TODAY)[0].id).toBe(first.id);
    expect(doneOn(d, first.id, TODAY)).toBe(true);
    const second = dailyMissions(d, TODAY)[1];
    swapMission(d, TODAY, second.id);
    expect(dailyMissions(d, TODAY)[1].id).not.toBe(second.id);
  });
});

describe('finishing quests and real totals (no XP)', () => {
  it('records the quest in the journal and clears the active mission', () => {
    const d = emptyData(TODAY);
    acceptQuest(d, 'at-core', 'bored', '2026-11-26T14:00:00Z');
    expect(nextAction(d, TODAY, 14)).toMatchObject({ kind: 'active' });
    const e = finish(d, 'at-core', TODAY, { note: '  felt strong  ', minutes: 12 });
    expect(e).toMatchObject({ questId: 'at-core', minutes: 12, note: 'felt strong' });
    expect(d.quest.active).toBeNull();
    expect(questLog(d)).toHaveLength(1);
  });
  it('adds up time taken back this week, by area, with scroll moments turned into action', () => {
    const d = emptyData(TODAY);
    finish(d, 'ex-crookes-valley', '2026-11-23'); // Monday: 30 min, outdoors
    finish(d, 'at-core', TODAY, { from: 'sos' }); // 10 min
    finish(d, 'sp-adhkar', TODAY); // 10 min, spiritual
    finish(d, 'sc-fermi', '2026-11-22'); // last Sunday: not this week
    const w = weekStats(d, TODAY);
    expect(w.minutes).toBe(50);
    expect(w.count).toBe(3);
    expect(w.outdoors).toBe(1);
    expect(w.fromScroll).toBe(1);
    expect(w.areas).toBe(2); // Spiritual is never counted as an area
    expect(lifeStats(d).minutes).toBe(65);
    expect(hoursLabel(50)).toBe('50 min');
    expect(hoursLabel(220)).toBe('3h 40m');
  });
  it('measures the weekly challenge in real things, the same all week', () => {
    const d = emptyData(TODAY);
    const { challenge } = challengeProgress(d, TODAY);
    expect(weeklyChallenge('2026-11-23').id).toBe(challenge.id);
    expect(weeklyChallenge('2026-11-30').id).not.toBe(challenge.id);
    expect(challengeProgress(d, TODAY).value).toBe(0);
  });
  it('never takes anything away for missed days', () => {
    const d = emptyData(TODAY);
    finish(d, 'at-core', '2026-10-01');
    expect(lifeStats(d).count).toBe(1);
    expect(nextAction(d, TODAY, 14).kind).toBe('daily');
    expect(nextAction(d, TODAY, 23).kind).toBe('rest');
  });
});

describe('projects', () => {
  it('ticks steps and finishes when every step is done', () => {
    const d = emptyData(TODAY);
    const p = startProject(d, 'pr-5k', TODAY, 'p1')!;
    expect(startProject(d, 'pr-5k', TODAY, 'p2')).toBeNull(); // not twice at once
    for (let i = 0; i < p.steps.length; i++) toggleStep(d, 'p1', i, TODAY);
    expect(d.quest.projects[0].finished).toBe(TODAY);
    toggleStep(d, 'p1', 0, TODAY);
    expect(d.quest.projects[0].finished).toBeUndefined();
  });
});

describe('persistence', () => {
  it('fills in an empty quest record for data saved before Bek’s Quest existed', () => {
    const old = emptyData(TODAY) as Partial<AppData>;
    delete old.quest;
    expect(normalize(old, TODAY).quest).toEqual({ log: [], active: null, projects: [], swaps: {} });
  });
  it('survives a backup and restore with the journal, active mission and projects intact', () => {
    const d = emptyData(TODAY);
    finish(d, 'at-core', TODAY, { note: 'done', photoId: 'ph1' });
    acceptQuest(d, 'ex-crookes-valley', 'daily', '2026-11-26T15:00:00Z');
    startProject(d, 'pr-green-spaces', TODAY, 'p1');
    toggleStep(d, 'p1', 0, TODAY);
    expect(validateData(d, TODAY)).toEqual([]);
    expect(parseBackup(exportJson(d), TODAY).quest).toEqual(d.quest);
  });
  it('ignores half-saved journal entries instead of crashing', () => {
    const d = emptyData(TODAY);
    d.quest.log.push({ questId: 'at-core' } as never);
    finish(d, 'at-core');
    expect(questLog(d)).toHaveLength(1);
  });
});
