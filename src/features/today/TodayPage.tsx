import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router';
import { BookOpen, ChevronRight, Layers, Mic, PenLine, Settings } from 'lucide-react';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { currentTrack, findSnippet, library, snippetChunks } from '../../services/content';
import { TrackPicker } from '../settings/TrackPicker';
import { abandonSession, nextSuggestions } from '../../services/learning';
import { Card, Chip, Lu, Note, PrimaryAction, StatTile } from '../../ui/ui';
import { Meter, PageSkeleton } from '../../ui/shell';
import { lastExport } from '../../services/backup';
import { MoreSuggestions, suggestionPath, suggestionText } from '../next/NextUp';

export function TodayPage() {
  const navigate = useNavigate();
  // Re-read whenever the tables change; `now()` is the app clock.
  const data = useLiveQuery(() => nextSuggestions(now()), [], undefined);
  if (!data) return <PageSkeleton />;
  const { summary, course, suggestions } = data;

  // A week of data and no backup for a week: worth a gentle nudge.
  const WEEK = 7 * 86_400_000;
  const backedUp = lastExport();
  const needsBackup =
    !!summary.firstCardAt && now().getTime() - Date.parse(summary.firstCardAt) > WEEK && (!backedUp || now().getTime() - Date.parse(backedUp) > WEEK);
  const active = summary.active;
  const loopFirst = suggestions[0]?.kind === 'session' || suggestions[0]?.kind === 'resume';
  const main = loopFirst ? suggestions[0] : undefined;
  const rest = loopFirst ? suggestions.slice(1) : suggestions;

  // The lesson the hero card is about: the one in the session in progress, else the next in order.
  const activeLesson = active && !active.plan.focus && !active.plan.review ? findSnippet(active.plan.snippetId) : undefined;
  const lesson = activeLesson
    ? { snippet: activeLesson.snippet, unit: activeLesson.unit }
    : course.next && { snippet: course.next.snippet, unit: course.next.unit };
  const lessonPlace = (snippetId: string) => {
    for (const u of course.units) {
      const l = u.lessons.find((x) => x.snippet.id === snippetId);
      if (l) return vi.path.lessonOf(u.unit.titleVi, l.index + 1, u.lessons.length);
    }
    return '';
  };

  return (
    <main className="page">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lu size={32} />
          <span className="text-lg font-semibold">FluentLoop</span>
          <Chip tone="track">{currentTrack.titleVi}</Chip>
        </div>
        <Link to="/settings" className="rounded-lg p-2 text-ink-soft hover:text-ink" aria-label={vi.settings.link} title={vi.settings.link}><Settings size={20} /></Link>
      </header>

      {summary.firstTime && (
        <section className="rise">
          <h1 className="text-2xl font-semibold">{vi.today.welcomeTitle}</h1>
          <p className="mt-2 leading-relaxed text-ink-soft">{vi.today.welcomeBody}</p>
          {library.tracks.length > 1 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">{vi.today.chooseTrack}</p>
              <TrackPicker />
            </div>
          )}
        </section>
      )}

      <Link to="/path" className="group block rounded-2xl border border-line bg-surface p-4 hover:border-primary">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{vi.path.course(course.read, course.total)}</span>
          <span className="inline-flex items-center gap-0.5 text-primary">{vi.path.see}<ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" /></span>
        </div>
        <Meter value={course.read} max={course.total} className="mt-2" />
      </Link>

      {main ? (
        <Card className="rise relative overflow-hidden">
          <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary-tint" aria-hidden="true" />
          <div className="relative">
            <p className="text-sm font-medium text-track">{active ? suggestionText(main).title : vi.next.title}</p>
            {lesson ? (
              <>
                <h2 className="mt-1 text-xl font-semibold">{lesson.snippet.titleVi}</h2>
                <p className="text-sm text-ink-soft">{lessonPlace(lesson.snippet.id)}</p>
                <p className="mt-3 text-sm">
                  <span className="text-ink-soft">{vi.lesson.chunks}: </span>
                  <span lang="en">{snippetChunks(lesson.snippet).map((c) => c.en).join(' · ')}</span>
                </p>
              </>
            ) : (
              <h2 className="mt-1 text-xl font-semibold">{suggestionText(main).title}</h2>
            )}
            {active ? (
              <>
                <p className="mt-3 text-ink-soft">{suggestionText(main).body}</p>
                <button
                  type="button"
                  className="mt-2 text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
                  onClick={() => confirm(vi.today.abandonConfirm) && void abandonSession(active.id, now())}
                >
                  {vi.today.abandon}
                </button>
              </>
            ) : (
              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {summary.dueToday > 0 && (
                  <li className="flex items-center gap-1.5"><Layers size={16} className="text-track" />{vi.today.plan.review(Math.min(summary.dueToday, 10))}</li>
                )}
                <li className="flex items-center gap-1.5"><BookOpen size={16} className="text-track" />{vi.today.plan.input}</li>
                <li className="flex items-center gap-1.5"><Mic size={16} className="text-track" />{vi.today.plan.shadow}</li>
                <li className="flex items-center gap-1.5"><PenLine size={16} className="text-track" />{vi.today.plan.produce}</li>
              </ul>
            )}
            {lesson && (
              <Link to={`/lesson/${lesson.snippet.id}`} className="mt-3 inline-block text-sm text-primary hover:underline">{vi.today.preview}</Link>
            )}
          </div>
        </Card>
      ) : (
        <Card className="rise flex items-center gap-4">
          <Lu size={56} />
          <div>
            <h2 className="text-xl font-semibold">{vi.today.doneTitle}</h2>
            <p className="mt-1 text-ink-soft">{vi.today.doneBody(summary.dueTomorrow)}</p>
            {course.next ? (
              <Link to={`/lesson/${course.next.snippet.id}`} className="mt-2 inline-block text-sm text-primary hover:underline">
                {vi.tomorrowLesson(course.next.snippet.titleVi)}
              </Link>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">{vi.path.finishedTitle}</p>
            )}
          </div>
        </Card>
      )}

      <MoreSuggestions items={rest} />

      <section className="grid grid-cols-3 gap-3">
        <StatTile value={summary.dueToday} label={vi.today.stats.due} />
        <StatTile value={summary.cards} label={vi.today.stats.cards} />
        <StatTile value={summary.daysLearned} label={vi.today.stats.days} />
      </section>

      {needsBackup && (
        <Note tone="accent">
          {vi.backup.reminder} <Link to="/settings" className="font-medium underline">{vi.backup.reminderAction}</Link>
        </Note>
      )}

      <div className="text-center text-[13px] text-ink-soft">
        <p>{vi.app.localData}</p>
        <Link to="/mic-check" className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"><Mic size={14} />{vi.micCheck.link}</Link>
      </div>

      <div className="flex-1" />
      {main && <PrimaryAction label={suggestionText(main).action} onClick={() => navigate(suggestionPath(main))} />}
    </main>
  );
}
