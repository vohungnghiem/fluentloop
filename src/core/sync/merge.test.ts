import { describe, expect, it } from 'vitest';
import { mergeTables, stableJson, type SyncTable } from './merge';

const now = new Date('2026-11-13T10:00:00Z');
const ALL: SyncTable[] = ['cards', 'reviews', 'sessions', 'aiUsage', 'drafts'];

describe('mergeTables', () => {
  it('keeps rows from both sides and the copy changed last', () => {
    const local = {
      cards: [
        { id: 'chunk:a', due: 'local', updatedAt: '2026-11-12T08:00:00Z' },
        { id: 'chunk:b', due: 'local', updatedAt: '2026-11-12T08:00:00Z' },
      ],
      reviews: [{ id: 'r1', cardId: 'chunk:a' }],
    };
    const remote = {
      cards: [
        { id: 'chunk:a', due: 'remote', updatedAt: '2026-11-12T09:00:00Z' },
        { id: 'chunk:b', due: 'remote', updatedAt: '2026-11-12T07:00:00Z' },
        { id: 'chunk:c', due: 'remote', updatedAt: '2026-11-12T07:00:00Z' },
      ],
      reviews: [{ id: 'r2', cardId: 'chunk:c' }],
    };
    const result = mergeTables(local, remote, ALL, now);
    const due = Object.fromEntries(result.tables.cards.map((row) => [row.id, row.due]));
    expect(due).toEqual({ 'chunk:a': 'remote', 'chunk:b': 'local', 'chunk:c': 'remote' });
    expect(result.tables.reviews.map((row) => row.id).sort()).toEqual(['r1', 'r2']);
    expect(result.toLocal.cards?.map((row) => row.id).sort()).toEqual(['chunk:a', 'chunk:c']);
    expect(result.toLocal.reviews?.map((row) => row.id)).toEqual(['r2']);
    expect(result.remoteBehind).toBe(true);
    expect(result.localChanged).toBe(true);
  });

  it('changes nothing when both sides already agree, whatever the key order', () => {
    const local = { cards: [{ id: 'x', a: 1, updatedAt: 't' }] };
    const remote = { cards: [{ updatedAt: 't', a: 1, id: 'x' }] };
    const result = mergeTables(local, remote, ALL, now);
    expect(result.remoteBehind).toBe(false);
    expect(result.localChanged).toBe(false);
  });

  it('sends everything when the other side is empty (first sign-in)', () => {
    const result = mergeTables({ cards: [{ id: 'x', updatedAt: 't' }] }, {}, ALL, now);
    expect(result.remoteBehind).toBe(true);
    expect(result.localChanged).toBe(false);
  });

  it('counts AI calls by the higher number of the day', () => {
    const result = mergeTables({ aiUsage: [{ day: '2026-11-13', count: 3 }] }, { aiUsage: [{ day: '2026-11-13', count: 5 }] }, ALL, now);
    expect(result.tables.aiUsage[0].count).toBe(5);
  });

  it('leaves one session in progress, the one touched last', () => {
    const local = { sessions: [{ id: 's1', status: 'active', updatedAt: '2026-11-13T08:00:00Z' }] };
    const remote = { sessions: [{ id: 's2', status: 'active', updatedAt: '2026-11-13T09:00:00Z' }] };
    const result = mergeTables(local, remote, ALL, now);
    const status = Object.fromEntries(result.tables.sessions.map((row) => [row.id, row.status]));
    expect(status).toEqual({ s1: 'done', s2: 'active' });
    // The same answer on the other device, so both end up agreeing.
    const other = mergeTables(remote, local, ALL, now);
    expect(stableJson(other.tables.sessions.sort((a, b) => String(a.id).localeCompare(String(b.id))))).toBe(
      stableJson(result.tables.sessions.sort((a, b) => String(a.id).localeCompare(String(b.id)))),
    );
  });

  it('passes a deleted draft on, and forgets the marker after a month', () => {
    const local = { drafts: [{ key: 'capture', value: 'half a sentence', updatedAt: '2026-11-13T08:00:00Z' }] };
    const remote = { drafts: [{ key: 'capture', deleted: true, updatedAt: '2026-11-13T09:00:00Z' }] };
    const result = mergeTables(local, remote, ALL, now);
    expect(result.toLocal.drafts?.[0]).toMatchObject({ deleted: true });

    const old = { drafts: [{ key: 'capture', deleted: true, updatedAt: '2026-09-01T00:00:00Z' }] };
    const pruned = mergeTables(old, old, ALL, now);
    expect(pruned.tables.drafts).toEqual([]);
    expect(pruned.deleteLocal.drafts).toEqual(['capture']);
    expect(pruned.remoteBehind).toBe(true);
  });
});
