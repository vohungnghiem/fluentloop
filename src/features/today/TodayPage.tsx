import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router';
import { BookOpen, MessagesSquare, Mic, Route, Settings } from 'lucide-react';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { currentTrack, findSnippet, library, snippetChunks } from '../../services/content';
import { TrackPicker } from '../settings/TrackPicker';
import { abandonSession, nextSuggestions } from '../../services/learning';
import { Card, CardAction, Chip, Lu, MoreMenu, NavList, NavRow, Note, linkButton } from '../../ui/ui';
import { PageSkeleton } from '../../ui/shell';
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
        <Link to="/settings" className="flex size-11 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-ink" aria-label={vi.settings.link} title={vi.settings.link}><Settings size={20} /></Link>
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


      {main ? (
        <Card className="rise">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-ink-soft">
              {active ? suggestionText(main).title : vi.next.title}
              {lesson && !active && <> · {lessonPlace(lesson.snippet.id).split(' · ').pop()}</>}
            </p>
            {active && (
              <div className="-mt-2 -mr-2">
                <MoreMenu label={vi.today.options} items={[{ label: vi.today.abandon, onClick: () => confirm(vi.today.abandonConfirm) && void abandonSession(active.id, now()) }]} />
              </div>
            )}
          </div>
          {lesson ? (
            <>
              <h2 className="mt-1 text-xl font-semibold">{lesson.snippet.titleVi}</h2>
              <p className="text-sm text-ink-soft">{lesson.unit.titleVi}</p>
              <p className="mt-3 text-ink" lang="en">{snippetChunks(lesson.snippet).map((c) => c.en).join(' · ')}</p>
            </>
          ) : (
            <h2 className="mt-1 text-xl font-semibold">{suggestionText(main).title}</h2>
          )}
          <p className="mt-3 text-sm text-ink-soft">
            {active
              ? suggestionText(main).body
              : [summary.dueToday > 0 && vi.today.plan.review(Math.min(summary.dueToday, 10)), vi.today.plan.input, vi.today.plan.shadow, vi.today.plan.produce].filter(Boolean).join(' · ') + ` (${vi.today.sessionMinutes})`}
          </p>
          <CardAction label={suggestionText(main).action} onClick={() => navigate(suggestionPath(main))} />
        </Card>
      ) : (
        <Card className="rise flex items-center gap-4">
          <Lu size={56} />
          <div>
            <h2 className="text-xl font-semibold">{vi.today.doneTitle}</h2>
            <p className="mt-1 text-ink-soft">{vi.today.doneBody(summary.dueTomorrow)}</p>
            {course.next ? (
              <Link to={`/lesson/${course.next.snippet.id}`} className={`mt-3 ${linkButton}`}>
                {vi.tomorrowLesson(course.next.snippet.titleVi)}
              </Link>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">{vi.path.finishedTitle}</p>
            )}
          </div>
        </Card>
      )}

      <MoreSuggestions items={rest} />

      {summary.cards > 0 && <p className="text-center text-sm text-ink-soft">
        {[`${summary.dueToday} ${vi.today.stats.due}`, `${summary.cards} ${vi.today.stats.cards}`, `${summary.daysLearned} ${vi.today.stats.days}`].join(' · ')}
      </p>}

      {needsBackup && (
        <Note tone="accent">
          {vi.backup.reminder} <Link to="/settings" className="font-medium underline">{vi.backup.reminderAction}</Link>
        </Note>
      )}

      <div className="mt-4">
        <NavList title={vi.today.explore}>
          <NavRow to="/path" icon={<Route size={18} />} title={vi.path.title} detail={vi.path.course(course.read, course.total)} />
          {lesson && <NavRow to={`/lesson/${lesson.snippet.id}`} icon={<BookOpen size={18} />} title={vi.today.preview} detail={lesson.snippet.titleVi} />}
          <NavRow to="/roleplay" icon={<MessagesSquare size={18} />} title={vi.roleplay.title} />
          <NavRow to="/mic-check" icon={<Mic size={18} />} title={vi.micCheck.link} />
        </NavList>
      </div>

      <p className="text-center text-[13px] text-ink-soft">{vi.app.localData}</p>
    </main>
  );
}
