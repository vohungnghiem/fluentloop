import { Link, useLocation } from 'react-router';
import { CloudAlert, CloudCheck, CloudOff, RefreshCw } from 'lucide-react';
import { vi } from '../copy/vi';
import { startSignIn, useSync } from '../services/sync/sync';

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ');
const base = 'inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap transition-colors';

/**
 * Sync at a glance, next to the AI badge, only once sync is on. A lapsed sign-in is a button that
 * (Google) signs in again straight away; otherwise one tap opens the sync settings.
 */
export function SyncBadge() {
  const sync = useSync();
  const location = useLocation();
  if (!sync.on || sync.status === 'off') return null;
  const label = vi.sync.badge[sync.status];

  if (sync.status === 'needsLogin' && sync.method === 'google') {
    return (
      <button type="button" onClick={startSignIn} title={vi.sync.status.needsLogin} className={cx(base, 'bg-accent-tint text-accent-ink hover:brightness-95')}>
        <CloudAlert size={14} strokeWidth={2.4} />
        {label}
      </button>
    );
  }
  const Icon = sync.status === 'syncing' ? RefreshCw : sync.status === 'ok' ? CloudCheck : sync.status === 'needsLogin' ? CloudAlert : CloudOff;
  return (
    <Link
      to="/settings#sync"
      state={{ from: location.pathname + location.search }}
      title={vi.sync.badgeTitle}
      aria-label={`${label}. ${vi.sync.badgeTitle}`}
      className={cx(base, sync.status === 'ok' || sync.status === 'syncing' ? 'text-ink-soft ring-1 ring-line hover:text-ink' : 'bg-accent-tint text-accent-ink')}
    >
      <Icon size={14} strokeWidth={2.4} className={sync.status === 'syncing' ? 'animate-spin' : undefined} />
      <span className="hidden min-[400px]:inline">{label}</span>
    </Link>
  );
}
