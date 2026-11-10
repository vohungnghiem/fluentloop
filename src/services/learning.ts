import { dayKey, startOfNextDay } from '../core/date';
import { planSession, type StepKind } from '../core/session/plan';
import { dueQueue, grade, isOwned, newState, type RatingName } from '../core/srs/srs';
import type { AnswerResult } from '../core/check/text';
import { courseUnits } from './content';
import type { Mistake } from '../core/errors/labels';
import type { Task } from '../core/content/schema';
import { errorCards } from '../core/errors/cards';
import { db, type AttemptRow, type CardRow, type SessionRow } from './db';

/** What the screens call. Every function takes `now` so it behaves the same in tests and in the app. */

const MINUTES = 15;
const uuid = () => crypto.randomUUID();

async function reviewedOn(now: Date) {
  return db.reviews.where('day').equals(dayKey(now)).count();
}

/** Today's review queue, already cut to what is left of the daily cap. */
export async function todayQueue(now: Date): Promise<CardRow[]> {
  return dueQueue(await db.cards.toArray(), now, await reviewedOn(now));
}

/** The session in progress, whatever day it was started on. */
export const activeSession = () => db.sessions.where('status').equals('active').first();

/** Resume the session in progress, or plan a new one. */
export function startSession(now: Date): Promise<SessionRow> {
  // One transaction, so two calls at once (React strict mode) still make a single session.
  return db.transaction('rw', db.sessions, db.reads, db.cards, db.reviews, () => planAndStart(now));
}

async function planAndStart(now: Date): Promise<SessionRow> {
  const active = await activeSession();
  if (active) return active;
  const reads = await db.reads.orderBy('lastReadAt').toArray();
  const queue = await todayQueue(now);
  const plan = planSession({
    units: courseUnits,
    readSnippets: reads.map((read) => read.snippetId),
    dueCards: queue.map((card) => ({ id: card.id, chunkId: card.chunkId })),
    minutes: MINUTES,
  });
  const session: SessionRow = {
    id: uuid(),
    day: dayKey(now),
    plan,
    stepIndex: 0,
    reviewedIds: [],
    status: 'active',
    stats: { reviewed: 0, remembered: 0, newCards: 0, written: 0, skipped: [] },
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  await db.sessions.add(session);
  // Data lives only in this browser: ask it not to evict us under storage pressure.
  void globalThis.navigator?.storage?.persist?.().catch(() => undefined);
  return session;
}

export async function nextStep(sessionId: string, now: Date, skipped?: StepKind) {
  await db.transaction('rw', db.sessions, async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) return;
    const stats = skipped ? { ...session.stats, skipped: [...session.stats.skipped, skipped] } : session.stats;
    await db.sessions.update(sessionId, {
      stepIndex: Math.min(session.stepIndex + 1, session.plan.steps.length - 1),
      stats,
      updatedAt: now.toISOString(),
    });
  });
}

export async function finishSession(sessionId: string, now: Date) {
  await db.sessions.update(sessionId, { status: 'done', finishedAt: now.toISOString(), updatedAt: now.toISOString() });
}

/** Stop the session without finishing it: progress so far stays, the plan goes. */
export async function abandonSession(sessionId: string, now: Date) {
  await finishSession(sessionId, now);
}

export async function recordReview(
  sessionId: string,
  cardId: string,
  outcome: { rating: RatingName; result: AnswerResult; ms: number },
  now: Date,
) {
  await db.transaction('rw', db.cards, db.reviews, db.sessions, async () => {
    const card = await db.cards.get(cardId);
    const session = await db.sessions.get(sessionId);
    if (!card || !session || session.reviewedIds.includes(cardId)) return;
    await db.cards.update(cardId, { fsrs: grade(card.fsrs, outcome.rating, now), updatedAt: now.toISOString() });
    const last = card.fsrs.lastReview ?? card.createdAt;
    const gapDays = Math.max(0, (now.getTime() - Date.parse(last)) / 86_400_000);
    await db.reviews.add({ id: uuid(), cardId, at: now.toISOString(), day: dayKey(now), gapDays, ...outcome });
    await db.sessions.update(sessionId, {
      reviewedIds: [...session.reviewedIds, cardId],
      stats: {
        ...session.stats,
        reviewed: session.stats.reviewed + 1,
        remembered: session.stats.remembered + (outcome.rating === 'again' ? 0 : 1),
      },
      updatedAt: now.toISOString(),
    });
  });
}

/** The snippet was read; the chosen chunks become cards, first due tomorrow. */
export async function finishReading(sessionId: string, snippetId: string, unitId: string, chunkIds: string[], now: Date) {
  await db.transaction('rw', db.cards, db.reads, db.sessions, async () => {
    const stamp = now.toISOString();
    let added = 0;
    for (const chunkId of chunkIds) {
      const id = `chunk:${chunkId}`;
      if (await db.cards.get(id)) continue;
      await db.cards.add({ id, source: 'content', chunkId, unitId, kind: 'cloze', fsrs: newState(now), createdAt: stamp, updatedAt: stamp });
      added++;
    }
    await db.reads.put({ snippetId, lastReadAt: stamp, updatedAt: stamp });
    const session = await db.sessions.get(sessionId);
    if (session) {
      await db.sessions.update(sessionId, { stats: { ...session.stats, newCards: session.stats.newCards + added }, updatedAt: stamp });
    }
  });
}

export async function recordAttempt(
  sessionId: string | undefined,
  attempt: Omit<AttemptRow, 'id' | 'at' | 'updatedAt' | 'source'> & { source?: AttemptRow['source'] },
  now: Date,
): Promise<string> {
  const id = uuid();
  await db.transaction('rw', db.attempts, db.sessions, async () => {
    const stamp = now.toISOString();
    await db.attempts.add({ source: 'rules', ...attempt, id, at: stamp, updatedAt: stamp });
    const session = sessionId ? await db.sessions.get(sessionId) : undefined;
    if (session) {
      await db.sessions.update(session.id, { stats: { ...session.stats, written: session.stats.written + 1 }, updatedAt: stamp });
    }
  });
  return id;
}

/**
 * Keep the mistakes of an answer for the error book; the chosen ones also become review cards
 * (first due tomorrow): one per wrong sentence, the learner's own words fixed.
 */
export async function saveMistakes(
  sessionId: string | undefined,
  attempt: { id: string; taskId: string; text: string; corrected: string; unitId: string },
  mistakes: readonly Mistake[],
  chosen: readonly number[],
  source: 'ai' | 'rules',
  now: Date,
) {
  const stamp = now.toISOString();
  const ids = mistakes.map(() => uuid());
  const drafts = errorCards(attempt.text, attempt.corrected, mistakes, chosen);
  const cardOf = new Map<number, string>();
  await db.transaction('rw', db.mistakes, db.cards, db.sessions, async () => {
    for (const draft of drafts) {
      const cardId = `error:${ids[draft.mistakes[0]]}`;
      draft.mistakes.forEach((index) => cardOf.set(index, cardId));
      await db.cards.add({
        id: cardId,
        source: 'error',
        unitId: attempt.unitId,
        kind: 'fix',
        wrongSentence: draft.wrongSentence,
        rightSentence: draft.rightSentence,
        mistakeId: ids[draft.mistakes[0]],
        fsrs: newState(now),
        createdAt: stamp,
        updatedAt: stamp,
      });
    }
    await db.mistakes.bulkAdd(
      mistakes.map((mistake, index) => ({
        id: ids[index],
        attemptId: attempt.id,
        taskId: attempt.taskId,
        at: stamp,
        day: dayKey(now),
        wrong: mistake.wrong,
        right: mistake.right,
        label: mistake.label,
        vi: mistake.vi,
        source,
        cardId: cardOf.get(index),
        updatedAt: stamp,
      })),
    );
    const session = sessionId ? await db.sessions.get(sessionId) : undefined;
    if (session && drafts.length > 0) {
      await db.sessions.update(session.id, { stats: { ...session.stats, errorCards: (session.stats.errorCards ?? 0) + drafts.length }, updatedAt: stamp });
    }
  });
}

export interface TodaySummary {
  dueToday: number;
  cards: number;
  owned: number;
  daysLearned: number;
  doneToday: boolean;
  active?: SessionRow;
  firstTime: boolean;
  /** Cards due tomorrow (within tomorrow's cap), for "see you tomorrow". */
  dueTomorrow: number;
  /** When the first card was made: a backup reminder only makes sense after a week of data. */
  firstCardAt?: string;
}

export async function todaySummary(now: Date): Promise<TodaySummary> {
  const [cards, sessions, queue, active] = await Promise.all([
    db.cards.toArray(),
    db.sessions.toArray(),
    todayQueue(now),
    activeSession(),
  ]);
  const doneDays = new Set(sessions.filter((s) => s.status === 'done' && s.stats.reviewed + s.stats.newCards + s.stats.written > 0).map((s) => s.day));
  const tomorrow = startOfNextDay(now);
  return {
    dueToday: queue.length,
    cards: cards.length,
    owned: cards.filter((card) => isOwned(card.fsrs)).length,
    daysLearned: doneDays.size,
    doneToday: doneDays.has(dayKey(now)),
    active,
    firstTime: sessions.length === 0,
    dueTomorrow: dueQueue(cards, tomorrow, 0).length,
    firstCardAt: cards.reduce<string | undefined>((min, c) => (!min || c.createdAt < min ? c.createdAt : min), undefined),
  };
}

/** The shadowing step is over: keep how many sentences were said and the average best share heard. */
export async function recordShadowing(sessionId: string, bestRatios: number[], now: Date) {
  const session = await db.sessions.get(sessionId);
  if (!session) return;
  const heardRatio = bestRatios.length === 0 ? undefined : bestRatios.reduce((a, b) => a + b, 0) / bestRatios.length;
  await db.sessions.update(sessionId, { stats: { ...session.stats, shadowed: bestRatios.length, heardRatio }, updatedAt: now.toISOString() });
}

export interface CapturePick {
  sentence: string;
  /** The part to blank out; must be in the sentence. */
  answer: string;
  sentenceVi?: string;
  meaningVi?: string;
}

/** A pasted text: the chosen sentences become fill-in cards (first due tomorrow), the text is kept. */
export async function saveCapture(text: string, source: string | undefined, picks: readonly CapturePick[], task: Task | undefined, now: Date): Promise<string> {
  const id = uuid();
  const stamp = now.toISOString();
  const cardIds = picks.map(() => `capture:${uuid()}`);
  await db.transaction('rw', db.cards, db.captures, async () => {
    await db.cards.bulkAdd(
      picks.map((pick, i) => ({
        id: cardIds[i],
        source: 'capture' as const,
        unitId: 'capture',
        kind: 'cloze' as const,
        sentence: pick.sentence,
        answer: pick.answer,
        sentenceVi: pick.sentenceVi || undefined,
        meaningVi: pick.meaningVi || undefined,
        captureId: id,
        fsrs: newState(now),
        createdAt: stamp,
        updatedAt: stamp,
      })),
    );
    await db.captures.add({ id, at: stamp, text, source, cardIds, task, updatedAt: stamp });
  });
  return id;
}
