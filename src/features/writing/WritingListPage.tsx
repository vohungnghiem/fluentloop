import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useSearchParams } from 'react-router';
import { vi } from '../../copy/vi';
import { attemptComplete, dayOf, WRITING_KINDS, type WritingGroup, type WritingKind } from '../../core/progress/writing';
import { loadWritings } from '../../services/writings';
import { formatDay } from '../plan/PlanCard';
import { SECTION_LOOK } from '../../ui/tones';
import { Card, Choice, Lu, NavList, NavRow } from '../../ui/ui';
import { PageHeader, PageSkeleton } from '../../ui/shell';

/** The look of where an answer was written: a lesson's is the writing step's, the others their section's. */
export const kindLook = (kind: WritingKind) => SECTION_LOOK[kind === 'lesson' ? 'writing' : kind];

/** One task in the writing history: how often it was done, when last, and whether it was complete. */
export function WritingRow({ group, title }: { group: WritingGroup; title?: string }) {
  return (
    <NavRow
      to={`/writing/${encodeURIComponent(group.key)}`}
      look={kindLook(group.kind)}
      title={title ?? vi.writing.untitled}
      detail={[
        vi.writing.times(group.attempts.length),
        vi.writing.lastOn(formatDay(dayOf(group.last.at))),
        attemptComplete(group.last) ? vi.writing.complete : vi.writing.incomplete,
      ].join(' · ')}
    />
  );
}

/** Every answer the learner wrote or spoke, one row per task, the latest first. */
export function WritingListPage() {
  const data = useLiveQuery(loadWritings, []);
  const [params, setParams] = useSearchParams();
  if (!data) return <PageSkeleton />;

  const present = WRITING_KINDS.filter((kind) => data.groups.some((g) => g.kind === kind));
  const asked = params.get('kind');
  const kind = present.includes(asked as WritingKind) ? (asked as WritingKind) : 'all';
  const shown = kind === 'all' ? data.groups : data.groups.filter((g) => g.kind === kind);

  return (
    <main className="page">
      <PageHeader title={vi.writing.title} back={{ to: '/progress', label: vi.progress.title }} look={SECTION_LOOK.writing} />

      {data.groups.length === 0 ? (
        <Card className="flex flex-col items-center py-10 text-center">
          <Lu size={72} />
          <p className="mt-4 max-w-sm text-ink-soft">{vi.writing.empty}</p>
          <Link to="/session" className="mt-4 rounded-xl bg-primary px-5 py-2.5 font-medium text-on-primary">{vi.today.start}</Link>
        </Card>
      ) : (
        <>
          <p className="text-ink-soft">{vi.writing.intro}</p>
          {present.length > 1 && (
            <Choice
              value={kind}
              options={[{ value: 'all' as const, label: vi.writing.kinds.all }, ...present.map((k) => ({ value: k, label: vi.writing.kinds[k] }))]}
              onChange={(value) => setParams(value === 'all' ? {} : { kind: value }, { replace: true })}
            />
          )}
          <NavList>
            {shown.map((group) => <WritingRow key={group.key} group={group} title={group.title} />)}
          </NavList>
        </>
      )}
    </main>
  );
}
