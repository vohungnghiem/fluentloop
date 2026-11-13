/**
 * Signing in with Google, without a server and without pop-ups: the page goes to Google and comes
 * back with a token in the address bar's #fragment (never sent to a server; wiped as soon as read).
 * Tokens last an hour. Once the learner has agreed, renewing is the same trip with `prompt=none`:
 * Google answers straight away while the browser is signed in, so the app does it on its own.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email';
const TOKEN = 'fluentloop.sync.token';
const NONCE = 'fluentloop.sync.nonce';
const FAKE = 'fluentloop.sync.fake';
/** A token this close to its end counts as gone: a sync must not start with seconds left. */
const MARGIN_MS = 2 * 60_000;

export interface Token {
  token: string;
  expiresAt: number;
  email?: string;
}

const read = <T>(key: string): T | undefined => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
};
const write = (key: string, value: unknown) => {
  try {
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode without storage: the token lasts for this page only.
  }
};

/** The debug page's stand-in for Google, with the fake Drive. */
export const fakeMode = () => read<boolean>(FAKE) === true || CLIENT_ID === 'fake';
export const setFakeMode = (on: boolean) => write(FAKE, on || undefined);

/** Whether this build can sign in at all (a Google Client ID was given at build time). */
export const canSignIn = () => fakeMode() || !!CLIENT_ID;

export function currentToken(at = Date.now()): Token | undefined {
  const token = read<Token>(TOKEN);
  return token && token.expiresAt - MARGIN_MS > at ? token : undefined;
}

export const forgetToken = () => write(TOKEN, undefined);

/**
 * Go to Google. `silent`: only if no question needs asking (renewal); `hint` picks the account.
 * Fake mode answers at once, without leaving the page.
 */
export function signIn({ silent = false, hint }: { silent?: boolean; hint?: string } = {}): 'redirecting' | 'done' {
  if (fakeMode()) {
    write(TOKEN, { token: 'fake', expiresAt: Date.now() + 3_600_000, email: 'ban@example.com' } satisfies Token);
    return 'done';
  }
  const nonce = crypto.randomUUID();
  write(NONCE, nonce);
  const back = location.pathname.slice(import.meta.env.BASE_URL.length - 1) + location.search;
  const params = new URLSearchParams({
    client_id: CLIENT_ID ?? '',
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: SCOPE,
    include_granted_scopes: 'true',
    state: JSON.stringify({ nonce, back, silent }),
    // By hand: show the permissions again, so an unticked Drive box can be ticked.
    prompt: silent ? 'none' : 'select_account consent',
    ...(hint ? { login_hint: hint } : {}),
  });
  location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  return 'redirecting';
}

/** Google sends the learner back to the app's root; the path they were on travels in `state`. */
export const redirectUri = () => location.origin + import.meta.env.BASE_URL;

export type SignInReturn = { ok: true; token: Token } | { ok: false; silent: boolean; noDrive?: boolean } | undefined;

/**
 * On start, before the router: take a token handed back by Google, put the address back to the
 * screen the learner left, and say how it went (undefined: this load is not a return from Google).
 */
export function takeSignInReturn(): SignInReturn {
  if (!/^#(access_token|error)=/.test(location.hash) && !/[#&]state=/.test(location.hash)) return undefined;
  const params = new URLSearchParams(location.hash.slice(1));
  let state: { nonce?: string; back?: string; silent?: boolean } = {};
  try {
    state = JSON.parse(params.get('state') ?? '{}');
  } catch {
    // ignore
  }
  const expected = read<string>(NONCE);
  write(NONCE, undefined);
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const back = state.back?.startsWith('/') ? state.back : '/';
  history.replaceState(null, '', base + back);

  const accessToken = params.get('access_token');
  if (!accessToken || !expected || state.nonce !== expected) return { ok: false, silent: !!state.silent };
  // Google lets the learner untick each permission: without Drive there is nowhere to sync to.
  if (!(params.get('scope') ?? '').includes('drive.appdata')) return { ok: false, silent: !!state.silent, noDrive: true };
  const token: Token = { token: accessToken, expiresAt: Date.now() + Number(params.get('expires_in') ?? 3600) * 1000 };
  write(TOKEN, token);
  return { ok: true, token };
}

/** The signed-in account's address, to show which Drive the data goes to. */
export async function fetchEmail(token: Token): Promise<string | undefined> {
  if (token.email) return token.email;
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token.token}` } });
    if (!response.ok) return undefined;
    const { email } = (await response.json()) as { email?: string };
    if (email) write(TOKEN, { ...token, email });
    return email;
  } catch {
    return undefined;
  }
}

/** Sign out on this device: the token is handed back to Google, the data stays everywhere. */
export function revoke() {
  const token = read<Token>(TOKEN);
  forgetToken();
  if (token && token.token !== 'fake') void fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token.token)}`, { method: 'POST' }).catch(() => undefined);
}
