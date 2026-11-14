import { daysBetween } from '../date';
import { sessionMinutes } from '../progress/stats';

/**
 * The 16-week plan (docs/PHAC-THAO.md 1.1): which week the learner is in, what that month is
 * about, when the benchmark is redone, and how many minutes were learnt each day. Pure.
 */

export const PLAN_WEEKS = 16;

/** Where a placement test puts the learner. A0: starting from scratch. */
export type Level = 'A0' | 'A1' | 'A2' | 'B1' | 'B2';
export const LEVELS: readonly Level[] = ['A0', 'A1', 'A2', 'B1', 'B2'];

/** Below B1: the foundation pack first, and more help (Vietnamese, hints shown) while learning. */
export const needsFoundation = (level: Level | undefined) => level === 'A0' || level === 'A1' || level === 'A2';

/** Minutes a day the learner can give, in and out of the app. */
export const DAILY_MINUTES = [15, 30, 60, 120, 180] as const;

/** Benchmark weeks: the start, every four weeks, and the last week to compare with the first. */
export const CHECKPOINT_WEEKS = [1, 5, 9, 13, 16] as const;

const shift = (day: string, by: number) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + by)).toISOString().slice(0, 10);
};

export interface PlanWeek {
  /** 1-based; past the end it keeps counting (17, 18…). */
  week: number;
  weeks: number;
  /** Month of the plan, 1–4: foundation, foundation + work, speaking at length, interviews. */
  phase: 1 | 2 | 3 | 4;
  finished: boolean;
  /** The first day of this week. */
  weekStart: string;
  /** The last day of the plan. */
  endDay: string;
  /** A benchmark is redone this week. */
  checkpoint: boolean;
}

export function planWeek(startDay: string, today: string, weeks = PLAN_WEEKS): PlanWeek {
  const week = Math.max(0, Math.floor(daysBetween(startDay, today) / 7)) + 1;
  const inPlan = Math.min(week, weeks);
  return {
    week,
    weeks,
    phase: Math.min(4, Math.ceil(inPlan / (weeks / 4))) as PlanWeek['phase'],
    finished: week > weeks,
    weekStart: shift(startDay, (week - 1) * 7),
    endDay: shift(startDay, weeks * 7 - 1),
    checkpoint: (CHECKPOINT_WEEKS as readonly number[]).includes(week),
  };
}

/**
 * Whether the benchmark is due: the latest checkpoint week reached has no benchmark made on or
 * after its first day. Past the end of the plan: never (the plan is over).
 */
export function checkpointDue(startDay: string, today: string, benchmarkDays: Iterable<string>): boolean {
  const { week, finished } = planWeek(startDay, today);
  if (finished) return false;
  const last = [...CHECKPOINT_WEEKS].reverse().find((w) => w <= week) ?? 1;
  const from = shift(startDay, (last - 1) * 7);
  for (const day of benchmarkDays) if (day >= from) return false;
  return true;
}

export interface DayMinutes {
  /** Time in the app: what the app counted, or the sessions' length when that is more. */
  app: number;
  /** Time the learner logged outside the app (listening, a speaking club…). */
  outside: number;
  total: number;
}

/**
 * Minutes learnt per day. Time in the app was not counted before the plan existed, so a day's
 * sessions still count when they add up to more.
 */
export function minutesByDay(input: {
  sessions: ReadonlyArray<{ day: string; startedAt: string; finishedAt?: string; status: string }>;
  appSeconds: ReadonlyArray<{ day: string; seconds: number }>;
  logs: ReadonlyArray<{ day: string; minutes: number; deleted?: boolean }>;
}): Map<string, DayMinutes> {
  const sessions = new Map<string, number>();
  for (const s of input.sessions) {
    if (s.status === 'done') sessions.set(s.day, (sessions.get(s.day) ?? 0) + sessionMinutes(s.startedAt, s.finishedAt));
  }
  const counted = new Map<string, number>();
  for (const row of input.appSeconds) counted.set(row.day, (counted.get(row.day) ?? 0) + row.seconds);
  const outside = new Map<string, number>();
  for (const log of input.logs) if (!log.deleted) outside.set(log.day, (outside.get(log.day) ?? 0) + log.minutes);

  const out = new Map<string, DayMinutes>();
  for (const day of new Set([...sessions.keys(), ...counted.keys(), ...outside.keys()])) {
    const app = Math.max(sessions.get(day) ?? 0, Math.round((counted.get(day) ?? 0) / 60));
    const away = outside.get(day) ?? 0;
    if (app + away > 0) out.set(day, { app, outside: away, total: app + away });
  }
  return out;
}
