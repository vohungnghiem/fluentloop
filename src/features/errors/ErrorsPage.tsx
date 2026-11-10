import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { TrendingDown, Repeat } from 'lucide-react';
import { daysBetween, dayKey } from '../../core/date';
import { ERROR_LABELS, type ErrorLabel } from '../../core/errors/labels';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { db, type MistakeRow } from '../../services/db';
import { Card, Chip, Lu } from '../../ui/ui';

const WEEKS = 4;

/** Mistakes grouped by label, with how often each came back in each of the last four weeks. */
function byLabel(mistakes: MistakeRow[], today: string) {
  const groups = new Map<string, { label: string; rows: MistakeRow[]; weeks: number[] }>();
  for (const mistake of mistakes) {
    const week = Math.floor(daysBetween(mistake.day, today) / 7);
    const group = groups.get(mistake.label) ?? { label: mistake.label, rows: [] as MistakeRow[], weeks: new Array<number>(WEEKS).fill(0) };
    group.rows.push(mistake);
    if (week >= 0 && week < WEEKS) group.weeks[WEEKS - 1 - week]++;
    groups.set(mistake.label, group);
  }
  return [...groups.values()].sort((a, b) => b.rows.length - a.rows.length);
}

export function ErrorsPage() {
  const mistakes = useLiveQuery(() => db.mistakes.orderBy('day').reverse().toArray(), []);
  if (!mistakes) return null;
  const today = dayKey(now());
  const groups = byLabel(mistakes, today);
  const max = Math.max(1, ...groups.flatMap((g) => g.weeks));

  return (
    <main className="mx-auto max-w-[640px] space-y-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{vi.errors.title}</h1>
        <Link to="/" className="text-primary hover:underline">← {vi.micCheck.back}</Link>
      </header>

      {groups.length === 0 ? (
        <Card className="flex flex-col items-center py-10 text-center">
          <Lu size={72} />
          <p className="mt-4 max-w-sm text-ink-soft">{vi.errors.empty}</p>
          <Link to="/session" className="mt-4 rounded-xl bg-primary px-5 py-2.5 font-medium text-on-primary">{vi.today.start}</Link>
        </Card>
      ) : (
        <>
          <p className="text-ink-soft">{vi.errors.intro(mistakes.length)}</p>
          {groups.map((group) => {
            const [prev, last] = [group.weeks[WEEKS - 2], group.weeks[WEEKS - 1]];
            const falling = prev > 0 && last < prev;
            return (
              <Card key={group.label}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">{ERROR_LABELS[group.label as ErrorLabel] ?? group.label}</h2>
                  <span className="text-sm text-ink-soft">{vi.errors.times(group.rows.length)}</span>
                </div>
                <div className="mt-3 flex items-end gap-2" aria-label={vi.errors.chart}>
                  {group.weeks.map((count, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex h-12 w-full items-end">
                        <div className={`w-full rounded-t ${i === WEEKS - 1 ? 'bg-accent' : 'bg-line'}`} style={{ height: `${(count / max) * 100}%`, minHeight: count ? 4 : 0 }} />
                      </div>
                      <span className="text-[11px] text-ink-soft">{i === WEEKS - 1 ? vi.errors.thisWeek : vi.errors.weeksAgo(WEEKS - 1 - i)} · {count}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  {falling ? (
                    <Chip tone="good"><TrendingDown size={14} />{vi.errors.falling}</Chip>
                  ) : last > 1 ? (
                    <Chip tone="accent"><Repeat size={14} />{vi.errors.repeating}</Chip>
                  ) : null}
                </div>
                <ul className="mt-3 space-y-2 text-sm">
                  {group.rows.slice(0, 3).map((m) => (
                    <li key={m.id}>
                      <span lang="en"><del className="rounded bg-accent-tint px-1 text-accent-ink">{m.wrong}</del> → <ins className="rounded bg-good-tint px-1 text-good no-underline">{m.right}</ins></span>
                      <span className="text-ink-soft"> · {m.vi}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </>
      )}
    </main>
  );
}
