import { z } from 'zod';
import { getSettings, type Settings } from '../settings';
import { learnerLevel } from '../plan';
import { askCached } from './cached';
import { levelBrief } from './level';

/** "How do I say this?": a sentence the learner wanted in a real conversation, in simple spoken English. */

const schema = z.object({ en: z.string().min(1), noteVi: z.string().optional().catch(undefined) });

const system = (learner: Awaited<ReturnType<typeof learnerLevel>>) => `A Vietnamese learner of English wanted to say something in a conversation and could not.
${levelBrief(learner)}
Return ONLY JSON {"en": string, "noteVi": string}:
- "en": ONE sentence a friendly native speaker would really say, in simple spoken English.
- "noteVi": one short tip in Vietnamese (at most 15 words) about a word or pattern in it, or "".`;

export async function englishFor(sentenceVi: string, now: Date, settings: Settings = getSettings()) {
  const outcome = await askCached({
    settings,
    now,
    version: 'phrase-1',
    system: system(await learnerLevel()),
    user: sentenceVi.trim(),
    schema,
    fake: () => ({ en: `(AI giả lập) ${sentenceVi.trim()}`, noteVi: '' }),
  });
  return outcome;
}
