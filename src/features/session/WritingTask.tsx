import { StepHeader } from '../../ui/ui';
import { STEP_LOOK } from '../../ui/tones';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, CircleDashed } from 'lucide-react';
import { correctWriting, type CorrectionResult } from '../../services/ai/correct';
import { buildFeedback } from '../../core/check/feedback';
import { normalize } from '../../core/check/text';
import type { Mistake } from '../../core/errors/labels';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import type { Task } from '../../core/content/schema';
import type { WrittenVersion } from '../../core/progress/writing';
import { taskHint, type Hint } from '../../services/ai/hint';
import { recordAttempt, saveMistakes } from '../../services/learning';
import { Button, ChunkChips, Eyebrow, PrimaryAction } from '../../ui/ui';
import { SpeakButton } from '../../ui/speech';
import { FeedbackPanel, Waiting, type Checked } from './FeedbackPanel';
import { HintBox } from './HintBox';
import { useDraft } from '../../ui/useDraft';
import { useSupport } from '../../ui/useSupport';

/** A checked version as stored in a draft (sets as arrays). */
type StoredChecked = Omit<Checked, 'chosenMistakes' | 'chosenUpgrades'> & { chosenMistakes: number[]; chosenUpgrades: number[] };
interface WritingDraft {
  text: string;
  hints: Hint[];
  history: StoredChecked[];
  current?: StoredChecked;
  selfCheck?: 'same' | 'different';
}
const store = (c: Checked): StoredChecked => ({ ...c, chosenMistakes: [...c.chosenMistakes], chosenUpgrades: [...c.chosenUpgrades] });
/** A version as kept in the learner's writing history: what was written and what was said about it. */
const keep = (c: Checked): WrittenVersion => ({
  text: c.text,
  at: c.at,
  source: c.source,
  feedback: c.feedback,
  chosenMistakes: [...c.chosenMistakes],
  chosenUpgrades: [...c.chosenUpgrades],
});
const restore = (c: StoredChecked): Checked => ({ ...c, chosenMistakes: new Set(c.chosenMistakes), chosenUpgrades: new Set(c.chosenUpgrades) });

/**
 * A writing task, coached: write (with hints when stuck), check, read one merged feedback, write
 * again until every idea is there. Every version is kept; chosen mistakes and better phrasings
 * become review cards. Used by the session's Produce step and by tasks made from captures.
 */
export function WritingTask({
  task,
  sessionId,
  snippetId,
  unitId,
  onDone,
  onSkip,
  initialText,
  title = vi.produce.title,
}: {
  task: Task;
  sessionId?: string;
  /** What the task came from: a snippet id, or `capture:<id>`. */
  snippetId: string;
  unitId: string;
  /** Done: the final version as checked. */
  onDone: (text: string) => Promise<void> | void;
  onSkip?: () => void;
  /** Text to start from (what a talk was heard as): the learner checks it as if written. */
  initialText?: string;
  title?: string;
}) {
  const [text, setText] = useState('');
  const [hints, setHints] = useState<Hint[]>([]);
  /** The answer being checked: 'loading' while AI reads it. */
  const [current, setCurrent] = useState<Checked | 'loading'>();
  /** Earlier checked versions, oldest first. */
  const [history, setHistory] = useState<Checked[]>([]);
  const [selfCheck, setSelfCheck] = useState<'same' | 'different'>();
  /** Open by default without AI: then the models are the only "better way" there is. */
  const [showModels, setShowModels] = useState<boolean>();
  const [saving, setSaving] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  // Only the latest request may show its answer (a skipped or edited one may come back late).
  const request = useRef(0);

  // Everything on this screen survives leaving and reloading, until the task is done or skipped.
  const draft = useDraft<WritingDraft>(`write:${sessionId ?? snippetId}:${task.id}`);
  const restored = useRef(false);
  const support = useSupport();
  useEffect(() => {
    if (!draft.ready || support === undefined || restored.current) return;
    restored.current = true;
    const saved = draft.saved;
    // Below B1 the first hint (a guiding question, in Vietnamese) is open before writing.
    if (!saved) {
      if (initialText) setText(initialText);
      else if (support) setHints([taskHint(task, '', 1)]);
      return;
    }
    setText(saved.text);
    setHints(saved.hints);
    setHistory(saved.history.map(restore));
    if (saved.current) setCurrent(restore(saved.current));
    setSelfCheck(saved.selfCheck);
  }, [draft.ready, draft.saved, support]);
  useEffect(() => {
    // Newer work on this task from another device: show that instead.
    const saved = draft.saved;
    if (draft.remote === 0 || !saved) return;
    setText(saved.text);
    setHints(saved.hints);
    setHistory(saved.history.map(restore));
    setCurrent(saved.current ? restore(saved.current) : undefined);
    setSelfCheck(saved.selfCheck);
  }, [draft.remote]);
  useEffect(() => {
    if (!restored.current) return;
    const checkedNow = current && current !== 'loading' ? store(current) : undefined;
    const empty = text === '' && hints.length === 0 && history.length === 0 && !checkedNow;
    draft.save(empty ? undefined : { text, hints, history: history.map(store), current: checkedNow, selfCheck });
  }, [text, hints, history, current, selfCheck, draft.save]);

  const writing = current === undefined;
  useEffect(() => {
    if (writing) box.current?.focus();
  }, [writing]);

  const show = (written: string, found: Omit<CorrectionResult, 'correction'> & { correction?: CorrectionResult['correction'] }) => {
    const feedback = buildFeedback(task, written, found.source === 'ai' ? found.correction : undefined);
    // Every mistake becomes a card unless the learner unticks it; a better phrasing only when picked.
    setCurrent({ text: written, feedback, source: found.source, aiError: found.aiError, at: now().toISOString(), chosenMistakes: new Set(feedback.mistakes.map((_, i) => i)), chosenUpgrades: new Set() });
  };
  const check = () => {
    const written = text;
    setCurrent('loading');
    const id = ++request.current;
    void correctWriting(task, written, now()).then((found) => {
      if (id === request.current) show(written, found);
    });
  };
  const writeAgain = () => {
    if (current && current !== 'loading') setHistory([...history, current]);
    request.current++;
    setCurrent(undefined);
  };
  const toggle = (which: 'chosenMistakes' | 'chosenUpgrades', index: number) => {
    if (!current || current === 'loading') return;
    const next = new Set(current[which]);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setCurrent({ ...current, [which]: next });
  };

  const finish = async () => {
    if (saving || !current || current === 'loading') return;
    setSaving(true);
    const { feedback, source } = current;
    const attemptId = await recordAttempt(
      sessionId,
      {
        taskId: task.id,
        snippetId,
        text: current.text,
        usedRequired: feedback.required.filter((r) => r.used).map((r) => r.label),
        missingRequired: feedback.required.filter((r) => !r.used).map((r) => r.label),
        missingPoints: feedback.points.filter((p) => p.status === 'missing').map((p) => p.vi),
        revisions: history.map((h) => h.text),
        versions: [...history, current].map(keep),
        promptVi: task.promptVi,
        selfCheck,
        source,
      },
      now(),
    );
    const attempt = { id: attemptId, taskId: task.id, unitId };
    // Mistakes from every version (a fixed one still belongs in the error book), each once, newest first.
    const seen = new Set<string>();
    for (const version of [current, ...[...history].reverse()]) {
      const mistakes = version.feedback.mistakes;
      const chosen = [...version.chosenMistakes].filter((i) => {
        const key = `${normalize(mistakes[i].wrong)}→${normalize(mistakes[i].right)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (chosen.length > 0) {
        await saveMistakes(sessionId, { ...attempt, text: version.text, corrected: version.feedback.corrected }, mistakes, chosen, version.source, now());
      }
    }
    // A better phrasing kept: a card to write their (corrected) answer the better way.
    for (const index of current.chosenUpgrades) {
      const upgrade = feedback.upgrades[index];
      const mistake: Mistake = { wrong: feedback.corrected, right: upgrade.en, label: 'naturalness', vi: upgrade.vi || vi.coach.modelUpgrade };
      await saveMistakes(sessionId, { ...attempt, text: feedback.corrected, corrected: upgrade.en }, [mistake], [0], source, now());
    }
    draft.clear();
    await onDone(current.text);
  };

  const checked = current && current !== 'loading' ? current : undefined;
  const last = history.at(-1);
  const modelsOpen = showModels ?? checked?.source === 'rules';
  const models = checked ? [checked.feedback.closestModel, ...task.models.filter((m) => m !== checked.feedback.closestModel)] : task.models;

  if (!draft.ready || support === undefined) return <section className="flex-1 pt-8" aria-busy="true"><div className="skeleton h-64" /></section>;

  return (
    <section className="flex flex-1 flex-col pt-8">
      <StepHeader {...STEP_LOOK.produce} title={title} />
      <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
        <Eyebrow tone="produce" right={task.situation ? <span lang="en">{task.situation}</span> : undefined}>{vi.produce.task}</Eyebrow>
        <p className="mt-1.5 text-xl leading-snug font-medium">{task.promptVi}</p>
        {task.required.length > 0 && (
          <div className="mt-3">
            <ChunkChips label={vi.produce.use} chunks={task.required.map((chunk) => chunk.label)} />
          </div>
        )}
      </div>

      {writing && last && <LastTime checked={last} />}

      <textarea
        ref={box}
        value={text}
        onChange={(event) => setText(event.target.value)}
        readOnly={!writing}
        rows={4}
        lang="en"
        spellCheck={false}
        placeholder={vi.produce.placeholder}
        className={`mt-5 w-full resize-y rounded-xl border border-line px-4 py-3 text-lg leading-relaxed outline-none focus:border-primary ${writing ? 'bg-surface' : 'bg-paper'}`}
      />

      {writing && (
        <div className="mt-3 space-y-2">
          <HintBox task={task} text={text} hints={hints} onHint={(hint) => setHints([...hints, hint])} />
          {onSkip && history.length === 0 && <Button variant="quiet" onClick={() => { draft.clear(); onSkip(); }}>{vi.session.skip}</Button>}
        </div>
      )}

      {current === 'loading' && (
        <div className="mt-4">
          <Waiting onSkip={() => { request.current++; show(text, { source: 'rules', aiError: 'skipped' }); }} />
        </div>
      )}

      {checked && (
        <div className="mt-4 space-y-3">
          <FeedbackPanel
            checked={checked}
            version={history.length + 1}
            onToggleMistake={(i) => toggle('chosenMistakes', i)}
            onToggleUpgrade={(i) => toggle('chosenUpgrades', i)}
          />

          <div className="flex flex-wrap gap-2">
            {checked.feedback.complete ? (
              <Button onClick={writeAgain}>{vi.coach.rewrite}</Button>
            ) : (
              <Button variant="quiet" onClick={() => void finish()} disabled={saving}>{vi.coach.nextAnyway}</Button>
            )}
            <Button variant="quiet" onClick={() => setShowModels(!modelsOpen)} aria-expanded={modelsOpen}>
              {modelsOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              {modelsOpen ? vi.coach.hideModels : vi.coach.showModels(models.length)}
            </Button>
          </div>

          {modelsOpen && (
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
              {checked.source === 'rules' && (
                <>
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
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex-1" />
      {writing && <PrimaryAction key="check" label={vi.produce.check} keys={vi.produce.checkKeys} onClick={check} disabled={text.trim() === ''} />}
      {current === 'loading' && <PrimaryAction key="wait" label={vi.produce.check} onClick={() => {}} disabled />}
      {checked && (checked.feedback.complete
        ? <PrimaryAction key="next" label={vi.session.next} onClick={() => void finish()} disabled={saving} />
        : <PrimaryAction key="more" label={vi.coach.writeMore} onClick={writeAgain} />)}
    </section>
  );
}

/** While writing again: what the last check said was missing or wrong, so it is not lost. */
function LastTime({ checked }: { checked: Checked }) {
  const missing = checked.feedback.points.filter((p) => p.status === 'missing');
  const chunks = checked.feedback.required.filter((r) => !r.used);
  const mistakes = checked.feedback.mistakes;
  if (missing.length + chunks.length + mistakes.length === 0) return null;
  return (
    <div className="mt-4 rounded-xl bg-accent-tint px-4 py-3 text-sm">
      <p className="font-medium">{vi.coach.lastTime}</p>
      <ul className="mt-1 space-y-1">
        {missing.map((p) => <li key={p.vi} className="flex gap-2"><CircleDashed size={16} className="mt-0.5 shrink-0" />{p.noteVi ?? p.vi}</li>)}
        {chunks.length > 0 && <li className="flex gap-2"><CircleDashed size={16} className="mt-0.5 shrink-0" />{vi.coach.missingChunks} {chunks.map((c) => `“${c.label}”`).join(', ')}</li>}
        {mistakes.map((m, i) => <li key={i} lang="en"><del>{m.wrong}</del> → <b>{m.right}</b></li>)}
      </ul>
    </div>
  );
}
