import { PageHeader } from '../../ui/shell';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router';
import { TrendingDown, Repeat, Dumbbell } from 'lucide-react';
import { daysBetween, dayKey } from '../../core/date';
import { ERROR_LABELS, type ErrorLabel } from '../../core/errors/labels';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { db, type MistakeRow } from '../../services/db';
import { Button, Card, Chip, Lu, Note } from '../../ui/ui';
import { Bars, PageSkeleton } from '../../ui/shell';
import { activeSession } from '../../services/learning';

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
  const navigate = useNavigate();
  const mistakes = useLiveQuery(() => db.mistakes.orderBy('day').reverse().toArray(), []);
  const busy = useLiveQuery(async () => !!(await activeSession()), [], false);
  if (!mistakes) return <PageSkeleton />;
  const today = dayKey(now());
  const groups = byLabel(mistakes, today);

  return (
    <main className="page">
      <PageHeader title={vi.errors.title} />

      {groups.length === 0 ? (
        <Card className="flex flex-col items-center py-10 text-center">
          <Lu size={72} />
          <p className="mt-4 max-w-sm text-ink-soft">{vi.errors.empty}</p>
          <Link to="/session" className="mt-4 rounded-xl bg-primary px-5 py-2.5 font-medium text-on-primary">{vi.today.start}</Link>
        </Card>
      ) : (
        <>
          <p className="text-ink-soft">{vi.errors.intro(mistakes.length)}</p>
          {busy && <Note tone="plain">{vi.drill.busy} <Link to="/session" className="font-medium text-primary underline">{vi.today.resume}</Link></Note>}
          {groups.map((group) => {
            const [prev, last] = [group.weeks[WEEKS - 2], group.weeks[WEEKS - 1]];
            const falling = prev > 0 && last < prev;
            const cards = new Set(group.rows.flatMap((m) => (m.cardId ? [m.cardId] : []))).size;
            return (
              <Card key={group.label} className="rise">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">{ERROR_LABELS[group.label as ErrorLabel] ?? group.label}</h2>
                  <span className="text-sm text-ink-soft">{vi.errors.times(group.rows.length)}</span>
                </div>
                <div className="mt-3">
                  <Bars
                    values={group.weeks}
                    labels={group.weeks.map((count, i) => `${i === WEEKS - 1 ? vi.errors.thisWeek : vi.errors.weeksAgoShort(WEEKS - 1 - i)} · ${count}`)}
                    highlight={(i) => i === WEEKS - 1}
                    tone="accent"
                    height="h-12"
                    label={vi.errors.chart}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {falling ? (
                      <Chip tone="good"><TrendingDown size={14} />{vi.errors.falling}</Chip>
                    ) : last > 1 ? (
                      <Chip tone="accent"><Repeat size={14} />{vi.errors.repeating}</Chip>
                    ) : null}
                  </span>
                  {cards > 0 && (
                    <Button onClick={() => navigate(`/session?focus=${encodeURIComponent(group.label)}`)} disabled={busy} title={busy ? vi.drill.busy : undefined}>
                      <Dumbbell size={16} />
                      {vi.drill.button(cards)}
                    </Button>
                  )}
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
