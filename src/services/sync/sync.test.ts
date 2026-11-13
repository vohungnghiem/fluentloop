import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { finishReading, startSession } from '../learning';
import { memoryStore, DATA_FILE } from './store';
import { readLocal, syncWith, SYNC_TABLES, type SyncFile } from './sync';

const day1 = new Date('2026-11-10T20:00:00');
const day2 = new Date('2026-11-11T08:00:00');

/** One IndexedDB in tests: "another device" is this one wiped, with its own rows put back. */
async function freshDevice() {
  await db.delete();
  await db.open();
}

beforeEach(freshDevice);

describe('sync', () => {
  it('brings what was learnt on one device to another, and keeps both sides', async () => {
    const drive = memoryStore();
    // Laptop: a lesson read, its cards made.
    const session = await startSession(day1);
    await finishReading(session.id, session.plan.snippetId, session.plan.unitId, ['worked-on', 'pick-up'], day1);
    expect(await syncWith(drive, day1)).toEqual({ received: false, sent: true });

    // Phone, before signing in: something of its own (a half-typed capture).
    await freshDevice();
    await db.drafts.put({ key: 'capture', value: 'I worked on the', updatedAt: day2.toISOString() });
    expect(await syncWith(drive, day2)).toEqual({ received: true, sent: true });
    expect(await db.cards.count()).toBe(2);
    expect((await db.sessions.toArray())[0].id).toBe(session.id);

    // Laptop again: the phone's draft arrives, its own data is still there.
    const file = JSON.parse(String(drive.files.get(DATA_FILE)!.body)) as SyncFile;
    expect(file.tables.drafts).toHaveLength(1);
    expect(file.tables.cards).toHaveLength(2);
  });

  it('does not write when nothing changed', async () => {
    const drive = memoryStore();
    const session = await startSession(day1);
    await finishReading(session.id, session.plan.snippetId, session.plan.unitId, ['worked-on'], day1);
    await syncWith(drive, day1);
    const version = drive.files.get(DATA_FILE)!.version;
    expect(await syncWith(drive, day1)).toEqual({ received: false, sent: false });
    expect(drive.files.get(DATA_FILE)!.version).toBe(version);
  });

  it('merges again instead of overwriting when another device wrote meanwhile', async () => {
    const drive = memoryStore();
    await db.drafts.put({ key: 'a', value: 'mine', updatedAt: day1.toISOString() });
    const write = drive.write.bind(drive);
    let sneaked = false;
    // Just before this device writes, "another device" adds its row.
    drive.version = async () => {
      if (!sneaked) {
        sneaked = true;
        await write(JSON.stringify({ app: 'fluentloop', kind: 'sync', version: 1, savedAt: '', audio: [], tables: { drafts: [{ key: 'b', value: 'theirs', updatedAt: day1.toISOString() }] } }));
      }
      const file = drive.files.get(DATA_FILE);
      return file && String(file.version);
    };
    await syncWith(drive, day1);
    const file = JSON.parse(String(drive.files.get(DATA_FILE)!.body)) as SyncFile;
    expect(file.tables.drafts.map((row) => row.key).sort()).toEqual(['a', 'b']);
    expect(await db.drafts.get('b')).toBeTruthy();
  });

  it('sends a recording once, as its own file, and fetches it on the other device', async () => {
    const drive = memoryStore();
    const audio = new Blob(['sound'], { type: 'audio/webm' });
    await db.baselines.add({ id: 'b1', kind: 'audio', at: day1.toISOString(), day: '2026-11-10', audio, seconds: 60, updatedAt: day1.toISOString() });
    await syncWith(drive, day1);
    expect(drive.files.has('audio-b1')).toBe(true);
    const file = JSON.parse(String(drive.files.get(DATA_FILE)!.body)) as SyncFile;
    expect(file.audio).toEqual(['b1']);
    expect(file.tables.baselines[0].audio).toBeUndefined();

    await freshDevice();
    await syncWith(drive, day2);
    const row = await db.baselines.get('b1');
    expect(row?.audio).toBeInstanceOf(Blob);
    expect(await row!.audio!.text()).toBe('sound');
    // Nothing new to send: the recording is not uploaded twice.
    const before = drive.files.get('audio-b1')!.version;
    await syncWith(drive, day2);
    expect(drive.files.get('audio-b1')!.version).toBe(before);
  });

  it('reads local data without recordings and without the AI cache', async () => {
    await db.aiCache.put({ hash: 'h', result: {}, at: day1.toISOString() });
    const { tables } = await readLocal(SYNC_TABLES);
    expect(Object.keys(tables)).not.toContain('aiCache');
  });
});
