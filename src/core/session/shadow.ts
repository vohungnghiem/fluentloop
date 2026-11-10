import type { Chunk, Snippet } from '../content/schema';
import { sentences } from '../check/shadow';

/**
 * Sentences to shadow: the ones that carry the snippet's chunks, most chunks first, at most
 * three, in reading order. Very short ones ("Good news:") are not worth it.
 */
export function shadowSentences(snippet: Snippet, chunks: readonly Chunk[], max = 3): string[] {
  const all = snippet.text.flatMap(sentences).filter((s) => s.split(/\s+/).length >= 4);
  const scored = all.map((sentence, order) => {
    const lower = sentence.toLowerCase();
    const count = chunks.filter((chunk) => [chunk.en, ...chunk.forms].some((form) => lower.includes(form.toLowerCase()))).length;
    return { sentence, order, count };
  });
  return scored
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .slice(0, max)
    .sort((a, b) => a.order - b.order)
    .map((s) => s.sentence);
}
