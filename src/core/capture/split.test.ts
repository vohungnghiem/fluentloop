import { describe, expect, it } from 'vitest';
import { splitSentences, suggestBlank } from './split';

describe('splitSentences', () => {
  it('keeps the useful sentences of an email', () => {
    const email = `Hi Nghiem,

Thanks for the quick fix yesterday. Could you also double-check the retry logic, e.g. when the token expires?
- We should roll this out gradually to avoid surprises.
- See https://example.com/runbook
const x = 1;

Best regards,
Anna`;
    expect(splitSentences(email)).toEqual([
      'Thanks for the quick fix yesterday.',
      'Could you also double-check the retry logic, e.g. when the token expires?',
      'We should roll this out gradually to avoid surprises.',
    ]);
  });
});

describe('suggestBlank', () => {
  it('picks a content phrase, not a stop word or an acronym', () => {
    expect(suggestBlank('We should roll this out gradually to avoid surprises.')).toBe('avoid surprises');
    expect(suggestBlank('Could you double-check the retry logic?')).toBe('double-check');
    expect(suggestBlank('Please merge the hotfix branch before Friday.')).toBe('hotfix branch');
  });
});
