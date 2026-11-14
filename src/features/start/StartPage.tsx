import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Briefcase, Clock, LogIn, Mic, Sparkles } from 'lucide-react';
import { vi } from '../../copy/vi';
import { dayKey } from '../../core/date';
import { DAILY_MINUTES, needsFoundation, planWeek } from '../../core/plan/plan';
import { now } from '../../services/clock';
import { chooseTrack, chosenIndustry, currentTrack, foundationTrack, industryTracks } from '../../services/content';
import { getPlan, savePlan } from '../../services/plan';
import { aiReady, useSettings } from '../../services/settings';
import { Meter } from '../../ui/shell';
import { STEP_LOOK } from '../../ui/tones';
import { Button, Card, Lu, LuBurst, Note, OptionButton, PrimaryAction, StepHeader, ToneIcon } from '../../ui/ui';
import { useDraft } from '../../ui/useDraft';
import { BaselineForm } from '../progress/BaselinePage';
import { PlacementTest } from '../placement/PlacementTest';
import { TrackPicker } from '../settings/TrackPicker';
import { formatDay } from '../plan/PlanCard';

type Step = 'welcome' | 'track' | 'goal' | 'placement' | 'baseline' | 'ai' | 'done';
const STEPS: Step[] = ['welcome', ...(industryTracks.length > 1 ? (['track'] as const) : []), 'goal', 'placement', 'baseline', 'ai', 'done'];

/** Tones of the three "how it works" rows: the colours the learner will meet in a session. */
const HOW = [STEP_LOOK.review, STEP_LOOK.produce, { tone: 'wrap', icon: STEP_LOOK.wrap.icon }] as const;

/**
 * The welcome flow of a new learner (or a learner without a plan yet): what the app is, how long a
 * day, a placement test, a benchmark, AI if wanted. Every step can be left for later; where the
 * learner is stays as a draft, so a reload (changing the track reloads) comes back to it.
 */
export function StartPage() {
  const navigate = useNavigate();
  const draft = useDraft<Step>('start');
  const [step, setStep] = useState<Step>();
  useEffect(() => {
    if (draft.ready && !step) setStep(draft.saved && STEPS.includes(draft.saved) ? draft.saved : 'welcome');
  }, [draft.ready]);
  const plan = useLiveQuery(getPlan);
  const settings = useSettings();
  const [minutes, setMinutes] = useState<number>();
  const [baselineSaved, setBaselineSaved] = useState(false);

  if (!step) return null;
  const index = STEPS.indexOf(step);
  const go = (next: Step) => {
    setStep(next);
    draft.save(next);
    window.scrollTo(0, 0);
  };
  const forward = () => go(STEPS[Math.min(index + 1, STEPS.length - 1)]);
  // Below B1 the learner starts on the foundation pack (the industry chosen comes after it).
  const toFoundation = !!foundationTrack && !currentTrack.foundation && needsFoundation(plan?.level);
  const finish = async (path: string, foundation = false) => {
    await savePlan({ onboarded: true }, now());
    draft.clear();
    // Content is read at start: another pack means loading the app again, straight at `path`.
    if (foundation && foundationTrack && chooseTrack(foundationTrack.id)) location.assign(`${import.meta.env.BASE_URL}${path.slice(1)}`);
    else navigate(path, { replace: true });
  };

  const chosen = minutes ?? plan?.minutesPerDay ?? 60;
  const week = planWeek(plan?.startDay ?? dayKey(now()), dayKey(now()));

  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col space-y-5 px-4 pt-6">
      {step !== 'welcome' && (
        <header className="flex items-center gap-2">
          <button type="button" onClick={() => go(STEPS[index - 1])} className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-ink" aria-label={vi.start.back} title={vi.start.back}>
            <ArrowLeft size={20} />
          </button>
          <Meter value={index} max={STEPS.length - 1} className="flex-1" />
          <span className="w-20 text-right text-sm text-ink-soft">{vi.start.stepOf(index, STEPS.length - 1)}</span>
        </header>
      )}

      {step === 'welcome' && (
        <>
          <section className="flex flex-col items-center pt-6 text-center">
            <Lu size={88} className="pop" />
            <h1 className="mt-5 text-3xl font-semibold">{vi.start.hello}</h1>
            <p className="mt-3 max-w-md text-lg leading-relaxed">{vi.start.lead}</p>
          </section>
          <Card className="rise">
            <ul className="space-y-4">
              {vi.start.how.map((row, i) => (
                <li key={row.title} className="flex items-start gap-3">
                  <ToneIcon tone={HOW[i].tone} icon={HOW[i].icon} />
                  <div>
                    <p className="font-semibold">{row.title}</p>
                    <p className="text-ink-soft">{row.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <p className="text-center text-sm text-ink-soft">{vi.start.takes}</p>
          <div className="flex-1" />
          <PrimaryAction label={vi.start.begin} onClick={forward}>
            <div className="mb-2 flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-4">
              <Link to="/settings#sync" state={{ from: '/start' }} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline"><LogIn size={16} />{vi.start.otherDevice}</Link>
              <Button variant="quiet" onClick={() => void finish('/')}>{vi.start.skipAll}</Button>
            </div>
          </PrimaryAction>
        </>
      )}

      {step === 'track' && (
        <>
          <StepHeader tone="input" icon={Briefcase} title={vi.start.trackTitle} detail={vi.start.trackBody} />
          <TrackPicker industries />
          <div className="flex-1" />
          <PrimaryAction label={vi.start.next} onClick={forward} />
        </>
      )}

      {step === 'goal' && (
        <>
          <StepHeader tone="produce" icon={Clock} title={vi.start.goalTitle} detail={vi.start.goalBody} />
          <ul className="grid gap-2" role="radiogroup">
            {DAILY_MINUTES.map((m) => (
              <li key={m}><OptionButton selected={chosen === m} onClick={() => setMinutes(m)}>{vi.plan.durations[m]}</OptionButton></li>
            ))}
          </ul>
          <Note tone="plain">{vi.start.goalAdvice}</Note>
          <p className="text-sm text-ink-soft">{vi.start.goalPlan(formatDay(plan?.startDay ?? dayKey(now())), formatDay(week.endDay))}</p>
          <div className="flex-1" />
          <PrimaryAction label={vi.start.next} onClick={() => void savePlan({ minutesPerDay: chosen }, now()).then(forward)} />
        </>
      )}

      {step === 'placement' && (
        <PlacementTest doneLabel={vi.start.next} onDone={forward} onLater={forward} laterLabel={vi.start.placementLater} />
      )}

      {step === 'baseline' && (
        <>
          <StepHeader tone="shadow" icon={Mic} title={vi.start.baselineTitle} detail={vi.start.baselineBody} />
          <BaselineForm onSaved={() => setBaselineSaved(true)} />
          <div className="flex-1" />
          <PrimaryAction label={baselineSaved ? vi.start.next : vi.start.baselineLater} onClick={forward} />
        </>
      )}

      {step === 'ai' && (
        <>
          <StepHeader tone="review" icon={Sparkles} title={vi.start.aiTitle} detail={vi.start.aiBody} />
          <Card className="space-y-3">
            {aiReady(settings) ? (
              <Note tone="good">{vi.start.aiOn}</Note>
            ) : (
              <>
                <p>{vi.start.aiFree}</p>
                <Button onClick={() => navigate('/settings#ai', { state: { from: '/start' } })}><Sparkles size={16} />{vi.start.aiSetup}</Button>
              </>
            )}
          </Card>
          <div className="flex-1" />
          <PrimaryAction label={aiReady(settings) ? vi.start.next : vi.start.aiLater} onClick={forward} />
        </>
      )}

      {step === 'done' && (
        <>
          <section className="flex flex-col items-center pt-6 text-center">
            <LuBurst />
            <h1 className="mt-5 text-3xl font-semibold">{vi.start.doneTitle}</h1>
          </section>
          <Card className="rise space-y-3">
            {plan?.level && (
              <p><span className="text-ink-soft">{vi.start.doneLevel}</span> <span className="font-semibold">{vi.levels[plan.level].name}</span></p>
            )}
            <p>
              <span className="text-ink-soft">{vi.start.donePlan}</span>{' '}
              <span className="font-semibold">{vi.plan.durations[plan?.minutesPerDay ?? 60]}</span>
              {' · '}
              {vi.start.goalPlan(formatDay(plan?.startDay ?? dayKey(now())), formatDay(week.endDay))}
            </p>
            {toFoundation && foundationTrack && (
              <p><span className="text-ink-soft">{vi.start.donePack}</span> <span className="font-semibold">{foundationTrack.titleVi}</span>, {vi.start.doneThen(chosenIndustry().titleVi)}</p>
            )}
            <div className="rounded-xl bg-paper p-4 ring-1 ring-line">
              <p className="font-semibold">{vi.start.doneWeek(vi.plan.phases[1].name)}</p>
              <p className="mt-1 text-ink-soft">{vi.plan.phases[1].focus}</p>
            </div>
          </Card>
          <div className="flex-1" />
          <PrimaryAction label={vi.start.doneAction} onClick={() => void finish('/session', toFoundation)} />
        </>
      )}
    </main>
  );
}
