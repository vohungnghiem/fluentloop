import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card,
  type Grade,
  type State,
} from 'ts-fsrs';
import { z } from 'zod';
import type { AnswerResult } from '../check/text';
import { endOfDay, startOfNextDay } from '../date';

/**
 * Spaced repetition on top of FSRS, in whole days. Everything takes `now` and nothing is random,
 * so the same data at the same time always gives the same queue.
 */

/** At most this many reviews a day; the rest moves to tomorrow. Never a pile of debt. */
export const DAILY_REVIEW_CAP = 20;

const isDate = (value: string) => !Number.isNaN(Date.parse(value));

export const fsrsStateSchema = z.object({
  due: z.string().refine(isDate),
  stability: z.number().finite(),
  difficulty: z.number().finite(),
  scheduledDays: z.number().finite(),
  learningSteps: z.number().int().default(0),
  reps: z.number().int(),
  lapses: z.number().int(),
  state: z.number().int().min(0).max(3),
  lastReview: z.string().refine(isDate).optional(),
});
export type FsrsState = z.infer<typeof fsrsStateSchema>;

export type RatingName = 'again' | 'hard' | 'good' | 'easy';

const GRADES: Record<RatingName, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

// Whole days: a learner opens the app once a day, learning steps in minutes make no sense here.
const scheduler = fsrs(generatorParameters({ enable_short_term: false, enable_fuzz: false }));

function toCard(state: FsrsState): Card {
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state as State,
    last_review: state.lastReview ? new Date(state.lastReview) : undefined,
  };
}

function fromCard(card: Card): FsrsState {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review?.toISOString(),
  };
}

/**
 * A chunk just met in a text. Not graded yet (seeing is not remembering): the first real recall
 * is tomorrow.
 */
export function newState(now: Date): FsrsState {
  return { ...fromCard(createEmptyCard(now)), due: startOfNextDay(now).toISOString() };
}

export function grade(state: FsrsState, rating: RatingName, now: Date): FsrsState {
  return fromCard(scheduler.next(toCard(state), now, GRADES[rating]).card);
}

/** Due at any time today counts as due: a review at 8am should not hide the 9am cards. */
export const isDue = (state: FsrsState, now: Date) => Date.parse(state.due) <= endOfDay(now).getTime();

/** Probability the card is still remembered, 0 to 1 (0 for a card never recalled). */
export function retrievability(state: FsrsState, now: Date): number {
  return state.reps === 0 ? 0 : scheduler.retrievability(toCard(state), now);
}

/** Recalled at least once and stable for three weeks: the sentence is "owned". */
export const isOwned = (state: FsrsState) => state.reps > 0 && state.stability >= 21;

/**
 * Today's review queue: due cards, the most overdue first, cut so that today's reviews never
 * pass the cap.
 */
export function dueQueue<T extends { id: string; fsrs: FsrsState }>(
  cards: readonly T[],
  now: Date,
  reviewedToday: number,
  cap = DAILY_REVIEW_CAP,
): T[] {
  return cards
    .filter((card) => isDue(card.fsrs, now))
    .sort((a, b) => Date.parse(a.fsrs.due) - Date.parse(b.fsrs.due) || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, cap - reviewedToday));
}

/** How hard the recall was, from what the learner did: the way they got there is what counts. */
export function ratingFor(attempt: { result: AnswerResult; hintShown: boolean; gaveUp: boolean; tries: number }): RatingName {
  if (attempt.gaveUp || attempt.result === 'wrong') return 'again';
  if (attempt.result === 'close' || attempt.hintShown || attempt.tries > 1) return 'hard';
  return 'good';
}
