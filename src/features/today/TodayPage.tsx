import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router';
import { BookOpen, ClipboardPaste, Layers, MessagesSquare, Mic, NotebookPen, PenLine, Play, Settings, TrendingUp } from 'lucide-react';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { courseUnits, currentTrack } from '../../services/content';
import { db } from '../../services/db';
import { todaySummary } from '../../services/learning';
import { Button, Card, Chip, Lu, Note, PrimaryAction, StatTile } from '../../ui/ui';
import { lastExport } from '../../services/backup';

export function TodayPage() {
  const navigate = useNavigate();
  // Re-read whenever the tables change; `now()` is the app clock (the debug page can shift it).
  const summary = useLiveQuery(() => todaySummary(now()), [], undefined);
  const reads = useLiveQuery(() => db.reads.toArray(), [], []);
  if (!summary) return null;

  // The unit being learnt: the first with a snippet not read yet (the last one when all are read).
  const read = new Set(reads.map((r) => r.snippetId));
  const unit = courseUnits.find((u) => u.snippets.some((sn) => !read.has(sn.id))) ?? courseUnits[courseUnits.length - 1];
  const readInUnit = unit.snippets.filter((sn) => read.has(sn.id)).length;
  // A week of data and no backup for a week: worth a gentle nudge.
  const WEEK = 7 * 86_400_000;
  const backedUp = lastExport();
  const needsBackup =
    !!summary.firstCardAt && now().getTime() - Date.parse(summary.firstCardAt) > WEEK && (!backedUp || now().getTime() - Date.parse(backedUp) > WEEK);
  const start = () => navigate('/session');
  const active = summary.active;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col px-4 pt-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lu size={32} />
          <span className="text-lg font-semibold">FluentLoop</span>
        </div>
        <nav className="flex items-center gap-1">
          <Link to="/settings" className="rounded-lg p-1.5 text-ink-soft hover:text-ink" aria-label={vi.settings.link} title={vi.settings.link}><Settings size={18} /></Link>
        </nav>
      </header>
      <div className="mt-2"><Chip tone="track">{currentTrack.titleVi}</Chip></div>

      {summary.firstTime && (
        <section className="mt-8">
          <h1 className="text-2xl font-semibold">{vi.today.welcomeTitle}</h1>
          <p className="mt-2 leading-relaxed text-ink-soft">{vi.today.welcomeBody}</p>
        </section>
      )}

      <Card className="mt-6">
        {summary.doneToday && !active ? (
          <div className="flex items-center gap-4">
            <Lu size={56} />
            <div>
              <h2 className="text-xl font-semibold">{vi.today.doneTitle}</h2>
              <p className="mt-1 text-ink-soft">{vi.today.doneBody(summary.dueTomorrow)}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold">{vi.today.sessionTitle}</h2>
              <span className="text-sm text-ink-soft">{vi.today.sessionMinutes}</span>
            </div>
            {active ? (
              <p className="mt-3 text-ink-soft">{vi.today.resumeHint(active.stepIndex + 1, active.plan.steps.length)}</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {summary.dueToday > 0 && (
                  <li className="flex items-center gap-3"><Layers size={20} className="text-track" />{vi.today.plan.review(Math.min(summary.dueToday, 10))}</li>
                )}
                <li className="flex items-center gap-3"><BookOpen size={20} className="text-track" />{vi.today.plan.input}</li>
                <li className="flex items-center gap-3"><Mic size={20} className="text-track" />{vi.today.plan.shadow}</li>
                <li className="flex items-center gap-3"><PenLine size={20} className="text-track" />{vi.today.plan.produce}</li>
              </ul>
            )}
            <p className="mt-4 text-sm text-ink-soft">
              {vi.today.unit}: {unit.titleVi} · {readInUnit}/{unit.snippets.length}
            </p>
          </>
        )}
      </Card>

      {summary.doneToday && !active && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-ink-soft">{vi.today.more}</span>
          <Button onClick={start}><Play size={16} />{vi.today.moreSession}</Button>
        </div>
      )}

      <section className="mt-6 grid grid-cols-3 gap-3">
        <StatTile value={summary.dueToday} label={vi.today.stats.due} />
        <StatTile value={summary.cards} label={vi.today.stats.cards} />
        <StatTile value={summary.daysLearned} label={vi.today.stats.days} />
      </section>

      <nav className="mt-3 grid grid-cols-4 gap-2">
        {[
          { to: '/roleplay', icon: <MessagesSquare size={20} />, label: vi.roleplay.link },
          { to: '/capture', icon: <ClipboardPaste size={20} />, label: vi.capture.link },
          { to: '/errors', icon: <NotebookPen size={20} />, label: vi.errors.link },
          { to: '/progress', icon: <TrendingUp size={20} />, label: vi.progress.link },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface px-1 py-3 text-center text-[13px] hover:border-primary">
            <span className="text-track">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {needsBackup && (
        <div className="mt-4">
          <Note tone="accent">
            {vi.backup.reminder} <Link to="/settings" className="font-medium underline">{vi.backup.reminderAction}</Link>
          </Note>
        </div>
      )}

      <p className="mt-6 text-center text-[13px] text-ink-soft">{vi.app.localData}</p>
      <p className="mt-2 text-center text-sm">
        <Link to="/mic-check" className="inline-flex items-center gap-1 text-primary hover:underline"><Mic size={14} />{vi.micCheck.link}</Link>
      </p>

      <div className="flex-1" />
      {!(summary.doneToday && !active) && (
        <PrimaryAction label={active ? vi.today.resume : vi.today.start} onClick={start} />
      )}
      {summary.doneToday && !active && <div className="h-6" />}
    </main>
  );
}
