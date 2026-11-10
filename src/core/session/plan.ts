import type { Snippet, Unit } from '../content/schema';

/**
 * Planning a session: which steps, which snippet, which cards. A pure function, so the same data
 * at the same time gives the same session, and a saved plan can be resumed step by step.
 */

export type StepKind = 'review' | 'input' | 'shadow' | 'produce' | 'wrap';

export interface SessionPlan {
  steps: StepKind[];
  unitId: string;
  snippetId: string;
  /** Cards to review in the warm-up, in order. */
  reviewCardIds: string[];
  /** A drill: only reviews of the cards of this mistake label, no new snippet. */
  focus?: string;
  /** Extra review outside the daily loop. */
  review?: boolean;
}

/** Review cards per session by length: a 15-minute session spends at most ~3 minutes on them. */
export const REVIEWS_PER_SESSION: Record<number, number> = { 5: 5, 10: 8, 15: 10, 30: 20 };

export interface PlanInput {
  units: readonly Unit[];
  /** Snippet ids already read, oldest first. */
  readSnippets: readonly string[];
  /** Today's review queue (already capped for the day), most urgent first. */
  dueCards: ReadonlyArray<{ id: string; chunkId?: string }>;
  minutes: number;
  /** A lesson the learner chose; otherwise the next one in order. */
  snippetId?: string;
}

/**
 * The next snippet: the first unread one in course order, so the learner always knows what comes
 * next. When everything is read, the one read longest ago.
 */
export function nextSnippet(input: Pick<PlanInput, 'units' | 'readSnippets'>): {
  unit: Unit;
  snippet: Snippet;
} {
  const all = input.units.flatMap((unit) => unit.snippets.map((snippet) => ({ unit, snippet })));
  if (all.length === 0) throw new Error('Không có nội dung để học');
  const read = new Set(input.readSnippets);
  const unread = all.find((entry) => !read.has(entry.snippet.id));
  if (unread) return unread;
  const oldest = input.readSnippets.find((id) => all.some((entry) => entry.snippet.id === id));
  return all.find((entry) => entry.snippet.id === oldest) ?? all[0];
}

export function planSession(input: PlanInput): SessionPlan {
  const chosen = input.snippetId
    ? input.units.flatMap((unit) => unit.snippets.map((snippet) => ({ unit, snippet }))).find((e) => e.snippet.id === input.snippetId)
    : undefined;
  const { unit, snippet } = chosen ?? nextSnippet(input);
  const perSession = REVIEWS_PER_SESSION[input.minutes] ?? REVIEWS_PER_SESSION[15];
  const reviewCardIds = input.dueCards.slice(0, perSession).map((card) => card.id);
  return {
    steps: [...(reviewCardIds.length > 0 ? (['review'] as const) : []), 'input', 'shadow', 'produce', 'wrap'],
    unitId: unit.id,
    snippetId: snippet.id,
    reviewCardIds,
  };
}
