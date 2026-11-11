import { z } from 'zod';
import type { Task } from '../../core/content/schema';
import { pointsByRules } from '../../core/check/feedback';
import { currentTrack } from '../content';
import { getSettings, type Settings } from '../settings';
import { askCached } from './cached';

/**
 * Help when stuck, three levels: 1 a question that points at the next idea, 2 the start of a
 * sentence, 3 a whole model answer. The learner still writes it. AI looks at what is written so far;
 * without AI (or when it fails) the task's own hints are used.
 */

export type HintLevel = 1 | 2 | 3;

export interface Hint {
  level: HintLevel;
  text: string;
  /** English (a sentence start or a model) or Vietnamese (a question). */
  lang: 'en' | 'vi';
  source: 'ai' | 'task';
}

const PROMPT_VERSION = 1;
const hintSchema = z.object({ hint: z.string().min(1) });

/** The task's own hint: written in the content, or made from its points and model. */
export function taskHint(task: Task, text: string, level: HintLevel): Hint {
  if (level === 3) return { level, text: task.models[0], lang: 'en', source: 'task' };
  if (level === 2) {
    const start = task.hints[1] ?? `${task.models[0].split(/\s+/).slice(0, 4).join(' ')} …`;
    return { level, text: start, lang: 'en', source: 'task' };
  }
  // A question about the first idea still missing beats the general one.
  const missing = pointsByRules(task, text).find((p) => p.status === 'missing');
  const general = task.hints[0] ?? `Bài cần có: ${task.points.map((p) => p.vi.toLowerCase()).join('; ')}.`;
  const question = text.trim() && missing ? `Bạn chưa nói: ${missing.vi.toLowerCase()}. ${general}` : general;
  return { level, text: question, lang: 'vi', source: 'task' };
}

const system = (level: 1 | 2) => `You help a Vietnamese ${currentTrack.audience} learner who is stuck writing a short workplace text in English.
Look at what they wrote so far and the task points. Find the NEXT idea they still need.
${level === 1
  ? 'Return ONLY JSON {"hint": string}: one short guiding question in Vietnamese (at most 20 words) about that idea. No English answer.'
  : 'Return ONLY JSON {"hint": string}: the first 3-6 English words of the next sentence they could write, ending with "…". Not a full sentence.'}`;

export async function hintFor(task: Task, text: string, level: HintLevel, now: Date, settings: Settings = getSettings()): Promise<Hint> {
  const fallback = taskHint(task, text, level);
  // Level 3 is a model; nothing written yet means nothing for AI to look at.
  if (level === 3 || text.trim().split(/\s+/).length < 3) return fallback;
  const outcome = await askCached({
    settings,
    now,
    version: `hint-${PROMPT_VERSION}`,
    system: system(level),
    user: `Task: ${task.promptVi}\nTask points:\n${task.points.map((p, i) => `${i + 1}. ${p.vi}`).join('\n')}\nExample: ${task.models[0]}\nWritten so far:\n${text.trim()}`,
    schema: hintSchema,
    fake: () => ({ hint: fallback.text }),
  });
  return outcome.ok ? { ...fallback, text: outcome.data.hint.trim(), source: 'ai' } : fallback;
}
