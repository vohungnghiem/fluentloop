import type { Task } from '../content/schema';
import type { Correction, Mistake, Upgrade } from '../errors/labels';
import { ruleMistakes, applyMistakes } from '../errors/rules';
import { checkTask } from './task';
import { containsPhrase, normalize } from './text';

/**
 * One verdict on a written answer, merged from rules and (when there is one) AI, so the learner
 * never sees two answers that disagree: is every idea there, the chunks, the mistakes, better ways
 * to say it, and praise only when earned.
 */

export type PointStatus = 'ok' | 'missing' | 'unknown';

export interface Feedback {
  points: Array<{ vi: string; status: PointStatus; noteVi?: string }>;
  required: Array<{ label: string; used: boolean }>;
  mistakes: Mistake[];
  corrected: string;
  upgrades: Upgrade[];
  praiseVi?: string;
  /** Every idea there and every chunk used: the answer is done (mistakes aside). */
  complete: boolean;
  closestModel: string;
}

/** Rules alone: a point is there when one of its variants is; without variants, rules cannot tell. */
export function pointsByRules(task: Task, text: string): Feedback['points'] {
  return task.points.map((point) => ({
    vi: point.vi,
    status: point.variants.length === 0 ? 'unknown' : point.variants.some((v) => containsPhrase(text, v)) ? 'ok' : 'missing',
  }));
}

const key = (piece: string) => normalize(piece);
/** Two mistakes are the same when one's wrong piece contains the other's. */
const overlaps = (a: Mistake, b: Mistake) => {
  const x = key(a.wrong);
  const y = key(b.wrong);
  return x !== '' && y !== '' && (x.includes(y) || y.includes(x));
};

export function buildFeedback(task: Task, text: string, ai?: Correction): Feedback {
  const check = checkTask(task, text);
  const rules = ruleMistakes(text);
  const byRules = pointsByRules(task, text);

  const points = byRules.map((point, index) => {
    const verdict = ai?.coverage?.[index];
    return verdict ? { vi: point.vi, status: verdict.ok ? ('ok' as const) : ('missing' as const), noteVi: verdict.noteVi?.trim() || undefined } : point;
  });

  // AI's mistakes first; a rule's only when AI did not already cover that piece.
  const aiMistakes = ai?.mistakes ?? [];
  const mistakes = [...aiMistakes, ...rules.filter((r) => !aiMistakes.some((m) => overlaps(m, r)))];
  const corrected = ai && mistakes.length === aiMistakes.length ? ai.corrected : applyMistakes(ai?.corrected ?? text, mistakes.slice(aiMistakes.length));

  // Better ways to say the learner's own idea: only AI can write them (a model says something else,
  // so it is shown as a model, never offered as "your sentence, better").
  const candidates = ai?.upgrades?.length ? ai.upgrades : ai?.natural ? [{ en: ai.natural, vi: '' }] : [];
  const upgrades = candidates.filter((u) => key(u.en) !== key(text) && key(u.en) !== key(corrected));

  const complete = points.every((p) => p.status !== 'missing') && check.required.every((r) => r.used);
  // Praise for a half answer teaches the wrong thing.
  const praiseVi = complete ? ai?.praiseVi?.trim() || undefined : undefined;

  return { points, required: check.required, mistakes, corrected, upgrades, praiseVi, complete, closestModel: check.closestModel };
}
