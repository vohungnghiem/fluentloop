import type { Task } from '../content/schema';
import { containsPhrase, overlap, words } from './text';

export interface TaskCheck {
  /** Each required chunk and whether it was used. */
  required: Array<{ label: string; used: boolean }>;
  wordCount: number;
  /** The model answer closest to what was written. */
  closestModel: string;
}

/** What rules can say about a written answer: chunks used or not, and the nearest model. */
export function checkTask(task: Task, text: string): TaskCheck {
  const required = task.required.map((chunk) => ({
    label: chunk.label,
    used: chunk.variants.some((variant) => containsPhrase(text, variant)),
  }));
  const closestModel = task.models.reduce((best, model) =>
    overlap(text, model) > overlap(text, best) ? model : best,
  );
  return { required, wordCount: words(text).length, closestModel };
}
