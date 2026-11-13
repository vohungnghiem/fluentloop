import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A browser just big enough for the sign-in trip: an address bar, history and localStorage. */
function fakeBrowser(path: string, hash = '') {
  const store = new Map<string, string>();
  const location = {
    origin: 'https://vohungnghiem.github.io',
    pathname: path,
    search: '',
    hash,
    assigned: '',
    assign(url: string) {
      this.assigned = url;
    },
  };
  vi.stubGlobal('location', location);
  vi.stubGlobal('history', { replaceState: (_: unknown, __: string, url: string) => Object.assign(location, { pathname: url, hash: '' }) });
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  });
  return { location, store };
}

async function load() {
  vi.resetModules();
  vi.stubEnv('BASE_URL', '/fluentloop/');
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client-123.apps.googleusercontent.com');
  return import('./auth');
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllEnvs());

describe('Google sign-in by redirect', () => {
  it('goes to Google with the app root as the way back and the current screen in state', async () => {
    const { location } = fakeBrowser('/fluentloop/settings');
    const auth = await load();
    expect(auth.signIn({ hint: 'me@gmail.com' })).toBe('redirecting');
    const url = new URL(location.assigned);
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('redirect_uri')).toBe('https://vohungnghiem.github.io/fluentloop/');
    expect(url.searchParams.get('response_type')).toBe('token');
    expect(url.searchParams.get('scope')).toContain('drive.appdata');
    expect(url.searchParams.get('prompt')).toBe('select_account consent');
    expect(url.searchParams.get('login_hint')).toBe('me@gmail.com');
    expect(JSON.parse(url.searchParams.get('state')!)).toMatchObject({ back: '/settings', silent: false });

    auth.signIn({ silent: true });
    expect(new URL(location.assigned).searchParams.get('prompt')).toBe('none');
  });

  it('takes the token on the way back, wipes it from the address bar and returns to the screen', async () => {
    const { location } = fakeBrowser('/fluentloop/session');
    const auth = await load();
    auth.signIn();
    const state = new URL(location.assigned).searchParams.get('state')!;
    // Google sends the learner back to the root with the token in the #fragment.
    Object.assign(location, { pathname: '/fluentloop/', hash: `#state=${encodeURIComponent(state)}&access_token=tok&token_type=Bearer&expires_in=3599&scope=${encodeURIComponent('email https://www.googleapis.com/auth/drive.appdata')}` });
    const back = auth.takeSignInReturn();
    expect(back).toMatchObject({ ok: true, token: { token: 'tok' } });
    expect(location.pathname).toBe('/fluentloop/session');
    expect(location.hash).toBe('');
    expect(auth.currentToken()?.token).toBe('tok');
    // Not again on the next load.
    expect(auth.takeSignInReturn()).toBeUndefined();
  });

  it('refuses a token it did not ask for, and reports a failed silent renewal', async () => {
    const { location } = fakeBrowser('/fluentloop/');
    const auth = await load();
    location.hash = `#access_token=evil&expires_in=3599&state=${encodeURIComponent(JSON.stringify({ nonce: 'x', back: '/' }))}`;
    expect(auth.takeSignInReturn()).toEqual({ ok: false, silent: false });
    expect(auth.currentToken()).toBeUndefined();

    auth.signIn({ silent: true });
    const state = new URL(location.assigned).searchParams.get('state')!;
    location.hash = `#error=interaction_required&state=${encodeURIComponent(state)}`;
    expect(auth.takeSignInReturn()).toEqual({ ok: false, silent: true });
  });

  it('says so when the Drive permission was left unticked', async () => {
    const { location } = fakeBrowser('/fluentloop/settings');
    const auth = await load();
    auth.signIn();
    const state = new URL(location.assigned).searchParams.get('state')!;
    location.hash = `#state=${encodeURIComponent(state)}&access_token=tok&expires_in=3599&scope=email`;
    expect(auth.takeSignInReturn()).toEqual({ ok: false, silent: false, noDrive: true });
  });

  it('treats a token about to run out as gone', async () => {
    const { store } = fakeBrowser('/fluentloop/');
    const auth = await load();
    store.set('fluentloop.sync.token', JSON.stringify({ token: 't', expiresAt: Date.now() + 60_000 }));
    expect(auth.currentToken()).toBeUndefined();
    store.set('fluentloop.sync.token', JSON.stringify({ token: 't', expiresAt: Date.now() + 30 * 60_000 }));
    expect(auth.currentToken()?.token).toBe('t');
  });
});
