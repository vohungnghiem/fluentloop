import { Link, useLocation } from 'react-router';
import { Sparkles } from 'lucide-react';
import { vi } from '../copy/vi';
import { aiReady, useSettings } from '../services/settings';

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ');

/**
 * Whether AI is on, wherever AI could help: on (and which), chosen but missing its key, or off.
 * One tap opens the AI settings; their back arrow returns here (a session keeps its place and drafts).
 */
export function AiBadge({ compact }: { compact?: boolean }) {
  const settings = useSettings();
  const location = useLocation();
  const on = aiReady(settings);
  const chosen = settings.aiProvider !== 'none';
  const name = settings.aiProvider === 'fake' ? vi.ai.fake : vi.settings.providers[settings.aiProvider as keyof typeof vi.settings.providers];
  const label = on ? vi.ai.on(name) : chosen ? vi.ai.noKey : vi.ai.off;
  return (
    <Link
      to="/settings#ai"
      state={{ from: location.pathname + location.search }}
      title={on ? vi.ai.onTitle : vi.ai.offTitle}
      aria-label={`${label}. ${on ? vi.ai.onTitle : vi.ai.offTitle}`}
      className={cx(
        'tone-review inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap transition-colors',
        on ? 'bg-tone-tint text-tone hover:brightness-95' : chosen ? 'bg-accent-tint text-accent-ink' : 'text-ink-soft ring-1 ring-line hover:text-ink',
      )}
    >
      <Sparkles size={14} strokeWidth={2.4} />
      {compact ? 'AI' : label}
    </Link>
  );
}
