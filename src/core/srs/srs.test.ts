import { describe, expect, it } from 'vitest';
import { dueQueue, grade, isDue, newState, ratingFor } from './srs';

const at = (text: string) => new Date(text);

describe('srs', () => {
  it('a new card is due tomorrow, not today', () => {
    const state = newState(at('2026-11-10T20:00:00'));
    expect(isDue(state, at('2026-11-10T23:59:00'))).toBe(false);
    expect(isDue(state, at('2026-11-11T07:00:00'))).toBe(true);
  });

  it('a good recall pushes the card days ahead, a lapse brings it back soon', () => {
    const learnt = newState(at('2026-11-10T09:00:00'));
    const good = grade(learnt, 'good', at('2026-11-11T09:00:00'));
    expect(Date.parse(good.due)).toBeGreaterThan(Date.parse('2026-11-12T00:00:00'));
    const again = grade(good, 'again', at(good.due));
    expect(Date.parse(again.due) - Date.parse(good.due)).toBeLessThanOrEqual(2 * 86_400_000);
    expect(again.lapses).toBe(1);
  });

  it('the queue is most overdue first and never passes the daily cap', () => {
    const now = at('2026-11-20T09:00:00');
    const cards = [
      { id: 'b', fsrs: newState(at('2026-11-12T09:00:00')) },
      { id: 'a', fsrs: newState(at('2026-11-15T09:00:00')) },
      { id: 'later', fsrs: newState(at('2026-11-25T09:00:00')) },
    ];
    expect(dueQueue(cards, now, 0).map((card) => card.id)).toEqual(['b', 'a']);
    expect(dueQueue(cards, now, 19).map((card) => card.id)).toEqual(['b']);
    expect(dueQueue(cards, now, 20)).toEqual([]);
  });

  it('rates by how the answer was reached', () => {
    expect(ratingFor({ result: 'correct', hintShown: false, gaveUp: false, tries: 1 })).toBe('good');
    expect(ratingFor({ result: 'correct', hintShown: true, gaveUp: false, tries: 1 })).toBe('hard');
    expect(ratingFor({ result: 'close', hintShown: false, gaveUp: false, tries: 1 })).toBe('hard');
    expect(ratingFor({ result: 'wrong', hintShown: false, gaveUp: true, tries: 2 })).toBe('again');
  });
});
