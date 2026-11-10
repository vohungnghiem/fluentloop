import type { Mistake } from './labels';

export const sentencesOf = (text: string) => text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface ErrorCardDraft {
  wrongSentence: string;
  rightSentence: string;
  /** Indexes of the mistakes this card covers. */
  mistakes: number[];
}

/**
 * One review card per wrong sentence: the learner's own sentence, and the same sentence with all
 * its mistakes fixed (from the corrected text when it lines up, else by applying the fixes).
 * A mistake that cannot be found in the text gets a card of its own pieces.
 */
export function errorCards(text: string, corrected: string, mistakes: readonly Mistake[], chosen: readonly number[]): ErrorCardDraft[] {
  const original = sentencesOf(text);
  const fixed = sentencesOf(corrected);
  const lined = original.length === fixed.length;
  const drafts = new Map<string, ErrorCardDraft>();
  for (const index of chosen) {
    const mistake = mistakes[index];
    if (!mistake) continue;
    const pattern = new RegExp(escape(mistake.wrong.trim()), 'i');
    const at = mistake.wrong.trim() ? original.findIndex((s) => pattern.test(s)) : -1;
    if (at < 0) {
      drafts.set(`piece:${index}`, { wrongSentence: mistake.wrong, rightSentence: mistake.right, mistakes: [index] });
      continue;
    }
    const key = `sentence:${at}`;
    const draft = drafts.get(key) ?? { wrongSentence: original[at], rightSentence: lined ? fixed[at] : original[at], mistakes: [] };
    if (!lined) draft.rightSentence = draft.rightSentence.replace(pattern, mistake.right);
    draft.mistakes.push(index);
    drafts.set(key, draft);
  }
  return [...drafts.values()];
}
