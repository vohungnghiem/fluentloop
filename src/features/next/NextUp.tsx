import { Link } from 'react-router';
import { ArrowRight, Layers, ClipboardPaste, Flag, MessagesSquare, PenLine, Play, Repeat, RotateCcw, Sparkles } from 'lucide-react';
import type { Suggestion } from '../../core/next/suggest';
import { ERROR_LABELS, type ErrorLabel } from '../../core/errors/labels';
import { vi } from '../../copy/vi';

/** Where a suggestion leads. */
export function suggestionPath(s: Suggestion): string {
  switch (s.kind) {
    case 'resume':
    case 'session':
    case 'more':
      return '/session';
    case 'drill':
      return `/session?focus=${encodeURIComponent(s.label)}`;
    case 'roleplay':
      return `/roleplay/${s.scenarioId}`;
    case 'captureTask':
      return `/capture/${s.captureId}/write`;
    case 'review':
      return '/session?review=1';
    case 'baseline':
      return '/baseline';
    case 'capture':
      return '/capture';
  }
}

export const labelName = (label: string) => ERROR_LABELS[label as ErrorLabel] ?? label;

export function suggestionText(s: Suggestion): { title: string; body: string; action: string } {
  switch (s.kind) {
    case 'resume':
      return vi.next.resume(s.step, s.total);
    case 'session':
      return vi.next.session(s.due);
    case 'drill':
      return vi.next.drill(labelName(s.label), s.cards);
    case 'roleplay':
      return vi.next.roleplay(s.title);
    case 'review':
      return vi.next.review(s.due);
    default:
      return vi.next[s.kind];
  }
}

const ICONS = {
  resume: RotateCcw,
  session: Play,
  more: Play,
  drill: Repeat,
  roleplay: MessagesSquare,
  captureTask: PenLine,
  baseline: Flag,
  review: Layers,
  capture: ClipboardPaste,
} as const;

/** The extra suggestions under the main one: one tap each, never more than two. */
export function MoreSuggestions({ items, onPick }: { items: Suggestion[]; onPick?: (to: string) => void }) {
  if (items.length === 0) return null;
  return (
    <section className="rise">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
        <Sparkles size={14} />
        {vi.next.also}
      </h2>
      <ul className="space-y-2">
        {items.map((s) => {
          const Icon = ICONS[s.kind];
          const text = suggestionText(s);
          const to = suggestionPath(s);
          return (
            <li key={`${s.kind}-${to}`}>
              <Link
                to={to}
                onClick={onPick ? (e) => (e.preventDefault(), onPick(to)) : undefined}
                className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-primary"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-track">
                  <Icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{text.title}</span>
                  <span className="block text-sm text-ink-soft">{text.body}</span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export { ICONS as suggestionIcons };
