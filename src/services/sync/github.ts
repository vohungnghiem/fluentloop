/**
 * The quickest way to sync: a GitHub token with only the `gist` permission, pasted once on the
 * computer and passed to the phone by QR code. The data goes into one secret gist of the learner's.
 * The token stays in this browser, like the AI key.
 */

const TOKEN = 'fluentloop.sync.github';

/** GitHub's page to make the token, already filled in: only `gist`, named FluentLoop. */
export const TOKEN_PAGE = 'https://github.com/settings/tokens/new?scopes=gist&description=FluentLoop%20sync';

export function githubToken(): string | undefined {
  try {
    return localStorage.getItem(TOKEN) ?? undefined;
  } catch {
    return undefined;
  }
}

export function setGithubToken(token: string | undefined) {
  try {
    if (token) localStorage.setItem(TOKEN, token);
    else localStorage.removeItem(TOKEN);
  } catch {
    // Private mode without storage: lasts for this page only.
  }
}

/** What was copied, minus spaces, line breaks and quotes. */
export const cleanToken = (raw: string) => raw.replace(/\s+/g, '').replace(/^["'`]+|["'`]+$/g, '');

/** The account the token belongs to, or why it does not work. */
export async function checkToken(token: string): Promise<{ ok: true; login: string } | { ok: false; reason: 'bad' | 'scope' | 'offline' }> {
  try {
    const response = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (response.status === 401) return { ok: false, reason: 'bad' };
    if (!response.ok) return { ok: false, reason: 'offline' };
    // Classic tokens list their scopes; fine-grained ones do not (a gist call will tell).
    const scopes = response.headers.get('x-oauth-scopes');
    if (scopes !== null && !scopes.split(/,\s*/).includes('gist')) return { ok: false, reason: 'scope' };
    const { login } = (await response.json()) as { login: string };
    return { ok: true, login };
  } catch {
    return { ok: false, reason: 'offline' };
  }
}

/** The link the QR code holds: the app's settings with the token in the #fragment (never sent anywhere). */
export function syncLink(token: string): string {
  return `${location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/settings#sync=${encodeURIComponent(token)}`;
}

/** A token handed over by QR code, taken from the address bar and wiped from it. */
export function takeTokenFromLink(): string | undefined {
  const match = /^#sync=([^&]+)$/.exec(location.hash);
  if (!match) return undefined;
  history.replaceState(null, '', location.pathname + location.search);
  return cleanToken(decodeURIComponent(match[1]));
}
