import type { Chunk } from './schema';

export type Segment = { text: string; chunkId?: string };

/**
 * Split a paragraph into plain text and chunk occurrences, so each chunk can be tapped. Longer
 * forms win over shorter ones; occurrences never overlap. Matching ignores case.
 */
export function chunkSegments(text: string, chunks: readonly Chunk[]): Segment[] {
  const lower = text.toLowerCase();
  const forms = chunks
    .flatMap((chunk) => [chunk.en, ...chunk.forms].map((form) => ({ form: form.toLowerCase(), id: chunk.id })))
    .sort((a, b) => b.form.length - a.form.length);
  const taken: Array<{ start: number; end: number; id: string }> = [];
  for (const { form, id } of forms) {
    let from = 0;
    while (from <= lower.length) {
      const start = lower.indexOf(form, from);
      if (start < 0) break;
      const end = start + form.length;
      const wordEdge = (index: number) => index < 0 || index >= lower.length || !/[a-z0-9]/.test(lower[index]);
      const free = taken.every((span) => end <= span.start || start >= span.end);
      if (free && wordEdge(start - 1) && wordEdge(end) && !taken.some((span) => span.id === id)) {
        taken.push({ start, end, id });
      }
      from = start + 1;
    }
  }
  taken.sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cursor = 0;
  for (const span of taken) {
    if (span.start > cursor) segments.push({ text: text.slice(cursor, span.start) });
    segments.push({ text: text.slice(span.start, span.end), chunkId: span.id });
    cursor = span.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}
