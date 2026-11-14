import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { courseState, findLesson } from '../../core/course/course';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { courseUnits, snippetChunks } from '../../services/content';
import { db } from '../../services/db';
import { abandonSession, activeSession } from '../../services/learning';
import { Chip, Note, PrimaryAction } from '../../ui/ui';
import { PageHeader, PageSkeleton } from '../../ui/shell';
import { ChunkGloss, PatternCard } from '../../ui/speech';
import { SnippetReader } from './SnippetReader';

/** One lesson outside a session: read it again or ahead of time, and study it when wanted. */
export function LessonPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const reads = useLiveQuery(() => db.reads.toArray(), []);
  if (!reads) return <PageSkeleton />;
  const course = courseState(courseUnits, reads.map((r) => r.snippetId));
  const found = findLesson(course, id);
  if (!found) {
    return (
      <main className="page">
        <PageHeader title={vi.path.title} back={{ to: '/path', label: vi.lesson.back }} />
        <p className="text-ink-soft">{vi.lesson.notFound}</p>
      </main>
    );
  }
  const { unit, lesson } = found;
  const { snippet, status } = lesson;
  const all = course.units.flatMap((u) => u.lessons);
  const at = all.findIndex((l) => l.snippet.id === id);
  const prev = all[at - 1];
  const next = all[at + 1];

  const study = async () => {
    const active = await activeSession();
    if (active) {
      if (!confirm(vi.lesson.replaceConfirm)) return;
      await abandonSession(active.id, now());
    }
    navigate(`/session?lesson=${encodeURIComponent(snippet.id)}`);
  };

  return (
    <main className="page">
      <PageHeader title={snippet.titleVi} back={{ to: '/path', label: vi.lesson.back }} />
      <div className="-mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
        <span>{vi.path.lessonOf(unit.unit.titleVi, lesson.index + 1, unit.lessons.length)}</span>
        {status === 'read' && <Chip tone="good">{vi.path.read}</Chip>}
        {status === 'next' && <Chip tone="track">{vi.path.next}</Chip>}
      </div>

      <Note tone="plain">{status === 'read' ? vi.lesson.readNote : status === 'next' ? vi.lesson.nextNote : vi.lesson.laterNote}</Note>

      {unit.unit.pattern && <PatternCard pattern={unit.unit.pattern} />}

      <SnippetReader snippet={snippet} />

      <section>
        <h2 className="mb-2 font-semibold">{vi.lesson.chunks}</h2>
        <ul className="space-y-2">
          {snippetChunks(snippet).map((chunk) => (
            <li key={chunk.id}><ChunkGloss en={chunk.en} meaning={chunk.vi} example={chunk.example} tone="card" /></li>
          ))}
        </ul>
      </section>

      <nav className="grid grid-cols-2 gap-2 text-sm">
        {prev ? (
          <Link to={`/lesson/${prev.snippet.id}`} className="flex min-h-12 items-center gap-1 rounded-xl border border-line bg-surface px-3 font-medium hover:border-primary"><ChevronLeft size={16} />{vi.lesson.prev}</Link>
        ) : <span />}
        {next && (
          <Link to={`/lesson/${next.snippet.id}`} className="col-start-2 flex min-h-12 items-center justify-end gap-1 rounded-xl border border-line bg-surface px-3 font-medium hover:border-primary">{vi.lesson.nextLesson}<ChevronRight size={16} /></Link>
        )}
      </nav>

      <div className="flex-1" />
      <PrimaryAction label={status === 'read' ? vi.lesson.restudy : vi.lesson.study} onClick={() => void study()} />
    </main>
  );
}
