import { Link, useLocation } from 'react-router';
import { Bug } from 'lucide-react';
import { dayOffset, now } from '../services/clock';

/**
 * A small corner link to the debug page. It shows while the dev server runs, or whenever the
 * clock is shifted, so a shifted date is never mistaken for the real one.
 */
export function ClockBadge() {
  useLocation(); // re-render on navigation, so a clock changed on /debug shows up
  const offset = dayOffset();
  if (!import.meta.env.DEV && offset === 0) return null;
  return (
    <Link
      to="/debug"
      className={`fixed right-2 bottom-24 z-50 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium shadow ${offset !== 0 ? 'bg-accent text-[#1E2230]' : 'bg-surface text-ink-soft ring-1 ring-line'}`}
    >
      <Bug size={14} />
      {offset !== 0 ? `${now().toLocaleDateString('vi-VN')} (+${offset}n)` : 'Debug'}
    </Link>
  );
}
