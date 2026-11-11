import type { ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { SECTION_LOOK, toneClass, type Tone } from './tones';
import { ToneIcon } from './ui';
import type { LucideIcon } from 'lucide-react';
import { vi } from '../copy/vi';

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ');

const TABS: Array<{ to: string; icon: LucideIcon; tone: Tone; label: string; end?: boolean }> = [
  { to: '/', ...SECTION_LOOK.today, label: vi.nav.today, end: true },
  { to: '/path', ...SECTION_LOOK.path, label: vi.path.link },
  { to: '/capture', ...SECTION_LOOK.capture, label: vi.capture.link },
  { to: '/errors', ...SECTION_LOOK.errors, label: vi.errors.link },
  { to: '/progress', ...SECTION_LOOK.progress, label: vi.progress.link },
];

/**
 * The frame of every browsing screen: a tab bar at the bottom (in thumb reach on a phone, a
 * floating bar on a wide screen). Focused flows (a session, a conversation) leave it out.
 */
export function AppShell() {
  return (
    <div className="shell">
      <Outlet />
      <nav
        aria-label={vi.nav.label}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:inset-x-auto sm:bottom-4 sm:left-1/2 sm:w-[520px] sm:-translate-x-1/2 sm:rounded-2xl sm:border sm:pb-0 sm:shadow-lg"
      >
        <ul className="mx-auto grid h-16 max-w-[640px] grid-cols-5">
          {TABS.map(({ to, icon: Icon, tone, label, end }) => (
            <li key={to} className={toneClass(tone)}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cx(
                    'group flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                    isActive ? 'text-ink' : 'text-ink-soft hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cx('flex h-7 w-12 items-center justify-center rounded-full transition-colors', isActive && 'bg-tone-tint text-tone')}>
                      <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/** The top of a screen: a title, an optional way back (sub-screens) and actions on the right. */
export function PageHeader({ title, back, look, children }: { title: string; back?: { to: string; label: string }; look?: { tone: Tone; icon: LucideIcon }; children?: ReactNode }) {
  return (
    <header className="flex min-h-10 items-center gap-2">
      {back && (
        <Link to={back.to} className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-ink" aria-label={back.label} title={back.label}>
          <ArrowLeft size={20} />
        </Link>
      )}
      {look && <ToneIcon tone={look.tone} icon={look.icon} size="sm" />}
      <h1 className="flex-1 text-xl font-semibold">{title}</h1>
      {children}
    </header>
  );
}

/** A small column chart: one bar per value, the highlighted ones in colour, labels under. */
export function Bars({
  values,
  labels,
  highlight,
  tone = 'primary',
  height = 'h-24',
  label,
}: {
  values: readonly number[];
  labels?: readonly string[];
  highlight?: (index: number) => boolean;
  tone?: 'primary' | 'accent';
  height?: string;
  label: string;
}) {
  const max = Math.max(1, ...values);
  const on = tone === 'primary' ? 'bg-primary' : 'bg-accent';
  const off = tone === 'primary' ? 'bg-primary/25' : 'bg-line';
  return (
    <div>
      <div className={cx('flex items-end gap-1.5', height)} role="img" aria-label={`${label}: ${values.join(', ')}`}>
        {values.map((value, i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end" title={labels ? `${labels[i]}: ${value}` : String(value)}>
            <div
              className={cx('bar rounded-t-md', highlight?.(i) ? on : off)}
              style={{ height: `${(value / max) * 100}%`, minHeight: value ? 4 : 0, animationDelay: `${i * 25}ms` }}
            />
          </div>
        ))}
      </div>
      {labels && (
        <div className="mt-1.5 flex gap-1.5">
          {labels.map((text, i) => (
            <span key={i} className="flex-1 truncate text-center text-[11px] text-ink-soft">{text}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Grey blocks while IndexedDB answers, instead of a blank screen. */
export function PageSkeleton() {
  return (
    <main className="page" aria-busy="true">
      <div className="skeleton h-8 w-40" />
      <div className="skeleton mt-6 h-40" />
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
      </div>
    </main>
  );
}

/** A thin progress line, e.g. snippets read in a unit. */
export function Meter({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={cx('h-2 overflow-hidden rounded-full bg-line', className)} role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-valuemin={0}>
      <div className="h-full rounded-full bg-track transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
