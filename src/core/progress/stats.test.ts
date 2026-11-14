import { describe, expect, it } from 'vitest';
import { perDay, retention, sessionMinutes, streak } from './stats';

describe('streak', () => {
  it('a first day of learning uses no rest days', () => {
    expect(streak(['2026-11-14'], '2026-11-14')).toEqual({ days: 1, restUsed: 0 });
    expect(streak(['2026-11-12', '2026-11-14'], '2026-11-14')).toEqual({ days: 2, restUsed: 1 });
  });

  it('counts back from today, and today not done yet does not break it', () => {
    expect(streak(['2026-11-08', '2026-11-09', '2026-11-10'], '2026-11-10').days).toBe(3);
    expect(streak(['2026-11-08', '2026-11-09'], '2026-11-10').days).toBe(2);
  });
  it('forgives up to two days off in a week', () => {
    const days = ['2026-11-03', '2026-11-04', '2026-11-06', '2026-11-08', '2026-11-09'];
    expect(streak(days, '2026-11-09')).toEqual({ days: 5, restUsed: 2 });
  });
  it('a third day off in a week ends it', () => {
    const days = ['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-08'];
    // 08, 06, 04 learnt; 07 and 05 forgiven; 03 is the third day off in a week.
    expect(streak(days, '2026-11-08').days).toBe(3);
  });
  it('yesterday missed is a rest day, not the end', () => {
    const days = ['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'];
    expect(streak(days, '2026-11-10')).toEqual({ days: 5, restUsed: 1 });
    // Three days away in a row: the streak is over.
    expect(streak(days, '2026-11-12').days).toBe(0);
  });
  it('nothing learnt: zero', () => {
    expect(streak([], '2026-11-10').days).toBe(0);
  });
});

describe('numbers', () => {
  it('session minutes are capped and at least one', () => {
    expect(sessionMinutes('2026-11-10T09:00:00Z', '2026-11-10T09:12:20Z')).toBe(12);
    expect(sessionMinutes('2026-11-10T09:00:00Z', '2026-11-11T09:00:00Z')).toBe(45);
    expect(sessionMinutes('2026-11-10T09:00:00Z')).toBe(0);
  });
  it('retention only counts long gaps', () => {
    expect(retention([{ rating: 'good', gapDays: 8 }, { rating: 'again', gapDays: 9 }, { rating: 'good', gapDays: 1 }])).toEqual({ tried: 2, kept: 1 });
  });
  it('per day fills empty days', () => {
    expect(perDay(3, '2026-11-10', ['2026-11-10', '2026-11-10', '2026-11-08'])).toEqual([
      { day: '2026-11-08', count: 1 },
      { day: '2026-11-09', count: 0 },
      { day: '2026-11-10', count: 2 },
    ]);
  });
});
