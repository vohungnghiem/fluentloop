import { AiBadge } from '../../ui/AiBadge';
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowRight, X } from 'lucide-react';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { db } from '../../services/db';
import { goToStep, reachedStep, startSession } from '../../services/learning';
import { StepBar } from './StepBar';
import { linkButton } from '../../ui/ui';
import { ReviewStep } from './ReviewStep';
import { InputStep } from './InputStep';
import { ProduceStep } from './ProduceStep';
import { ShadowStep } from './ShadowStep';
import { WrapStep } from './WrapStep';

/** A session: full screen, one step at a time, saved after every step. */
export function SessionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const focus = params.get('focus') ?? undefined;
  const snippetId = params.get('lesson') ?? undefined;
  const review = params.has('review');
  const [sessionId, setSessionId] = useState<string>();
  useEffect(() => {
    void startSession(now(), { focus, snippetId, review }).then((session) => setSessionId(session.id));
  }, [focus, snippetId, review]);
  const session = useLiveQuery(() => (sessionId ? db.sessions.get(sessionId) : undefined), [sessionId]);
  // Each step starts at the top, wherever the last one was left.
  const stepIndex = session?.stepIndex;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stepIndex]);
  if (!session) return <main className="mx-auto max-w-[640px] px-4 pt-4" aria-busy="true"><div className="skeleton h-10" /><div className="skeleton mt-6 h-64" /></main>;

  const step = session.plan.steps[session.stepIndex];
  const reached = reachedStep(session);
  const go = (index: number) => void goToStep(session.id, index, now());
  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col px-4 pt-4">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="-ml-2 rounded-lg p-2 text-ink-soft hover:text-ink"
          aria-label={vi.session.exit}
          title={vi.session.exit}
        >
          <X size={22} />
        </button>
        <StepBar steps={session.plan.steps} current={session.stepIndex} reached={reached} onGo={go} />
        <AiBadge compact />
      </header>
      {session.stepIndex < reached && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary-tint px-4 py-2 text-sm">
          <span>{vi.session.revisiting(vi.session.steps[step])}</span>
          <button type="button" onClick={() => go(reached)} className={linkButton}>
            {vi.session.backTo(vi.session.steps[session.plan.steps[reached]])}
            <ArrowRight size={16} />
          </button>
        </div>
      )}
      {/* `key` remounts a step's local state when the session moves on. */}
      {step === 'review' && <ReviewStep key="review" session={session} />}
      {step === 'input' && <InputStep key="input" session={session} />}
      {step === 'shadow' && <ShadowStep key="shadow" session={session} />}
      {step === 'produce' && <ProduceStep key="produce" session={session} />}
      {step === 'wrap' && <WrapStep key="wrap" session={session} onDone={() => navigate('/')} />}
    </main>
  );
}
