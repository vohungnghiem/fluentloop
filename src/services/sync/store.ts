/**
 * Where the shared copy lives: the app's hidden folder on the learner's own Google Drive
 * (`appDataFolder`: only this app sees it, nothing else in the Drive is touched). One JSON file
 * for the learning data, one file per recording. A fake store stands in for tests and the debug page.
 */

export const DATA_FILE = 'fluentloop-sync.json';
const audioName = (id: string) => `audio-${id}`;

export class AuthError extends Error {}

export interface RemoteStore {
  /** The data file and its version, or nothing on a brand new account. */
  read(): Promise<{ text: string; version: string } | undefined>;
  /** The data file's current version, to see whether another device wrote since `read`. */
  version(): Promise<string | undefined>;
  write(text: string): Promise<void>;
  readAudio(id: string): Promise<Blob | undefined>;
  writeAudio(id: string, blob: Blob): Promise<void>;
}

const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

export function driveStore(token: string): RemoteStore {
  const ids = new Map<string, string>();
  const call = async (url: string, init: RequestInit = {}) => {
    const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } });
    if (response.status === 401 || response.status === 403) throw new AuthError(String(response.status));
    if (!response.ok) throw new Error(`Drive ${response.status}`);
    return response;
  };
  const find = async (name: string) => {
    if (ids.has(name)) return { id: ids.get(name)!, version: undefined as string | undefined };
    const q = encodeURIComponent(`name='${name}' and trashed=false`);
    const { files } = (await (await call(`${API}?spaces=appDataFolder&q=${q}&fields=files(id,version)`)).json()) as { files: Array<{ id: string; version: string }> };
    if (files[0]) ids.set(name, files[0].id);
    return files[0];
  };
  const upload = async (name: string, body: Blob) => {
    const found = await find(name);
    if (found) {
      await call(`${UPLOAD}/${found.id}?uploadType=media`, { method: 'PATCH', body });
      return;
    }
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify({ name, parents: ['appDataFolder'] })], { type: 'application/json' }));
    form.append('file', body);
    const { id } = (await (await call(`${UPLOAD}?uploadType=multipart&fields=id`, { method: 'POST', body: form })).json()) as { id: string };
    ids.set(name, id);
  };
  const download = async (name: string) => {
    const found = await find(name);
    return found ? (await call(`${API}/${found.id}?alt=media`)).blob() : undefined;
  };
  const version = async () => {
    const found = await find(DATA_FILE);
    if (!found) return undefined;
    const { version } = (await (await call(`${API}/${found.id}?fields=version`)).json()) as { version: string };
    return version;
  };

  return {
    async read() {
      const found = await find(DATA_FILE);
      if (!found) return undefined;
      const [text, v] = await Promise.all([(await call(`${API}/${found.id}?alt=media`)).text(), version()]);
      return { text, version: v ?? '' };
    },
    version,
    write: (text) => upload(DATA_FILE, new Blob([text], { type: 'application/json' })),
    readAudio: (id) => download(audioName(id)),
    writeAudio: (id, blob) => upload(audioName(id), blob),
  };
}

/** A store in memory: two "devices" sharing one of these is how the sync is tested. */
export function memoryStore(): RemoteStore & { files: Map<string, { body: string | Blob; version: number }> } {
  const files = new Map<string, { body: string | Blob; version: number }>();
  const put = (name: string, body: string | Blob) => files.set(name, { body, version: (files.get(name)?.version ?? 0) + 1 });
  return {
    files,
    async read() {
      const file = files.get(DATA_FILE);
      return file && { text: String(file.body), version: String(file.version) };
    },
    async version() {
      const file = files.get(DATA_FILE);
      return file && String(file.version);
    },
    async write(text) {
      put(DATA_FILE, text);
    },
    async readAudio(id) {
      const body = files.get(audioName(id))?.body;
      return body instanceof Blob ? body : undefined;
    },
    async writeAudio(id, blob) {
      put(audioName(id), blob);
    },
  };
}

/**
 * The debug page's "fake Drive": kept in this browser's localStorage, so the whole flow (sign in,
 * status, another device's data arriving) can be tried without a Google account.
 */
export function fakeStore(): RemoteStore {
  const KEY = 'fluentloop.fakeDrive';
  const load = (): Record<string, { body: string; version: number }> => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '{}');
    } catch {
      return {};
    }
  };
  const put = (name: string, body: string) => {
    const all = load();
    all[name] = { body, version: (all[name]?.version ?? 0) + 1 };
    localStorage.setItem(KEY, JSON.stringify(all));
  };
  const toDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  return {
    async read() {
      const file = load()[DATA_FILE];
      return file && { text: file.body, version: String(file.version) };
    },
    async version() {
      const file = load()[DATA_FILE];
      return file && String(file.version);
    },
    async write(text) {
      put(DATA_FILE, text);
    },
    async readAudio(id) {
      const file = load()[audioName(id)];
      return file ? (await fetch(file.body)).blob() : undefined;
    },
    async writeAudio(id, blob) {
      put(audioName(id), await toDataUrl(blob));
    },
  };
}

/**
 * A secret gist of the learner's, through a GitHub token with the `gist` permission. Recordings are
 * text files there (data URLs). GitHub caches answers for a minute, so every call skips the cache.
 */
export function gistStore(token: string): RemoteStore {
  const GIST_ID = 'fluentloop.sync.gistId';
  const API_GISTS = 'https://api.github.com/gists';
  type GistFile = { raw_url: string; content?: string; truncated?: boolean };
  let files: Record<string, GistFile> = {};
  let id: string | undefined = (() => {
    try {
      return localStorage.getItem(GIST_ID) ?? undefined;
    } catch {
      return undefined;
    }
  })();
  const remember = (next: string | undefined) => {
    id = next;
    try {
      if (next) localStorage.setItem(GIST_ID, next);
      else localStorage.removeItem(GIST_ID);
    } catch {
      // ignore
    }
  };
  const call = async (url: string, init: RequestInit = {}) => {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', ...init.headers },
    });
    if (response.status === 401 || response.status === 403) throw new AuthError(String(response.status));
    return response;
  };
  /** The gist holding the data file: the remembered one, else found among the learner's gists. */
  const findId = async () => {
    if (id) return id;
    for (let page = 1; page <= 10; page++) {
      const response = await call(`${API_GISTS}?per_page=100&page=${page}`);
      if (!response.ok) throw new Error(`GitHub ${response.status}`);
      const list = (await response.json()) as Array<{ id: string; files: Record<string, unknown> }>;
      const found = list.find((gist) => DATA_FILE in gist.files);
      if (found) {
        remember(found.id);
        return found.id;
      }
      if (list.length < 100) return undefined;
    }
    return undefined;
  };
  const content = async (file: GistFile | undefined) => {
    if (!file) return undefined;
    if (!file.truncated && file.content !== undefined) return file.content;
    return (await fetch(file.raw_url, { cache: 'no-store' })).text();
  };
  const patch = async (changes: Record<string, { content: string }>) => {
    const gist = await findId();
    const response = gist
      ? await call(`${API_GISTS}/${gist}`, { method: 'PATCH', body: JSON.stringify({ files: changes }) })
      : await call(API_GISTS, { method: 'POST', body: JSON.stringify({ description: 'FluentLoop sync (do not edit)', public: false, files: changes }) });
    if (!response.ok) throw new Error(`GitHub ${response.status}`);
    const saved = (await response.json()) as { id: string; files: Record<string, GistFile> };
    remember(saved.id);
    files = saved.files;
  };
  const toDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

  const version = async () => {
    const gist = await findId();
    if (!gist) return undefined;
    const response = await call(`${API_GISTS}/${gist}/commits?per_page=1`);
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`GitHub ${response.status}`);
    const [last] = (await response.json()) as Array<{ version: string }>;
    return last?.version;
  };

  return {
    async read() {
      const gist = await findId();
      if (!gist) return undefined;
      const response = await call(`${API_GISTS}/${gist}`);
      if (response.status === 404) {
        // Deleted on GitHub: start a new one on the next write.
        remember(undefined);
        return undefined;
      }
      if (!response.ok) throw new Error(`GitHub ${response.status}`);
      const data = (await response.json()) as { files: Record<string, GistFile>; history: Array<{ version: string }> };
      files = data.files;
      const text = await content(files[DATA_FILE]);
      return text === undefined ? undefined : { text, version: data.history[0]?.version ?? '' };
    },
    version,
    write: (text) => patch({ [DATA_FILE]: { content: text } }),
    async readAudio(audioId) {
      const text = await content(files[`${audioName(audioId)}.txt`]);
      return text ? (await fetch(text)).blob() : undefined;
    },
    async writeAudio(audioId, blob) {
      await patch({ [`${audioName(audioId)}.txt`]: { content: await toDataUrl(blob) } });
    },
  };
}
