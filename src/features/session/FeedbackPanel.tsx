import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Check, CircleCheck, CircleDashed, CircleHelp, Sparkles, Wand2, Wrench } from 'lucide-react';
import type { Feedback } from '../../core/check/feedback';
import { displayDiff } from '../../core/check/text';
import { ERROR_LABELS } from '../../core/errors/labels';
import { vi } from '../../copy/vi';
import type { CorrectionResult } from '../../services/ai/correct';
import { Button, Chip, Note } from '../../ui/ui';
import { Diff } from '../../ui/Diff';
import { SpeakButton } from '../../ui/speech';

export interface Checked {
  text: string;
  feedback: Feedback;
  source: 'ai' | 'rules';
  aiError?: CorrectionResult['aiError'];
  /** Mistakes and upgrades the learner keeps as review cards. */
  chosenMistakes: ReadonlySet<number>;
  chosenUpgrades: ReadonlySet<number>;
}

/**
 * Everything said about one answer, in one card and one order: is every idea there, what to fix,
 * how to say it better. Rules and AI are merged before this (`buildFeedback`), so it never contradicts itself.
 */
export function FeedbackPanel({
  checked,
  version,
  onToggleMistake,
  onToggleUpgrade,
}: {
  checked: Checked;
  version: number;
  onToggleMistake: (index: number) => void;
  onToggleUpgrade: (index: number) => void;
}) {
  const { text, feedback, source, aiError } = checked;
  const missing = feedback.points.filter((p) => p.status === 'missing').length;
  const unusedChunks = feedback.required.filter((r) => !r.used);
  // The word diff ignores case: a capitals-only fix is shown by the mistake list alone.
  const diff = displayDiff(text, feedback.corrected);
  const changed = diff.some((part) => part.kind !== 'same');

  return (
    <div className="space-y-3">
      {aiError && <Note tone="plain">{vi.correct.aiError[aiError]}</Note>}
      <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
        <div className="space-y-1 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className={`flex items-center gap-2 font-semibold ${feedback.complete ? 'text-good' : 'text-accent-ink'}`} role="status">
              {feedback.complete ? <CircleCheck size={20} /> : <CircleDashed size={20} />}
              {feedback.complete ? vi.coach.complete : missing > 0 ? vi.coach.incomplete(missing) : `${vi.coach.missingChunks} ${unusedChunks.map((c) => `“${c.label}”`).join(', ')}`}
            </p>
            {version > 1 && <Chip>{vi.coach.version(version)}</Chip>}
          </div>
          {feedback.praiseVi && <p className="text-sm text-ink-soft">{feedback.praiseVi}</p>}
        </div>

        {(feedback.points.length > 0 || feedback.required.length > 0) && (
          <Section title={vi.coach.points}>
            <ul className="space-y-2">
              {feedback.points.map((point) => (
                <li key={point.vi} className="flex items-start gap-2">
                  <PointIcon status={point.status} />
                  <span className="min-w-0">
                    <span className={point.status === 'missing' ? 'font-medium' : ''}>{point.vi}</span>
                    {point.status === 'unknown' && <span className="text-sm text-ink-soft"> ({vi.coach.pointUnknown})</span>}
                    {point.noteVi && point.status === 'missing' && <span className="block text-sm text-accent-ink">{point.noteVi}</span>}
                  </span>
                </li>
              ))}
            </ul>
            {feedback.required.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink-soft">{vi.coach.chunks}:</span>
                {feedback.required.map((chunk) => (
                  <Chip key={chunk.label} tone={chunk.used ? 'good' : 'accent'}>
                    {chunk.used ? <CircleCheck size={14} /> : <CircleDashed size={14} />}
                    <span lang="en">{chunk.label}</span>
                  </Chip>
                ))}
              </div>
            )}
          </Section>
        )}

        <Section title={source === 'ai' ? vi.coach.mistakes : vi.coach.mistakesRules} icon={<Wrench size={18} className="text-accent-ink" />}>
          {feedback.mistakes.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-ink-soft"><CircleCheck size={16} className="text-good" />{vi.coach.noMistakes}</p>
          ) : (
            <>
              {changed && <Diff parts={diff} />}
              <p className={`${changed ? 'mt-3 ' : ''}text-sm text-ink-soft`}>{vi.coach.chooseHint}</p>
              <ul className="mt-2 space-y-2">
                {feedback.mistakes.map((mistake, index) => (
                  <Pick key={index} on={checked.chosenMistakes.has(index)} onToggle={() => onToggleMistake(index)}>
                    <span className="block" lang="en">
                      <del className="rounded bg-accent-tint px-1 text-accent-ink">{mistake.wrong}</del> → <ins className="rounded bg-good-tint px-1 text-good no-underline">{mistake.right}</ins>
                    </span>
                    <span className="block text-sm">{mistake.vi}</span>
                    <Chip tone="accent">{ERROR_LABELS[mistake.label]}</Chip>
                  </Pick>
                ))}
              </ul>
            </>
          )}
        </Section>

        {feedback.upgrades.length > 0 && (
          <Section title={vi.coach.upgrades} icon={<Wand2 size={18} className="text-primary" />}>
            <p className="text-sm text-ink-soft">{vi.coach.upgradesHint}</p>
            <ul className="mt-2 space-y-2">
              {feedback.upgrades.map((upgrade, index) => (
                <Pick key={upgrade.en} on={checked.chosenUpgrades.has(index)} onToggle={() => onToggleUpgrade(index)}>
                  <span className="flex items-start gap-2">
                    <span className="flex-1 text-lg leading-relaxed" lang="en">{upgrade.en}</span>
                    <SpeakButton text={upgrade.en} size="sm" />
                  </span>
                  <span className="block text-sm text-ink-soft">{upgrade.vi}</span>
                </Pick>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {source === 'rules' && (
        <p className="text-sm text-ink-soft">
          {vi.correct.rulesOnly}{' '}
          {!aiError && <Link to="/settings" className="text-primary hover:underline">{vi.correct.setupAi}</Link>}
        </p>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="p-4">
      <h2 className="mb-2 flex items-center gap-2 font-semibold">{icon}{title}</h2>
      {children}
    </div>
  );
}

function PointIcon({ status }: { status: Feedback['points'][number]['status'] }) {
  if (status === 'ok') return <CircleCheck size={18} className="mt-0.5 shrink-0 text-good" aria-label="có" />;
  if (status === 'missing') return <CircleDashed size={18} className="mt-0.5 shrink-0 text-accent-ink" aria-label="thiếu" />;
  return <CircleHelp size={18} className="mt-0.5 shrink-0 text-ink-soft" aria-label="tự kiểm" />;
}

/** A tickable row: what becomes a review card. */
function Pick({ on, onToggle, children }: { on: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <li>
      <label className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-3 ${on ? 'border-primary' : 'border-line bg-paper'}`}>
        <input type="checkbox" className="sr-only" checked={on} onChange={onToggle} />
        <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-primary bg-primary text-on-primary' : 'border-line'}`}>
          {on && <Check size={16} strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1 space-y-1">{children}</span>
      </label>
    </li>
  );
}

/** Seconds waited, and after a few a way out: the learner never sits on a spinner. */
export function Waiting({ onSkip }: { onSkip: () => void }) {
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
