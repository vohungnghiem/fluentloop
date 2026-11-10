import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight, ChevronDown, ChevronRight, CornerDownLeft, MoreHorizontal } from 'lucide-react';
import { useEnter } from './useKey';

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ');

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' };

/** A small secondary link inside a card (not the main action): bordered, 40px tall. */
export const linkButton = 'inline-flex min-h-10 items-center gap-1 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink hover:border-primary';

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
        tone === 'track' && 'bg-paper text-ink ring-1 ring-line',
      )}
    >
      {tone === 'track' && <span className="size-1.5 rounded-full bg-track" aria-hidden="true" />}
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

/**
 * A row that leads somewhere: the whole row is the tap target (52px), icon left, chevron right.
 * Rows go inside a `NavList`.
 */
export function NavRow({ to, icon, title, detail }: { to: string; icon: ReactNode; title: string; detail?: string }) {
  return (
    <li>
      <Link to={to} className="flex min-h-13 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-paper active:bg-primary-tint">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-paper text-ink-soft">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{title}</span>
          {detail && <span className="block text-sm text-ink-soft">{detail}</span>}
        </span>
        <ChevronRight size={18} className="shrink-0 text-ink-soft" />
      </Link>
    </li>
  );
}

export function NavList({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section>
      {title && <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-ink-soft uppercase">{title}</h2>}
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">{children}</ul>
    </section>
  );
}

/** A ⋯ button for rare or risky actions, kept away from the main one. */
export function MoreMenu({ label, items }: { label: string; items: Array<{ label: string; onClick: () => void }> }) {
  return (
    <details className="relative">
      <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full text-ink-soft hover:bg-paper [&::-webkit-details-marker]:hidden" aria-label={label} title={label}>
        <MoreHorizontal size={20} />
      </summary>
      <div className="absolute right-0 z-10 mt-1 min-w-56 rounded-xl border border-line bg-surface p-1 shadow-lg">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-paper"
            onClick={(e) => {
              (e.currentTarget.closest('details') as HTMLDetailsElement).open = false;
              item.onClick();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </details>
  );
}

/** The main action inside a card (not stuck to the bottom), still on Enter. */
export function CardAction({ label, onClick }: { label: string; onClick: () => void }) {
  useEnter(onClick);
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-lg font-semibold text-on-primary transition hover:brightness-110 active:brightness-95"
    >
      {label}
      <ArrowRight size={20} />
    </button>
  );
}

/** A labelled form field: label, the control, one short hint under it. */
export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-sm text-ink-soft">{hint}</span>}
    </label>
  );
}

export const inputClass = 'min-h-11 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-primary';

/** The system list (a wheel on iPhone): for four or more choices. */
export function SelectField<T extends string>({ value, options, onChange, dot }: { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void; dot?: string }) {
  return (
    <span className="relative flex min-h-11 w-full items-center rounded-xl border border-line bg-surface focus-within:border-primary">
      {dot && <span className="pointer-events-none absolute left-4 size-2.5 rounded-full" style={{ background: dot }} />}
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={cx('w-full appearance-none bg-transparent py-2.5 pr-10 font-medium outline-none', dot ? 'pl-9' : 'pl-3')}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={18} className="pointer-events-none absolute right-3 text-ink-soft" />
    </span>
  );
}

/** A pill switch: for two or three choices. */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string; dot?: string }>; onChange: (value: T) => void }) {
  return (
    <div className="inline-flex w-full rounded-full bg-line/60 p-1 sm:w-auto" role="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => !on && onChange(o.value)}
            className={cx('flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm font-medium whitespace-nowrap transition sm:flex-none', on ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink')}
          >
            {o.dot && <span className="size-2 shrink-0 rounded-full" style={{ background: o.dot }} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Choices: a pill switch up to three, the system list from four. */
export function Choice<T extends string>(props: { value: T; options: Array<{ value: T; label: string; dot?: string }>; onChange: (value: T) => void }) {
  if (props.options.length > 3) return <SelectField {...props} dot={props.options.find((o) => o.value === props.value)?.dot} />;
  return <Segmented {...props} />;
}
