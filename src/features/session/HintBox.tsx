import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import type { Task } from '../../core/content/schema';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { hintFor, type Hint, type HintLevel } from '../../services/ai/hint';
import { Button } from '../../ui/ui';
import { SpeakButton } from '../../ui/speech';

/** Help when stuck, opened one level at a time: a question, the start of a sentence, a model. */
export function HintBox({ task, text, hints, onHint }: { task: Task; text: string; hints: Hint[]; onHint: (hint: Hint) => void }) {
  const [loading, setLoading] = useState(false);
  const next = (hints.length + 1) as HintLevel;
  const ask = async () => {
    setLoading(true);
    try {
      onHint(await hintFor(task, text, next, now()));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-2">
      {hints.length > 0 && (
        <ol className="space-y-2 rounded-2xl border border-line bg-surface p-4">
          {hints.map((hint) => (
            <li key={hint.level}>
              <span className="text-xs font-medium tracking-wide text-ink-soft uppercase">{vi.coach.hintLevels[hint.level]}</span>
              <p className="flex items-start gap-2">
                <span className={`flex-1 ${hint.lang === 'en' ? 'text-lg' : ''}`} lang={hint.lang}>{hint.text}</span>
                {hint.lang === 'en' && <SpeakButton text={hint.text.replace(/…/g, '')} size="sm" />}
              </p>
            </li>
          ))}
          <li className="text-sm text-ink-soft">{vi.coach.hintNote}</li>
        </ol>
      )}
      {hints.length < 3 && (
        <Button onClick={() => void ask()} disabled={loading}>
          <Lightbulb size={18} className={loading ? 'animate-pulse' : ''} />
          {loading ? vi.coach.hintLoading : hints.length === 0 ? vi.coach.hint : vi.coach.hintMore(next)}
        </Button>
      )}
    </div>
  );
}
