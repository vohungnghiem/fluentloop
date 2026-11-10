import { Link, useLocation } from 'react-router';
import { Bug } from 'lucide-react';
import { dayOffset, now } from '../services/clock';

/**
 * Shows only while the test clock is shifted (from /debug), so a shifted date is never mistaken
 * for the real one. The debug page itself is a tool for testing, not for learners: no link to it.
 */
export function ClockBadge() {
  useLocation(); // re-render on navigation, so a clock changed on /debug shows up
  const offset = dayOffset();
  if (offset === 0) return null;
  return (
    <Link
      to="/debug"
      className={`fixed right-2 bottom-24 z-50 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium shadow bg-accent text-[#1E2230]`}
    >
      <Bug size={14} />
      {`${now().toLocaleDateString('vi-VN')} (+${offset}n)`}
    </Link>
  );
}
