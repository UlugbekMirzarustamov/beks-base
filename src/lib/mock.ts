/**
 * Mock exams: build a question pool from your own material (question bank, mistakes notebook,
 * formula cards), pick questions with weak topics more likely, score the marked paper, and
 * predict a grade from recent mocks, topic confidence and coursework. Plain functions.
 * A prediction is a rough guide, not a promise — the app says how sure it is.
 */
import { band } from './grades';
import type { AppData, Confidence, MockResult } from './types';

export interface MockQ {
  key: string;
  question: string;
  answer: string;
  marks: number;
  /** Higher = more likely to be picked (weak topics, mistakes to review). */
  weight: number;
}

const CONF_WEIGHT: Record<string, number> = { red: 3, amber: 2, unrated: 2, green: 1 };
const confWeight = (c: Confidence | undefined) => CONF_WEIGHT[c ?? 'unrated'];

/** Every question available for a module (or all modules when `subjectId` is null). */
export function questionPool(d: AppData, subjectId: string | null, includeFormulas: boolean): MockQ[] {
  const topic = (id: string | null) => d.topics.find((t) => t.id === id);
  const inSubject = (sid: string | null | undefined) => subjectId === null || sid === subjectId;
  const out: MockQ[] = [];
  for (const q of d.examQuestions) {
    if (inSubject(q.subjectId)) out.push({ key: `bank-${q.id}`, question: q.question, answer: q.answer, marks: Math.max(1, q.marks), weight: confWeight(topic(q.topicId)?.confidence) });
  }
  for (const m of d.mistakes) {
    if (!m.question.trim() || !m.correctAnswer.trim()) continue;
    if (subjectId === null || topic(m.topicId)?.subjectId === subjectId) out.push({ key: `mistake-${m.id}`, question: m.question, answer: m.correctAnswer, marks: 2, weight: m.reviewAgain ? 3 : 1.5 });
  }
  if (includeFormulas) for (const f of d.flashcards) out.push({ key: `card-${f.id}`, question: `Write down: ${f.front}`, answer: f.back, marks: 1, weight: f.box <= 1 ? 2 : 1 });
  return out;
}

/** Pick `n` different questions; heavier ones are more likely. `rand` is for tests. */
export function pickQuestions(pool: MockQ[], n: number, rand: () => number = Math.random): MockQ[] {
  const left = [...pool];
  const out: MockQ[] = [];
  while (out.length < n && left.length) {
    const total = left.reduce((a, q) => a + q.weight, 0);
    let r = rand() * total;
    let i = 0;
    while (i < left.length - 1 && r >= left[i].weight) r -= left[i++].weight;
    out.push(left.splice(i, 1)[0]);
  }
  return out;
}

/** About 1.5 minutes per mark, rounded up to 5 minutes (at least 5). */
export const suggestedMinutes = (qs: { marks: number }[]) => Math.max(5, Math.ceil((qs.reduce((a, q) => a + q.marks, 0) * 1.5) / 5) * 5);

export const percent = (m: Pick<MockResult, 'score' | 'max'>) => (m.max > 0 ? Math.round((m.score / m.max) * 1000) / 10 : 0);

export interface Prediction {
  pct: number;
  band: string;
  sure: 'low' | 'medium' | 'high';
  parts: { label: string; value: number; weight: number }[];
}

/**
 * A predicted mark (%) for a module: recent mocks (newest count most) 60%, topic confidence 25%,
 * coursework marks 15% — using only the parts that exist. Null when there's nothing to go on.
 */
export function predictGrade(d: AppData, subjectId: string | null): Prediction | null {
  const parts: Prediction['parts'] = [];
  const mocks = d.mocks.filter((m) => subjectId === null || m.subjectId === subjectId).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 3);
  if (mocks.length) {
    const w = [3, 2, 1].slice(0, mocks.length);
    const avg = mocks.reduce((a, m, i) => a + percent(m) * w[i], 0) / w.reduce((a, x) => a + x, 0);
    parts.push({ label: `Mock exams (last ${mocks.length})`, value: Math.round(avg), weight: 60 });
  }
  const topics = d.topics.filter((t) => subjectId === null || t.subjectId === subjectId);
  if (topics.length) {
    const score = { green: 85, amber: 60, red: 35 } as const;
    const avg = topics.reduce((a, t) => a + (t.confidence ? score[t.confidence] : 50), 0) / topics.length;
    parts.push({ label: 'Topic confidence', value: Math.round(avg), weight: 25 });
  }
  const marks = d.assignments.filter((a) => (subjectId === null || a.subjectId === subjectId) && typeof a.mark === 'number').map((a) => a.mark as number);
  if (marks.length) parts.push({ label: 'Coursework marks', value: Math.round(marks.reduce((a, x) => a + x, 0) / marks.length), weight: 15 });
  if (!parts.length) return null;
  const totalW = parts.reduce((a, p) => a + p.weight, 0);
  const pct = Math.round(parts.reduce((a, p) => a + p.value * p.weight, 0) / totalW);
  const sure = mocks.length >= 3 ? 'high' : mocks.length >= 1 ? 'medium' : 'low';
  return { pct, band: band(pct), sure, parts };
}
