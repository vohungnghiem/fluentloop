import { describe, expect, it } from 'vitest';
import { matchSpoken, sentences } from './shadow';
import { cardKind } from '../srs/kind';
import { newState } from '../srs/srs';
import { shadowSentences } from '../session/shadow';
import unitJson from '../../../content/tracks/dev/units/standup.json';
import { unitSchema } from '../content/schema';

describe('matchSpoken', () => {
  it('marks the words the machine heard', () => {
    const result = matchSpoken("Sorry, I'm blocked by the API team.", 'sorry I am block by API team');
    expect(result.words.map((w) => w.heard)).toEqual([true, true, false, true, false, true, true]);
    expect(result.ratio).toBeCloseTo(5 / 7);
  });
  it('accepts near spellings of long words and digits as words', () => {
    expect(matchSpoken('We pushed 2 fixes yesterday.', 'we pushed two fixes yesterdy').ratio).toBe(1);
  });
  it('hears nothing from silence', () => {
    expect(matchSpoken('No blockers on my side.', '').ratio).toBe(0);
  });
});

describe('sentences / shadowSentences', () => {
  it('splits on end punctuation', () => {
    expect(sentences('Good news: it works. I pushed a fix! Done?')).toEqual(['Good news: it works.', 'I pushed a fix!', 'Done?']);
  });
  it('picks up to three chunk-bearing sentences in reading order', () => {
    const unit = unitSchema.parse(unitJson);
    const snippet = unit.snippets.find((s) => s.id === 'standup-blocked')!;
    const chunks = unit.chunks.filter((c) => snippet.chunks.includes(c.id));
    expect(shadowSentences(snippet, chunks)).toEqual([
      "I'm almost done with the payment API, but I'm blocked by the auth service.",
      "I'm still waiting on access to the staging server.",
      'Could someone from DevOps take a look at my request?',
    ]);
  });
});

describe('cardKind', () => {
  it('fresh cards are cloze, firm ones dictation when speech exists', () => {
    const fresh = newState(new Date('2026-11-10T09:00:00'));
    expect(cardKind(fresh, true)).toBe('cloze');
    const firm = { ...fresh, reps: 3, stability: 9 };
    expect(cardKind(firm, true)).toBe('dictation');
    expect(cardKind(firm, false)).toBe('cloze');
  });
});

describe('closest guess', async () => {
  const { closest } = await import('../../services/speech/stt');
  it('keeps the recognition guess nearest to the practised sentence', () => {
    expect(closest(['I am looking forward to stand up', 'I am ready for the stand up'], 'I am ready for the standup.')).toBe('I am ready for the stand up');
    expect(closest(['hello there', 'hello their'], 'Good morning.')).toBe('hello there');
  });
});
