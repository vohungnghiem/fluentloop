import { useLiveQuery } from 'dexie-react-hooks';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import type { SessionRow } from '../../services/db';
import { finishSession, todaySummary } from '../../services/learning';
import { Lu, PrimaryAction, StatTile } from '../../ui/ui';

/** The end of the day's loop: what was done, what comes tomorrow, and a clear stop. */
export function WrapStep({ session, onDone }: { session: SessionRow; onDone: () => void }) {
  const summary = useLiveQuery(() => todaySummary(now()), []);
  const { stats } = session;
  const done = () => void finishSession(session.id, now()).then(onDone);

  return (
    <section className="flex flex-1 flex-col items-center pt-12 text-center">
      <Lu size={96} />
      <h1 className="mt-4 text-2xl font-semibold">{vi.wrap.title}</h1>
      <div className="mt-6 grid w-full grid-cols-3 gap-3">
        <StatTile value={stats.newCards} label={vi.wrap.newCards} />
        <StatTile value={stats.reviewed} label={vi.wrap.reviewed} />
        <StatTile value={stats.errorCards ?? 0} label={vi.wrap.errorCards} />
      </div>
      {stats.reviewed > 0 && <p className="mt-4 text-ink-soft">{vi.wrap.remembered(stats.remembered, stats.reviewed)}</p>}
      {stats.shadowed && stats.heardRatio !== undefined ? (
        <p className="mt-1 text-ink-soft">{vi.wrap.shadowed(stats.shadowed, Math.round(stats.heardRatio * 100))}</p>
      ) : null}
      {summary && <p className="mt-2 text-lg">{vi.wrap.tomorrow(summary.dueTomorrow)}</p>}
      <div className="flex-1" />
      <div className="w-full">
        <PrimaryAction label={vi.wrap.done} onClick={done} />
      </div>
    </section>
  );
}
