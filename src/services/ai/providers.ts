import type { Settings } from '../settings';

/**
 * One JSON-returning call to the chosen provider, straight from the browser (both allow CORS).
 * Errors come back as a kind the screen can explain.
 */

export type AiErrorKind = 'no-key' | 'bad-key' | 'quota' | 'offline' | 'timeout' | 'bad-output' | 'server';

export class AiError extends Error {
  constructor(public kind: AiErrorKind, message: string) {
    super(message);
  }
}

/** Longer than this and the learner is better served by the rules. */
const TIMEOUT_MS = 20_000;

/** The chat endpoint from whatever address was pasted: with or without https://, /v1 or the full path. */
export function chatUrl(base: string): string {
  let url = base.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\/chat\/completions$/i, '');
  return `${url}/chat/completions`;
}

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new AiError('offline', 'offline');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    throw new AiError(controller.signal.aborted ? 'timeout' : 'offline', String(error));
  } finally {
    clearTimeout(timer);
  }
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    const text = await response.text().catch(() => '');
    // Gemini answers 400 for a bad key.
    if (response.status !== 400 || /api.?key/i.test(text)) throw new AiError('bad-key', text.slice(0, 200));
    throw new AiError('server', text.slice(0, 200));
  }
  if (response.status === 429 || response.status === 402) throw new AiError('quota', String(response.status));
  if (!response.ok) throw new AiError('server', String(response.status));
  return response.json();
}

/** Parse the model's text as JSON, tolerating ```json fences. */
export function parseJsonText(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new AiError('bad-output', cleaned.slice(0, 200));
  }
}

export async function askJson(settings: Settings, system: string, user: string): Promise<unknown> {
  if (settings.aiProvider === 'gemini') {
    if (!settings.geminiKey) throw new AiError('no-key', 'gemini');
    const name = settings.geminiModel || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(name)}:generateContent`;
    const headers = { 'x-goog-api-key': settings.geminiKey.trim() };
    const body = (thinking: boolean) => ({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        // Flash models "think" before answering by default: 10+ seconds for a 3-line fix. Off.
        ...(thinking ? {} : { thinkingConfig: { thinkingBudget: 0 } }),
      },
    });
    const fast = /flash/i.test(name);
    let data: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    try {
      data = (await post(url, headers, body(!fast))) as typeof data;
    } catch (error) {
      // A model that refuses the thinking setting: ask again the plain way.
      if (!fast || !(error instanceof AiError) || error.kind !== 'server') throw error;
      data = (await post(url, headers, body(true))) as typeof data;
    }
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    return parseJsonText(text);
  }
  if (settings.aiProvider === 'openai' || settings.aiProvider === 'openrouter' || settings.aiProvider === 'compatible') {
    // All three speak the OpenAI chat-completions format.
    const { aiProvider: p } = settings;
    const key = (p === 'openai' ? settings.openaiKey : p === 'compatible' ? settings.compatKey : settings.openrouterKey).trim();
    if (!key || (p === 'compatible' && !settings.compatBaseUrl.trim())) throw new AiError('no-key', p);
    const url = p === 'openai' ? 'https://api.openai.com/v1/chat/completions' : p === 'compatible' ? chatUrl(settings.compatBaseUrl) : 'https://openrouter.ai/api/v1/chat/completions';
    const headers = { Authorization: `Bearer ${key}`, ...(p === 'openrouter' ? { 'X-Title': 'FluentLoop' } : {}) };
    const body = (jsonMode: boolean) => ({
      model: p === 'openai' ? settings.openaiModel || 'gpt-4.1-mini' : p === 'compatible' ? settings.compatModel.trim() : settings.openrouterModel || 'google/gemini-2.5-flash',
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    type Reply = { choices?: Array<{ message?: { content?: string } }> };
    let data: Reply;
    try {
      data = (await post(url, headers, body(true))) as Reply;
    } catch (error) {
      // Some proxies and local servers reject JSON mode: ask again without it (the prompt asks for JSON anyway).
      if (!(error instanceof AiError) || error.kind !== 'server') throw error;
      data = (await post(url, headers, body(false))) as Reply;
    }
    return parseJsonText(data.choices?.[0]?.message?.content ?? '');
  }
  throw new AiError('no-key', 'none');
}
