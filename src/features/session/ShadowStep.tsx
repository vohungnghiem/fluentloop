import { StepHeader } from '../../ui/ui';
import { STEP_LOOK } from '../../ui/tones';
import { useMemo, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { matchSpoken, type ShadowResult } from '../../core/check/shadow';
import { shadowSentences } from '../../core/session/shadow';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { findSnippet, snippetChunks } from '../../services/content';
import type { SessionRow } from '../../services/db';
import { nextStep, recordShadowing } from '../../services/learning';
import { sttSupported, type MicStatus } from '../../services/speech/stt';
import { Button, Note, PrimaryAction } from '../../ui/ui';
import { MicButton, SpeakButton, useSpaceToPlay } from '../../ui/speech';

/**
 * Hear a key sentence, say it straight after, see which words the machine heard. Without
 * recognition the learner reads aloud and moves on: the step never blocks.
 */
export function ShadowStep({ session }: { session: SessionRow }) {
  const found = findSnippet(session.plan.snippetId);
  const lines = useMemo(() => (found ? shadowSentences(found.snippet, snippetChunks(found.snippet)) : []), [found]);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<ShadowResult & { transcript: string }>();
  const [best, setBest] = useState<number[]>([]);
  const [status, setStatus] = useState<MicStatus>('idle');
  const canListen = sttSupported() && status !== 'unsupported';
  const line = lines[index];
  useSpaceToPlay(line);

  const finish = (ratios: number[]) =>
    void recordShadowing(session.id, ratios, now()).then(() => nextStep(session.id, now(), ratios.length === 0 ? 'shadow' : undefined));

  if (!line) return <PrimaryAction label={vi.session.next} onClick={() => finish([])} />;

  const heard = (transcript: string) => {
    const match = matchSpoken(line, transcript);
    setResult({ ...match, transcript });
    setBest((list) => {
      const next = [...list];
      next[index] = Math.max(next[index] ?? 0, match.ratio);
      return next;
    });
  };
  const next = () => {
    const ratios = canListen ? Array.from({ length: index + 1 }, (_, i) => best[i] ?? 0) : [];
    if (index + 1 < lines.length) {
      setIndex(index + 1);
      setResult(undefined);
      setStatus('idle');
    } else {
      finish(ratios);
    }
  };
  const heardCount = result?.words.filter((w) => w.heard).length ?? 0;

  return (
    <section className="flex flex-1 flex-col pt-8">
      <StepHeader {...STEP_LOOK.shadow} title={vi.shadow.title} detail={vi.shadow.instruction} right={vi.shadow.progress(index + 1, lines.length)} />

      <p className="mt-6 text-[22px] leading-relaxed font-medium" lang="en">
        {result
          ? result.words.map((word, i) => (
              <span key={i}>
                <span className={word.heard ? '' : 'rounded bg-accent-tint px-0.5 text-accent-ink underline decoration-accent decoration-2 underline-offset-4'}>{word.text}</span>{' '}
              </span>
            ))
          : line}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <SpeakButton text={line} slow />
      </div>

      <div className="mt-8">
        {canListen ? (
          <MicButton key={index} expected={line} onHeard={heard} onStatus={setStatus} />
        ) : (
          <Note tone="plain">{vi.speech.mic.unsupported}</Note>
        )}
      </div>

      {result && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-ink-soft">
            {vi.shadow.you} <i lang="en">“{result.transcript}”</i>
          </p>
          {result.ratio === 1 ? (
            <Note tone="good" icon={<CircleCheck size={18} />}>{vi.shadow.heardAll}</Note>
          ) : (
            <Note tone="accent">{vi.shadow.heardSome(heardCount, result.words.length)}</Note>
          )}
          <p className="text-xs text-ink-soft">{vi.shadow.note}</p>
        </div>
      )}

      <div className="mt-2">
        {!result && <Button variant="quiet" onClick={() => finish(best.filter((r) => typeof r === 'number'))}>{vi.session.skip}</Button>}
      </div>
      <div className="flex-1" />
      <PrimaryAction label={vi.session.next} onClick={next} />
    </section>
  );
}
