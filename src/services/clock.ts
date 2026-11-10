/**
 * The app's only clock. Normally the real time; the debug page can move it forward by whole days
 * to see "tomorrow" without waiting. The offset lives in localStorage of this browser only.
 */

const KEY = 'fluentloop.debug.dayOffset';
const DAY_MS = 86_400_000;

export function dayOffset(): number {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function setDayOffset(days: number) {
  try {
    if (days === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(days));
  } catch {
    // Private mode: the offset just does not stick.
  }
}

export const now = () => new Date(Date.now() + dayOffset() * DAY_MS);
