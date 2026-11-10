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
}

/**
 * The next snippet: the first unread one in course order. Among the next few unread, one that
 * reuses chunks due today wins (interleaving). When everything is read, the one read longest ago.
 */
export function nextSnippet(input: Pick<PlanInput, 'units' | 'readSnippets' | 'dueCards'>): {
  unit: Unit;
  snippet: Snippet;
} {
  const all = input.units.flatMap((unit) => unit.snippets.map((snippet) => ({ unit, snippet })));
  if (all.length === 0) throw new Error('Không có nội dung để học');
  const read = new Set(input.readSnippets);
  const unread = all.filter((entry) => !read.has(entry.snippet.id));
  if (unread.length === 0) {
    const oldest = input.readSnippets.find((id) => all.some((entry) => entry.snippet.id === id));
    return all.find((entry) => entry.snippet.id === oldest) ?? all[0];
  }
  const due = new Set(input.dueCards.flatMap((card) => (card.chunkId ? [card.chunkId] : [])));
  const window = unread.slice(0, 3);
  const score = (snippet: Snippet) => snippet.chunks.filter((chunk) => due.has(chunk)).length;
  return window.reduce((best, entry) => (score(entry.snippet) > score(best.snippet) ? entry : best));
}

export function planSession(input: PlanInput): SessionPlan {
  const { unit, snippet } = nextSnippet(input);
  const perSession = REVIEWS_PER_SESSION[input.minutes] ?? REVIEWS_PER_SESSION[15];
  const reviewCardIds = input.dueCards.slice(0, perSession).map((card) => card.id);
  return {
    steps: [...(reviewCardIds.length > 0 ? (['review'] as const) : []), 'input', 'shadow', 'produce', 'wrap'],
    unitId: unit.id,
    snippetId: snippet.id,
    reviewCardIds,
  };
}
