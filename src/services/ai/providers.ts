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
  if (settings.aiProvider === 'openai' || settings.aiProvider === 'openrouter') {
    const openai = settings.aiProvider === 'openai';
    const key = (openai ? settings.openaiKey : settings.openrouterKey).trim();
    if (!key) throw new AiError('no-key', settings.aiProvider);
    // Both speak the OpenAI chat-completions format.
    const data = (await post(
      openai ? 'https://api.openai.com/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions',
      { Authorization: `Bearer ${key}`, ...(openai ? {} : { 'X-Title': 'FluentLoop' }) },
      {
        model: openai ? settings.openaiModel || 'gpt-4.1-mini' : settings.openrouterModel || 'google/gemini-2.5-flash',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      },
    )) as { choices?: Array<{ message?: { content?: string } }> };
    return parseJsonText(data.choices?.[0]?.message?.content ?? '');
  }
  throw new AiError('no-key', 'none');
}
