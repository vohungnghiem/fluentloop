import { describe, expect, it } from 'vitest';
import { matchReply } from './script';

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
