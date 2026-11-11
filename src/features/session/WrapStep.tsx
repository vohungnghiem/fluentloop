import { useEffect, useState } from 'react';

/** Dots thrown once around Lu at the end: angle and tone. */
const BURST: Array<[number, string]> = [[0, 'produce'], [45, 'shadow'], [90, 'wrap'], [135, 'review'], [180, 'input'], [225, 'fix'], [270, 'produce'], [315, 'wrap']];
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import type { SessionRow } from '../../services/db';
import { finishSession, nextSuggestions, todaySummary } from '../../services/learning';
import { Lu, PrimaryAction, StatTile } from '../../ui/ui';
import { labelName, MoreSuggestions } from '../next/NextUp';

/**
 * The end of the loop: what was done, what comes tomorrow, and where to go from here. Reaching
 * this step finishes the session, so the suggestions see today as done.
 */
export function WrapStep({ session, onDone }: { session: SessionRow; onDone: () => void }) {
  const navigate = useNavigate();
  const [finished, setFinished] = useState(session.status === 'done');
  useEffect(() => {
    if (session.status === 'active') void finishSession(session.id, now()).then(() => setFinished(true));
  }, [session.id, session.status]);
  const summary = useLiveQuery(() => todaySummary(now()), []);
  const next = useLiveQuery(() => (finished ? nextSuggestions(now(), 2) : undefined), [finished]);
  const { stats } = session;
  const drill = session.plan.focus ?? (session.plan.review ? 'review' : undefined);
  // "Another snippet" right after the daily loop is the main button's job, not a suggestion.
  const extras = next?.suggestions.filter((s) => s.kind !== 'more' && !(s.kind === 'drill' && s.label === drill)) ?? [];

  // Only what happened: a row of zeros reads like a scolding.
  const tiles = [
    { value: stats.newCards, label: vi.wrap.newCards, tone: 'input' as const },
    { value: stats.reviewed, label: vi.wrap.reviewed, tone: 'review' as const },
    { value: stats.written, label: vi.wrap.written, tone: 'produce' as const },
    { value: stats.errorCards ?? 0, label: vi.wrap.errorCards, tone: 'fix' as const },
  ].filter((tile) => tile.value > 0);

  return (
    <section className="flex flex-1 flex-col items-center pt-10 text-center">
      <span className="burst tone-wrap">
        {BURST.map(([angle, color], i) => <i key={i} style={{ '--a': `${angle}deg`, background: `var(--tone-${color})` } as React.CSSProperties} />)}
        <Lu size={88} className="pop" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold">{session.plan.review ? vi.wrap.reviewDone : drill ? vi.drill.done(labelName(drill)) : vi.wrap.title}</h1>
      {tiles.length > 0 && (
        <div className={`rise mt-6 grid w-full gap-3 ${['', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-2'][tiles.length]}`}>
          {tiles.map((tile) => <StatTile key={tile.label} {...tile} />)}
        </div>
      )}
      {stats.reviewed > 0 && <p className="mt-4 text-ink-soft">{vi.wrap.remembered(stats.remembered, stats.reviewed)}</p>}
      {stats.shadowed && stats.heardRatio !== undefined ? (
        <p className="mt-1 text-ink-soft">{vi.wrap.shadowed(stats.shadowed, Math.round(stats.heardRatio * 100))}</p>
      ) : null}
      {summary && !drill && <p className="mt-2 text-lg">{vi.wrap.tomorrow(summary.dueTomorrow)}</p>}
      {next?.course.next && !drill && (
        <p className="mt-1 text-ink-soft">{vi.tomorrowLesson(next.course.next.snippet.titleVi)}</p>
      )}
      <div className="mt-8 w-full text-left">
        <MoreSuggestions items={extras} onPick={(to) => navigate(to, { replace: true })} />
      </div>
      <div className="flex-1" />
      <div className="w-full">
        <PrimaryAction label={drill ? vi.drill.finish : vi.wrap.done} onClick={onDone} />
      </div>
    </section>
  );
}
