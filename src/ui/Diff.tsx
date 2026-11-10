import type { DiffPart } from '../core/check/text';

/** Word diff: what to drop is struck through on amber, what to add is on green. Never red. */
export function Diff({ parts }: { parts: DiffPart[] }) {
  const fixes = parts.filter((p) => p.kind !== 'same').length;
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-lg leading-relaxed" lang="en">
        {parts.map((part, i) => (
          <span key={i}>
            {part.kind === 'same' && part.text}
            {part.kind === 'removed' && <del className="rounded bg-accent-tint px-1 text-accent-ink">{part.text}</del>}
            {part.kind === 'added' && <ins className="rounded bg-good-tint px-1 text-good no-underline">{part.text}</ins>}{' '}
          </span>
        ))}
      </p>
      <p className="mt-1 text-xs text-ink-soft">{fixes} chỗ sửa</p>
    </div>
  );
}
