import { useSyncExternalStore } from 'react';
import { mergeTables, rowsBefore, SYNC_KEYS, type Row, type SyncTable, type Tables } from '../../core/sync/merge';
import { db } from '../db';
import { now } from '../clock';
import { AuthError, driveStore, fakeStore, gistStore, type RemoteStore } from './store';
import { canSignIn, currentToken, fakeMode, fetchEmail, forgetToken, revoke, signIn, takeSignInReturn } from './auth';
import { checkToken, githubToken, setGithubToken, takeTokenFromLink } from './github';

/**
 * Keeping devices in step: pull the shared copy, merge it row by row with this device's data,
 * write what arrived, and push back when the shared copy was behind. Runs on its own: when the app
 * opens, a few seconds after something is learnt, when the app is left or comes back, when the
 * network returns, and every few minutes. Recordings travel as separate files, once each.
 */

export const SYNC_TABLES = Object.keys(SYNC_KEYS) as SyncTable[];

export interface SyncFile {
  app: 'fluentloop';
  kind: 'sync';
  version: 1;
  savedAt: string;
  tables: Tables;
  /** Rows (benchmarks, talks) whose recording is stored as its own file. */
  audio: string[];
  /** The learner deleted their data at this time: rows older than it are gone on every device. */
  resetAt?: string;
}

/** The last data reset this device knows of ('' for none). */
export async function knownReset(): Promise<string> {
  return (await db.meta.get('resetAt'))?.value ?? '';
}
export const rememberReset = (at: string) => db.meta.put({ key: 'resetAt', value: at });

// ---------- the data on this device ----------

/** This device's rows, recordings taken out (they travel apart). */
export async function readLocal(tables: readonly SyncTable[]): Promise<{ tables: Tables; audio: Map<string, Blob> }> {
  const out: Tables = {};
  const audio = new Map<string, Blob>();
  for (const name of tables) {
    const rows = (await db.table(name).toArray()) as Row[];
    out[name] = rows.map((row) => {
      if (!(row.audio instanceof Blob)) return row;
      audio.set(String(row.id), row.audio);
      const { audio: _, ...rest } = row;
      return rest;
    });
  }
  return { tables: out, audio };
}

let applying = false;

/** Tables whose rows may carry a recording (`audio`), sent as files of their own. */
const AUDIO_TABLES: readonly SyncTable[] = ['baselines', 'talks'];

/** The rows of `tables` written at or after `resetAt`. */
function dropOld(tables: Tables, resetAt: string): Tables {
  const gone = rowsBefore(tables, resetAt, SYNC_TABLES);
  return Object.fromEntries(
    Object.entries(tables).map(([name, rows]) => {
      const ids = new Set(gone[name as SyncTable] ?? []);
      const key = SYNC_KEYS[name as SyncTable];
      return [name, key ? rows.filter((row) => !ids.has(String(row[key]))) : rows];
    }),
  );
}

/** Write what the merge decided. A recording already on this device is kept with its row. */
export async function applyLocal(toLocal: Partial<Record<SyncTable, Row[]>>, deleteLocal: Partial<Record<SyncTable, string[]>>) {
  const names = [...new Set([...Object.keys(toLocal), ...Object.keys(deleteLocal)])] as SyncTable[];
  if (!names.length) return;
  applying = true;
  try {
    await db.transaction('rw', names.map((name) => db.table(name)), async () => {
      for (const name of names) {
        const table = db.table(name);
        const rows = toLocal[name] ?? [];
        if (AUDIO_TABLES.includes(name)) {
          for (const row of rows) {
            const old = (await table.get(row.id as string)) as Row | undefined;
            if (old?.audio instanceof Blob && !(row.audio instanceof Blob)) row.audio = old.audio;
          }
        }
        if (rows.length) await table.bulkPut(rows);
        if (deleteLocal[name]?.length) await table.bulkDelete(deleteLocal[name]!);
      }
    });
  } finally {
    applying = false;
  }
}

// ---------- one round ----------

export interface SyncOutcome {
  received: boolean;
  sent: boolean;
}

/** One full round against a store. Retries when another device wrote in between. */
export async function syncWith(store: RemoteStore, at: Date): Promise<SyncOutcome> {
  const outcome: SyncOutcome = { received: false, sent: false };
  for (let tries = 0; tries < 3; tries++) {
    const remote = await store.read();
    let file: SyncFile | undefined;
    try {
      file = remote ? (JSON.parse(remote.text) as SyncFile) : undefined;
    } catch {
      file = undefined;
    }
    if (file && file.app !== 'fluentloop') throw new Error('not a FluentLoop file');

    // A reset on another device: drop what this device had from before it. A reset here that the
    // shared copy has not seen: its old rows are not taken back, and the copy is rewritten.
    const remoteReset = file?.resetAt ?? '';
    const localReset = await knownReset();
    let remoteTables = file?.tables ?? {};
    let remoteAudio = file?.audio ?? [];
    let force = false;
    if (remoteReset > localReset) {
      const before = await readLocal(SYNC_TABLES);
      await applyLocal({}, rowsBefore(before.tables, remoteReset, SYNC_TABLES));
      await rememberReset(remoteReset);
      outcome.received = true;
    } else if (localReset > remoteReset) {
      remoteTables = dropOld(remoteTables, localReset);
      remoteAudio = remoteAudio.filter((id) => AUDIO_TABLES.some((name) => remoteTables[name]?.some((row) => row.id === id)));
      force = true;
    }
    const resetAt = remoteReset > localReset ? remoteReset : localReset;

    const local = await readLocal(SYNC_TABLES);
    const merged = mergeTables(local.tables, remoteTables, SYNC_TABLES, at);
    await applyLocal(merged.toLocal, merged.deleteLocal);
    outcome.received ||= merged.localChanged;

    // Recordings: send the ones the shared copy lacks, fetch the ones this device lacks.
    const stored = new Set(remoteAudio);
    let audioSent = false;
    for (const [id, blob] of local.audio) {
      if (stored.has(id)) continue;
      await store.writeAudio(id, blob);
      stored.add(id);
      audioSent = true;
    }
    for (const id of stored) {
      if (local.audio.has(id)) continue;
      let table: (typeof AUDIO_TABLES)[number] | undefined;
      let row: Row | undefined;
      for (const name of AUDIO_TABLES) {
        row = (await db.table(name).get(id)) as Row | undefined;
        if (row) {
          table = name;
          break;
        }
      }
      if (!table || !row || row.audio) continue;
      const blob = await store.readAudio(id);
      if (blob) {
        applying = true;
        try {
          await db.table(table).update(id, { audio: blob });
        } finally {
          applying = false;
        }
        outcome.received = true;
      }
    }

    if (!merged.remoteBehind && !audioSent && !force) return outcome;
    // Another device wrote since the read: start over so its rows are merged, not overwritten.
    if ((await store.version()) !== remote?.version) continue;
    const next: SyncFile = { app: 'fluentloop', kind: 'sync', version: 1, savedAt: at.toISOString(), tables: merged.tables, audio: [...stored], ...(resetAt ? { resetAt } : {}) };
    await store.write(JSON.stringify(next));
    outcome.sent = true;
    return outcome;
  }
  throw new Error('the shared copy keeps changing');
}

// ---------- state the screens show ----------

export type SyncStatus = 'off' | 'syncing' | 'ok' | 'needsLogin' | 'offline' | 'error';

/** GitHub token (quickest to set up) or Google sign-in (needs a Client ID in the build). */
export type SyncMethod = 'github' | 'google';

export interface SyncState {
  /** Turned on on this device; stays on while the token renews. */
  on: boolean;
  method: SyncMethod;
  /** The account the data goes to: a GitHub login or a Google address. */
  email?: string;
  /** Signed in to Google without ticking the Drive permission. */
  noDrive?: boolean;
  status: SyncStatus;
  lastSyncedAt?: string;
}

const PREFS = 'fluentloop.sync';
const listeners = new Set<() => void>();
let state: SyncState = { on: false, method: 'github', status: 'off' };

const loadPrefs = (): Partial<Pick<SyncState, 'on' | 'method' | 'email' | 'lastSyncedAt'>> => {
  try {
    return JSON.parse(localStorage.getItem(PREFS) ?? '{}');
  } catch {
    return { on: false };
  }
};

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(PREFS, JSON.stringify({ on: state.on, method: state.method, email: state.email, lastSyncedAt: state.lastSyncedAt }));
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
}

export function useSync(): SyncState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

export const syncState = () => state;

// ---------- running it ----------

/** Where this device syncs to right now, or nothing when it has to sign in (again). */
function currentStore(): RemoteStore | undefined {
  if (state.method === 'github') {
    const token = githubToken();
    return token ? gistStore(token) : undefined;
  }
  const token = currentToken();
  return token && (token.token === 'fake' ? fakeStore() : driveStore(token.token));
}

let running: Promise<void> | undefined;
let again = false;

/** Sync now (or right after the round in progress). Never throws: the status says how it went. */
export function syncNow(): Promise<void> {
  if (!state.on) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      const store = currentStore();
      if (!store) {
        setState({ status: 'needsLogin' });
        return;
      }
      if (!navigator.onLine) {
        setState({ status: 'offline' });
        return;
      }
      setState({ status: 'syncing' });
      try {
        await syncWith(store, now());
        setState({ status: 'ok', noDrive: false, lastSyncedAt: new Date().toISOString() });
      } catch (error) {
        if (error instanceof AuthError) {
          if (state.method === 'google') forgetToken();
          else setGithubToken(undefined);
          setState({ status: 'needsLogin' });
          return;
        }
        setState({ status: navigator.onLine ? 'error' : 'offline' });
        return;
      }
    } while (again);
  })().finally(() => {
    running = undefined;
  });
  return running;
}

let timer: ReturnType<typeof setTimeout> | undefined;
let firstChange = 0;
/** A few seconds after the last change, and at most every 20 s while the learner keeps typing. */
function scheduleSync() {
  if (!state.on || applying) return;
  const at = Date.now();
  if (!timer) firstChange = at;
  clearTimeout(timer);
  timer = setTimeout(() => {
    timer = undefined;
    void syncNow();
  }, at - firstChange > 15_000 ? 0 : 4_000);
}

/** Turn sync on with a GitHub token: checked first, then the first round runs at once. */
export async function connectGithub(token: string): Promise<{ ok: true } | { ok: false; reason: 'bad' | 'scope' | 'offline' }> {
  const check = await checkToken(token);
  if (!check.ok) return check;
  setGithubToken(token);
  setState({ on: true, method: 'github', email: check.login });
  void syncNow();
  return { ok: true };
}

/** Turn sync on with Google: go to Google (or, in fake mode, start at once). */
export function startSignIn() {
  setState({ on: true, method: 'google' });
  if (signIn({ hint: state.email }) === 'done') void afterSignIn();
}

async function afterSignIn() {
  const token = currentToken();
  if (!token) return;
  const email = await fetchEmail(token);
  setState({ on: true, email });
  await syncNow();
}

/** Turn sync off on this device. Data stays here and on Drive. */
export function stopSync() {
  revoke();
  setGithubToken(undefined);
  setState({ on: false, status: 'off' });
}

const AUTO_TRIED = 'fluentloop.sync.autoTried';
/** Renew a lapsed token by the silent trip to Google, at most once every 10 minutes per tab. */
function renewSilently(): boolean {
  if (state.method !== 'google' || fakeMode() || !navigator.onLine) return false;
  try {
    const last = Number(sessionStorage.getItem(AUTO_TRIED) ?? 0);
    if (Date.now() - last < 10 * 60_000) return false;
    sessionStorage.setItem(AUTO_TRIED, String(Date.now()));
  } catch {
    return false;
  }
  signIn({ silent: true, hint: state.email });
  return true;
}

/** Called once before the app renders: handle a return from Google, then keep in step from here on. */
export function startSync() {
  const prefs = loadPrefs();
  const method = prefs.method ?? 'google';
  state = { on: !!prefs.on && (method === 'github' || canSignIn()), method, email: prefs.email, lastSyncedAt: prefs.lastSyncedAt, status: prefs.on ? 'ok' : 'off' };

  // A token passed from the computer by QR code: connect with it (settings shows the result).
  const handed = takeTokenFromLink();
  const back = takeSignInReturn();
  if (handed) void connectGithub(handed);
  else if (back?.ok) void afterSignIn();
  else if (back && !back.ok && back.noDrive) setState({ on: true, method: 'google', status: 'needsLogin', noDrive: true });
  // Cancelled on Google's page: sync stays off.
  else if (back && !back.silent && !currentToken()) setState({ on: false, status: 'off' });
  else if (state.on && !currentStore()) {
    // Coming back from a failed silent try: ask with a button rather than looping.
    if (back && !back.ok) setState({ status: 'needsLogin' });
    else if (renewSilently()) return;
    else setState({ status: 'needsLogin' });
  } else void syncNow();

  // Every change to the learning data schedules a sync (writes made by the sync itself do not).
  for (const name of SYNC_TABLES) {
    const table = db.table(name);
    table.hook('creating', scheduleSync);
    table.hook('updating', scheduleSync);
    table.hook('deleting', scheduleSync);
  }

  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (!state.on) return;
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      clearTimeout(timer);
      timer = undefined;
      void syncNow();
      return;
    }
    // Back after a while (a phone app resumed from the background): renew if needed, then pull.
    if (!currentStore() && Date.now() - hiddenAt > 15 * 60_000 && renewSilently()) return;
    void syncNow();
  });
  window.addEventListener('online', () => void syncNow());
  setInterval(() => document.visibilityState === 'visible' && void syncNow(), 5 * 60_000);
}
