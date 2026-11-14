import { useState } from 'react';
import { Link } from 'react-router';
import { CalendarCheck, Plus, X } from 'lucide-react';
import { vi } from '../../copy/vi';
import type { StudyLogRow } from '../../services/db';
import { now } from '../../services/clock';
import { logOutside, removeLog, type planToday } from '../../services/plan';
import { Meter } from '../../ui/shell';
import { Button, Card, Eyebrow, Note, Segmented, ToneIcon, linkButton } from '../../ui/ui';

/** "2026-11-14" as the learner reads a date: 14/11/2026. */
export const formatDay = (day: string) => day.split('-').reverse().join('/');

type PlanToday = Awaited<ReturnType<typeof planToday>>;

/**
 * Today's place in the 16-week plan: the week, what this month is about, minutes so far against
 * the daily goal, and a quick way to log time studied outside the app. No plan yet: an invitation.
 */
export function PlanCard({ data }: { data: PlanToday }) {
  const [logging, setLogging] = useState(false);
  if (!data.plan) {
    return (
      <Card className="rise flex items-start gap-3">
        <ToneIcon tone="wrap" icon={CalendarCheck} />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{vi.plan.setupTitle}</h2>
          <p className="mt-1 text-ink-soft">{vi.plan.setupBody}</p>
          <Link to="/start" className={`${linkButton} mt-3`}>{vi.plan.setupAction}</Link>
        </div>
      </Card>
    );
  }
  const { plan, week, today, logs, checkpointDue } = data;
  const phase = vi.plan.phases[week.phase];
  const goal = plan.minutesPerDay;

  if (week.finished) {
    return (
      <Card className="rise">
        <Eyebrow tone="wrap">{vi.plan.weekOf(week.weeks, week.weeks)}</Eyebrow>
        <h2 className="mt-2 text-lg font-semibold">{vi.plan.finishedTitle}</h2>
        <p className="mt-1 text-ink-soft">{vi.plan.finishedBody}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/baseline" className={linkButton}>{vi.plan.checkpointAction}</Link>
          <Link to="/settings#plan" className={linkButton}>{vi.plan.settingsTitle}</Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rise">
      <Eyebrow tone="wrap" right={vi.plan.monthOf(week.phase, phase.name)}>{vi.plan.weekOf(week.week, week.weeks)}</Eyebrow>
      <p className="mt-2 font-semibold">{phase.focus}</p>
      <p className="mt-0.5 text-sm text-ink-soft">{vi.plan.weekGoal} {phase.goal}</p>

      <div className="mt-4">
        <p className="text-sm font-medium">{today.total >= goal ? vi.plan.todayDone(today.total) : vi.plan.today(today.total, goal)}</p>
        <Meter value={today.total} max={goal} className="mt-1.5" />
        {today.outside > 0 && <p className="mt-1.5 text-sm text-ink-soft">{vi.plan.inApp(today.app)} · {vi.plan.outside(today.outside)}</p>}
      </div>

      {checkpointDue && (
        <div className="mt-4">
          <Note tone="accent">
            <p>{week.week === 1 ? vi.plan.checkpointFirst : vi.plan.checkpoint}</p>
            <Link to="/baseline" className={`${linkButton} mt-2`}>{vi.plan.checkpointAction}</Link>
          </Note>
        </div>
      )}

      {logging ? (
        <LogOutside logs={logs} onClose={() => setLogging(false)} />
      ) : (
        <Button variant="quiet" className="mt-2 -ml-1 px-1" onClick={() => setLogging(true)}><Plus size={16} />{vi.plan.logButton}</Button>
      )}
    </Card>
  );
}

const KINDS: Array<StudyLogRow['kind']> = ['listen', 'speak', 'read', 'other'];
const LOG_MINUTES = ['15', '30', '45', '60'] as const;

function LogOutside({ logs, onClose }: { logs: readonly StudyLogRow[]; onClose: () => void }) {
  const [kind, setKind] = useState<StudyLogRow['kind']>('listen');
  const [minutes, setMinutes] = useState<(typeof LOG_MINUTES)[number]>('30');
  return (
    <div className="mt-4 space-y-3 rounded-xl bg-paper p-4 ring-1 ring-line">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{vi.plan.logTitle}</p>
          <p className="text-sm text-ink-soft">{vi.plan.logHint}</p>
        </div>
        <button type="button" onClick={onClose} className="-mt-1 -mr-1 flex size-10 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface" aria-label={vi.plan.close} title={vi.plan.close}><X size={18} /></button>
      </div>
      <Segmented value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k, label: vi.plan.kinds[k] }))} />
      <Segmented value={minutes} onChange={setMinutes} options={LOG_MINUTES.map((m) => ({ value: m, label: vi.plan.minutes(Number(m)) }))} />
      <Button variant="primary" className="w-full sm:w-auto" onClick={() => void logOutside(Number(minutes), kind, now())}>{vi.plan.save}</Button>
      {logs.length > 0 && (
        <div className="border-t border-line pt-3 text-sm">
          <p className="text-ink-soft">{vi.plan.logged}</p>
          <ul className="mt-1 space-y-1">
            {logs.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-2">
                <span>{vi.plan.kinds[log.kind]} · {vi.plan.minutes(log.minutes)}</span>
                <Button variant="quiet" className="min-h-9 px-2 text-sm" onClick={() => void removeLog(log.id, now())}>{vi.plan.undo}</Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
