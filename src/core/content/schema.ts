import { z } from 'zod';

/**
 * Content is data: a track (an industry) holds units (topics), and a unit holds the snippets,
 * chunks and tasks a session is made of. Adding a track means adding files, never code.
 */

export const cefrSchema = z.enum(['A2', 'B1', 'B2', 'C1']);
export type Cefr = z.infer<typeof cefrSchema>;

const id = z.string().regex(/^[a-z0-9-]+$/, 'id chỉ gồm a-z, 0-9 và dấu -');

export const chunkSchema = z.object({
  id,
  /** The chunk as it is learnt: "blocked by". */
  en: z.string().min(1),
  vi: z.string().min(1),
  /** Other ways the chunk shows up in text ("was blocked by", "Blocked by"). Case does not matter. */
  forms: z.array(z.string().min(1)).default([]),
  /** A sentence that uses the chunk, for the fill-in card. */
  example: z.string().min(1),
  exampleVi: z.string().min(1),
  /** The part of `example` that is blanked out on the card. */
  answer: z.string().min(1),
});
export type Chunk = z.infer<typeof chunkSchema>;

export const requiredChunkSchema = z.object({
  /** What the learner is told to use. */
  label: z.string().min(1),
  /** Any of these counts (lowercase match on normalized text). */
  variants: z.array(z.string().min(1)).min(1),
});
export type RequiredChunk = z.infer<typeof requiredChunkSchema>;

export const taskSchema = z.object({
  id,
  promptVi: z.string().min(1),
  /** Where the learner is: one line of context in English, optional. */
  situation: z.string().optional(),
  required: z.array(requiredChunkSchema).default([]),
  /** Natural answers to compare with. The first is shown first. */
  models: z.array(z.string().min(1)).min(1),
  tipVi: z.string().optional(),
});
export type Task = z.infer<typeof taskSchema>;

export const snippetSchema = z.object({
  id,
  /** What kind of text: standup, slack, email, ticket, pr, conversation, phone… shown as a label. */
  genre: z.string().min(1),
  titleVi: z.string().min(1),
  /** Who says it, shown above the text: "Linh, backend dev". */
  speaker: z.string().optional(),
  cefr: cefrSchema,
  /** One paragraph per item. */
  text: z.array(z.string().min(1)).min(1),
  translationVi: z.array(z.string().min(1)).min(1),
  /** Chunks of the unit that appear in this text. */
  chunks: z.array(id).min(1),
  task: id,
});
export type Snippet = z.infer<typeof snippetSchema>;

/** A step of the scripted (no-AI) conversation: what the other person says, and replies that move on. */
export const scriptNodeSchema = z.object({
  id,
  say: z.string().min(1),
  sayVi: z.string().optional(),
  /** Suggested replies; `next` null ends the conversation. */
  replies: z
    .array(z.object({ text: z.string().min(1), next: id.nullable() }))
    .default([]),
});

/** A roleplay: someone at work, a goal, a persona for AI, and a script for when there is no AI. */
export const scenarioSchema = z.object({
  id,
  titleVi: z.string().min(1),
  /** Who you talk to: "Minh, tech lead". */
  partner: z.string().min(1),
  situationVi: z.string().min(1),
  goalVi: z.string().min(1),
  /** For AI: how the partner behaves (English). */
  persona: z.string().min(1),
  /** For AI: what the learner must get across (English), to judge the goal. */
  goal: z.string().min(1),
  /** The script; the first node opens the conversation. */
  script: z.array(scriptNodeSchema).min(1),
});
export type Scenario = z.infer<typeof scenarioSchema>;
export type ScriptNode = z.infer<typeof scriptNodeSchema>;

export const unitSchema = z.object({
  id,
  track: id,
  title: z.string().min(1),
  titleVi: z.string().min(1),
  cefr: cefrSchema,
  snippets: z.array(snippetSchema).min(1),
  chunks: z.array(chunkSchema).min(1),
  tasks: z.array(taskSchema).min(1),
  scenarios: z.array(scenarioSchema).default([]),
});
export type Unit = z.infer<typeof unitSchema>;

export const trackSchema = z.object({
  id,
  titleVi: z.string().min(1),
  /** Colour of the track's labels and illustrations. */
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  /** Unit ids in learning order. */
  units: z.array(id).min(1),
  /** Who learns this track, in English, for AI prompts: "people who work in software". */
  audience: z.string().min(1),
  /** The benchmark prompts (Vietnamese). */
  baseline: z.object({ writingVi: z.string().min(1), speakingVi: z.string().min(1) }),
  /** A short text to try "capture" with when the learner has nothing to paste. */
  captureSample: z.string().optional(),
});
export type Track = z.infer<typeof trackSchema>;

export interface Library {
  tracks: Track[];
  units: Unit[];
}

const lower = (text: string) => text.toLowerCase();

/**
 * Problems the schema cannot see: ids that point nowhere, chunks that are not in the text they
 * claim to be in, answers that are not in their example. Empty when the content is sound.
 */
export function contentProblems(library: Library): string[] {
  const problems: string[] = [];
  const unitIds = new Set(library.units.map((unit) => unit.id));
  const seen = new Set<string>();
  const once = (kind: string, value: string) => {
    if (seen.has(`${kind}:${value}`)) problems.push(`${kind} "${value}" bị trùng id`);
    seen.add(`${kind}:${value}`);
  };

  for (const track of library.tracks) {
    once('track', track.id);
    for (const unitId of track.units) {
      if (!unitIds.has(unitId)) problems.push(`track "${track.id}": không có unit "${unitId}"`);
    }
  }
  for (const unit of library.units) {
    once('unit', unit.id);
    if (!library.tracks.some((track) => track.id === unit.track)) {
      problems.push(`unit "${unit.id}": không có track "${unit.track}"`);
    }
    const chunks = new Map(unit.chunks.map((chunk) => [chunk.id, chunk]));
    const tasks = new Set(unit.tasks.map((task) => task.id));
    for (const chunk of unit.chunks) {
      once('chunk', chunk.id);
      if (!lower(chunk.example).includes(lower(chunk.answer))) {
        problems.push(`chunk "${chunk.id}": answer "${chunk.answer}" không nằm trong example`);
      }
    }
    for (const task of unit.tasks) once('task', task.id);
    for (const scenario of unit.scenarios) {
      once('scenario', scenario.id);
      const nodes = new Set(scenario.script.map((node) => node.id));
      for (const node of scenario.script) {
        for (const reply of node.replies) {
          if (reply.next && !nodes.has(reply.next)) {
            problems.push(`scenario "${scenario.id}": node "${node.id}" trỏ tới "${reply.next}" không tồn tại`);
          }
        }
      }
    }
    for (const snippet of unit.snippets) {
      once('snippet', snippet.id);
      if (!tasks.has(snippet.task)) problems.push(`snippet "${snippet.id}": không có task "${snippet.task}"`);
      if (snippet.text.length !== snippet.translationVi.length) {
        problems.push(`snippet "${snippet.id}": số đoạn tiếng Anh và tiếng Việt khác nhau`);
      }
      const text = lower(snippet.text.join(' '));
      for (const chunkId of snippet.chunks) {
        const chunk = chunks.get(chunkId);
        if (!chunk) {
          problems.push(`snippet "${snippet.id}": không có chunk "${chunkId}"`);
        } else if (![chunk.en, ...chunk.forms].some((form) => text.includes(lower(form)))) {
          problems.push(`snippet "${snippet.id}": không thấy "${chunk.en}" trong đoạn văn`);
        }
      }
    }
  }
  return problems;
}
