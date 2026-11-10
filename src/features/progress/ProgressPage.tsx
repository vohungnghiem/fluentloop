import { PageHeader } from '../../ui/shell';
import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { dayKey, daysBetween } from '../../core/date';
import { perDay, retention, sessionMinutes, streak } from '../../core/progress/stats';
import { isOwned } from '../../core/srs/srs';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { db, type BaselineRow } from '../../services/db';
import { Card, StatTile, linkButton } from '../../ui/ui';
import { Bars, PageSkeleton } from '../../ui/shell';
import { insights, type Insight } from '../../core/next/suggest';
import { labelName } from '../next/NextUp';
import { ArrowRight, Lightbulb } from 'lucide-react';

const REDO_AFTER_DAYS = 28;

async function load() {
  const [sessions, cards, reviews, mistakes, baselines] = await Promise.all([
    db.sessions.toArray(),
    db.cards.toArray(),
    db.reviews.toArray(),
    db.mistakes.toArray(),
    db.baselines.orderBy('at').toArray(),
  ]);
  return { sessions, cards, reviews, mistakes, baselines };
}

/** Real measures of learning: days, minutes, sentences owned, memory after a week, mistakes fading. */
export function ProgressPage() {
  const data = useLiveQuery(load, []);
  const today = dayKey(now());
  const view = useMemo(() => {
    if (!data) return undefined;
    const done = data.sessions.filter((s) => s.status === 'done' && s.stats.reviewed + s.stats.newCards + s.stats.written > 0);
    const minutesByDay = new Map<string, number>();
    for (const s of done) minutesByDay.set(s.day, (minutesByDay.get(s.day) ?? 0) + sessionMinutes(s.startedAt, s.finishedAt));
    const days14 = perDay(14, today, []).map(({ day }) => ({ day, minutes: minutesByDay.get(day) ?? 0 }));
    const weekMistakes = [3, 2, 1, 0].map((weeksAgo) => ({
      weeksAgo,
      count: data.mistakes.filter((m) => Math.floor(daysBetween(m.day, today) / 7) === weeksAgo).length,
    }));
    const labelWeeks = [...new Set(data.mistakes.map((m) => m.label))].map((label) => ({
      label,
      weeks: [3, 2, 1, 0].map((ago) => data.mistakes.filter((m) => m.label === label && Math.floor(daysBetween(m.day, today) / 7) === ago).length),
    }));
    return {
      insights: insights({
        labelWeeks,
        minutesThisWeek: days14.slice(-7).reduce((a, d) => a + d.minutes, 0),
        minutesLastWeek: days14.slice(0, 7).reduce((a, d) => a + d.minutes, 0),
      }),
      streak: streak(done.map((s) => s.day), today),
      totalMinutes: [...minutesByDay.values()].reduce((a, b) => a + b, 0),
      weekMinutes: days14.slice(-7).reduce((a, d) => a + d.minutes, 0),
      owned: data.cards.filter((c) => isOwned(c.fsrs)).length,
      retention: retention(data.reviews),
      days14,
      weekMistakes,
    };
  }, [data, today]);
  if (!data || !view) return <PageSkeleton />;
  const lastBaseline = data.baselines.at(-1);
  const sinceBaseline = lastBaseline ? daysBetween(lastBaseline.day, today) : 0;

  return (
    <main className="page">
      <PageHeader title={vi.progress.title} />

      <section className="grid grid-cols-2 gap-3">
        <StatTile value={view.streak.days} label={vi.progress.streak} />
        <StatTile value={view.totalMinutes} label={vi.progress.minutes} />
        <StatTile value={view.owned} label={vi.progress.owned} />
        <StatTile
          value={view.retention.tried > 0 ? `${Math.round((view.retention.kept / view.retention.tried) * 100)}%` : '–'}
          label={vi.progress.retention}
        />
      </section>
      <div className="space-y-1 text-sm text-ink-soft">
        {view.streak.restUsed > 0 && <p>{vi.progress.restUsed(view.streak.restUsed)}</p>}
        <p>{vi.progress.minutesWeek(view.weekMinutes)}. {vi.progress.ownedHint}</p>
        {view.retention.tried === 0 && <p>{vi.progress.retentionNone}</p>}
      </div>

      {view.insights.length > 0 && (
        <Card className="rise">
          <h2 className="flex items-center gap-2 font-semibold"><Lightbulb size={18} className="text-accent" />{vi.insights.title}</h2>
          <ul className="mt-3 space-y-2">
            {view.insights.map((insight, i) => (
              <li key={i}>
                <Link to={insightPath(insight)} className="group flex items-center gap-2 rounded-xl px-1 py-1 hover:bg-paper">
                  <span className="flex-1">{insightText(insight)}</span>
                  <ArrowRight size={16} className="shrink-0 text-ink-soft group-hover:text-primary" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold">{vi.progress.chartTitle}</h2>
        <div className="mt-4">
          <Bars
            values={view.days14.map((d) => d.minutes)}
            highlight={(i) => view.days14[i].day === today}
            height="h-28"
            label={vi.progress.chartTitle}
          />
          <div className="mt-1 flex justify-between text-[11px] text-ink-soft">
            <span>{view.days14[0].day.slice(5)}</span>
            <span>{today.slice(5)}</span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">{vi.progress.mistakesTitle}</h2>
          <Link to="/errors" className={linkButton}>{vi.progress.mistakesLink}</Link>
        </div>
        <div className="mt-3">
          <Bars
            values={view.weekMistakes.map((w) => w.count)}
            labels={view.weekMistakes.map((w) => `${w.weeksAgo === 0 ? vi.errors.thisWeek : vi.errors.weeksAgoShort(w.weeksAgo)} · ${w.count}`)}
            highlight={(i) => view.weekMistakes[i].weeksAgo === 0}
            tone="accent"
            height="h-16"
            label={vi.progress.mistakesTitle}
          />
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">{vi.progress.baselineTitle}</h2>
        {!lastBaseline ? (
          <>
            <p className="mt-1 text-ink-soft">{vi.progress.baselineNone}</p>
            <Link to="/baseline" className="mt-3 inline-block rounded-xl bg-primary px-4 py-2.5 font-medium text-on-primary">{vi.progress.baselineMake}</Link>
          </>
        ) : sinceBaseline >= REDO_AFTER_DAYS ? (
          <>
            <p className="mt-1">{vi.progress.baselineDue}</p>
            <Link to="/baseline" className="mt-3 inline-block rounded-xl bg-primary px-4 py-2.5 font-medium text-on-primary">{vi.progress.baselineRedo}</Link>
          </>
        ) : (
          <p className="mt-1 text-ink-soft">{vi.progress.baselineWait(lastBaseline.day, REDO_AFTER_DAYS - sinceBaseline)}</p>
        )}
        {data.baselines.length > 0 && <Compare baselines={data.baselines} />}
      </Card>
    </main>
  );
}

/** Each benchmark next to the others, oldest first: the learner judges the difference. */
function Compare({ baselines }: { baselines: BaselineRow[] }) {
  return (
    <div className="mt-5 space-y-4">
      <h3 className="text-sm font-semibold">{vi.progress.compare}</h3>
      {baselines.map((b) => (
        <div key={b.id} className="border-l-2 border-track pl-3">
          <div className="text-xs text-ink-soft">
            {b.day} · {b.kind === 'writing' ? vi.progress.words((b.text ?? '').split(/\s+/).filter(Boolean).length) : vi.progress.seconds(b.seconds ?? 0)}
          </div>
          {b.kind === 'writing' ? <p className="mt-1 text-sm whitespace-pre-wrap" lang="en">{b.text}</p> : b.audio && <AudioPlayer blob={b.audio} />}
        </div>
      ))}
    </div>
  );
}

export function AudioPlayer({ blob }: { blob: Blob }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <audio controls src={url} className="mt-1 w-full" />;
}

function insightText(insight: Insight): string {
  switch (insight.kind) {
    case 'mistakeFalling':
      return vi.insights.mistakeFalling(labelName(insight.label), insight.weeks);
    case 'mistakeRising':
      return vi.insights.mistakeRising(labelName(insight.label));
    case 'minutesUp':
      return vi.insights.minutesUp(insight.delta);
    case 'minutesDown':
      return vi.insights.minutesDown(insight.delta);
  }
}

/** Where to act on an observation: a rising mistake goes to the error book, where it can be drilled. */
const insightPath = (insight: Insight) => (insight.kind === 'mistakeFalling' || insight.kind === 'mistakeRising' ? '/errors' : '/');
