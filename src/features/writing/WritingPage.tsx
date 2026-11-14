import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useParams } from 'react-router';
import { ArrowRight, ChevronDown, ChevronRight, CircleCheck, CircleDashed, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { vi } from '../../copy/vi';
import { displayDiff } from '../../core/check/text';
import { compareAttempts, dayOf, versionsOf, type Signal, type VersionView } from '../../core/progress/writing';
import type { AttemptRow, TalkRow } from '../../services/db';
import { loadWritings } from '../../services/writings';
import { formatDay } from '../plan/PlanCard';
import { AudioPlayer } from '../progress/ProgressPage';
import { FeedbackPanel } from '../session/FeedbackPanel';
import { Diff } from '../../ui/Diff';
import { Button, Card, Chip, Eyebrow, Note, linkButton } from '../../ui/ui';
import { PageHeader, PageSkeleton } from '../../ui/shell';
import { kindLook } from './WritingListPage';

/** One task over time: this answer next to the last one, then every answer with its versions and feedback. */
export function WritingPage() {
  const { key = '' } = useParams();
  const data = useLiveQuery(loadWritings, []);
  if (!data) return <PageSkeleton />;
  const group = data.groups.find((g) => g.key === key);
  const back = { to: '/writing', label: vi.writing.title };
  if (!group) {
    return (
      <main className="page">
        <PageHeader title={vi.writing.title} back={back} />
        <p className="text-ink-soft">{vi.writing.notFound}</p>
      </main>
    );
  }
  const { attempts } = group;
  const before = attempts.at(-2);

  return (
    <main className="page">
      <PageHeader title={vi.writing.title} back={back} />

      <Card>
        <Eyebrow tone={kindLook(group.kind).tone} right={group.where}>{vi.writing.kinds[group.kind]}</Eyebrow>
        <p className="mt-1.5 text-xl leading-snug font-medium">{group.title ?? vi.writing.untitled}</p>
        {group.again && (
          <Link to={group.again} className={`${linkButton} mt-3`}>{vi.writing.again}<ArrowRight size={16} /></Link>
        )}
      </Card>

      {before ? <Compare before={before} after={group.last} /> : <Note tone="plain">{vi.writing.compareOnce}</Note>}

      {[...attempts].reverse().map((attempt, i) => (
        <Attempt key={attempt.id} attempt={attempt} n={attempts.length - i} latest={i === 0} talk={data.talks.get(attempt.snippetId.slice('talk:'.length))} />
      ))}
    </main>
  );
}

function Compare({ before, after }: { before: AttemptRow; after: AttemptRow }) {
  const { signals, newChunks } = compareAttempts(before, after);
  return (
    <Card className="rise">
      <h2 className="font-semibold">{vi.writing.compareTitle}</h2>
      <p className="text-sm text-ink-soft">{vi.writing.compareDates(formatDay(dayOf(before.at)), formatDay(dayOf(after.at)))}</p>
      <ul className="mt-3 space-y-2">
        {signals.map((s) => <SignalRow key={s.kind} signal={s} />)}
      </ul>
      {newChunks.length > 0 && (
        <p className="mt-3 text-sm">
          <span className="text-ink-soft">{vi.writing.newChunks}</span> {newChunks.map((c) => <Chip key={c} tone="good"><span lang="en">{c}</span></Chip>)}
        </p>
      )}
    </Card>
  );
}

function SignalRow({ signal }: { signal: Signal }) {
  const { better } = signal;
  const Icon = better === undefined ? Minus : better ? TrendingUp : TrendingDown;
  return (
    <li className="flex items-center gap-3">
      <Icon size={18} className={`shrink-0 ${better === undefined ? 'text-ink-soft' : better ? 'text-good' : 'text-accent-ink'}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block">{vi.writing.signals[signal.kind]}</span>
        <span className={`block text-sm ${better === undefined ? 'text-ink-soft' : better ? 'text-good' : 'text-accent-ink'}`}>
          {better === undefined ? vi.writing.same : better ? vi.writing.better : vi.writing.worse}
        </span>
      </span>
      <span className="shrink-0 font-medium tabular-nums">{signal.before} → {signal.after}</span>
    </li>
  );
}

/** One answer: its versions oldest first, the last with its feedback open. */
function Attempt({ attempt, n, latest, talk }: { attempt: AttemptRow; n: number; latest: boolean; talk?: TalkRow }) {
  const versions = versionsOf(attempt);
  const kept = versions.some((v) => v.version);
  const complete = (attempt.missingPoints ?? []).length === 0 && attempt.missingRequired.length === 0;
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 px-1">
        <h2 className="font-semibold">{vi.writing.attempt(n, formatDay(dayOf(attempt.at)))}</h2>
        <span className="text-sm text-ink-soft">{vi.writing.versionsCount(versions.length)}</span>
        <span className="flex-1" />
        <Chip tone={complete ? 'good' : 'accent'}>
          {complete ? <CircleCheck size={14} /> : <CircleDashed size={14} />}
          {complete ? vi.writing.complete : vi.writing.incomplete}
        </Chip>
      </div>
      {talk?.audio && (
        <div>
          <p className="px-1 text-sm text-ink-soft">{vi.writing.heard}</p>
          <AudioPlayer blob={talk.audio} />
        </div>
      )}
      {!kept && <Note tone="plain">{vi.writing.noFeedback}</Note>}
      {versions.map((v, i) => (
        <Version key={i} view={v} index={i} previous={versions[i - 1]?.text} open={latest && i === versions.length - 1} />
      ))}
    </section>
  );
}

function Version({ view, index, previous, open: openFirst }: { view: VersionView; index: number; previous?: string; open: boolean }) {
  const [open, setOpen] = useState(openFirst);
  const { version } = view;
  const diff = previous !== undefined ? displayDiff(previous, view.text) : undefined;
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between gap-2">
          <Eyebrow>{vi.coach.version(index + 1)}</Eyebrow>
          {view.at && <span className="text-xs text-ink-soft">{new Date(view.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
        <p className="mt-1.5 text-lg leading-relaxed whitespace-pre-wrap" lang="en">{view.text}</p>
        {diff?.some((part) => part.kind !== 'same') && (
          <div className="mt-3">
            <p className="mb-1 text-sm text-ink-soft">{vi.writing.changed}</p>
            <Diff parts={diff} />
          </div>
        )}
        {version && (
          <Button variant="quiet" className="mt-2" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            {open ? vi.writing.hideFeedback : vi.writing.showFeedback}
          </Button>
        )}
      </Card>
      {version && open && (
        <FeedbackPanel
          checked={{ ...version, chosenMistakes: new Set(version.chosenMistakes), chosenUpgrades: new Set(version.chosenUpgrades) }}
          version={index + 1}
        />
      )}
    </div>
  );
}
