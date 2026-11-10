import { describe, expect, it } from 'vitest';
import { checkAnswer, containsPhrase, normalize, wordDiff } from './text';
import { checkTask } from './task';

describe('normalize', () => {
  it('spells out contractions and drops punctuation', () => {
    expect(normalize("I'm blocked, aren't I?")).toBe('i am blocked are not i');
    expect(normalize('It’s on track!')).toBe('it is on track');
    expect(normalize('Just a heads-up: OK')).toBe('just a heads-up ok');
  });
});

describe('checkAnswer', () => {
  it('accepts exact, case and spacing differences', () => {
    expect(checkAnswer('  Blocked ', 'blocked')).toBe('correct');
  });
  it('allows one typo per five letters', () => {
    expect(checkAnswer('blokced', 'blocked')).toBe('wrong');
    expect(checkAnswer('blocekd', 'blocked')).toBe('wrong');
    expect(checkAnswer('bloked', 'blocked')).toBe('close');
    expect(checkAnswer('waitng on', 'waiting on')).toBe('close');
  });
  it('treats short words strictly and empty as wrong', () => {
    expect(checkAnswer('on', 'in')).toBe('wrong');
    expect(checkAnswer('', 'blocked')).toBe('wrong');
  });
});

describe('wordDiff', () => {
  it('marks removed and added words', () => {
    expect(wordDiff('I blocked by API team', 'I am blocked by the API team')).toEqual([
      { kind: 'same', text: 'i' },
      { kind: 'added', text: 'am' },
      { kind: 'same', text: 'blocked by' },
      { kind: 'added', text: 'the' },
      { kind: 'same', text: 'api team' },
    ]);
  });
});

describe('containsPhrase / checkTask', () => {
  it('matches whole words only', () => {
    expect(containsPhrase("I'm blocked by QA.", 'blocked by')).toBe(true);
    expect(containsPhrase('unblocked by', 'blocked by')).toBe(false);
  });
  it('reports which required chunks were used', () => {
    const task = {
      id: 't',
      promptVi: 'x',
      required: [
        { label: 'blocked by', variants: ['blocked by'] },
        { label: 'waiting on', variants: ['waiting on', 'waiting for'] },
      ],
      models: ['I am blocked by the API team.', 'I am waiting on access.'],
    };
    const result = checkTask(task, "I'm waiting for access to staging.");
    expect(result.required).toEqual([
      { label: 'blocked by', used: false },
      { label: 'waiting on', used: true },
    ]);
    expect(result.closestModel).toBe('I am waiting on access.');
    expect(result.wordCount).toBe(7);
  });
});

describe('checkSentence', async () => {
  const { checkSentence } = await import('./text');
  it('grades a dictated sentence', () => {
    expect(checkSentence("I'm blocked by the API team", 'Sorry... no')).toBe('wrong');
    expect(checkSentence('i am blocked by the api team.', "I'm blocked by the API team.")).toBe('correct');
    expect(checkSentence("I'm blocked by API team", "I'm blocked by the API team.")).toBe('close');
    expect(checkSentence("I'm blokced by the API team", "I'm blocked by the API team.")).toBe('close');
    expect(checkSentence('I blocked API', "I'm blocked by the API team.")).toBe('wrong');
  });
});
