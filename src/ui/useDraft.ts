import { useCallback, useEffect, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import { db } from '../services/db';
import { stableJson } from '../core/sync/merge';

/**
 * A draft kept in IndexedDB while the learner types: saved a moment after each change and when the
 * page is hidden, read back on the next visit. Saving `undefined` or '' clears it (a marker stays,
 * so a synced device clears it too). A newer draft arriving from another device bumps `remote`,
 * and the screen takes it, so typing on here does not overwrite what was written over there.
 */
export function useDraft<T>(key: string | undefined) {
  const [state, setState] = useState<{ ready: boolean; saved?: T; remote: number }>({ ready: !key, remote: 0 });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<{ value: T | undefined }>(undefined);
  /** What this screen last read or wrote: the same again is not written, another stamp came from elsewhere. */
  const known = useRef<{ json: string; updatedAt?: string }>({ json: stableJson(undefined) });

  const write = useCallback(() => {
    clearTimeout(timer.current);
    const next = pending.current;
    pending.current = undefined;
    if (!key || !next) return;
    const empty = next.value === undefined || next.value === '';
    const json = stableJson(empty ? undefined : next.value);
    if (json === known.current.json) return;
    const updatedAt = new Date().toISOString();
    known.current = { json, updatedAt };
    void (empty
      ? db.drafts.get(key).then((row) => {
          if (row && !row.deleted) void db.drafts.put({ key, value: undefined, deleted: true, updatedAt });
        })
      : db.drafts.put({ key, value: next.value, updatedAt }));
  }, [key]);

  useEffect(() => {
    if (!key) return;
    let first = true;
    setState({ ready: false, remote: 0 });
    known.current = { json: stableJson(undefined) };
    const subscription = liveQuery(() => db.drafts.get(key)).subscribe((row) => {
      const value = row && !row.deleted ? (row.value as T) : undefined;
      if (first) {
        first = false;
        known.current = { json: stableJson(value), updatedAt: row?.updatedAt };
        setState({ ready: true, saved: value, remote: 0 });
        return;
      }
      if (!row || row.updatedAt === known.current.updatedAt) return;
      // The other device's text is newer than what waits to be written here.
      clearTimeout(timer.current);
      pending.current = undefined;
      known.current = { json: stableJson(value), updatedAt: row.updatedAt };
      setState((old) => ({ ready: true, saved: value, remote: old.remote + 1 }));
    });
    // Leaving the screen or the page writes what is still waiting.
    window.addEventListener('pagehide', write);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('pagehide', write);
      write();
    };
  }, [key, write]);

  const save = useCallback((value: T | undefined) => {
    pending.current = { value };
    clearTimeout(timer.current);
    timer.current = setTimeout(write, 300);
  }, [write]);
  /** Done with it: drop the draft now. */
  const clear = useCallback(() => {
    pending.current = { value: undefined };
    write();
  }, [write]);

  return { ...state, save, clear };
}

/** `useState` for a text box whose text survives leaving and reloading. */
export function useDraftText(key: string, initial = '') {
  const [text, setText] = useState(initial);
  const draft = useDraft<string>(key);
  const touched = useRef(false);
  useEffect(() => {
    // The saved draft wins, unless the text came from elsewhere or the learner already started typing.
    if (draft.ready && draft.saved && !touched.current && !initial) setText(draft.saved);
  }, [draft.ready, draft.saved, initial]);
  useEffect(() => {
    // Newer text typed on another device.
    if (draft.remote > 0) setText(draft.saved ?? '');
  }, [draft.remote]);
  const update = useCallback((next: string) => {
    touched.current = true;
    setText(next);
    draft.save(next);
  }, [draft.save]);
  return [text, update] as const;
}
