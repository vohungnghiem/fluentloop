import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { Check, ChevronDown, ChevronRight, MessagesSquare, PartyPopper } from 'lucide-react';
import type { CourseUnit } from '../../core/course/course';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { nextSuggestions } from '../../services/learning';
import { currentTrack } from '../../services/content';
import { FoundationDone } from './FoundationDone';
import { Card, Chip, Note } from '../../ui/ui';
import { Meter, PageHeader, PageSkeleton } from '../../ui/shell';
import { SECTION_LOOK } from '../../ui/tones';

/** The whole course: where the learner is, what comes next, and every lesson to open again. */
export function PathPage() {
  const data = useLiveQuery(() => nextSuggestions(now()), []);
  if (!data) return <PageSkeleton />;
  const { course, played } = data;

  return (
    <main className="page">
      <PageHeader title={vi.path.title} look={SECTION_LOOK.path}>
        <Chip tone="track">{currentTrack.titleVi}</Chip>
      </PageHeader>
      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">{vi.path.course(course.read, course.total)}</span>
          <span className="text-ink-soft">{Math.round((course.read / Math.max(1, course.total)) * 100)}%</span>
        </div>
        <Meter value={course.read} max={course.total} className="mt-2" />
        <p className="mt-3 text-sm text-ink-soft">{vi.path.intro}</p>
      </div>
      {course.finished && currentTrack.foundation && <FoundationDone />}
      {course.finished && !currentTrack.foundation && (
        <Note tone="good" icon={<PartyPopper size={18} />}>
          <b>{vi.path.finishedTitle}</b> {vi.path.finishedBody}
        </Note>
      )}
      <ol className="space-y-3">
        {course.units.map((unit) => (
          <UnitCard key={unit.unit.id} unit={unit} played={played} startOpen={unit.status === 'current' || (course.finished && unit.index === 0)} />
        ))}
      </ol>
    </main>
  );
}

function UnitCard({ unit, played, startOpen }: { unit: CourseUnit; played: Set<string>; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const total = unit.lessons.length;
  return (
    <li className="rise">
      <Card className={`!p-0 ${unit.status === 'current' ? 'border-primary' : ''}`}>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
              unit.status === 'done' ? 'bg-good-tint text-good' : unit.status === 'current' ? 'bg-primary text-on-primary' : 'bg-paper text-ink-soft ring-1 ring-line'
            }`}
          >
            {unit.status === 'done' ? <Check size={18} /> : unit.index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-ink-soft">{vi.path.unit(unit.index + 1)} · {vi.path.snippets(unit.read, total)}</span>
            <span className="block font-semibold">{unit.unit.titleVi}</span>
            {unit.status === 'current' && <Meter value={unit.read} max={total} className="mt-2" />}
          </span>
          {open ? <ChevronDown size={20} className="text-ink-soft" /> : <ChevronRight size={20} className="text-ink-soft" />}
        </button>
        {open && (
          <ul className="border-t border-line">
            {unit.lessons.map(({ snippet, index, status }) => (
              <li key={snippet.id}>
                <Link
                  to={`/lesson/${snippet.id}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-paper ${status === 'next' ? 'bg-primary-tint/60' : ''}`}
                  aria-current={status === 'next' ? 'step' : undefined}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                      status === 'read' ? 'bg-good text-on-primary' : status === 'next' ? 'bg-primary text-on-primary' : 'text-ink-soft ring-1 ring-line'
                    }`}
                  >
                    {status === 'read' ? <Check size={14} strokeWidth={3} /> : index + 1}
                  </span>
                  <span className={`min-w-0 flex-1 ${status === 'later' ? 'text-ink-soft' : ''}`}>{snippet.titleVi}</span>
                  {status === 'next' && <Chip tone="track">{vi.path.next}</Chip>}
                  <ChevronRight size={16} className="shrink-0 text-ink-soft" />
                </Link>
              </li>
            ))}
            {unit.unit.scenarios.map((scenario) => (
              <li key={scenario.id} className="border-t border-line">
                <Link to={`/roleplay/${scenario.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-paper">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center text-track"><MessagesSquare size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-ink-soft">{vi.path.roleplay}</span>
                    {scenario.titleVi}
                  </span>
                  {played.has(scenario.id) && <Chip tone="good"><Check size={14} />{vi.path.roleplayDone}</Chip>}
                  <ChevronRight size={16} className="shrink-0 text-ink-soft" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </li>
  );
}
