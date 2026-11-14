import { describe, expect, it } from 'vitest';
import type { Feedback } from '../check/feedback';
import { checkpoints, checksByWeek, compareAttempts, groupWritings, topMistakes, versionsOf, writingKind, type AttemptLike, type WrittenVersion } from './writing';

const feedback = (mistakes: number): Feedback => ({
  points: [],
  required: [],
  mistakes: Array.from({ length: mistakes }, (_, i) => ({ wrong: `w${i}`, right: `r${i}`, label: 'tense' as const, vi: '' })),
  corrected: '',
  upgrades: [],
  complete: true,
  closestModel: '',
});
const version = (text: string, mistakes = 0): WrittenVersion => ({ text, source: 'ai', feedback: feedback(mistakes) });

const attempt = (over: Partial<AttemptLike> & { id: string; at: string }): AttemptLike => ({
  taskId: 'standup',
  snippetId: 'dev-standup-1',
  text: 'Yesterday I fixed the login bug.',
  usedRequired: [],
  missingRequired: [],
  ...over,
});

describe('writingKind', () => {
  it('reads where an answer came from', () => {
    expect(writingKind('dev-standup-1')).toBe('lesson');
    expect(writingKind('talk:abc')).toBe('talk');
    expect(writingKind('interview:intro')).toBe('interview');
    expect(writingKind('capture:x')).toBe('capture');
  });
});

describe('versionsOf', () => {
  it('shows kept versions with their feedback', () => {
    const a = attempt({ id: 'a', at: '2026-11-14T08:00:00Z', versions: [version('one', 2), version('two')] });
    expect(versionsOf(a).map((v) => [v.text, v.version?.feedback.mistakes.length])).toEqual([['one', 2], ['two', 0]]);
  });

  it('falls back to the texts of an older answer, without feedback', () => {
    const a = attempt({ id: 'a', at: '2026-11-10T08:00:00Z', revisions: ['first try'], text: 'final' });
    expect(versionsOf(a)).toEqual([{ text: 'first try' }, { text: 'final', at: '2026-11-10T08:00:00Z' }]);
  });
});

describe('groupWritings', () => {
  it('groups by task and kind, latest group first, answers oldest first', () => {
    const groups = groupWritings([
      attempt({ id: 'b', at: '2026-11-12T08:00:00Z' }),
      attempt({ id: 'x', at: '2026-11-13T08:00:00Z', taskId: 'email' }),
      attempt({ id: 'a', at: '2026-11-05T08:00:00Z' }),
      attempt({ id: 't', at: '2026-11-11T08:00:00Z', snippetId: 'talk:1' }),
    ]);
    expect(groups.map((g) => [g.key, g.attempts.map((a) => a.id)])).toEqual([
      ['lesson:email', ['x']],
      ['lesson:standup', ['a', 'b']],
      ['talk:standup', ['t']],
    ]);
    expect(groups[1].last.id).toBe('b');
  });
});

describe('compareAttempts', () => {
  it('sees fewer checks, fewer missing ideas, fewer first-try mistakes and new chunks', () => {
    const before = attempt({ id: 'a', at: '2026-11-05T08:00:00Z', text: 'I fix bug.', missingPoints: ['hôm nay'], versions: [version('I fix bug', 3), version('I fixed bug.', 1), version('I fix bug.', 1)], usedRequired: ['fixed'] });
    const after = attempt({ id: 'b', at: '2026-11-12T08:00:00Z', text: 'Yesterday I fixed the bug. Today I will test it.', versions: [version('…', 1)], usedRequired: ['fixed', 'pick up'] });
    const { signals, newChunks } = compareAttempts(before, after);
    expect(signals).toEqual([
      { kind: 'checks', before: 3, after: 1, better: true },
      { kind: 'missing', before: 1, after: 0, better: true },
      { kind: 'mistakes', before: 3, after: 1, better: true },
      { kind: 'words', before: 3, after: 10, better: true },
    ]);
    expect(newChunks).toEqual(['pick up']);
  });

  it('leaves out first-try mistakes when an answer kept no feedback, and marks no change', () => {
    const before = attempt({ id: 'a', at: '2026-11-05T08:00:00Z', revisions: ['x'] });
    const after = attempt({ id: 'b', at: '2026-11-12T08:00:00Z', versions: [version('y'), version('z')] });
    const { signals } = compareAttempts(before, after);
    expect(signals.map((s) => s.kind)).toEqual(['checks', 'missing', 'words']);
    expect(signals[0]).toEqual({ kind: 'checks', before: 2, after: 2, better: undefined });
  });
});

describe('checksByWeek', () => {
  it('averages checks per answer each week, oldest week first', () => {
    const weeks = checksByWeek(
      [
        attempt({ id: 'a', at: '2026-10-30T08:00:00Z', revisions: ['1', '2'] }),
        attempt({ id: 'b', at: '2026-10-31T08:00:00Z' }),
        attempt({ id: 'c', at: '2026-11-13T08:00:00Z', versions: [version('x')] }),
      ],
      '2026-11-14',
      3,
    );
    expect(weeks).toEqual([
      { weeksAgo: 2, count: 2, average: 2 },
      { weeksAgo: 1, count: 0, average: undefined },
      { weeksAgo: 0, count: 1, average: 1 },
    ]);
  });
});

describe('topMistakes', () => {
  it('ranks labels of the last 4 weeks, with the 4 weeks before', () => {
    const m = (label: string, day: string) => ({ label, day });
    const top = topMistakes(
      [m('article', '2026-11-14'), m('article', '2026-11-01'), m('tense', '2026-11-10'), m('article', '2026-10-10'), m('tense', '2026-10-01'), m('tense', '2026-10-02'), m('old', '2026-10-01')],
      '2026-11-14',
    );
    expect(top).toEqual([
      { label: 'article', count: 2, before: 1 },
      { label: 'tense', count: 1, before: 2 },
    ]);
  });
});

describe('checkpoints', () => {
  const b = (id: string, kind: 'writing' | 'audio', day: string) => ({ id, kind, day, at: `${day}T08:00:00Z` });

  it('pairs the writing and the recording of each plan week, latest of each kind', () => {
    const groups = checkpoints([b('w1', 'writing', '2026-11-14'), b('a1', 'audio', '2026-11-15'), b('w1b', 'writing', '2026-11-16'), b('w5', 'writing', '2026-12-12')], '2026-11-14');
    expect(groups.map((g) => [g.week, g.writing?.id, g.audio?.id])).toEqual([
      [1, 'w1b', 'a1'],
      [5, 'w5', undefined],
    ]);
  });

  it('groups by day without a plan', () => {
    expect(checkpoints([b('w', 'writing', '2026-11-14'), b('a', 'audio', '2026-11-14')]).map((g) => g.key)).toEqual(['2026-11-14']);
  });
});
