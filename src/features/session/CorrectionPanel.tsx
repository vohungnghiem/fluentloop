import { useEffect, useState } from 'react';
import { Check, CircleCheck, Sparkles, Wrench } from 'lucide-react';
import { Button } from '../../ui/ui';
import { Link } from 'react-router';
import { displayDiff } from '../../core/check/text';
import { normalize } from '../../core/check/text';
import { ERROR_LABELS, type Mistake } from '../../core/errors/labels';
import { vi } from '../../copy/vi';
import type { CorrectionResult } from '../../services/ai/correct';
import { Chip, Note } from '../../ui/ui';
import { Diff } from '../../ui/Diff';
import { SpeakButton } from '../../ui/speech';

/**
 * The "Fix" part of the loop: the diff, a word of praise, the natural version, and each mistake
 * with a Vietnamese explanation and a tick to make it a review card.
 */
export function CorrectionPanel({
  text,
  result,
  chosen,
  onToggle,
  onSkip,
}: {
  onSkip: () => void;
  text: string;
  result: CorrectionResult | 'loading';
  chosen: ReadonlySet<number>;
  onToggle: (index: number) => void;
}) {
  if (result === 'loading') return <Waiting onSkip={onSkip} />;
  const { correction, source, aiError } = result;
  const changed = normalize(correction.corrected) !== normalize(text);
  const mistakes: Mistake[] = correction.mistakes;

  return (
    <div className="space-y-3">
      {aiError && <Note tone="plain">{vi.correct.aiError[aiError]}</Note>}
      {source === 'ai' && correction.praiseVi && (
        <Note tone="good" icon={<CircleCheck size={18} />}>{correction.praiseVi}</Note>
      )}
      {changed ? (
        <Diff parts={displayDiff(text, correction.corrected)} />
      ) : (
        source === 'ai' && <Note tone="good" icon={<CircleCheck size={18} />}>{vi.correct.noMistakes}</Note>
      )}

      {correction.natural && normalize(correction.natural) !== normalize(correction.corrected) && (
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <div className="text-sm font-medium text-ink-soft">{vi.correct.natural}</div>
          <p className="mt-1 flex items-start gap-2 text-lg leading-relaxed">
            <span className="flex-1" lang="en">{correction.natural}</span>
            <SpeakButton text={correction.natural} size="sm" />
          </p>
        </div>
      )}

      {mistakes.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Wrench size={18} className="text-accent-ink" />
            {source === 'ai' ? vi.correct.mistakesAi : vi.correct.mistakesRules}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{vi.correct.chooseHint}</p>
          <ul className="mt-3 space-y-2">
            {mistakes.map((mistake, index) => {
              const on = chosen.has(index);
              return (
                <li key={index}>
                  <label className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-3 ${on ? 'border-primary' : 'border-line bg-paper'}`}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => onToggle(index)} />
                    <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-primary bg-primary text-on-primary' : 'border-line'}`}>
                      {on && <Check size={16} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 space-y-1">
                      <span className="block" lang="en">
                        <del className="rounded bg-accent-tint px-1 text-accent-ink">{mistake.wrong}</del> → <ins className="rounded bg-good-tint px-1 text-good no-underline">{mistake.right}</ins>
                      </span>
                      <span className="block text-sm">{mistake.vi}</span>
                      <Chip tone="accent">{ERROR_LABELS[mistake.label]}</Chip>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {source === 'rules' && (
        <p className="text-sm text-ink-soft">
          {vi.correct.rulesOnly}{' '}
          {!aiError && <Link to="/settings" className="text-primary hover:underline">{vi.correct.setupAi}</Link>}
        </p>
      )}
    </div>
  );
}

/** Seconds waited, and after a few a way out: the learner never sits on a spinner. */
function Waiting({ onSkip }: { onSkip: () => void }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="space-y-2">
      <Note tone="plain" icon={<Sparkles size={18} className="animate-pulse" />}>{vi.correct.loading(seconds)}</Note>
      {seconds >= 5 && <Button variant="quiet" onClick={onSkip}>{vi.correct.skipAi}</Button>}
    </div>
  );
}
