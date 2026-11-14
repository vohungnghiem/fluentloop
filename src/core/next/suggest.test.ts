import { describe, expect, it } from 'vitest';
import { insights, prioritize, repeatingLabels, suggestNext, type SuggestInput } from './suggest';

const base: SuggestInput = { doneToday: false, dueToday: 3, repeating: [], baselineDue: false, captureCards: 5 };

describe('suggestNext', () => {
  it('starts with the session when today is not done', () => {
    expect(suggestNext(base)[0]).toEqual({ kind: 'session', due: 3 });
  });

  it('resumes a session in progress first', () => {
    expect(suggestNext({ ...base, active: { step: 2, total: 5 } })[0]).toEqual({ kind: 'resume', step: 2, total: 5 });
  });

  it('suggests a talk after the roleplay when none was made lately', () => {
    const out = suggestNext({ ...base, doneToday: true, dueToday: 0, roleplay: { scenarioId: 's', title: 'S' }, talkDue: true });
    expect(out.map((s) => s.kind)).toEqual(['roleplay', 'talk', 'more']);
  });

  it('after the session, leads to the drill, then the roleplay of the unit', () => {
    const out = suggestNext({
      ...base,
      doneToday: true,
      dueToday: 0,
      repeating: [{ label: 'article', cardIds: ['error:1', 'error:2'] }],
      roleplay: { scenarioId: 'standup', title: 'Standup' },
    });
    expect(out.map((s) => s.kind)).toEqual(['drill', 'roleplay', 'more']);
  });

  it('after the session, cards still due: review more', () => {
    const out = suggestNext({ ...base, doneToday: true, dueToday: 6 });
    expect(out.map((s) => s.kind)).toEqual(['review', 'more']);
  });

  it('skips a repeating group with no cards to drill', () => {
    const out = suggestNext({ ...base, repeating: [{ label: 'tense', cardIds: [] }] });
    expect(out.map((s) => s.kind)).toEqual(['session']);
  });

  it('points a new learner to capture, and keeps at most three', () => {
    const out = suggestNext({ ...base, captureCards: 0, baselineDue: true, captureTaskId: 'c1', roleplay: { scenarioId: 's', title: 'S' } });
    expect(out.map((s) => s.kind)).toEqual(['session', 'roleplay', 'captureTask']);
  });
});

describe('repeatingLabels', () => {
  const today = '2026-11-10';
  it('keeps labels made more than once this week, most first, with their cards', () => {
    const out = repeatingLabels(
      [
        { label: 'article', day: '2026-11-09', cardId: 'error:a' },
        { label: 'article', day: '2026-11-08' },
        { label: 'article', day: '2026-10-01', cardId: 'error:old' },
        { label: 'tense', day: '2026-11-10', cardId: 'error:t1' },
        { label: 'tense', day: '2026-11-10', cardId: 'error:t2' },
        { label: 'tense', day: '2026-11-07' },
        { label: 'spelling', day: '2026-11-10' },
      ],
      today,
    );
    expect(out).toEqual([
      { label: 'tense', thisWeek: 3, cardIds: ['error:t1', 'error:t2'] },
      { label: 'article', thisWeek: 2, cardIds: ['error:a', 'error:old'] },
    ]);
  });
});

describe('prioritize', () => {
  it('moves chosen cards first and keeps the rest in order', () => {
    const cards = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
    expect(prioritize(cards, new Set(['c', 'a'])).map((c) => c.id)).toEqual(['a', 'c', 'b', 'd']);
  });
});

describe('insights', () => {
  it('notices a mistake falling two weeks in a row and minutes going up', () => {
    expect(
      insights({
        labelWeeks: [
          { label: 'article', weeks: [5, 4, 2, 1] },
          { label: 'tense', weeks: [0, 0, 1, 3] },
          { label: 'spelling', weeks: [1, 1, 1, 1] },
        ],
        minutesThisWeek: 60,
        minutesLastWeek: 40,
      }),
    ).toEqual([
      { kind: 'mistakeFalling', label: 'article', weeks: 3 },
      { kind: 'mistakeRising', label: 'tense' },
      { kind: 'minutesUp', delta: 20 },
    ]);
  });

  it('says nothing about minutes without a previous week', () => {
    expect(insights({ labelWeeks: [], minutesThisWeek: 30, minutesLastWeek: 0 })).toEqual([]);
  });
});
