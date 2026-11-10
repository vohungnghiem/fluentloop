import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { CornerDownLeft } from 'lucide-react';
import { useEnter } from './useKey';

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ');

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' };

export function Button({ variant = 'secondary', className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-primary text-on-primary hover:brightness-110',
        variant === 'secondary' && 'border border-line bg-surface text-ink hover:border-primary',
        variant === 'quiet' && 'text-ink-soft underline-offset-4 hover:text-ink hover:underline',
        className,
      )}
      {...props}
    />
  );
}

/**
 * The one main action of a screen: always at the bottom, in thumb reach on a phone, with Enter
 * (or Ctrl + Enter in a text box) on a keyboard.
 */
export function PrimaryAction({
  label,
  onClick,
  disabled,
  keys = '↵',
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  keys?: string;
  children?: ReactNode;
}) {
  useEnter(disabled ? undefined : onClick);
  return (
    <div className="sticky bottom-[var(--nav-offset,0px)] -mx-4 mt-8 border-t border-line bg-paper/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
      {children}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex min-h-13 w-full items-center justify-center gap-3 rounded-2xl bg-primary px-5 text-lg font-semibold text-on-primary transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {label}
        <kbd className="hidden items-center gap-1 rounded-md bg-white/20 px-1.5 py-0.5 font-sans text-xs font-medium sm:inline-flex">
          {keys === '↵' ? <CornerDownLeft size={14} aria-label="Enter" /> : keys}
        </kbd>
      </button>
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]', className)}>{children}</div>;
}

export function Chip({ tone = 'plain', children }: { tone?: 'plain' | 'good' | 'accent' | 'track'; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium',
        tone === 'plain' && 'bg-paper text-ink-soft ring-1 ring-line',
        tone === 'good' && 'bg-good-tint text-good',
        tone === 'accent' && 'bg-accent-tint text-accent-ink',
        tone === 'track' && 'bg-primary-tint text-track',
      )}
    >
      {children}
    </span>
  );
}

/** A friendly note: green when right, amber when there is something to fix. Never red. */
export function Note({ tone, icon, children }: { tone: 'good' | 'accent' | 'plain'; icon?: ReactNode; children: ReactNode }) {
  return (
    <div
      role="status"
      className={cx(
        'flex items-start gap-2 rounded-xl px-4 py-3',
        tone === 'good' && 'bg-good-tint text-ink',
        tone === 'accent' && 'bg-accent-tint text-ink',
        tone === 'plain' && 'bg-paper text-ink-soft ring-1 ring-line',
      )}
    >
      {icon && <span className={cx('mt-0.5 shrink-0', tone === 'good' && 'text-good', tone === 'accent' && 'text-accent-ink')}>{icon}</span>}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function StatTile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-4 text-center">
      <div className="text-3xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-[13px] leading-tight text-ink-soft">{label}</div>
    </div>
  );
}

/** Lu, the speech bubble from the logo. Only on welcome, wrap-up and empty states. */
export function Lu({ size = 72, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden="true" className={className}>
      <path d="M40 6C60 6 74 19 74 38C74 57 60 70 40 70C35 70 30 69 26 67L12 76L15 61C9 55 6 47 6 38C6 19 20 6 40 6Z" fill="var(--track)" />
      <circle cx="29" cy="36" r="5" fill="var(--paper)" />
      <circle cx="51" cy="36" r="5" fill="var(--paper)" />
      <path d="M30 49Q40 57 50 49" fill="none" stroke="var(--paper)" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
