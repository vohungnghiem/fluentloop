import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useSearchParams } from 'react-router';
import { X } from 'lucide-react';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { db } from '../../services/db';
import { startSession } from '../../services/learning';
import { StepBar } from './StepBar';
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
  if (!session) return <main className="mx-auto max-w-[640px] px-4 pt-4" aria-busy="true"><div className="skeleton h-10" /><div className="skeleton mt-6 h-64" /></main>;

  const step = session.plan.steps[session.stepIndex];
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
        <StepBar steps={session.plan.steps} current={session.stepIndex} />
      </header>
      {/* `key` remounts a step's local state when the session moves on. */}
      {step === 'review' && <ReviewStep key="review" session={session} />}
      {step === 'input' && <InputStep key="input" session={session} />}
      {step === 'shadow' && <ShadowStep key="shadow" session={session} />}
      {step === 'produce' && <ProduceStep key="produce" session={session} />}
      {step === 'wrap' && <WrapStep key="wrap" session={session} onDone={() => navigate('/')} />}
    </main>
  );
}
