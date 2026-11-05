/**
 * Exam boss battles: every test is a pixel boss.
 *
 * Its health is made of two parts:
 *  - 10 HP for every topic of that subject (green topic = −10, amber = −4)
 *  - 60 HP of "stamina", knocked down 6 HP by each Pomodoro for that subject
 *    in the 4 weeks before the test (10 Pomodoros = stamina gone).
 * So the boss is beaten by understanding the topics AND by putting in the hours.
 */
import { addDays } from './dates';
import { dayHash } from './daily';
import type { AppData, Test } from './types';

export type BossKind = 'golem' | 'dragon' | 'slime' | 'knight';
const KINDS: BossKind[] = ['golem', 'dragon', 'slime', 'knight'];
const KIND_NAME: Record<BossKind, string> = { golem: 'Golem', dragon: 'Dragon', slime: 'Slime King', knight: 'Shadow Knight' };

export const TOPIC_HP = 10;
export const STAMINA_HP = 60;
export const POMODORO_HIT = 6;

export interface Boss {
  kind: BossKind;
  name: string;
  maxHp: number;
  hp: number;
  /** HP taken off by topics, and by study sessions */
  topicDamage: number;
  studyDamage: number;
  pomodoros: number;
  /** Topics still red / not rated (the boss's weak spots to hit next). */
  weakSpots: string[];
}

export function bossFor(test: Test, d: AppData): Boss {
  const kind = KINDS[dayHash(test.id) % KINDS.length];
  const subject = d.subjects.find((s) => s.id === test.subjectId);
  const topics = test.subjectId ? d.topics.filter((t) => t.subjectId === test.subjectId) : [];
  const topicDamage = topics.reduce((a, t) => a + (t.confidence === 'green' ? TOPIC_HP : t.confidence === 'amber' ? 4 : 0), 0);
  const from = addDays(test.date, -28);
  const pomodoros = d.studyLog.filter((s) => s.date >= from && s.date <= test.date && (!test.subjectId || s.subjectId === test.subjectId)).length;
  const studyDamage = Math.min(STAMINA_HP, pomodoros * POMODORO_HIT);
  const maxHp = topics.length * TOPIC_HP + STAMINA_HP;
  return {
    kind,
    name: `The ${subject?.name ?? test.name} ${KIND_NAME[kind]}`,
    maxHp,
    hp: Math.max(0, maxHp - topicDamage - studyDamage),
    topicDamage,
    studyDamage,
    pomodoros,
    weakSpots: topics.filter((t) => t.confidence !== 'green' && t.confidence !== 'amber').map((t) => t.name),
  };
}
