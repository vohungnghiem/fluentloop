import { describe, expect, it } from 'vitest';
import unitJson from '../../../content/tracks/dev/units/standup.json';
import trackJson from '../../../content/tracks/dev/track.json';
import ticketJson from '../../../content/tracks/dev/units/ticket.json';
import prJson from '../../../content/tracks/dev/units/pr.json';
import { contentProblems, trackSchema, unitSchema } from '../content/schema';
import { nextSnippet, planSession } from './plan';

const unit = unitSchema.parse(unitJson);
const units = [unit];

describe('content', () => {
  it('the dev track is sound', () => {
    const all = [unit, unitSchema.parse(ticketJson), unitSchema.parse(prJson)];
    expect(contentProblems({ tracks: [trackSchema.parse(trackJson)], units: all })).toEqual([]);
  });
});

describe('planSession', () => {
  it('first session: no review, the first snippet', () => {
    const plan = planSession({ units, readSnippets: [], dueCards: [], minutes: 15 });
    expect(plan.steps).toEqual(['input', 'shadow', 'produce', 'wrap']);
    expect(plan.snippetId).toBe('standup-first');
  });

  it('with due cards: a warm-up first, at most what the session length allows', () => {
    const dueCards = Array.from({ length: 14 }, (_, i) => ({ id: `c${i}`, chunkId: 'worked-on' }));
    const plan = planSession({ units, readSnippets: ['standup-first'], dueCards, minutes: 15 });
    expect(plan.steps).toEqual(['review', 'input', 'shadow', 'produce', 'wrap']);
    expect(plan.reviewCardIds).toHaveLength(10);
    expect(plan.snippetId).toBe('standup-blocked');
  });

  it('always takes the next lesson in order', () => {
    const { snippet } = nextSnippet({ units, readSnippets: ['standup-first'] });
    expect(snippet.id).toBe('standup-blocked');
  });

  it('a chosen lesson wins over the order', () => {
    const plan = planSession({ units, readSnippets: [], dueCards: [], minutes: 15, snippetId: 'standup-ooo' });
    expect(plan.snippetId).toBe('standup-ooo');
  });

  it('when all is read, starts again from the one read longest ago', () => {
    const readSnippets = unit.snippets.map((s) => s.id).reverse();
    expect(nextSnippet({ units, readSnippets }).snippet.id).toBe('standup-ooo');
  });
});
