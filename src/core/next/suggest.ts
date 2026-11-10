import { daysBetween } from '../date';

/**
 * What to do next, from everything the learner has: one main thing and a couple of extras.
 * Every screen that ends something (Today, the wrap-up) asks this, so the parts of the app lead
 * into each other instead of each being a dead end. Pure: the same data gives the same answer.
 */

export type Suggestion =
  | { kind: 'resume'; step: number; total: number }
  | { kind: 'session'; due: number }
  | { kind: 'drill'; label: string; cards: number }
  | { kind: 'roleplay'; scenarioId: string; title: string }
  | { kind: 'captureTask'; captureId: string }
  | { kind: 'review'; due: number }
  | { kind: 'baseline' }
  | { kind: 'capture' }
  | { kind: 'more' };

export interface SuggestInput {
  active?: { step: number; total: number };
  doneToday: boolean;
  dueToday: number;
  /** Mistake groups coming back this week, most first (see `repeatingLabels`). */
  repeating: ReadonlyArray<{ label: string; cardIds: readonly string[] }>;
  /** The roleplay of the unit being learnt, once at least one of its snippets was read. */
  roleplay?: { scenarioId: string; title: string };
  /** A writing task made from a capture and not written yet. */
  captureTaskId?: string;
  baselineDue: boolean;
  /** Cards made from captures, ever: none yet means the learner may not know the feature. */
  captureCards: number;
}

export function suggestNext(input: SuggestInput, max = 3): Suggestion[] {
  const out: Suggestion[] = [];
  if (input.active) out.push({ kind: 'resume', ...input.active });
  else if (!input.doneToday) out.push({ kind: 'session', due: input.dueToday });

  const drill = input.repeating.find((group) => group.cardIds.length > 0);
  if (drill) out.push({ kind: 'drill', label: drill.label, cards: drill.cardIds.length });
  // Done for today and cards still due (past the session's share): review more, outside a session.
  if (input.doneToday && !input.active && input.dueToday > 0) out.push({ kind: 'review', due: input.dueToday });
  if (input.roleplay) out.push({ kind: 'roleplay', ...input.roleplay });
  if (input.captureTaskId) out.push({ kind: 'captureTask', captureId: input.captureTaskId });
  if (input.baselineDue) out.push({ kind: 'baseline' });
  if (input.captureCards === 0) out.push({ kind: 'capture' });
  // Done for today and nothing else waiting: another snippet is always possible.
  if (input.doneToday && !input.active) out.push({ kind: 'more' });
  return out.slice(0, max);
}

/**
 * Mistake labels made more than once in the last 7 days, most frequent first, with the review
 * cards made from them (any week): those are what a focused drill practises.
 */
export function repeatingLabels(
  mistakes: ReadonlyArray<{ label: string; day: string; cardId?: string }>,
  today: string,
): Array<{ label: string; thisWeek: number; cardIds: string[] }> {
  const groups = new Map<string, { label: string; thisWeek: number; cardIds: Set<string> }>();
  for (const mistake of mistakes) {
    const group = groups.get(mistake.label) ?? { label: mistake.label, thisWeek: 0, cardIds: new Set<string>() };
    const ago = daysBetween(mistake.day, today);
    if (ago >= 0 && ago < 7) group.thisWeek++;
    if (mistake.cardId) group.cardIds.add(mistake.cardId);
    groups.set(mistake.label, group);
  }
  return [...groups.values()]
    .filter((group) => group.thisWeek > 1)
    .sort((a, b) => b.thisWeek - a.thisWeek || a.label.localeCompare(b.label))
    .map((group) => ({ label: group.label, thisWeek: group.thisWeek, cardIds: [...group.cardIds] }));
}

/** Put the given cards first, keeping the order otherwise (a stable sort). */
export function prioritize<T extends { id: string }>(cards: readonly T[], first: ReadonlySet<string>): T[] {
  return [...cards.filter((card) => first.has(card.id)), ...cards.filter((card) => !first.has(card.id))];
}

/** Short observations for the progress screen; each one comes with where to act on it. */
export type Insight =
  | { kind: 'mistakeFalling'; label: string; weeks: number }
  | { kind: 'mistakeRising'; label: string }
  | { kind: 'minutesUp'; delta: number }
  | { kind: 'minutesDown'; delta: number };

export function insights(input: {
  /** Per label, counts for the last four weeks, oldest first. */
  labelWeeks: ReadonlyArray<{ label: string; weeks: readonly number[] }>;
  minutesThisWeek: number;
  minutesLastWeek: number;
}): Insight[] {
  const out: Insight[] = [];
  for (const { label, weeks } of input.labelWeeks) {
    // Weeks in a row the count went down, ending this week.
    let falling = 0;
    for (let i = weeks.length - 1; i > 0 && weeks[i] < weeks[i - 1]; i--) falling++;
    if (falling >= 2) out.push({ kind: 'mistakeFalling', label, weeks: falling });
    else if (weeks.length > 1 && weeks[weeks.length - 1] > weeks[weeks.length - 2] && weeks[weeks.length - 1] > 1) {
      out.push({ kind: 'mistakeRising', label });
    }
  }
  const delta = input.minutesThisWeek - input.minutesLastWeek;
  if (input.minutesLastWeek > 0 && delta >= 10) out.push({ kind: 'minutesUp', delta });
  if (input.minutesLastWeek > 0 && delta <= -10) out.push({ kind: 'minutesDown', delta: -delta });
  return out.slice(0, 3);
}
