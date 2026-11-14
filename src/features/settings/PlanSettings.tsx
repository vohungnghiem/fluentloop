import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { vi } from '../../copy/vi';
import { dayKey } from '../../core/date';
import { DAILY_MINUTES, planWeek } from '../../core/plan/plan';
import { now } from '../../services/clock';
import { getPlan, savePlan } from '../../services/plan';
import { Button, Card, Choice, Field, linkButton } from '../../ui/ui';
import { formatDay } from '../plan/PlanCard';

/** The plan in Settings: minutes a day, the level, and starting the 16 weeks again. */
export function PlanSettings() {
  const plan = useLiveQuery(getPlan, [], null);
  if (plan === null) return null;
  if (!plan) {
    return (
      <Card>
        <p className="text-ink-soft">{vi.plan.setupBody}</p>
        <Link to="/start" className={`${linkButton} mt-3`}>{vi.plan.setupAction}</Link>
      </Card>
    );
  }
  const week = planWeek(plan.startDay, dayKey(now()));
  return (
    <Card className="space-y-4">
      <Field label={vi.plan.perDay} hint={vi.plan.perDayHint}>
        <Choice
          value={String(plan.minutesPerDay)}
          options={DAILY_MINUTES.map((m) => ({ value: String(m), label: vi.plan.durations[m] }))}
          onChange={(m) => void savePlan({ minutesPerDay: Number(m) }, now())}
        />
      </Field>
      <div>
        <p className="text-sm font-medium">{vi.plan.level}</p>
        <p className="mt-1">{plan.level ? vi.levels[plan.level].name : vi.plan.noLevel}</p>
        <Link to="/placement" className={`${linkButton} mt-2`}>{vi.plan.redoPlacement}</Link>
      </div>
      <div className="border-t border-line pt-4">
        <p className="text-sm text-ink-soft">
          {vi.plan.weekOf(Math.min(week.week, week.weeks), week.weeks)} · {vi.plan.started(formatDay(plan.startDay), formatDay(week.endDay))}
        </p>
        <Button className="mt-2" onClick={() => confirm(vi.plan.restartConfirm) && void savePlan({ restart: true }, now())}>{vi.plan.restart}</Button>
      </div>
    </Card>
  );
}
