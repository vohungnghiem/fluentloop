import { describe, expect, it } from 'vitest';
import { matchReply, nextNode } from './script';

const node = {
  id: 'start',
  say: 'Anything blocking you?',
  replies: [
    { text: 'No blockers on my side.', next: 'end' },
    { text: "Yes, I'm blocked by the design team.", next: 'help' },
  ],
};

describe('matchReply', () => {
  it('finds the reply the learner meant, in their own words', () => {
    expect(matchReply(node, 'no blockers')).toBe(0);
    expect(matchReply(node, 'yes I am blocked by design team')).toBe(1);
  });
  it('says no match when it is something else', () => {
    expect(matchReply(node, 'I like pizza')).toBe(-1);
  });
});

describe('nextNode', () => {
  const open = { id: 'q1', say: 'Tell me about yourself.', replies: [], any: 'q2' };
  it('moves on after any answer of a few words to an open question', () => {
    expect(nextNode(open, 'I am a tester with three years of experience')).toBe('q2');
    expect(nextNode(open, 'Hello')).toBeUndefined();
  });
  it('follows the matching reply, and ends on a null', () => {
    expect(nextNode(node, 'no blockers')).toBe('end');
    expect(nextNode({ ...node, replies: [{ text: 'Thanks a lot', next: null }] }, 'thanks a lot')).toBeNull();
  });
});
