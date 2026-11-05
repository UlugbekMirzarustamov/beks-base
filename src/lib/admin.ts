/**
 * Student admin: visa, documents, accommodation and other paperwork as checklists with dates.
 * Plain functions, so they're easy to test. The templates are generic starting points
 * (no personal details) — every step can be changed.
 */
import { daysBetween } from './dates';
import type { AdminArea, AdminItem } from './types';

export const AREAS: Record<AdminArea, { label: string; icon: 'plane' | 'scroll' | 'house' | 'book' | 'coin' | 'heart' | 'star' }> = {
  visa: { label: 'Visa & immigration', icon: 'plane' },
  documents: { label: 'Documents', icon: 'scroll' },
  housing: { label: 'Accommodation', icon: 'house' },
  university: { label: 'University', icon: 'book' },
  money: { label: 'Money & bank', icon: 'coin' },
  health: { label: 'Health', icon: 'heart' },
  other: { label: 'Other', icon: 'star' },
};

export const DATE_LABELS = ['Expires', 'Deadline', 'Renew by', 'Appointment', 'Move in', 'Move out', 'Starts', 'Ends'];

export interface AdminTemplate {
  title: string;
  area: AdminArea;
  dateLabel: string;
  remind: number;
  steps: string[];
}

/** Starting points for common international-student admin. */
export const TEMPLATES: AdminTemplate[] = [
  {
    title: 'Visa renewal / extension',
    area: 'visa',
    dateLabel: 'Expires',
    remind: 90,
    steps: ['Check the official rules and fees for my visa type', 'Ask the university for the documents they provide', 'Collect bank statements / financial evidence', 'Fill in the online application', 'Pay the fee and book the biometrics appointment', 'Go to the appointment', 'Keep the decision letter safe'],
  },
  {
    title: 'Passport',
    area: 'documents',
    dateLabel: 'Expires',
    remind: 180,
    steps: ['Check how long renewal takes from abroad', 'Book an appointment with the embassy / consulate', 'Get photos taken', 'Submit the application', 'Collect the new passport', 'Update my visa / university records with the new number'],
  },
  {
    title: 'Accommodation contract',
    area: 'housing',
    dateLabel: 'Ends',
    remind: 60,
    steps: ['Decide: stay or move', 'Look at new places / ask about renewing', 'Read the new contract before signing', 'Pay the deposit (and keep the receipt)', 'Check the deposit is protected', 'Do the move-out checklist and photos', 'Get the old deposit back'],
  },
  {
    title: 'Council tax exemption',
    area: 'money',
    dateLabel: 'Deadline',
    remind: 14,
    steps: ['Download a student status letter from the university', 'Send it to the local council', 'Check the exemption is confirmed'],
  },
  {
    title: 'Register with a GP',
    area: 'health',
    dateLabel: 'Deadline',
    remind: 7,
    steps: ['Find the nearest GP practice', 'Fill in the registration form', 'Get the confirmation / NHS number'],
  },
  {
    title: 'University enrolment / registration',
    area: 'university',
    dateLabel: 'Deadline',
    remind: 14,
    steps: ['Complete online registration', 'Upload documents', 'Collect the student card', 'Check my modules are right'],
  },
];

/** How many steps are done out of how many. */
export const progress = (item: AdminItem) => ({ done: item.steps.filter((s) => s.done).length, total: item.steps.length });

/** The first step not done yet (dated steps first, soonest first), or undefined. */
export function nextStep(item: AdminItem) {
  const open = item.steps.filter((s) => !s.done);
  const dated = open.filter((s) => s.due).sort((a, b) => a.due.localeCompare(b.due));
  return dated[0] ?? open[0];
}

export type AdminStatus = 'finished' | 'overdue' | 'soon' | 'later' | 'nodate';

/** Where an item stands: past its key date, inside its reminder window, later, or without a date. */
export function adminStatus(item: AdminItem, today: string): AdminStatus {
  if (item.finished) return 'finished';
  if (!item.date) return 'nodate';
  const left = daysBetween(today, item.date);
  return left < 0 ? 'overdue' : left <= item.remind ? 'soon' : 'later';
}

/** Unfinished admin to show on Home: past its date or inside its reminder window, most urgent first. */
export function adminReminders(items: AdminItem[], today: string): { item: AdminItem; daysLeft: number }[] {
  return items
    .filter((i) => {
      const s = adminStatus(i, today);
      return s === 'overdue' || s === 'soon';
    })
    .map((item) => ({ item, daysLeft: daysBetween(today, item.date) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** The order on the Admin screen: urgent first, then by date, undated after, finished last. */
export function sortAdmin(items: AdminItem[], today: string): AdminItem[] {
  const rank: Record<AdminStatus, number> = { overdue: 0, soon: 1, later: 2, nodate: 3, finished: 4 };
  return [...items].sort((a, b) => rank[adminStatus(a, today)] - rank[adminStatus(b, today)] || (a.date || '9999').localeCompare(b.date || '9999') || a.title.localeCompare(b.title));
}
