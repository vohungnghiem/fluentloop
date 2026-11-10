import { z } from 'zod';
import { db } from './db';

/**
 * Backup: everything learnt, in one JSON file. The AI key is not in it (it stays in the
 * browser's settings) and neither is the AI cache (it can be rebuilt). Recordings are inside
 * as base64, so one file moves a learner to a new phone.
 */

const TABLES = ['cards', 'reviews', 'attempts', 'sessions', 'reads', 'mistakes', 'captures', 'baselines', 'aiUsage'] as const;
type TableName = (typeof TABLES)[number];
const LAST_EXPORT = 'fluentloop.lastExport';

const backupSchema = z.object({
  app: z.literal('fluentloop'),
  version: z.literal(1),
  exportedAt: z.string(),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const dataUrlToBlob = async (url: string) => (await fetch(url)).blob();

export async function exportData(now: Date): Promise<{ json: string; fileName: string; counts: Record<string, number> }> {
  const tables: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  for (const name of TABLES) {
    const rows = await db.table(name).toArray();
    tables[name] = await Promise.all(
      rows.map(async (row) => (row.audio instanceof Blob ? { ...row, audio: await blobToDataUrl(row.audio) } : row)),
    );
    counts[name] = rows.length;
  }
  const json = JSON.stringify({ app: 'fluentloop', version: 1, exportedAt: now.toISOString(), tables });
  return { json, fileName: `fluentloop-${now.toISOString().slice(0, 10)}.json`, counts };
}

/** Save the export as a file download and remember when. */
export async function downloadBackup(now: Date) {
  const { json, fileName } = await exportData(now);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  try {
    localStorage.setItem(LAST_EXPORT, now.toISOString());
  } catch {
    // ignore
  }
}

export function lastExport(): string | undefined {
  try {
    return localStorage.getItem(LAST_EXPORT) ?? undefined;
  } catch {
    return undefined;
  }
}

export type ImportPreview = { ok: true; exportedAt: string; counts: Record<string, number>; apply: () => Promise<void> } | { ok: false };

/** Read a backup file. Nothing changes until `apply`, which replaces all learning data. */
export function readBackup(json: string): ImportPreview {
  let parsed;
  try {
    parsed = backupSchema.safeParse(JSON.parse(json));
  } catch {
    return { ok: false };
  }
  if (!parsed.success) return { ok: false };
  const { tables, exportedAt } = parsed.data;
  const counts = Object.fromEntries(TABLES.map((name) => [name, tables[name]?.length ?? 0]));
  const apply = async () => {
    const restored: Partial<Record<TableName, unknown[]>> = {};
    for (const name of TABLES) {
      restored[name] = await Promise.all(
        (tables[name] ?? []).map(async (row) => (typeof row.audio === 'string' ? { ...row, audio: await dataUrlToBlob(row.audio) } : row)),
      );
    }
    await db.transaction('rw', TABLES.map((name) => db.table(name)), async () => {
      for (const name of TABLES) {
        await db.table(name).clear();
        await db.table(name).bulkPut(restored[name] ?? []);
      }
    });
  };
  return { ok: true, exportedAt, counts, apply };
}
