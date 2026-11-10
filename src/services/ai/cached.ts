import type { z } from 'zod';
import { dayKey } from '../../core/date';
import { db } from '../db';
import { aiReady, providerKeyAndModel, type Settings } from '../settings';
import { AiError, askJson, type AiErrorKind } from './providers';

/**
 * One AI job: cached by provider, model and prompt (the same question is never paid twice),
 * counted against the daily limit, and validated by a schema. Never throws: the caller gets
 * the data or the reason, and falls back to rules.
 */

export type AiOutcome<T> = { ok: true; data: T; cached: boolean } | { ok: false; kind: AiErrorKind | 'limit' | 'off' };

async function sha(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function aiCallsToday(now: Date): Promise<number> {
  return (await db.aiUsage.get(dayKey(now)))?.count ?? 0;
}

export async function askCached<S extends z.ZodType>(job: {
  settings: Settings;
  now: Date;
  /** Bump when the prompt changes, so old answers are not reused. */
  version: string;
  system: string;
  user: string;
  schema: S;
  /** The debug "fake AI" answer. */
  fake: () => unknown;
}): Promise<AiOutcome<z.infer<S>>> {
  const { settings, now } = job;
  if (!aiReady(settings)) return { ok: false, kind: 'off' };
  const { model } = providerKeyAndModel(settings);
  const hash = await sha(`${job.version}|${settings.aiProvider}|${model}|${job.system}|${job.user}`);
  const cached = await db.aiCache.get(hash);
  if (cached) {
    const parsed = job.schema.safeParse(cached.result);
    if (parsed.success) return { ok: true, data: parsed.data, cached: true };
  }
  if ((await aiCallsToday(now)) >= settings.aiDailyLimit) return { ok: false, kind: 'limit' };
  try {
    const raw = settings.aiProvider === 'fake' ? job.fake() : await askJson(settings, job.system, job.user);
    await db.aiUsage.put({ day: dayKey(now), count: (await aiCallsToday(now)) + 1 });
    const parsed = job.schema.safeParse(raw);
    if (!parsed.success) throw new AiError('bad-output', parsed.error.message);
    await db.aiCache.put({ hash, result: parsed.data, at: now.toISOString() });
    return { ok: true, data: parsed.data, cached: false };
  } catch (error) {
    return { ok: false, kind: error instanceof AiError ? error.kind : 'server' };
  }
}
