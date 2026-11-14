import { z } from 'zod';
import type { InterviewQuestion } from '../../core/content/interview';
import { getSettings, type Settings } from '../settings';
import { learnerLevel } from '../plan';
import { askCached } from './cached';
import { levelBrief } from './level';

/**
 * A first draft of the learner's OWN answer to an interview question, from their CV: their facts,
 * the shape of a good answer, words they can say. Nothing is invented: what the CV does not say is
 * left as [ … ] for the learner to fill in.
 */

const schema = z.object({ answer: z.string().min(1), noteVi: z.string().optional().catch(undefined) });

const system = (learner: Awaited<ReturnType<typeof learnerLevel>>) => `You help a Vietnamese job seeker prepare their OWN answers to job interview questions in English.
${levelBrief(learner)}
Write the answer they could say, in the first person, from their background below. Rules:
- Use only facts from the background. Where a fact is needed but missing, write a short placeholder in square brackets, e.g. [name of the project].
- 4 to 6 short spoken sentences, following the shape given. Simple, common words; natural, not memorised-sounding.
- Return ONLY JSON {"answer": string, "noteVi": string}; "noteVi": one tip in Vietnamese (at most 20 words) on what to add or say with care, or "".`;

export async function draftAnswer(question: InterviewQuestion, profile: string, now: Date, settings: Settings = getSettings()) {
  return askCached({
    settings,
    now,
    version: 'interview-1',
    system: system(await learnerLevel()),
    user: `Question: ${question.en}\nShape of a good answer:\n${question.shape.map((s, i) => `${i + 1}. ${s}`).join('\n')}\nExample (another person, for the style only): ${question.model}\nBackground (CV / notes):\n${profile.slice(0, 4000)}`,
    schema,
    fake: () => ({ answer: question.model, noteVi: '(AI giả lập) Thêm tên dự án thật của bạn.' }),
  });
}
