import type { Feedback } from '../check/feedback';
import { dayKey, daysBetween } from '../date';
import { planWeek } from '../plan/plan';

/**
 * The learner's writing over time: every answer to a task, each with its versions and what was
 * said about them, grouped by task so this time can be put next to last time.
 */

/** One checked version of an answer, as it was shown (stored since Sprint 18). */
export interface WrittenVersion {
  text: string;
  at?: string;
  source: 'ai' | 'rules';
  feedback: Feedback;
  /** Mistakes and better phrasings the learner kept as review cards (indexes into the feedback). */
  chosenMistakes?: number[];
  chosenUpgrades?: number[];
}

/** What these functions need of an attempt row. */
export interface AttemptLike {
  id: string;
  taskId: string;
  snippetId: string;
  text: string;
  at: string;
  usedRequired: string[];
  missingRequired: string[];
  missingPoints?: string[];
  revisions?: string[];
  versions?: WrittenVersion[];
}

/** Where an answer was written: a lesson, a talk (spoken, then checked), an interview answer, a capture. */
export type WritingKind = 'lesson' | 'talk' | 'interview' | 'capture';
export const WRITING_KINDS: readonly WritingKind[] = ['lesson', 'talk', 'interview', 'capture'];

export function writingKind(snippetId: string): WritingKind {
  const prefix = snippetId.split(':')[0];
  return prefix === 'talk' || prefix === 'interview' || prefix === 'capture' ? prefix : 'lesson';
}

/** One version to show: its feedback only when it was kept (answers before Sprint 18 have text only). */
export interface VersionView {
  text: string;
  at?: string;
  version?: WrittenVersion;
}

export function versionsOf(attempt: AttemptLike): VersionView[] {
  if (attempt.versions?.length) return attempt.versions.map((v) => ({ text: v.text, at: v.at, version: v }));
  return [...(attempt.revisions ?? []).map((text) => ({ text })), { text: attempt.text, at: attempt.at }];
}

/** The learner's day of a timestamp (their clock, as every day in the app). */
export const dayOf = (at: string) => dayKey(new Date(at));

/** Every idea and chunk there in the final version. */
export const attemptComplete = (a: AttemptLike) => (a.missingPoints ?? []).length === 0 && a.missingRequired.length === 0;

/** How many times the answer was checked before it was kept. */
export const checksOf = (a: AttemptLike) => (a.versions?.length ? a.versions.length : (a.revisions?.length ?? 0) + 1);

export interface WritingGroup<A extends AttemptLike = AttemptLike> {
  /** `<kind>:<taskId>`: a spoken answer and a written one to the same task are kept apart. */
  key: string;
  kind: WritingKind;
  taskId: string;
  /** Oldest first. */
  attempts: A[];
  last: A;
}

export const groupKey = (a: AttemptLike) => `${writingKind(a.snippetId)}:${a.taskId}`;

/** Answers grouped by task, the group written in most recently first. */
export function groupWritings<A extends AttemptLike>(attempts: readonly A[]): Array<WritingGroup<A>> {
  const groups = new Map<string, A[]>();
  for (const a of [...attempts].sort((x, y) => x.at.localeCompare(y.at))) {
    const key = groupKey(a);
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  return [...groups]
    .map(([key, list]) => ({ key, kind: writingKind(list[0].snippetId), taskId: list[0].taskId, attempts: list, last: list[list.length - 1] }))
    .sort((x, y) => y.last.at.localeCompare(x.last.at));
}

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

export type SignalKind = 'checks' | 'missing' | 'mistakes' | 'words';
export interface Signal {
  kind: SignalKind;
  before: number;
  after: number;
  /** true: better this time; false: worse; undefined: the same. */
  better?: boolean;
}

/**
 * This time next to last time, on the same task: fewer checks needed, fewer ideas missing, fewer
 * mistakes on the first try (only when both kept their feedback), longer answers, and chunks now used.
 */
export function compareAttempts(before: AttemptLike, after: AttemptLike): { signals: Signal[]; newChunks: string[] } {
  const signal = (kind: SignalKind, b: number, a: number, lowerIsBetter: boolean): Signal => ({
    kind,
    before: b,
    after: a,
    better: a === b ? undefined : lowerIsBetter ? a < b : a > b,
  });
  const signals = [
    signal('checks', checksOf(before), checksOf(after), true),
    signal('missing', (before.missingPoints ?? []).length + before.missingRequired.length, (after.missingPoints ?? []).length + after.missingRequired.length, true),
  ];
  const firstB = before.versions?.[0];
  const firstA = after.versions?.[0];
  if (firstB && firstA) signals.push(signal('mistakes', firstB.feedback.mistakes.length, firstA.feedback.mistakes.length, true));
  signals.push(signal('words', words(before.text), words(after.text), false));
  const newChunks = after.usedRequired.filter((c) => !before.usedRequired.includes(c));
  return { signals, newChunks };
}

/**
 * Checks needed per answer, week by week (oldest first): it falls as the learner needs fewer
 * rewrites to say everything. `undefined` for a week without answers.
 */
export function checksByWeek(attempts: readonly AttemptLike[], today: string, weeks = 6): Array<{ weeksAgo: number; average?: number; count: number }> {
  return Array.from({ length: weeks }, (_, i) => weeks - 1 - i).map((weeksAgo) => {
    const inWeek = attempts.filter((a) => Math.floor(daysBetween(dayOf(a.at), today) / 7) === weeksAgo);
    const total = inWeek.reduce((sum, a) => sum + checksOf(a), 0);
    return { weeksAgo, count: inWeek.length, average: inWeek.length ? Math.round((total / inWeek.length) * 10) / 10 : undefined };
  });
}

/** The most frequent mistake labels in the last `days`, with the count of the `days` before. */
export function topMistakes(mistakes: ReadonlyArray<{ label: string; day: string }>, today: string, days = 28, n = 3): Array<{ label: string; count: number; before: number }> {
  const counts = new Map<string, { count: number; before: number }>();
  for (const m of mistakes) {
    const ago = daysBetween(m.day, today);
    if (ago < 0 || ago >= days * 2) continue;
    const entry = counts.get(m.label) ?? { count: 0, before: 0 };
    if (ago < days) entry.count++;
    else entry.before++;
    counts.set(m.label, entry);
  }
  return [...counts]
    .filter(([, c]) => c.count > 0)
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([label, c]) => ({ label, ...c }));
}

export interface BenchmarkLike {
  id: string;
  kind: 'writing' | 'audio';
  day: string;
  at: string;
}

/** One benchmark: the writing and the recording made the same plan week (or the same day without a plan). */
export interface Checkpoint<B extends BenchmarkLike = BenchmarkLike> {
  key: string;
  week?: number;
  day: string;
  writing?: B;
  audio?: B;
}

/** Benchmarks by plan week, oldest first; the latest of each kind in a week wins. */
export function checkpoints<B extends BenchmarkLike>(benchmarks: readonly B[], startDay?: string): Array<Checkpoint<B>> {
  const groups = new Map<string, Checkpoint<B>>();
  for (const b of [...benchmarks].sort((x, y) => x.at.localeCompare(y.at))) {
    const week = startDay ? planWeek(startDay, b.day).week : undefined;
    const key = week !== undefined ? `week-${week}` : b.day;
    const group = groups.get(key) ?? { key, week, day: b.day };
    group[b.kind] = b;
    groups.set(key, group);
  }
  return [...groups.values()];
}
