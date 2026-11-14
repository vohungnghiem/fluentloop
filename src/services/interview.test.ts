import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { findQuestion, interview, saveAnswer } from './interview';
import { saveRealTalk, saveTalk, speakingWeek } from './talk';
import { answerSentences, interviewProblems, interviewTask } from '../core/content/interview';

const day1 = new Date('2026-11-14T09:00:00');
const day2 = new Date('2026-11-15T09:00:00');

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('interview content', () => {
  it('has ten questions and a mock interview that reaches its end', () => {
    expect(interview.questions).toHaveLength(10);
    expect(interviewProblems(interview)).toEqual([]);
    expect(interview.scenario.script.at(-1)?.id).toBe('end');
  });

  it('aims a task at the learner\'s own answer when there is one', () => {
    const q = findQuestion('about-you')!;
    expect(interviewTask(q).models).toEqual([q.model]);
    expect(interviewTask(q, 'My own answer.').models[0]).toBe('My own answer.');
  });

  it('splits an answer into sentences worth a card', () => {
    expect(answerSentences("I'm a tester. Hi. I have four years of experience!\nI like it here.")).toEqual(["I'm a tester.", 'I have four years of experience!', 'I like it here.']);
  });
});

describe('saveAnswer', () => {
  it('keeps one card per sentence, and keeps the card of a sentence that did not change', async () => {
    const q = findQuestion('strengths')!;
    expect(await saveAnswer(q, 'I am very careful. I find bugs early.', 'own', day1)).toBe(2);
    const first = await db.answers.get('strengths');
    const kept = first!.cardIds[0];
    await saveAnswer(q, 'I am very careful. I always test twice before a release.', 'ai', day2);
    const second = await db.answers.get('strengths');
    expect(second).toMatchObject({ source: 'ai', at: day1.toISOString() });
    expect(second!.cardIds[0]).toBe(kept);
    expect(second!.cardIds[1]).not.toBe(first!.cardIds[1]);
    const card = await db.cards.get(second!.cardIds[1]);
    expect(card).toMatchObject({ unitId: 'interview', sentence: 'I always test twice before a release.', answer: 'I always test twice before a release.' });
    expect(card?.sentenceVi).toContain('câu 2/2');
  });
});

describe('talks', () => {
  it('logs a real conversation: time outside the app, and cards for sentences with English', async () => {
    const cards = await saveRealTalk({ topic: 'Họp khách', minutes: 15, phrases: [{ vi: 'Tôi cần thêm thời gian', en: 'I need more time.' }, { vi: 'Chưa tra được' }] }, day1);
    expect(cards).toBe(1);
    expect(await db.studyLog.toArray()).toMatchObject([{ minutes: 15, kind: 'speak' }]);
    expect(await db.talks.toArray()).toMatchObject([{ kind: 'real', seconds: 900, phrases: [{ en: 'I need more time.' }, { vi: 'Chưa tra được' }] }]);
  });

  it('averages the speed of this week', async () => {
    await saveTalk({ kind: 'talk', topic: 'a', seconds: 60, wpm: 80 }, day1);
    await saveTalk({ kind: 'talk', topic: 'b', seconds: 60, wpm: 100 }, day2);
    expect(await speakingWeek(day2)).toMatchObject({ thisWeek: 90, count: 2 });
  });
});
