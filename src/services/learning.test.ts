import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { finishReading, finishSession, nextStep, recordAttempt, recordReview, startSession, todaySummary } from './learning';

const day1 = new Date('2026-11-10T20:00:00');
const day2 = new Date('2026-11-11T08:00:00');

beforeEach(async () => {
  await db.delete();
  await db.open();
});

async function learnFirstSession() {
  const session = await startSession(day1);
  expect(session.plan.steps).toEqual(['input', 'shadow', 'produce', 'wrap']);
  await finishReading(session.id, session.plan.snippetId, session.plan.unitId, ['worked-on', 'pick-up', 'wrapped-up'], day1);
  await nextStep(session.id, day1);
  await nextStep(session.id, day1);
  await recordAttempt(session.id, { taskId: 't', snippetId: session.plan.snippetId, text: 'I worked on it.', usedRequired: [], missingRequired: [] }, day1);
  await nextStep(session.id, day1);
  await finishSession(session.id, day1);
  return session;
}

describe('a first day and the day after', () => {
  it('first visit: no cards, nothing due', async () => {
    expect(await todaySummary(day1)).toMatchObject({ firstTime: true, dueToday: 0, cards: 0, doneToday: false });
  });

  it('two calls at once make one session, and an unfinished one is resumed', async () => {
    const [a, b] = await Promise.all([startSession(day1), startSession(day1)]);
    expect(a.id).toBe(b.id);
    await nextStep(a.id, day1);
    const resumed = await startSession(day1);
    expect(resumed.stepIndex).toBe(1);
  });

  it('cards learnt today are not due today but are due tomorrow, with a warm-up first', async () => {
    await learnFirstSession();
    expect(await todaySummary(day1)).toMatchObject({ dueToday: 0, cards: 3, doneToday: true, dueTomorrow: 3, daysLearned: 1 });

    const second = await startSession(day2);
    expect(second.plan.steps).toEqual(['review', 'input', 'shadow', 'produce', 'wrap']);
    expect(second.plan.reviewCardIds).toHaveLength(3);
    expect(second.plan.snippetId).not.toBe('standup-first');

    await recordReview(second.id, second.plan.reviewCardIds[0], { rating: 'good', result: 'correct', ms: 3000 }, day2);
    // Recording twice (a double click) counts once.
    await recordReview(second.id, second.plan.reviewCardIds[0], { rating: 'good', result: 'correct', ms: 3000 }, day2);
    const after = await db.sessions.get(second.id);
    expect(after?.stats).toMatchObject({ reviewed: 1, remembered: 1 });
    expect((await todaySummary(day2)).dueToday).toBe(2);
  });
});

describe('mistakes become cards', async () => {
  const { saveMistakes } = await import('./learning');
  const { correctWriting } = await import('./ai/correct');
  const { findTask } = await import('./content');

  it('rules find the mistake, the chosen one becomes a card due tomorrow, the error book keeps both', async () => {
    const session = await startSession(day1);
    const task = findTask('task-standup-basic')!;
    const text = 'Yesterday I work on a API. Today I will pick up the next ticket.';
    const found = await correctWriting(task, text, day1, { ...(await import('./settings')).DEFAULT_SETTINGS });
    expect(found.source).toBe('rules');
    expect(found.correction.mistakes.map((m) => m.label)).toEqual(['past-tense', 'article']);
    const attemptId = await recordAttempt(session.id, { taskId: task.id, snippetId: 'standup-first', text, usedRequired: [], missingRequired: [] }, day1);
    await saveMistakes(session.id, { id: attemptId, taskId: task.id, text, corrected: found.correction.corrected, unitId: 'dev-standup' },
      found.correction.mistakes, [0, 1], 'rules', day1);

    expect(await db.mistakes.count()).toBe(2);
    const cards = await db.cards.where('source').equals('error').toArray();
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ wrongSentence: 'Yesterday I work on a API.', rightSentence: 'Yesterday I worked on an API.', kind: 'fix' });
    expect((await todaySummary(day1)).dueToday).toBe(0);
    expect((await todaySummary(day2)).dueToday).toBe(1);
  });

  it('fake AI is cached: the same answer twice counts one call', async () => {
    const { aiCallsToday } = await import('./ai/correct');
    const { DEFAULT_SETTINGS } = await import('./settings');
    const task = findTask('task-blocked')!;
    const settings = { ...DEFAULT_SETTINGS, aiProvider: 'fake' as const };
    const a = await correctWriting(task, 'I blocked by QA.', day1, settings);
    const b = await correctWriting(task, 'I blocked by QA.', day1, settings);
    expect(a.source).toBe('ai');
    expect(b.cached).toBe(true);
    expect(await aiCallsToday(day1)).toBe(1);
  });
});

describe('capture', async () => {
  const { saveCapture } = await import('./learning');
  const { helpWithCapture } = await import('./ai/capture');
  const { DEFAULT_SETTINGS } = await import('./settings');

  it('chosen sentences become cards due tomorrow and join the review queue', async () => {
    const id = await saveCapture('Could you double-check the retry logic?', 'email', [
      { sentence: 'Could you double-check the retry logic?', answer: 'double-check' },
    ], undefined, day1);
    expect((await db.captures.get(id))?.cardIds).toHaveLength(1);
    expect((await todaySummary(day1)).dueToday).toBe(0);
    const session = await startSession(day2);
    expect(session.plan.reviewCardIds[0]).toMatch(/^capture:/);
  });

  it('fake AI gives a chunk that is in each sentence, and a task', async () => {
    const sentences = ['We should roll this out gradually.', 'Please take a look at the logs.'];
    const outcome = await helpWithCapture(sentences, day1, { ...DEFAULT_SETTINGS, aiProvider: 'fake' });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    outcome.data.items.forEach((item, i) => expect(sentences[i].toLowerCase()).toContain(item.chunk.toLowerCase()));
    expect(outcome.data.task?.id).toMatch(/^capture-/);
  });
});
