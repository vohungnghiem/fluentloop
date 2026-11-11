import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../services/db';

/**
 * A draft kept in IndexedDB while the learner types: saved a moment after each change and when the
 * page is hidden, read back on the next visit. Saving `undefined` or '' deletes it.
 */
export function useDraft<T>(key: string | undefined) {
  const [state, setState] = useState<{ ready: boolean; saved?: T }>({ ready: !key });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<{ value: T | undefined }>(undefined);

  const write = useCallback(() => {
    clearTimeout(timer.current);
    const next = pending.current;
    pending.current = undefined;
    if (!key || !next) return;
    const empty = next.value === undefined || next.value === '';
    void (empty ? db.drafts.delete(key) : db.drafts.put({ key, value: next.value, updatedAt: new Date().toISOString() }));
  }, [key]);

  useEffect(() => {
    if (!key) return;
    let live = true;
    setState({ ready: false });
    void db.drafts.get(key).then((row) => live && setState({ ready: true, saved: row?.value as T | undefined }));
    // Leaving the screen or the page writes what is still waiting.
    window.addEventListener('pagehide', write);
    return () => {
      live = false;
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
  const update = useCallback((next: string) => {
    touched.current = true;
    setText(next);
    draft.save(next);
  }, [draft.save]);
  return [text, update] as const;
}
