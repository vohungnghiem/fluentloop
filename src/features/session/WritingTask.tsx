import { useRef, useState } from 'react';
import { correctWithRules, correctWriting, type CorrectionResult } from '../../services/ai/correct';
import { CorrectionPanel } from './CorrectionPanel';
import { CircleCheck, CircleDashed } from 'lucide-react';
import { checkTask, type TaskCheck } from '../../core/check/task';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import type { Task } from '../../core/content/schema';
import { recordAttempt, saveMistakes } from '../../services/learning';
import { Button, Chip, Note, PrimaryAction } from '../../ui/ui';
import { SpeakButton } from '../../ui/speech';

/**
 * A writing task: write, check the required chunks, get corrected (AI or rules), compare with the
 * models, keep the mistakes. Used by the session's Produce step and by tasks made from captures.
 */
export function WritingTask({
  task,
  sessionId,
  snippetId,
  unitId,
  onDone,
  onSkip,
}: {
  task: Task;
  sessionId?: string;
  /** What the task came from: a snippet id, or `capture:<id>`. */
  snippetId: string;
  unitId: string;
  onDone: () => Promise<void> | void;
  onSkip?: () => void;
}) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<TaskCheck>();
  const [selfCheck, setSelfCheck] = useState<'same' | 'different'>();
  const [correction, setCorrection] = useState<CorrectionResult | 'loading'>();
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  // Only the latest request may show its answer (a skipped or edited one may come back late).
  const request = useRef(0);

  const showCorrection = (found: CorrectionResult) => {
    setCorrection(found);
    // Every mistake becomes a card unless the learner unticks it.
    setChosen(new Set(found.correction.mistakes.map((_, i) => i)));
  };
  const check = () => {
    setResult(checkTask(task, text));
    setCorrection('loading');
    const id = ++request.current;
    void correctWriting(task, text, now()).then((found) => {
      if (id !== request.current) return;
      setCorrection(found);
      // Every mistake becomes a card unless the learner unticks it.
      setChosen(new Set(found.correction.mistakes.map((_, i) => i)));
    });
  };
  const finish = async () => {
    if (saving || correction === 'loading') return;
    setSaving(true);
    const source = correction?.source ?? 'rules';
    const attemptId = await recordAttempt(
      sessionId,
      {
        taskId: task.id,
        snippetId,
        text,
        usedRequired: result?.required.filter((r) => r.used).map((r) => r.label) ?? [],
        missingRequired: result?.required.filter((r) => !r.used).map((r) => r.label) ?? [],
        selfCheck,
        source,
      },
      now(),
    );
    const mistakes = correction?.correction.mistakes ?? [];
    if (mistakes.length > 0) {
      const corrected = correction?.correction.corrected ?? text;
      await saveMistakes(sessionId, { id: attemptId, taskId: task.id, text, corrected, unitId }, mistakes, [...chosen], source, now());
    }
    await onDone();
  };

  const models = result ? [result.closestModel, ...task.models.filter((m) => m !== result.closestModel)] : [];

  return (
    <section className="flex flex-1 flex-col pt-8">
      <h1 className="text-lg font-semibold">{vi.produce.title}</h1>
      <p className="mt-4 text-xl leading-snug font-medium">{task.promptVi}</p>
      {task.situation && <p className="mt-1 text-ink-soft" lang="en">{task.situation}</p>}
      {task.required.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-soft">{vi.produce.use}</span>
          {task.required.map((chunk) => {
            const used = result?.required.find((r) => r.label === chunk.label)?.used;
            return (
              <Chip key={chunk.label} tone={used === undefined ? 'track' : used ? 'good' : 'accent'}>
                {used && <CircleCheck size={14} />}
                {used === false && <CircleDashed size={14} />}
                <span lang="en">{chunk.label}</span>
              </Chip>
            );
          })}
        </div>
      )}

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        readOnly={!!result}
        autoFocus
        rows={4}
        lang="en"
        spellCheck={false}
        placeholder={vi.produce.placeholder}
        className={`mt-5 w-full resize-y rounded-xl border border-line px-4 py-3 text-lg leading-relaxed outline-none focus:border-primary ${result ? 'bg-paper' : 'bg-surface'}`}
      />

      {result && (
        <div className="mt-4 space-y-3">
          {result.required.every((r) => r.used) ? (
            <Note tone="good" icon={<CircleCheck size={18} />}>{vi.produce.allUsed}</Note>
          ) : (
            result.required.filter((r) => !r.used).map((r) => (
              <Note key={r.label} tone="accent" icon={<CircleDashed size={18} />}>{vi.produce.missing(r.label)}</Note>
            ))
          )}
          {correction && (
            <CorrectionPanel
              text={text}
              result={correction}
              chosen={chosen}
              onSkip={() => {
                request.current++;
                showCorrection({ correction: correctWithRules(text), source: 'rules', aiError: 'skipped' });
              }}
              onToggle={(i) => {
                const next = new Set(chosen);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                setChosen(next);
              }}
            />
          )}
          <Button onClick={() => { request.current++; setResult(undefined); setSelfCheck(undefined); setCorrection(undefined); }}>{vi.produce.edit}</Button>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-semibold">{vi.produce.models}</h2>
            <ul className="mt-2 space-y-2">
              {models.map((model) => (
                <li key={model} className="flex items-start gap-2 border-l-2 border-track pl-3 text-lg leading-relaxed">
                  <span className="flex-1" lang="en">{model}</span>
                  <SpeakButton text={model} size="sm" />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-ink-soft">{vi.produce.readAloud}</p>
            {task.tipVi && <p className="mt-3 text-sm text-ink-soft"><b className="text-ink">{vi.produce.tip}:</b> {task.tipVi}</p>}
            <p className="mt-4 text-sm">{vi.produce.selfCheck}</p>
            <div className="mt-2 flex gap-2" role="radiogroup">
              {(['same', 'different'] as const).map((value) => (
                <Button
                  key={value}
                  role="radio"
                  aria-checked={selfCheck === value}
                  onClick={() => setSelfCheck(value)}
                  className={selfCheck === value ? '!border-primary bg-primary-tint' : ''}
                >
                  {vi.produce[value]}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!result && onSkip && (
        <div className="mt-2">
          <Button variant="quiet" onClick={onSkip}>{vi.session.skip}</Button>
        </div>
      )}

      <div className="flex-1" />
      {result ? (
        <PrimaryAction key="next" label={vi.session.next} onClick={() => void finish()} disabled={saving || correction === 'loading'} />
      ) : (
        <PrimaryAction key="check" label={vi.produce.check} keys={vi.produce.checkKeys} onClick={check} disabled={text.trim() === ''} />
      )}
    </section>
  );
}
