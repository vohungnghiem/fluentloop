import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { exportData, readBackup } from './backup';
import { finishReading, startSession } from './learning';

const day1 = new Date('2026-11-10T20:00:00');

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('backup', () => {
  it('export then import gives back the same learning data', async () => {
    const session = await startSession(day1);
    await finishReading(session.id, session.plan.snippetId, session.plan.unitId, ['worked-on', 'pick-up'], day1);
    const { json, counts } = await exportData(day1);
    expect(counts).toMatchObject({ cards: 2, sessions: 1, reads: 1 });
    expect(json).not.toMatch(/geminiKey|openaiKey/);

    await db.cards.clear();
    const preview = readBackup(json);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.counts.cards).toBe(2);
    await preview.apply();
    expect(await db.cards.count()).toBe(2);
    expect((await db.cards.get('chunk:worked-on'))?.fsrs.due).toBeTruthy();
  });

  it('refuses a file that is not a FluentLoop backup', () => {
    expect(readBackup('{"hello":1}').ok).toBe(false);
    expect(readBackup('not json').ok).toBe(false);
  });
});
