import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Check, ChevronDown, ChevronRight, CornerDownLeft, MoreHorizontal } from 'lucide-react';
import { useEnter } from './useKey';
import { toneClass, type Tone } from './tones';
import type { LucideIcon } from 'lucide-react';

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ');

/** `danger` only for what cannot be undone (deleting data): the one place red is used. */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' | 'danger' };

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
        variant === 'danger' && 'bg-danger text-on-primary hover:brightness-110',
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
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium whitespace-nowrap',
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

/** A rounded square in a tone with its icon: what step or section this is, at a glance. */
export function ToneIcon({ tone, icon: Icon, size = 'md', className }: { tone: Tone; icon: LucideIcon; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const box = { sm: 'size-8 rounded-lg', md: 'size-11 rounded-xl', lg: 'size-16 rounded-2xl' }[size];
  return (
    <span className={cx(toneClass(tone), 'flex shrink-0 items-center justify-center bg-tone-tint text-tone', box, className)} aria-hidden="true">
      <Icon size={{ sm: 18, md: 22, lg: 32 }[size]} strokeWidth={2.2} />
    </span>
  );
}

/**
 * Text roles (docs/THIET-KE.md 3): an eyebrow says what kind of thing this is (small, caps, toned),
 * a title names it, body text is ink, and only side notes are soft. Never several lines of soft grey.
 */
export function Eyebrow({ tone, children, right }: { tone?: Tone; children: ReactNode; right?: ReactNode }) {
  return (
    <div className={cx('flex items-center justify-between gap-2', tone && toneClass(tone))}>
      <span className={cx('text-xs font-semibold tracking-wide uppercase', tone ? 'text-tone' : 'text-ink-soft')}>{children}</span>
      {right && <span className="text-xs font-medium text-ink-soft">{right}</span>}
    </div>
  );
}

/** English chunks as chips under a label: what will be learnt, readable at a glance. */
export function ChunkChips({ label, chunks }: { label: string; chunks: readonly string[] }) {
  return (
    <div>
      <div className="text-xs font-medium text-ink-soft">{label}</div>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {chunks.map((chunk) => (
          <li key={chunk} className="rounded-lg bg-paper px-2.5 py-1 text-sm font-medium text-ink ring-1 ring-line" lang="en">{chunk}</li>
        ))}
      </ul>
    </div>
  );
}

/** The steps of a session as a row of toned icons: done ones ticked, the current one ringed. */
export function StepTrail({ steps, current }: { steps: ReadonlyArray<{ tone: Tone; icon: LucideIcon; label: string }>; current?: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {steps.map((step, i) => {
        const done = current !== undefined && i < current;
        const here = i === current;
        return (
          <li key={step.label} className="flex items-center gap-1">
            <span className={cx('flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-0.5 text-sm', toneClass(step.tone), here ? 'bg-tone-tint font-semibold text-ink' : done ? 'text-ink-soft' : 'text-ink')}>
              {done ? (
                <span className="flex size-8 items-center justify-center rounded-lg bg-tone text-on-primary"><Check size={16} strokeWidth={3} /></span>
              ) : (
                <ToneIcon tone={step.tone} icon={step.icon} size="sm" className={here ? 'bg-surface' : ''} />
              )}
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The top of a session step: its coloured icon (pops in), a big title, one line of what to do. */
export function StepHeader({ tone, icon, title, detail, right }: { tone: Tone; icon: LucideIcon; title: string; detail?: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex items-start gap-3">
      <ToneIcon tone={tone} icon={icon} className="pop" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-xl leading-tight font-semibold">{title}</h1>
          {right && <span className="shrink-0 text-sm text-ink-soft">{right}</span>}
        </div>
        {detail && <p className="mt-1 text-sm text-ink-soft">{detail}</p>}
      </div>
    </header>
  );
}

export function StatTile({ value, label, tone }: { value: number | string; label: string; tone?: Tone }) {
  return (
    <div className={cx('rounded-2xl border border-line bg-surface px-3 py-4 text-center', tone && toneClass(tone))}>
      <div className={cx('text-3xl font-semibold tabular-nums', tone && 'text-tone')}>{value}</div>
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

/** Dots thrown once around Lu at an ending: angle and tone. */
const BURST: Array<[number, Tone]> = [[0, 'produce'], [45, 'shadow'], [90, 'wrap'], [135, 'review'], [180, 'input'], [225, 'fix'], [270, 'produce'], [315, 'wrap']];

/** Lu with a one-off burst of coloured dots: the end of a session, the end of the welcome flow. */
export function LuBurst({ size = 88 }: { size?: number }) {
  return (
    <span className="burst tone-wrap">
      {BURST.map(([angle, tone], i) => <i key={i} style={{ '--a': `${angle}deg`, background: `var(--tone-${tone})` } as React.CSSProperties} />)}
      <Lu size={size} className="pop" />
    </span>
  );
}

/**
 * A row that leads somewhere: the whole row is the tap target (52px), icon left, chevron right.
 * Rows go inside a `NavList`.
 */
export function NavRow({ to, icon, look, title, detail }: { to: string; icon?: ReactNode; look?: { tone: Tone; icon: LucideIcon }; title: string; detail?: string }) {
  return (
    <li>
      <Link to={to} className="flex min-h-13 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-paper active:bg-primary-tint">
        {look ? <ToneIcon {...look} size="sm" /> : <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-paper text-ink-soft">{icon}</span>}
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

const finePointer = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine)').matches;

/**
 * A list of four or more choices. With a mouse: our own popover list (arrows, Enter, Esc). On a
 * touch screen: the system picker (a wheel on iPhone), which fingers handle better.
 */
export function SelectField<T extends string>({ value, options, onChange, dot }: { value: T; options: Array<{ value: T; label: string; dot?: string }>; onChange: (value: T) => void; dot?: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const Dot = ({ color }: { color?: string }) => (color ? <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} /> : null);
  const box = 'flex min-h-11 w-full items-center gap-2.5 rounded-xl border bg-surface px-3 text-left font-medium outline-none transition';

  if (!finePointer())
    return (
      <span className={cx(box, 'relative border-line focus-within:border-primary')}>
        <Dot color={dot} />
        <select value={value} onChange={(e) => onChange(e.target.value as T)} className="absolute inset-0 w-full cursor-pointer opacity-0">
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="flex-1 truncate">{current?.label}</span>
        <ChevronDown size={18} className="shrink-0 text-ink-soft" />
      </span>
    );

  const pick = (o: { value: T }) => {
    onChange(o.value);
    setOpen(false);
  };
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setActive(Math.max(0, options.findIndex((o) => o.value === value)));
          setOpen(!open);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') return setOpen(false);
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) {
              setActive(Math.max(0, options.findIndex((o) => o.value === value)));
              return setOpen(true);
            }
            setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length);
          }
          if (open && e.key === 'Enter') {
            e.preventDefault();
            pick(options[active]);
          }
        }}
        className={cx(box, 'focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary-tint', open ? 'border-primary ring-3 ring-primary-tint' : 'border-line hover:border-primary')}
      >
        <Dot color={dot} />
        <span className="flex-1 truncate">{current?.label}</span>
        <ChevronDown size={18} className={cx('shrink-0 text-ink-soft transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 left-0 z-20 mt-1.5 rounded-xl border border-line bg-surface p-1 shadow-lg">
          {options.map((o, i) => {
            const on = o.value === value;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={on}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(o)}
                className={cx('flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm', i === active && 'bg-paper', on && 'font-semibold')}
              >
                <Dot color={o.dot} />
                <span className="flex-1">{o.label}</span>
                {on && <Check size={16} className="text-primary" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
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

/**
 * One answer in a list of choices, as a big row (52px): a quiz option, a plan to pick. `keyHint`
 * shows the keyboard shortcut on a wide screen; `selected` rings it and ticks it.
 */
export function OptionButton({ onClick, selected, keyHint, dot, lang, children }: { onClick: () => void; selected?: boolean; keyHint?: string; /** A colour dot before the label (a track). */ dot?: string; lang?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      role={selected === undefined ? undefined : 'radio'}
      aria-checked={selected}
      onClick={onClick}
      lang={lang}
      className={cx(
        'flex min-h-13 w-full items-center gap-3 rounded-2xl border bg-surface px-4 py-2 text-left font-medium transition hover:border-primary active:bg-primary-tint',
        selected ? 'border-primary ring-3 ring-primary-tint' : 'border-line',
      )}
    >
      {keyHint && <kbd className="hidden size-6 shrink-0 items-center justify-center rounded-md bg-paper font-sans text-xs text-ink-soft ring-1 ring-line sm:flex">{keyHint}</kbd>}
      {dot && <span className="size-2.5 shrink-0 rounded-full" style={{ background: dot }} aria-hidden="true" />}
      <span className="min-w-0 flex-1">{children}</span>
      {selected && <Check size={18} className="shrink-0 text-primary" />}
    </button>
  );
}

/**
 * A titled part of a long screen (Settings): toned icon, title, one line of what it is for, and its
 * state on the right ("Đang bật"). The content (usually a Card) goes under it.
 */
export function Section({ id, tone, icon, title, detail, status, children }: { id?: string; tone?: Tone; icon: LucideIcon; title: string; detail?: string; status?: ReactNode; children: ReactNode }) {
  const Icon = icon;
  return (
    <section id={id} className="scroll-mt-20">
      <header className="mb-3 flex items-start gap-3 px-1">
        {tone ? (
          <ToneIcon tone={tone} icon={icon} size="sm" />
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-danger-tint text-danger" aria-hidden="true"><Icon size={18} strokeWidth={2.2} /></span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold leading-8">{title}</h2>
          {detail && <p className="text-sm text-ink-soft">{detail}</p>}
        </div>
        {status && <div className="mt-1 shrink-0">{status}</div>}
      </header>
      {children}
    </section>
  );
}
