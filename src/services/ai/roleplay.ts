import { z } from 'zod';
import type { Scenario } from '../../core/content/schema';
import { correctionSchema, ERROR_LABELS } from '../../core/errors/labels';
import { matchReply } from '../../core/roleplay/script';
import { getSettings, type Settings } from '../settings';
import { askCached, type AiOutcome } from './cached';
import { correctWithRules } from './correct';

/** One turn of a roleplay with AI: the partner answers, and the learner's line is corrected. */

export interface Line {
  who: 'partner' | 'learner';
  text: string;
}

const turnSchema = z.object({
  /** The partner's next message (English, short). */
  reply: z.string().min(1),
  /** Correction of the learner's last message. */
  correction: correctionSchema.nullable().catch(null),
  /** The learner reached the goal: the partner wraps up. */
  goalMet: z.boolean().catch(false),
  /** A Vietnamese hint for what to say next, if useful. */
  hintVi: z.string().optional().catch(undefined),
});
export type Turn = z.infer<typeof turnSchema>;

const system = (scenario: Scenario) => `${scenario.persona}
This is English practice for a Vietnamese software professional (about B1). Stay in character and keep each message under 30 words, in natural workplace English.
The learner's goal: ${scenario.goal}
After each learner message, return ONLY JSON:
{"reply": string, "correction": {"corrected": string, "natural": string, "mistakes": [{"wrong": string, "right": string, "label": string, "vi": string}], "praiseVi": string} | null, "goalMet": boolean, "hintVi": string}
- "correction": of the learner's LAST message only; null if it has no real errors. Labels: ${Object.keys(ERROR_LABELS).join(', ')}. "vi" in simple Vietnamese, max 20 words.
- "goalMet": true once the learner has done everything in the goal; then "reply" politely ends the conversation.
- "hintVi": one short Vietnamese hint about what they could say next ("" if not needed).`;

export async function roleplayTurn(scenario: Scenario, lines: readonly Line[], now: Date, settings: Settings = getSettings()): Promise<AiOutcome<Turn>> {
  const transcript = lines.map((line) => `${line.who === 'partner' ? scenario.partner : 'Learner'}: ${line.text}`).join('\n');
  return askCached({
    settings,
    now,
    version: 'roleplay-1',
    system: system(scenario),
    user: transcript,
    schema: turnSchema,
    fake: () => fakeTurn(scenario, lines),
  });
}

/** Debug AI: walk the script, correct with the rules. */
function fakeTurn(scenario: Scenario, lines: readonly Line[]): Turn {
  const learnerTurns = lines.filter((l) => l.who === 'learner').length;
  const node = scenario.script[Math.min(learnerTurns, scenario.script.length - 1)];
  const last = lines.at(-1)?.text ?? '';
  const correction = correctWithRules(last);
  return {
    reply: node.say,
    correction: correction.mistakes.length > 0 ? correction : null,
    goalMet: learnerTurns >= scenario.script.length - 1,
    hintVi: node.replies[0] ? `Gợi ý: “${node.replies[0].text}”` : '',
  };
}

export { matchReply };
