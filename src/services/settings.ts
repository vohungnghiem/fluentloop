import { useSyncExternalStore } from 'react';

/**
 * Settings kept in this browser's localStorage. The AI key lives here and is only ever sent to
 * the provider it belongs to.
 */

export type AiProvider = 'none' | 'gemini' | 'openai' | 'openrouter' | 'fake';

export interface Settings {
  aiProvider: AiProvider;
  geminiKey: string;
  geminiModel: string;
  openaiKey: string;
  openaiModel: string;
  openrouterKey: string;
  openrouterModel: string;
  /** Calls a day before the app stops asking AI (free tiers are small). */
  aiDailyLimit: number;
}

export const DEFAULT_SETTINGS: Settings = {
  aiProvider: 'none',
  geminiKey: '',
  geminiModel: 'gemini-2.5-flash',
  openaiKey: '',
  openaiModel: 'gpt-4.1-mini',
  openrouterKey: '',
  openrouterModel: 'google/gemini-2.5-flash',
  aiDailyLimit: 40,
};

const KEY = 'fluentloop.settings';
const listeners = new Set<() => void>();
let cache: Settings | undefined;

export function getSettings(): Settings {
  if (cache) return cache;
  try {
    cache = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    cache = { ...DEFAULT_SETTINGS };
  }
  return cache!;
}

export function saveSettings(patch: Partial<Settings>) {
  cache = { ...getSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Private mode: settings last for this tab only.
  }
  listeners.forEach((listener) => listener());
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSettings,
  );
}

/** Whether AI can be called at all with these settings. */
export function aiReady(settings: Settings): boolean {
  if (settings.aiProvider === 'fake') return true;
  if (settings.aiProvider === 'gemini') return settings.geminiKey.trim() !== '';
  if (settings.aiProvider === 'openai') return settings.openaiKey.trim() !== '';
  if (settings.aiProvider === 'openrouter') return settings.openrouterKey.trim() !== '';
  return false;
}

/** The key and model of the chosen provider ("" when none). */
export function providerKeyAndModel(settings: Settings): { key: string; model: string } {
  switch (settings.aiProvider) {
    case 'gemini':
      return { key: settings.geminiKey, model: settings.geminiModel };
    case 'openai':
      return { key: settings.openaiKey, model: settings.openaiModel };
    case 'openrouter':
      return { key: settings.openrouterKey, model: settings.openrouterModel };
    default:
      return { key: '', model: settings.aiProvider };
  }
}
