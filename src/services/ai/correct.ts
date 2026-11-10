import { correctionSchema, ERROR_LABELS, type Correction } from '../../core/errors/labels';
import { applyMistakes, ruleMistakes } from '../../core/errors/rules';
import type { Task } from '../../core/content/schema';
import { aiCallsToday, askCached } from './cached';
import { currentTrack } from '../content';
import { getSettings, aiReady, type Settings } from '../settings';
import { AiError, askJson, type AiErrorKind } from './providers';

/**
 * Correcting a written answer. AI when it is set up and has calls left today; otherwise (or when
 * it fails) the rules. Results are cached: the same answer is never sent twice.
 */

const PROMPT_VERSION = 1;

const system = () => `You are a kind English writing coach for Vietnamese ${currentTrack.audience}.
Correct the learner's short workplace text. Return ONLY JSON:
{"corrected": string, "natural": string, "mistakes": [{"wrong": string, "right": string, "label": string, "vi": string}], "praiseVi": string}
Rules:
- "corrected": the learner's text with only real errors fixed; keep their words and meaning.
- "natural": how a friendly native colleague would say it; "" if "corrected" is already natural.
- "mistakes": each real error; "wrong" and "right" are short exact pieces (2-6 words) from the text and from "corrected".
- "label": one of ${Object.keys(ERROR_LABELS).join(', ')}.
- "vi": why, in simple Vietnamese, at most 20 words. No English grammar jargon.
- Do not flag style choices as mistakes; use label "naturalness" only for clearly unnatural phrasing.
- "praiseVi": one specific compliment in Vietnamese (what they did well), at most 15 words.
- If there are no errors, "mistakes" is [] and "corrected" equals the text.`;

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

/** Debug: a believable AI answer without a network (rules + the task's model as the natural version). */
function fakeAi(task: Task, text: string): Correction {
  const rules = correctWithRules(text);
  return {
    ...rules,
    natural: task.models[0],
    praiseVi: rules.mistakes.length === 0 ? 'Câu rõ ý, dùng cụm đúng chỗ.' : 'Ý rõ ràng, chỉ cần sửa vài chỗ nhỏ.',
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
    system: system(),
    user: `Task (for context): ${task.promptVi}${task.situation ? ` — ${task.situation}` : ''}\nLearner's text:\n${text.trim()}`,
    schema: correctionSchema,
    fake: () => fakeAi(task, text),
  });
  if (!outcome.ok) {
    return { correction: correctWithRules(text), source: 'rules', aiError: outcome.kind === 'off' ? undefined : outcome.kind };
  }
  const correction = { ...outcome.data, natural: outcome.data.natural?.trim() || undefined };
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
