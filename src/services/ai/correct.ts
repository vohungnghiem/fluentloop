import { correctionSchema, ERROR_LABELS, type Correction } from '../../core/errors/labels';
import { applyMistakes, ruleMistakes } from '../../core/errors/rules';
import type { Task } from '../../core/content/schema';
import { pointsByRules } from '../../core/check/feedback';
import { aiCallsToday, askCached } from './cached';
import { currentTrack } from '../content';
import { getSettings, aiReady, type Settings } from '../settings';
import { AiError, askJson, type AiErrorKind } from './providers';
import { learnerLevel } from '../plan';
import { levelBrief } from './level';

/**
 * Correcting a written answer. AI when it is set up and has calls left today; otherwise (or when
 * it fails) the rules. Results are cached: the same answer is never sent twice.
 */

const PROMPT_VERSION = 3;

const system = (level: Awaited<ReturnType<typeof learnerLevel>>) => `You are an English writing coach for Vietnamese ${currentTrack.audience}. The learner is LEARNING:
never wave an answer through. Judge it against the task, fix it, and teach one step further.
${levelBrief(level)}
Return ONLY JSON:
{"corrected": string, "mistakes": [{"wrong": string, "right": string, "label": string, "vi": string}],
 "coverage": [{"ok": boolean, "noteVi": string}], "upgrades": [{"en": string, "vi": string}], "praiseVi": string}
Rules:
- "coverage": one item per task point, in the same order. "ok" only if the idea is clearly there.
  If not, "noteVi" says in Vietnamese what to add (at most 15 words). Unfinished text = points missing.
- "corrected": the learner's text with only real errors fixed (grammar, spelling, capitals, punctuation); keep their words.
- "mistakes": each real error; "wrong" and "right" are short exact pieces (2-6 words) from the text and from "corrected".
- "label": one of ${Object.keys(ERROR_LABELS).join(', ')}.
- "vi": why, in simple Vietnamese, at most 20 words. No grammar jargon.
- "upgrades": ${level.support ? '1 way' : '1-2 ways'} a friendly native colleague would say the learner's own idea better (more natural, more varied,
  using the task's chunks). Give them EVEN IF there are no mistakes. "vi": what is better about it, at most 15 words.
- "praiseVi": one specific thing done well, in Vietnamese, at most 15 words; "" if the answer is incomplete or weak.
- If there are no errors, "mistakes" is [] and "corrected" equals the text.`;

const taskBrief = (task: Task) =>
  [
    `Task: ${task.promptVi}${task.situation ? ` — ${task.situation}` : ''}`,
    task.points.length ? `Task points:\n${task.points.map((p, i) => `${i + 1}. ${p.vi}`).join('\n')}` : 'Task points: (none)',
    task.required.length ? `Chunks to use: ${task.required.map((r) => r.label).join(', ')}` : '',
    `Example answer: ${task.models[0]}`,
  ].filter(Boolean).join('\n');

export interface CorrectionResult {
  correction: Correction;
  source: 'ai' | 'rules';
  /** Why AI was not used, when it was meant to be. */
  aiError?: AiErrorKind | 'limit' | 'too-short' | 'skipped';
  cached?: boolean;
}


export function correctWithRules(text: string): Correction {
  const mistakes = ruleMistakes(text);
  return { corrected: applyMistakes(text, mistakes), mistakes };
}

/** Debug: a believable AI answer without a network (rules, the points by rules, the model as the upgrade). */
function fakeAi(task: Task, text: string): Correction {
  const rules = correctWithRules(text);
  return {
    ...rules,
    coverage: pointsByRules(task, text).map((p) => ({ ok: p.status !== 'missing', noteVi: p.status === 'missing' ? `Thêm ý: ${p.vi.toLowerCase()}.` : undefined })),
    upgrades: [{ en: task.models[0], vi: '(AI giả lập) Gọn và tự nhiên hơn.' }],
    praiseVi: 'Câu rõ ý, dùng cụm đúng chỗ.',
  };
}

export { aiCallsToday };

export async function correctWriting(task: Task, text: string, now: Date, settings: Settings = getSettings()): Promise<CorrectionResult> {
  if (!aiReady(settings)) return { correction: correctWithRules(text), source: 'rules' };
  // A couple of words is not worth a call (and not something to correct yet).
  if (text.trim().split(/\s+/).length < 4) return { correction: correctWithRules(text), source: 'rules', aiError: 'too-short' };
  const outcome = await askCached({
    settings,
    now,
    version: `correct-${PROMPT_VERSION}`,
    system: system(await learnerLevel()),
    user: `${taskBrief(task)}\nLearner's text:\n${text.trim()}`,
    schema: correctionSchema,
    fake: () => fakeAi(task, text),
  });
  if (!outcome.ok) {
    return { correction: correctWithRules(text), source: 'rules', aiError: outcome.kind === 'off' ? undefined : outcome.kind };
  }
  const correction = outcome.data;
  return { correction, source: 'ai', cached: outcome.cached };
}

/** A tiny call to check the key works (settings page). */
export async function testConnection(settings: Settings): Promise<{ ok: true } | { ok: false; kind: AiErrorKind }> {
  if (settings.aiProvider === 'fake') return { ok: true };
  try {
    await askJson(settings, 'Return only JSON.', 'Return {"ok": true}');
    return { ok: true };
  } catch (error) {
    return { ok: false, kind: error instanceof AiError ? error.kind : 'server' };
  }
}
