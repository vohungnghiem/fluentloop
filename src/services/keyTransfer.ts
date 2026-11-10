import type { AiProvider } from './settings';

/**
 * Moving an AI key between devices without typing it: paste cleans it, and a QR code from the
 * computer opens this app on the phone with the key in the link's #fragment (browsers never send
 * the fragment to a server; the app wipes it from the address bar as soon as it is read).
 */

export type KeyProvider = Exclude<AiProvider, 'none' | 'fake'>;
const PROVIDERS: KeyProvider[] = ['gemini', 'openai', 'compatible', 'openrouter'];
const PREFIX: Record<KeyProvider, RegExp> = { gemini: /^AIza[\w-]{30,}$/, openai: /^sk-[\w-]{20,}$/, compatible: /^\S{8,}$/, openrouter: /^sk-or-[\w-]{20,}$/ };

/** What was copied, minus the spaces, line breaks and quotes that come along with it. */
export function cleanKey(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/^["'`<(\[]+|["'`>)\].,;]+$/g, '');
}

/** Whether a key looks right for the provider (only a shape check; "Thử kết nối" is the real one). */
export function keyLooksRight(provider: KeyProvider, key: string): boolean {
  if (provider === 'openai' && key.startsWith('sk-or-')) return false;
  return PREFIX[provider].test(key);
}

/** The link the QR code holds; a proxy's address travels with its key. */
export function transferLink(provider: KeyProvider, key: string, baseUrl?: string): string {
  const base = location.origin + import.meta.env.BASE_URL.replace(/\/$/, '');
  const url = provider === 'compatible' && baseUrl?.trim() ? `&url=${encodeURIComponent(baseUrl.trim())}` : '';
  return `${base}/settings#key=${provider}:${encodeURIComponent(key)}${url}`;
}

/** Read a key handed over in the address bar, then remove it from there. */
export function takeKeyFromLink(): { provider: KeyProvider; key: string; baseUrl?: string } | undefined {
  const match = /^#key=(\w+):([^&]+)(?:&url=(.+))?$/.exec(location.hash);
  if (!match) return undefined;
  history.replaceState(null, '', location.pathname + location.search);
  const provider = match[1] as KeyProvider;
  if (!PROVIDERS.includes(provider)) return undefined;
  return { provider, key: cleanKey(decodeURIComponent(match[2])), baseUrl: match[3] ? decodeURIComponent(match[3]) : undefined };
}

/** 'AIzaSy…x9Qk': enough to recognise, not enough to copy. */
export const maskKey = (key: string) => (key.length > 12 ? `${key.slice(0, 6)}…${key.slice(-4)}` : '••••');
