import type { StepKind } from '../../core/session/plan';
import { vi } from '../../copy/vi';

/** One segment per step; the current one is labelled. */
export function StepBar({ steps, current }: { steps: StepKind[]; current: number }) {
  return (
    <nav className="flex flex-1 items-center gap-2" aria-label={`Bước ${current + 1}/${steps.length}`}>
      {steps.map((step, index) => (
        <div key={step} className="flex flex-1 flex-col gap-1">
          <div className={`h-1.5 rounded-full ${index <= current ? 'bg-primary' : 'bg-line'}`} />
          <span className={`text-xs ${index === current ? 'font-semibold text-ink' : 'text-ink-soft'}`} aria-current={index === current ? 'step' : undefined}>
            {vi.session.steps[step]}
          </span>
        </div>
      ))}
    </nav>
  );
}
