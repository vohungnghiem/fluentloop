import { dayKey } from '../core/date';
import { dueQueue } from '../core/srs/srs';
import { checkTask } from '../core/check/task';
import { courseUnits, findTask } from './content';
import { db } from './db';
import { now } from './clock';
import {
  abandonSession,
  activeSession,
  finishReading,
  finishSession,
  nextStep,
  recordAttempt,
  recordReview,
  startSession,
} from './learning';

/**
 * Shortcuts for looking at any state without learning from the start. They go through the same
 * functions the screens use, so what you see here is what a learner would get.
 */

const DAY_MS = 86_400_000;

export async function wipeAll() {
  await db.delete();
  await db.open();
}

/** Every card due right now (as if the learner came back after a long time). */
export async function makeAllDue() {
  const past = new Date(now().getTime() - 60_000).toISOString();
  await db.cards.toCollection().modify((card) => {
    card.fsrs.due = past;
  });
}

export async function jumpToStep(stepIndex: number) {
  const session = await activeSession();
  if (session) await db.sessions.update(session.id, { stepIndex, updatedAt: now().toISOString() });
}

/** Drop the session in progress and start a new one on the chosen snippet. */
export async function startWithSnippet(snippetId: string) {
  const at = now();
  const active = await activeSession();
  if (active) await abandonSession(active.id, at);
  const unit = courseUnits.find((u) => u.snippets.some((s) => s.id === snippetId));
  const session = await startSession(at);
  if (unit) await db.sessions.update(session.id, { plan: { ...session.plan, snippetId, unitId: unit.id } });
}

/**
 * Wipe, then live `days` days of learning ending yesterday: each day one session with a warm-up
 * (mostly remembered), one snippet read, one answer written. Today is left untouched.
 */
export async function seedHistory(days: number) {
  await wipeAll();
  const today = now();
  for (let back = days; back >= 1; back--) {
    const at = new Date(today.getTime() - back * DAY_MS);
    at.setHours(9, 0, 0, 0);
    const session = await startSession(at);
    for (const [i, cardId] of session.plan.reviewCardIds.entries()) {
      const forgot = i % 4 === 3;
      await recordReview(session.id, cardId, { rating: forgot ? 'again' : 'good', result: forgot ? 'wrong' : 'correct', ms: 4000 }, at);
    }
    const unit = courseUnits.find((u) => u.id === session.plan.unitId)!;
    const snippet = unit.snippets.find((s) => s.id === session.plan.snippetId)!;
    await finishReading(session.id, snippet.id, unit.id, snippet.chunks, at);
    const task = findTask(snippet.task)!;
    const check = checkTask(task, task.models[0]);
    await recordAttempt(session.id, {
      taskId: task.id,
      snippetId: snippet.id,
      text: task.models[0],
      usedRequired: check.required.map((r) => r.label),
      missingRequired: [],
      selfCheck: 'same',
    }, at);
    await finishSession(session.id, at);
  }
}

/** Walk the active session to its last step (the wrap-up), marking nothing as learnt. */
export async function skipToWrap() {
  const session = await activeSession();
  if (!session) return;
  for (let i = session.stepIndex; i < session.plan.steps.length - 1; i++) await nextStep(session.id, now());
}

export async function snapshot() {
  const [cards, sessions, reviews, reads, attempts] = await Promise.all([
    db.cards.toArray(),
    db.sessions.orderBy('day').reverse().toArray(),
    db.reviews.toArray(),
    db.reads.toArray(),
    db.attempts.toArray(),
  ]);
  const at = now();
  const reviewedToday = reviews.filter((r) => r.day === dayKey(at)).length;
  return { cards, sessions, reviews, reads, attempts, queue: dueQueue(cards, at, reviewedToday) };
}
