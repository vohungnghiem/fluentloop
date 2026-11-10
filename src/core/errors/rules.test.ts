import { describe, expect, it } from 'vitest';
import { applyMistakes, ruleMistakes } from './rules';
import { correctionSchema } from './labels';

describe('ruleMistakes', () => {
  it('catches common slips', () => {
    const text = 'Yesterday I work on a API. The test fail. I blocked by the QA team.';
    const found = ruleMistakes(text);
    expect(found.map((m) => m.label)).toEqual(['past-tense', 'article', 'third-person-s', 'be-verb']);
    expect(applyMistakes(text, found)).toBe('Yesterday I worked on an API. The test fails. I am blocked by the QA team.');
  });
  it('leaves correct English alone', () => {
    const fine = "Yesterday I worked on a user story. Today I'll pick up a ticket. The test fails. I'm blocked by the API team. It is an issue.";
    expect(ruleMistakes(fine)).toEqual([]);
  });
});

describe('correctionSchema', () => {
  it('keeps unknown labels as other and drops a bad natural field', () => {
    const parsed = correctionSchema.parse({
      corrected: 'x',
      natural: 42,
      mistakes: [{ wrong: 'a', right: 'b', label: 'weird', vi: 'v' }],
    });
    expect(parsed.mistakes[0].label).toBe('other');
    expect(parsed.natural).toBeUndefined();
  });
});

describe('errorCards', async () => {
  const { errorCards } = await import('./cards');
  it('one card per sentence, fixed with every mistake in it', () => {
    const text = 'Yesterday I work on a API. I am blocked by QA. Hello';
    const mistakes = [
      { wrong: 'I work', right: 'I worked', label: 'past-tense' as const, vi: '' },
      { wrong: 'a API', right: 'an API', label: 'article' as const, vi: '' },
      { wrong: 'nowhere', right: 'x', label: 'other' as const, vi: '' },
    ];
    const corrected = 'Yesterday I worked on an API. I am blocked by QA. Hello';
    expect(errorCards(text, corrected, mistakes, [0, 1, 2])).toEqual([
      { wrongSentence: 'Yesterday I work on a API.', rightSentence: 'Yesterday I worked on an API.', mistakes: [0, 1] },
      { wrongSentence: 'nowhere', rightSentence: 'x', mistakes: [2] },
    ]);
    // Corrected text that does not line up: the fixes are applied to the sentence instead.
    expect(errorCards(text, 'Totally rewritten.', mistakes, [1, 0])[0].rightSentence).toBe('Yesterday I worked on an API.');
    expect(errorCards(text, corrected, mistakes, [])).toEqual([]);
  });
});
