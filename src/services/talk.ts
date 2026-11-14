import { dayKey } from '../core/date';
import { newState } from '../core/srs/srs';
import { weekSpeed } from '../core/speech/fluency';
import { db, type CardRow, type TalkRow } from './db';
import { logOutside } from './plan';

/** Times the learner spoke (talks, voice conversations, real conversations). Every function takes `now`. */

type NewTalk = Omit<TalkRow, 'id' | 'at' | 'day' | 'updatedAt'>;

export async function saveTalk(talk: NewTalk, now: Date): Promise<string> {
  const id = crypto.randomUUID();
  const stamp = now.toISOString();
  await db.talks.add({ ...talk, id, at: stamp, day: dayKey(now), updatedAt: stamp });
  return id;
}

export async function updateTalk(id: string, patch: Partial<NewTalk>, now: Date) {
  await db.talks.update(id, { ...patch, updatedAt: now.toISOString() });
}

export const talksNewestFirst = () => db.talks.orderBy('at').reverse().toArray();

/** The talk before this one on the same kind of thing, to compare with. */
export async function previousTalk(talk: TalkRow): Promise<TalkRow | undefined> {
  const all = await db.talks.where('kind').equals(talk.kind).toArray();
  return all.filter((t) => t.at < talk.at && t.wpm).sort((a, b) => b.at.localeCompare(a.at))[0];
}

/** Speaking speed this week against last week, for Progress. */
export async function speakingWeek(now: Date) {
  return weekSpeed(await db.talks.toArray(), dayKey(now));
}

/**
 * A conversation with real people, logged after it: the time counts as speaking outside the app,
 * and each sentence the learner wanted to say (with its English) becomes a card: the Vietnamese is
 * shown, the English is written.
 */
export async function saveRealTalk(input: { topic: string; partner?: string; minutes: number; hardVi?: string; phrases: Array<{ vi: string; en?: string }> }, now: Date) {
  const stamp = now.toISOString();
  const phrases = input.phrases.map((p) => ({ vi: p.vi.trim(), en: p.en?.trim() || undefined })).filter((p) => p.vi || p.en);
  const cards: CardRow[] = phrases.flatMap((p) =>
    p.en
      ? [{ id: `capture:${crypto.randomUUID()}`, source: 'capture' as const, unitId: 'talk', kind: 'cloze' as const, sentence: p.en, answer: p.en, sentenceVi: p.vi || undefined, fsrs: newState(now), createdAt: stamp, updatedAt: stamp }]
      : [],
  );
  await db.transaction('rw', db.talks, db.cards, db.studyLog, async () => {
    await saveTalk({ kind: 'real', topic: input.topic.trim(), partner: input.partner, seconds: input.minutes * 60, hardVi: input.hardVi?.trim() || undefined, phrases }, now);
    if (cards.length) await db.cards.bulkAdd(cards);
    if (input.minutes > 0) await logOutside(input.minutes, 'speak', now);
  });
  return cards.length;
}
