import type { ScriptNode } from '../content/schema';
import { words } from '../check/text';

/**
 * The scripted conversation (no AI): the learner says or types anything, and the reply it is
 * closest to moves the conversation on. Close enough: at least two shared words, covering half
 * of the shorter of the two (a short answer is fine). Otherwise the suggestions are shown again.
 */
export const MATCH_AT = 0.5;

function similarity(said: string, reply: string): number {
  const a = words(said);
  const b = new Set(words(reply));
  const hits = new Set(a.filter((word) => b.has(word))).size;
  if (hits < Math.min(2, b.size)) return 0;
  return hits / Math.max(1, Math.min(new Set(a).size, b.size));
}

export function matchReply(node: ScriptNode, said: string): number {
  let best = -1;
  let score = 0;
  node.replies.forEach((reply, index) => {
    const s = similarity(said, reply.text);
    if (s > score) {
      best = index;
      score = s;
    }
  });
  return score >= MATCH_AT ? best : -1;
}

/** Words an open answer needs before the script moves on. */
export const OPEN_ANSWER_WORDS = 3;

/**
 * Where the script goes after the learner said `said`: the closest reply's node, else the node's
 * open answer (`any`) when it is a few words long. `undefined`: not understood, try again.
 * `null`: the conversation ends.
 */
export function nextNode(node: ScriptNode, said: string): string | null | undefined {
  const index = matchReply(node, said);
  if (index >= 0) return node.replies[index].next;
  if (node.any && words(said).length >= OPEN_ANSWER_WORDS) return node.any;
  return undefined;
}
