import { Lock } from 'lucide-react';
import type { StepKind } from '../../core/session/plan';
import { vi } from '../../copy/vi';
import { STEP_LOOK, toneClass } from '../../ui/tones';

/**
 * One segment per step; the current one is labelled. Steps already reached are buttons (go back to
 * read again or redo, and forward again); the ones ahead are locked until the steps before are done.
 */
export function StepBar({ steps, current, reached, onGo }: { steps: StepKind[]; current: number; reached: number; onGo: (index: number) => void }) {
  return (
    <nav className="flex flex-1 items-start gap-2" aria-label={`Bước ${current + 1}/${steps.length}`}>
      {steps.map((step, index) => {
        const open = index <= reached;
        const here = index === current;
        const content = (
          <>
            <div className={`h-1.5 w-full rounded-full transition-colors duration-500 ${index <= reached ? 'bg-tone' : 'bg-line'} ${here ? 'h-2' : ''} ${open && !here ? 'group-hover:brightness-110' : ''}`} />
            <span className={`flex items-center gap-1 text-xs whitespace-nowrap ${here ? 'font-semibold text-ink' : open ? 'text-ink-soft group-hover:text-ink' : 'text-ink-soft/70'}`}>
              {!open && <Lock size={11} aria-hidden="true" />}
              {vi.session.steps[step]}
            </span>
          </>
        );
        return open && !here ? (
          <button
            key={step}
            type="button"
            onClick={() => onGo(index)}
            className={`group -my-2 flex min-h-11 flex-1 flex-col justify-center gap-1 rounded-md text-left ${toneClass(STEP_LOOK[step].tone)}`}
            aria-label={vi.session.goTo(vi.session.steps[step])}
            title={vi.session.goTo(vi.session.steps[step])}
          >
            {content}
          </button>
        ) : (
          <div
            key={step}
            className={`-my-2 flex min-h-11 flex-1 flex-col justify-center gap-1 ${toneClass(STEP_LOOK[step].tone)}`}
            aria-current={here ? 'step' : undefined}
            title={here ? undefined : vi.session.locked}
          >
            {content}
          </div>
        );
      })}
    </nav>
  );
}
