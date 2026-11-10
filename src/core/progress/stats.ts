import { daysBetween } from '../date';

/**
 * Progress numbers. A kind streak: up to two days off in any seven do not break it, and today
 * not done yet never breaks it (the day is not over).
 */

export const REST_DAYS_PER_WEEK = 2;

const shift = (day: string, by: number) => {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + by));
  return date.toISOString().slice(0, 10);
};

export function streak(learnedDays: Iterable<string>, today: string): { days: number; restUsed: number } {
  const learned = new Set(learnedDays);
  let day = learned.has(today) ? today : shift(today, -1);
  let days = 0;
  const misses: string[] = [];
  for (let guard = 0; guard < 3660; guard++) {
    if (learned.has(day)) {
      days++;
    } else {
      // A miss counts against the 7 days ending at it; a third one in a week ends the streak.
      const recent = misses.filter((miss) => daysBetween(day, miss) < 7);
      // Days off right before today count too: yesterday missed is a rest day, not the end.
      if (recent.length >= REST_DAYS_PER_WEEK) break;
      misses.push(day);
    }
    day = shift(day, -1);
  }
  if (days === 0) return { days: 0, restUsed: 0 };
  const restUsed = misses.filter((miss) => daysBetween(miss, today) < 7).length;
  return { days, restUsed };
}

/** Minutes of a session: start to finish, capped (a session left open overnight is not 9 hours). */
export function sessionMinutes(startedAt: string, finishedAt?: string): number {
  if (!finishedAt) return 0;
  const minutes = (Date.parse(finishedAt) - Date.parse(startedAt)) / 60_000;
  return Math.max(1, Math.min(45, Math.round(minutes)));
}

/** Of the reviews done after a gap of at least `minDays`, how many were remembered. */
export function retention(reviews: ReadonlyArray<{ rating: string; gapDays?: number }>, minDays = 7) {
  const counted = reviews.filter((review) => (review.gapDays ?? 0) >= minDays);
  return { tried: counted.length, kept: counted.filter((review) => review.rating !== 'again').length };
}

/** Counts per day for the last `days` days, oldest first. */
export function perDay(days: number, today: string, items: Iterable<string>): Array<{ day: string; count: number }> {
  const counts = new Map<string, number>();
  for (const day of items) counts.set(day, (counts.get(day) ?? 0) + 1);
  return Array.from({ length: days }, (_, i) => {
    const day = shift(today, i - days + 1);
    return { day, count: counts.get(day) ?? 0 };
  });
}
