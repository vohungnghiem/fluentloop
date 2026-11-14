import { z } from 'zod';
import type { Level } from './plan';

/**
 * The placement test: a few questions per level, easiest first. A level block answered mostly
 * wrong ends the test early (no point in ten more questions that are too hard). The result is an
 * estimate from about twenty questions, not a certificate.
 */

export const placementLevels = ['A1', 'A2', 'B1', 'B2'] as const;
export type PlacementLevel = (typeof placementLevels)[number];
export const placementSkills = ['listen', 'read', 'grammar'] as const;
export type Skill = (typeof placementSkills)[number];

export const placementItemSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    level: z.enum(placementLevels),
    skill: z.enum(placementSkills),
    /** Listening: what is read aloud (never shown before answering). */
    audio: z.string().min(1).optional(),
    /** Reading: the text to read. */
    passage: z.string().min(1).optional(),
    /** The question: Vietnamese for listening and reading, an English gap sentence for grammar. */
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(3).max(4),
    answer: z.number().int().min(0),
    /** Why the answer is right, shown after the test. */
    explainVi: z.string().min(1),
  })
  .refine((item) => item.answer < item.options.length, { message: 'answer phải là chỉ số trong options' })
  .refine((item) => item.skill !== 'listen' || !!item.audio, { message: 'câu nghe cần audio' })
  .refine((item) => item.skill !== 'read' || !!item.passage, { message: 'câu đọc cần passage' });
export type PlacementItem = z.infer<typeof placementItemSchema>;

export const placementSchema = z.object({ items: z.array(placementItemSchema).min(1) });

/** Option index chosen, or -1 for "I don't know". */
export type Answers = Readonly<Record<string, number>>;
export const DONT_KNOW = -1;

/** A level is passed with this share right; below `STOP_BELOW` the test ends there. */
const PASS = 0.6;
const STOP_BELOW = 0.4;

const byLevel = (items: readonly PlacementItem[], level: PlacementLevel) => items.filter((item) => item.level === level);

/** Problems with the item set as a whole (ids, enough per level). */
export function placementProblems(items: readonly PlacementItem[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) problems.push(`placement: id trùng ${item.id}`);
    seen.add(item.id);
  }
  for (const level of placementLevels) {
    if (byLevel(items, level).length < 3) problems.push(`placement: mức ${level} cần ít nhất 3 câu`);
  }
  return problems;
}

/** The next question to ask, or nothing when the test is over (all done, or stopped early). */
export function nextItem(items: readonly PlacementItem[], answers: Answers): PlacementItem | undefined {
  for (const level of placementLevels) {
    const block = byLevel(items, level);
    const open = block.find((item) => answers[item.id] === undefined);
    if (open) return open;
    if (block.length > 0 && right(block, answers) / block.length < STOP_BELOW) return undefined;
  }
  return undefined;
}

const right = (items: readonly PlacementItem[], answers: Answers) => items.filter((item) => answers[item.id] === item.answer).length;

/** How far along: questions answered, and the most there can still be. */
export function placementProgress(items: readonly PlacementItem[], answers: Answers): { done: number; total: number } {
  const done = items.filter((item) => answers[item.id] !== undefined).length;
  return { done, total: nextItem(items, answers) ? items.length : done };
}

export interface PlacementResult {
  level: Level;
  correct: number;
  answered: number;
  bySkill: Record<Skill, [right: number, asked: number]>;
  /** Questions answered wrong (or "don't know"), in order: the review after the test. */
  missed: PlacementItem[];
}

/**
 * The level: the highest one passed with every level under it passed too. Nothing passed is A0.
 * Levels never reached (the test stopped) count as not passed.
 */
export function scorePlacement(items: readonly PlacementItem[], answers: Answers): PlacementResult {
  let level: Level = 'A0';
  for (const candidate of placementLevels) {
    const block = byLevel(items, candidate);
    if (block.length === 0 || right(block, answers) / block.length < PASS) break;
    level = candidate;
  }
  const answeredItems = items.filter((item) => answers[item.id] !== undefined);
  const bySkill = Object.fromEntries(
    placementSkills.map((skill) => {
      const asked = answeredItems.filter((item) => item.skill === skill);
      return [skill, [right(asked, answers), asked.length]];
    }),
  ) as PlacementResult['bySkill'];
  return {
    level,
    correct: right(answeredItems, answers),
    answered: answeredItems.length,
    bySkill,
    missed: answeredItems.filter((item) => answers[item.id] !== item.answer),
  };
}
