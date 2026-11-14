import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { exportData, readBackup } from './backup';
import { finishReading, recordAttempt, startSession } from './learning';

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

  it('import merges: what this device learnt since the backup stays', async () => {
    const session = await startSession(day1);
    await finishReading(session.id, session.plan.snippetId, session.plan.unitId, ['worked-on'], day1);
    const { json } = await exportData(day1);
    const later = new Date('2026-11-11T20:00:00');
    await db.cards.update('chunk:worked-on', { fsrs: { ...(await db.cards.get('chunk:worked-on'))!.fsrs, due: 'later' }, updatedAt: later.toISOString() });
    await db.reads.put({ snippetId: 'other', lastReadAt: later.toISOString(), updatedAt: later.toISOString() });

    const preview = readBackup(json);
    if (!preview.ok) throw new Error('bad file');
    await preview.apply();
    expect((await db.cards.get('chunk:worked-on'))?.fsrs.due).toBe('later');
    expect(await db.reads.get('other')).toBeTruthy();
    expect(await db.sessions.count()).toBe(1);
  });

  it('keeps every version of an answer with its feedback', async () => {
    const feedback = { points: [{ vi: 'Hôm qua làm gì', status: 'ok' as const }], required: [], mistakes: [{ wrong: 'fix', right: 'fixed', label: 'past-tense' as const, vi: 'Quá khứ' }], corrected: 'I fixed it.', upgrades: [], complete: true, closestModel: 'I fixed it.' };
    const versions = [
      { text: 'I fix it.', source: 'ai' as const, feedback, chosenMistakes: [0], chosenUpgrades: [] },
      { text: 'I fixed it.', source: 'ai' as const, feedback: { ...feedback, mistakes: [] }, chosenMistakes: [], chosenUpgrades: [] },
    ];
    const id = await recordAttempt(undefined, { taskId: 't', snippetId: 's', text: 'I fixed it.', usedRequired: [], missingRequired: [], revisions: ['I fix it.'], versions, promptVi: 'Kể hôm qua' }, day1);
    const { json } = await exportData(day1);
    await db.attempts.clear();
    const preview = readBackup(json);
    if (!preview.ok) throw new Error('bad file');
    await preview.apply();
    const back = await db.attempts.get(id);
    expect(back?.versions).toEqual(versions);
    expect(back?.promptVi).toBe('Kể hôm qua');
  });

  it('refuses a file that is not a FluentLoop backup', () => {
    expect(readBackup('{"hello":1}').ok).toBe(false);
    expect(readBackup('not json').ok).toBe(false);
  });
});
