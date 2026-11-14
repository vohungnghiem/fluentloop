import { describe, expect, it } from 'vitest';
import { checkpointDue, minutesByDay, needsFoundation, planWeek } from './plan';
import { nextItem, placementProgress, scorePlacement, type PlacementItem } from './placement';
import placementData from '../../../content/placement.json';
import { placementProblems, placementSchema } from './placement';

describe('planWeek', () => {
  it('counts weeks from the start day, months of four weeks', () => {
    expect(planWeek('2026-11-14', '2026-11-14')).toMatchObject({ week: 1, phase: 1, finished: false, checkpoint: true, endDay: '2027-03-05' });
    expect(planWeek('2026-11-14', '2026-11-20')).toMatchObject({ week: 1 });
    expect(planWeek('2026-11-14', '2026-11-21')).toMatchObject({ week: 2, phase: 1, checkpoint: false, weekStart: '2026-11-21' });
    expect(planWeek('2026-11-14', '2026-12-12')).toMatchObject({ week: 5, phase: 2, checkpoint: true });
    expect(planWeek('2026-11-14', '2027-03-05')).toMatchObject({ week: 16, phase: 4, finished: false, checkpoint: true });
    expect(planWeek('2026-11-14', '2027-03-06')).toMatchObject({ week: 17, phase: 4, finished: true });
  });

  it('a clock moved back before the start stays in week 1', () => {
    expect(planWeek('2026-11-14', '2026-11-10').week).toBe(1);
  });
});

describe('checkpointDue', () => {
  it('asks for a benchmark in week 1, then again from week 5', () => {
    expect(checkpointDue('2026-11-14', '2026-11-15', [])).toBe(true);
    expect(checkpointDue('2026-11-14', '2026-11-15', ['2026-11-14'])).toBe(false);
    expect(checkpointDue('2026-11-14', '2026-12-05', ['2026-11-14'])).toBe(false);
    expect(checkpointDue('2026-11-14', '2026-12-12', ['2026-11-14'])).toBe(true);
    expect(checkpointDue('2026-11-14', '2026-12-20', ['2026-11-14', '2026-12-13'])).toBe(false);
  });

  it('a benchmark made before the plan does not count for week 1', () => {
    expect(checkpointDue('2026-11-14', '2026-11-14', ['2026-10-01'])).toBe(true);
  });

  it('is never due once the plan is over', () => {
    expect(checkpointDue('2026-11-14', '2027-04-01', [])).toBe(false);
  });
});

describe('minutesByDay', () => {
  it('adds time outside the app to the larger of counted time and session length', () => {
    const minutes = minutesByDay({
      sessions: [{ day: 'd1', startedAt: '2026-11-14T08:00:00Z', finishedAt: '2026-11-14T08:12:00Z', status: 'done' }],
      appSeconds: [{ day: 'd1', seconds: 600 }, { day: 'd1', seconds: 600 }, { day: 'd2', seconds: 90 }],
      logs: [{ day: 'd1', minutes: 30 }, { day: 'd1', minutes: 15, deleted: true }, { day: 'd3', minutes: 45 }],
    });
    expect(minutes.get('d1')).toEqual({ app: 20, outside: 30, total: 50 });
    expect(minutes.get('d2')).toEqual({ app: 2, outside: 0, total: 2 });
    expect(minutes.get('d3')).toEqual({ app: 0, outside: 45, total: 45 });
  });

  it('sessions still count on days before time was counted, unfinished ones do not', () => {
    const minutes = minutesByDay({
      sessions: [
        { day: 'd1', startedAt: '2026-11-14T08:00:00Z', finishedAt: '2026-11-14T08:12:00Z', status: 'done' },
        { day: 'd2', startedAt: '2026-11-15T08:00:00Z', status: 'active' },
      ],
      appSeconds: [],
      logs: [],
    });
    expect(minutes.get('d1')?.app).toBe(12);
    expect(minutes.has('d2')).toBe(false);
  });
});

const item = (id: string, level: PlacementItem['level'], skill: PlacementItem['skill'] = 'grammar'): PlacementItem => ({
  id, level, skill, question: '?', options: ['a', 'b', 'c'], answer: 0, explainVi: '.', ...(skill === 'listen' ? { audio: 'x' } : {}),
});
const ITEMS = (['A1', 'A2', 'B1', 'B2'] as const).flatMap((level) => [1, 2, 3, 4, 5].map((n) => item(`${level}-${n}`.toLowerCase(), level, n === 1 ? 'listen' : 'grammar')));
/** Answer the first `k` questions of a level right and the rest wrong. */
const answer = (level: string, k: number) => Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`${level}-${n}`.toLowerCase(), n <= k ? 0 : 1]));

describe('placement', () => {
  it('asks the easiest unanswered question first', () => {
    expect(nextItem(ITEMS, {})?.id).toBe('a1-1');
    expect(nextItem(ITEMS, answer('A1', 5))?.id).toBe('a2-1');
  });

  it('stops after a level answered mostly wrong', () => {
    const answers = { ...answer('A1', 4), ...answer('A2', 1) };
    expect(nextItem(ITEMS, answers)).toBeUndefined();
    expect(placementProgress(ITEMS, answers)).toEqual({ done: 10, total: 10 });
    expect(scorePlacement(ITEMS, answers).level).toBe('A1');
  });

  it('a borderline level goes on to the next one', () => {
    expect(nextItem(ITEMS, { ...answer('A1', 5), ...answer('A2', 2) })?.id).toBe('b1-1');
  });

  it('the level is the highest passed with every level under it passed', () => {
    expect(scorePlacement(ITEMS, { ...answer('A1', 5), ...answer('A2', 3), ...answer('B1', 2) }).level).toBe('A2');
    expect(scorePlacement(ITEMS, { ...answer('A1', 2) }).level).toBe('A0');
    expect(scorePlacement(ITEMS, { ...answer('A1', 5), ...answer('A2', 5), ...answer('B1', 5), ...answer('B2', 3) }).level).toBe('B2');
  });

  it('"don\'t know" counts as wrong and shows in the review', () => {
    const result = scorePlacement(ITEMS, { ...answer('A1', 4), 'a1-5': -1 });
    expect(result.correct).toBe(4);
    expect(result.missed.map((i) => i.id)).toEqual(['a1-5']);
    expect(result.bySkill.listen).toEqual([1, 1]);
    expect(result.bySkill.grammar).toEqual([3, 4]);
  });

  it('the real question set is valid, every level has enough, answers are spread out', () => {
    const { items } = placementSchema.parse(placementData);
    expect(placementProblems(items)).toEqual([]);
    const positions = new Set(items.map((i) => i.answer));
    expect(positions.size).toBeGreaterThanOrEqual(4);
  });
});

describe('needsFoundation', () => {
  it('sends A0–A2 to the foundation pack, B1 and up to their industry', () => {
    expect((['A0', 'A1', 'A2'] as const).map(needsFoundation)).toEqual([true, true, true]);
    expect((['B1', 'B2'] as const).map(needsFoundation)).toEqual([false, false]);
    expect(needsFoundation(undefined)).toBe(false);
  });
});
