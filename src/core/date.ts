/** Local calendar day of `now`, "2026-11-10". A learning day follows the learner's clock. */
export function dayKey(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Midnight at the start of the next local day. */
export function startOfNextDay(now: Date): Date {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next;
}

/** Last moment of the local day of `now`: anything due before then counts as due today. */
export function endOfDay(now: Date): Date {
  return new Date(startOfNextDay(now).getTime() - 1);
}

/** Whole local days from day key `a` to day key `b`. */
export function daysBetween(a: string, b: string): number {
  const toUtc = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}
