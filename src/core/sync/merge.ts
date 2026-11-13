/**
 * Merging the learning data of two devices, row by row, so nothing learnt on either is lost.
 * Pure: the same two sides and the same `now` always give the same result, on any device.
 */

export type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;

/** The tables that travel between devices, each with its key field. */
export const SYNC_KEYS = {
  cards: 'id',
  reviews: 'id',
  attempts: 'id',
  sessions: 'id',
  reads: 'snippetId',
  mistakes: 'id',
  captures: 'id',
  baselines: 'id',
  aiUsage: 'day',
  roleplays: 'scenarioId',
  drafts: 'key',
} as const;
export type SyncTable = keyof typeof SYNC_KEYS;

/** A deleted draft is kept as a marker this long, so the other device deletes it too. */
const TOMBSTONE_DAYS = 30;

export interface MergeResult {
  tables: Tables;
  /** Rows this device must write, and keys it must delete. */
  toLocal: Partial<Record<SyncTable, Row[]>>;
  deleteLocal: Partial<Record<SyncTable, string[]>>;
  /** Whether the other side lacks something: then the merged data must be sent back. */
  remoteBehind: boolean;
  /** Whether this device received anything. */
  localChanged: boolean;
}

/** JSON with sorted keys: two copies of the same row compare equal whatever their key order. */
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .filter((k) => (value as Row)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson((value as Row)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** Which copy of a row to keep: the one changed last (AI calls: the higher count). Ties keep this device's. */
function pick(table: SyncTable, local: Row, remote: Row): Row {
  if (table === 'aiUsage') return Number(remote.count) > Number(local.count) ? remote : local;
  return String(remote.updatedAt ?? '') > String(local.updatedAt ?? '') ? remote : local;
}

/**
 * Two sessions in progress (each device started one before they met): the one touched last stays
 * open, the others count as done, so today's work is kept and only one session is resumed.
 */
function oneActiveSession(rows: Row[], now: Date): Row[] {
  const active = rows.filter((row) => row.status === 'active');
  if (active.length < 2) return rows;
  const keep = active.reduce((a, b) => (String(b.updatedAt) > String(a.updatedAt) ? b : a));
  return rows.map((row) =>
    row.status === 'active' && row !== keep ? { ...row, status: 'done', finishedAt: row.updatedAt, updatedAt: now.toISOString() } : row,
  );
}

export function mergeTables(local: Tables, remote: Tables, tables: readonly SyncTable[], now: Date): MergeResult {
  const result: MergeResult = { tables: {}, toLocal: {}, deleteLocal: {}, remoteBehind: false, localChanged: false };
  const oldest = new Date(now.getTime() - TOMBSTONE_DAYS * 86_400_000).toISOString();

  for (const table of tables) {
    const key = SYNC_KEYS[table];
    const mine = new Map((local[table] ?? []).map((row) => [String(row[key]), row]));
    const theirs = new Map((remote[table] ?? []).map((row) => [String(row[key]), row]));
    let merged: Row[] = [];
    for (const id of new Set([...mine.keys(), ...theirs.keys()])) {
      const a = mine.get(id);
      const b = theirs.get(id);
      merged.push(a && b ? pick(table, a, b) : (a ?? b)!);
    }
    if (table === 'sessions') merged = oneActiveSession(merged, now);
    if (table === 'drafts') merged = merged.filter((row) => !(row.deleted && String(row.updatedAt) < oldest));

    const kept = new Set<string>();
    const write: Row[] = [];
    for (const row of merged) {
      const id = String(row[key]);
      kept.add(id);
      const a = mine.get(id);
      const b = theirs.get(id);
      if (!a || stableJson(a) !== stableJson(row)) write.push(row);
      if (!b || stableJson(b) !== stableJson(row)) result.remoteBehind = true;
    }
    const gone = [...mine.keys()].filter((id) => !kept.has(id));
    if ([...theirs.keys()].some((id) => !kept.has(id))) result.remoteBehind = true;
    if (write.length) result.toLocal[table] = write;
    if (gone.length) result.deleteLocal[table] = gone;
    if (write.length || gone.length) result.localChanged = true;
    result.tables[table] = merged;
  }
  return result;
}
