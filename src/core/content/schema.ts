import { z } from 'zod';

/**
 * Content is data: a track (an industry) holds units (topics), and a unit holds the snippets,
 * chunks and tasks a session is made of. Adding a track means adding files, never code.
 */

export const cefrSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1']);
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

/** One idea the answer must contain. `variants` let rules spot it; without them only AI can judge it. */
export const taskPointSchema = z.object({
  vi: z.string().min(1),
  variants: z.array(z.string().min(1)).default([]),
});
export type TaskPoint = z.infer<typeof taskPointSchema>;

export const taskSchema = z.object({
  id,
  promptVi: z.string().min(1),
  /** Where the learner is: one line of context in English, optional. */
  situation: z.string().optional(),
  required: z.array(requiredChunkSchema).default([]),
  /** Natural answers to compare with. The first is shown first. */
  models: z.array(z.string().min(1)).min(1),
  tipVi: z.string().optional(),
  /** The ideas a complete answer has: "đủ ý" is checked against them. */
  points: z.array(taskPointSchema).default([]),
  /** Hints when stuck: [a guiding question in Vietnamese, the start of a sentence]. Level 3 is a model. */
  hints: z.array(z.string().min(1)).max(2).default([]),
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
  /** Any answer of a few words moves on to this node (open questions: an interview). */
  any: id.optional(),
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

/** The sentence pattern a foundation unit is built on: shown before the text, in Vietnamese. */
export const patternSchema = z.object({
  titleVi: z.string().min(1),
  /** The shape of the sentence, one per line: "I + work + at/for …". */
  forms: z.array(z.string().min(1)).min(1),
  examples: z.array(z.object({ en: z.string().min(1), vi: z.string().min(1) })).min(1),
  noteVi: z.string().optional(),
});
export type Pattern = z.infer<typeof patternSchema>;

/** A sound to watch when speaking: the word (or short phrase) and what to do with the mouth. */
export const soundSchema = z.object({
  en: z.string().min(1),
  /** How to say it, in Vietnamese: "đuôi -ed đọc /t/: worked = /wɜːkt/". */
  tipVi: z.string().min(1),
});
export type Sound = z.infer<typeof soundSchema>;

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
  pattern: patternSchema.optional(),
  sounds: z.array(soundSchema).default([]),
  /** The second-model check the content process asks for (content/prompts/review.md). */
  review: z.object({ by: z.string().min(1), on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().optional() }).optional(),
});
export type Unit = z.infer<typeof unitSchema>;

export const trackSchema = z.object({
  id,
  titleVi: z.string().min(1),
  /** Colour of the track's labels and illustrations. */
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  /** Unit ids in learning order. */
  units: z.array(id).min(1),
  /** A foundation pack (core): for every industry, learnt first by learners below B1. */
  foundation: z.boolean().default(false),
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
        for (const next of [...node.replies.map((reply) => reply.next), node.any]) {
          if (next && !nodes.has(next)) {
            problems.push(`scenario "${scenario.id}": node "${node.id}" trỏ tới "${next}" không tồn tại`);
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

/** Longest sentence (in words) a unit of a low level may use: A2 learners need short sentences. */
export const MAX_WORDS: Partial<Record<Cefr, number>> = { A1: 10, A2: 14 };

/** Sentences of a text, for counting words: split after . ! ? (a list line counts as one). */
export const sentences = (text: string) =>
  text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
const wordCount = (sentence: string) => sentence.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;

/**
 * What the level asks of a unit (docs/PHAC-THAO.md 7): at A1–A2 every sentence a learner reads or
 * copies is short, every task has its ideas and both hints (nobody gets stuck with nothing), and a
 * foundation unit says which sentence pattern it teaches. Empty when the unit fits its level.
 */
export function levelProblems(library: Library): string[] {
  const problems: string[] = [];
  const foundation = new Set(library.tracks.filter((track) => track.foundation).map((track) => track.id));
  for (const unit of library.units) {
    if (foundation.has(unit.track) && !unit.pattern) problems.push(`unit "${unit.id}": gói Nền cần có "pattern"`);
    const max = MAX_WORDS[unit.cefr];
    if (!max) continue;
    const texts: Array<[string, string]> = [
      ...unit.snippets.flatMap((s) => s.text.map((t): [string, string] => [`snippet "${s.id}"`, t])),
      ...unit.chunks.map((c): [string, string] => [`chunk "${c.id}"`, c.example]),
      ...unit.tasks.flatMap((t) => t.models.map((m): [string, string] => [`task "${t.id}"`, m])),
      ...unit.scenarios.flatMap((sc) => sc.script.flatMap((node) => [node.say, ...node.replies.map((r) => r.text)].map((t): [string, string] => [`scenario "${sc.id}"`, t]))),
      ...(unit.pattern?.examples.map((e): [string, string] => ['pattern', e.en]) ?? []),
    ];
    for (const [where, text] of texts) {
      for (const sentence of sentences(text)) {
        if (wordCount(sentence) > max) problems.push(`unit "${unit.id}" ${where}: câu ${wordCount(sentence)} từ, mức ${unit.cefr} tối đa ${max}: "${sentence}"`);
      }
    }
    for (const task of unit.tasks) {
      if (task.points.length === 0) problems.push(`unit "${unit.id}" task "${task.id}": mức ${unit.cefr} cần "points"`);
      if (task.hints.length < 2) problems.push(`unit "${unit.id}" task "${task.id}": mức ${unit.cefr} cần đủ 2 "hints"`);
    }
  }
  return problems;
}

/** Things to do that do not block a build: a foundation unit not cross-checked yet, a sound not in any text. */
export function contentWarnings(library: Library): string[] {
  const warnings: string[] = [];
  const foundation = new Set(library.tracks.filter((track) => track.foundation).map((track) => track.id));
  for (const unit of library.units) {
    if (foundation.has(unit.track) && !unit.review) warnings.push(`unit "${unit.id}": chưa kiểm chéo bằng model thứ hai (npm run content:review -- ${unit.id})`);
    const text = lower(unit.snippets.flatMap((s) => s.text).join(' '));
    for (const sound of unit.sounds) {
      if (!text.includes(lower(sound.en))) warnings.push(`unit "${unit.id}": âm "${sound.en}" không có trong bài đọc nào`);
    }
  }
  return warnings;
}
