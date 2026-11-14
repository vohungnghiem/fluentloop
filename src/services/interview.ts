import { answerSentences, interviewSchema, type InterviewQuestion } from '../core/content/interview';
import { newState } from '../core/srs/srs';
import interviewData from '../../content/interview.json';
import { db, type CardRow } from './db';
import { savePlan } from './plan';

/** The interview questions, the learner's CV and their own answers. Every function takes `now`. */

export const interview = interviewSchema.parse(interviewData);
export const findQuestion = (id: string) => interview.questions.find((q) => q.id === id);

export const saveProfile = (profile: string, now: Date) => savePlan({ profile: profile.trim() || undefined }, now);

/**
 * Keep the learner's answer. Each sentence is a card (the question and its place are shown, the
 * sentence is written): a sentence kept from the last version keeps its card and its progress.
 */
export async function saveAnswer(question: InterviewQuestion, text: string, source: 'ai' | 'own', now: Date) {
  const stamp = now.toISOString();
  const parts = answerSentences(text);
  await db.transaction('rw', db.answers, db.cards, async () => {
    const old = await db.answers.get(question.id);
    const oldCards = (await db.cards.bulkGet(old?.cardIds ?? [])).filter((c): c is CardRow => !!c);
    const cardIds: string[] = [];
    const fresh: CardRow[] = [];
    parts.forEach((sentence, i) => {
      const hint = `${question.vi} · câu ${i + 1}/${parts.length}`;
      const kept = oldCards.find((c) => c.sentence === sentence);
      if (kept) {
        cardIds.push(kept.id);
        if (kept.sentenceVi !== hint) fresh.push({ ...kept, sentenceVi: hint, updatedAt: stamp });
        return;
      }
      const id = `capture:${crypto.randomUUID()}`;
      cardIds.push(id);
      fresh.push({ id, source: 'capture', unitId: 'interview', kind: 'cloze', sentence, answer: sentence, sentenceVi: hint, fsrs: newState(now), createdAt: stamp, updatedAt: stamp });
    });
    if (fresh.length) await db.cards.bulkPut(fresh);
    await db.answers.put({ questionId: question.id, text: text.trim(), source, cardIds, at: old?.at ?? stamp, updatedAt: stamp });
  });
  return parts.length;
}
