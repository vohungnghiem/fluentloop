import { z } from 'zod';
import { suggestBlank } from '../../core/capture/split';
import { taskSchema, type Task } from '../../core/content/schema';
import { currentTrack } from '../content';
import { getSettings, type Settings } from '../settings';
import { askCached, type AiOutcome } from './cached';

/** AI help for a pasted text: meanings, the chunk worth learning in each sentence, and a task. */

const system = () => `You help Vietnamese ${currentTrack.audience} learn English from their own work texts.
For each given sentence, return its Vietnamese meaning and the most useful reusable chunk in it (2-5 words, copied exactly from the sentence, e.g. "double-check", "roll this out", "take a look at"). Not names, not code, not plain nouns.
Also make ONE short writing task in Vietnamese that makes them reuse 2 of those chunks in a similar real situation, with 2 natural model answers (1-3 sentences each).
Return ONLY JSON:
{"items":[{"sentence":string,"vi":string,"chunk":string,"chunkVi":string}],
 "task":{"promptVi":string,"situation":string,"required":[{"label":string,"variants":[string]}],"models":[string,string],
  "points":[{"vi":string}],"hints":[string,string]}}
"variants" are accepted forms of the chunk (e.g. "roll out","rolled out","rolling out").
"points": the 2-3 ideas a complete answer has, in short Vietnamese. "hints": [a guiding question in Vietnamese, the first English words of an answer ending with "…"].`;

const itemSchema = z.object({ sentence: z.string(), vi: z.string(), chunk: z.string(), chunkVi: z.string() });
const resultSchema = z.object({
  items: z.array(itemSchema),
  task: taskSchema.omit({ id: true }).optional().catch(undefined),
});
export type CaptureHelp = { items: Array<z.infer<typeof itemSchema>>; task?: Task };

/** Debug "AI": the suggested blank as the chunk, no translations, a task from the first two. */
function fake(sentences: string[]) {
  const items = sentences.map((sentence) => ({ sentence, vi: '(AI giả lập: bản dịch)', chunk: suggestBlank(sentence), chunkVi: '(nghĩa của cụm)' }));
  const two = items.slice(0, 2).map((item) => item.chunk);
  return {
    items,
    task: {
      promptVi: `Viết 2 câu cho đồng nghiệp, dùng: ${two.join(', ')}.`,
      situation: 'Slack, team channel.',
      required: two.map((chunk) => ({ label: chunk, variants: [chunk] })),
      models: [sentences.slice(0, 2).join(' ')],
    },
  };
}

export async function helpWithCapture(sentences: string[], now: Date, settings: Settings = getSettings()): Promise<AiOutcome<CaptureHelp>> {
  const outcome = await askCached({
    settings,
    now,
    version: 'capture-2',
    system: system(),
    user: sentences.map((s, i) => `${i + 1}. ${s}`).join('\n'),
    schema: resultSchema,
    fake: () => fake(sentences),
  });
  if (!outcome.ok) return outcome;
  // The chunk must really be in its sentence; otherwise fall back to the rule's suggestion.
  const items = sentences.map((sentence) => {
    const item = outcome.data.items.find((i) => i.sentence.trim() === sentence.trim()) ?? outcome.data.items[sentences.indexOf(sentence)];
    const chunk = item && sentence.toLowerCase().includes(item.chunk.toLowerCase()) ? item.chunk : suggestBlank(sentence);
    return { sentence, vi: item?.vi ?? '', chunk, chunkVi: item?.chunk === chunk ? item.chunkVi : '' };
  });
  const task = outcome.data.task ? { ...outcome.data.task, id: `capture-${crypto.randomUUID()}` } : undefined;
  return { ok: true, cached: outcome.cached, data: { items, task } };
}
