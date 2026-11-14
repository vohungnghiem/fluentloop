import { describe, expect, it } from 'vitest';
import { fillerCount, fluency, silences, weekSpeed, wordCount } from './fluency';

/** Frames of 0.1 s: `q` quiet, `L` loud. */
const levels = (pattern: string) => [...pattern].map((c) => (c === 'L' ? 0.2 : 0.01));

describe('words and fillers', () => {
  it('counts words without the hesitation sounds', () => {
    expect(wordCount('Um, I worked on the, uh, login page.')).toBe(6);
    expect(fillerCount('Um, I worked on the, uh, login page.')).toBe(2);
  });
});

describe('silences', () => {
  it('finds pauses of a second or more between speech, not before or after it', () => {
    const s = silences(levels(`qqqqq${'L'.repeat(20)}${'q'.repeat(15)}${'L'.repeat(20)}qqqq${'L'.repeat(10)}${'q'.repeat(30)}`));
    expect(s.pauses).toBe(1);
    expect(s.longestPause).toBe(1.5);
    expect(s.activeSeconds).toBe(6.9);
  });

  it('finds nothing in a recording of noise only', () => {
    expect(silences(levels('q'.repeat(50)))).toEqual({ pauses: 0, longestPause: 0, activeSeconds: 0 });
  });
});

describe('fluency', () => {
  it('measures speed over the talking time when the levels found speech', () => {
    const talk = `${'L'.repeat(300)}${'q'.repeat(100)}`; // 30 s of talking, then 10 s of silence
    expect(fluency({ transcript: Array(50).fill('word').join(' '), seconds: 40, levels: levels(talk) }).wpm).toBe(100);
  });

  it('falls back to the whole recording, and has no speed without words', () => {
    expect(fluency({ transcript: 'one two three', seconds: 60 }).wpm).toBe(3);
    expect(fluency({ seconds: 60 }).wpm).toBeUndefined();
    expect(fluency({ transcript: 'Hi, I am Hoa.', seconds: 5 }).wpm).toBeUndefined();
  });
});

describe('weekSpeed', () => {
  it('averages the last 7 days and the 7 before', () => {
    const talks = [{ day: '2026-11-14', wpm: 80 }, { day: '2026-11-10', wpm: 90 }, { day: '2026-11-05', wpm: 60 }, { day: '2026-10-20', wpm: 10 }, { day: '2026-11-13' }];
    expect(weekSpeed(talks, '2026-11-14')).toEqual({ thisWeek: 85, lastWeek: 60, count: 2 });
  });
});
