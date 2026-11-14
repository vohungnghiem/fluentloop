import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addStudySeconds, getPlan, logOutside, placementItems, planToday, removeLog, savePlacement, savePlan } from './plan';
import { exportData, readBackup } from './backup';
import { startSession } from './learning';
import { newState } from '../core/srs/srs';

const day1 = new Date('2026-11-14T09:00:00');
const day9 = new Date('2026-11-22T09:00:00');

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('plan', () => {
  it('starts on the first save and keeps its start day after', async () => {
    await savePlan({ minutesPerDay: 120 }, day1);
    await savePlan({ minutesPerDay: 30 }, day9);
    expect(await getPlan()).toMatchObject({ startDay: '2026-11-14', minutesPerDay: 30 });
    await savePlan({ restart: true }, day9);
    expect((await getPlan())?.startDay).toBe('2026-11-22');
  });

  it('a placement test is kept and sets the level', async () => {
    const answers = Object.fromEntries(placementItems.filter((i) => i.level === 'A1' || i.level === 'A2').map((i) => [i.id, i.answer]));
    for (const item of placementItems.filter((i) => i.level === 'B1')) answers[item.id] = -1;
    const level = await savePlacement(answers, placementItems, day1);
    expect(level).toBe('A2');
    expect((await getPlan())?.level).toBe('A2');
    expect(await db.placements.count()).toBe(1);
  });

  it("today's minutes: time in the app plus time logged outside, undo drops a log", async () => {
    await savePlan({ minutesPerDay: 60 }, day1);
    await addStudySeconds(300, day1);
    await addStudySeconds(300, day1);
    await logOutside(30, 'listen', day1);
    await logOutside(15, 'speak', day1);
    let today = await planToday(day1);
    expect(today.today).toEqual({ app: 10, outside: 45, total: 55 });
    expect(today.plan && today.week.week).toBe(1);
    expect(today.plan && today.checkpointDue).toBe(true);
    const speak = (await db.studyLog.toArray()).find((l) => l.kind === 'speak')!;
    await removeLog(speak.id, day1);
    today = await planToday(day1);
    expect(today.today?.outside).toBe(30);
    expect(today.plan && today.logs.map((l) => l.kind)).toEqual(['listen']);
  });

  it('a daily goal of 30 minutes or more gives the session more reviews', async () => {
    const old = new Date('2026-11-01T09:00:00');
    await db.cards.bulkAdd(
      Array.from({ length: 20 }, (_, i) => ({
        id: `chunk:c${i}`, source: 'content' as const, chunkId: `c${i}`, unitId: 'u', kind: 'cloze' as const,
        fsrs: newState(old), createdAt: old.toISOString(), updatedAt: old.toISOString(),
      })),
    );
    expect((await startSession(day1)).plan.reviewCardIds).toHaveLength(10);
    await db.sessions.clear();
    await savePlan({ minutesPerDay: 120 }, day1);
    expect((await startSession(day1)).plan.reviewCardIds).toHaveLength(20);
  });

  it('the plan, tests and time travel in the backup', async () => {
    await savePlan({ minutesPerDay: 60 }, day1);
    await addStudySeconds(120, day1);
    await logOutside(30, 'read', day1);
    const { json, counts } = await exportData(day1);
    expect(counts).toMatchObject({ plans: 1, studyTime: 1, studyLog: 1 });
    await db.delete();
    await db.open();
    const preview = readBackup(json);
    if (!preview.ok) throw new Error('backup not read');
    await preview.apply();
    expect((await planToday(day1)).today).toEqual({ app: 2, outside: 30, total: 32 });
  });
});
