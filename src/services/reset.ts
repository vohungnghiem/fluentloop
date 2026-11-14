import { db } from './db';
import { rememberReset, SYNC_TABLES, syncNow } from './sync/sync';

/**
 * Deleting everything learnt, to start again. What stays: the AI key and settings (localStorage),
 * the sync connection. The shared copy learns of the reset on the next sync, and every other
 * device then drops what it had from before.
 */

export interface LearningCounts {
  cards: number;
  sessions: number;
  attempts: number;
  recordings: number;
  minutes: number;
}

/** What would be deleted, in the learner's terms. */
export async function learningCounts(): Promise<LearningCounts> {
  const [cards, sessions, attempts, baselines, captures, studyTime, studyLog] = await Promise.all([
    db.cards.count(),
    db.sessions.count(),
    db.attempts.count(),
    db.baselines.toArray(),
    db.captures.count(),
    db.studyTime.toArray(),
    db.studyLog.toArray(),
  ]);
  const minutes = Math.round(studyTime.reduce((a, r) => a + r.seconds, 0) / 60) + studyLog.filter((l) => !l.deleted).reduce((a, l) => a + l.minutes, 0);
  return { cards, sessions, attempts: attempts + captures, recordings: baselines.filter((b) => b.kind === 'audio').length, minutes };
}

export const hasLearningData = (c: LearningCounts) => c.cards + c.sessions + c.attempts + c.recordings + c.minutes > 0;

export async function resetLearningData(now: Date) {
  const tables = [...SYNC_TABLES.map((name) => db.table(name)), db.aiCache, db.meta];
  await db.transaction('rw', tables, async () => {
    for (const name of SYNC_TABLES) await db.table(name).clear();
    await db.aiCache.clear();
    await rememberReset(now.toISOString());
  });
  await syncNow();
}
