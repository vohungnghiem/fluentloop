import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CircleCheck, Mic, Sparkles } from 'lucide-react';
import { vi } from '../../copy/vi';
import { interviewTask } from '../../core/content/interview';
import { draftAnswer } from '../../services/ai/interview';
import { now } from '../../services/clock';
import { db } from '../../services/db';
import { findQuestion, interview, saveAnswer } from '../../services/interview';
import { getPlan } from '../../services/plan';
import { aiReady, useSettings } from '../../services/settings';
import { STEP_LOOK } from '../../ui/tones';
import { Button, Card, Eyebrow, Note, PrimaryAction, StepHeader, linkButton } from '../../ui/ui';
import { SpeakButton } from '../../ui/speech';
import { useDraft } from '../../ui/useDraft';
import { WritingTask } from '../session/WritingTask';

type Stage = 'compose' | 'check' | 'saved';

/**
 * One interview question: how a good answer is built, the learner's own answer (drafted by AI from
 * the CV, or started from the model), checked like a written answer, then kept as review cards.
 */
export function InterviewQuestionPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const settings = useSettings();
  const question = findQuestion(id);
  const answer = useLiveQuery(() => db.answers.get(id), [id], null);
  const plan = useLiveQuery(getPlan, [], null);
  const draft = useDraft<{ text: string; fromAi: boolean }>(`interview:${id}`);
  const [text, setText] = useState<string>();
  const [fromAi, setFromAi] = useState(false);
  const [note, setNote] = useState<string>();
  const [asking, setAsking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [stage, setStage] = useState<Stage>('compose');
  const [cards, setCards] = useState(0);
  const loaded = useRef('');

  // The text being written, else the saved answer.
  useEffect(() => {
    if (!draft.ready || answer === null || loaded.current === id) return;
    loaded.current = id;
    setText(draft.saved?.text ?? answer?.text ?? '');
    setFromAi(draft.saved?.fromAi ?? answer?.source === 'ai');
    setStage('compose');
    setNote(undefined);
  }, [draft.ready, answer, id]);

  if (!question) return <main className="p-6"><Link to="/interview" className="text-primary">{vi.interview.back}</Link></main>;
  if (text === undefined || plan === null) return null;

  const write = (next: string, ai = fromAi) => {
    setText(next);
    setFromAi(ai);
    draft.save(next ? { text: next, fromAi: ai } : undefined);
  };
  const ask = async () => {
    setAsking(true);
    setFailed(false);
    const outcome = await draftAnswer(question, plan?.profile ?? '', now());
    setAsking(false);
    if (!outcome.ok) return setFailed(true);
    write(outcome.data.answer, true);
    setNote(outcome.data.noteVi || undefined);
  };
  const index = interview.questions.findIndex((q) => q.id === id);
  const next = interview.questions[index + 1];
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const withAi = aiReady(settings);

  if (stage === 'check') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col px-4 pb-6">
        <WritingTask
          task={interviewTask(question)}
          snippetId={`interview:${id}`}
          unitId="interview"
          initialText={text}
          title={vi.interview.checkTitle}
          onDone={async (final) => {
            setCards(await saveAnswer(question, final, fromAi ? 'ai' : 'own', now()));
            draft.clear();
            setText(final);
            setStage('saved');
            window.scrollTo(0, 0);
          }}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col space-y-5 px-4 pt-6">
      <header className="flex items-center gap-2">
        <Link to="/interview" className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-ink" aria-label={vi.interview.back} title={vi.interview.back}><ArrowLeft size={20} /></Link>
        <span className="font-semibold">{vi.interview.title}</span>
        <span className="ml-auto text-sm text-ink-soft">{vi.interview.questionOf(index + 1, interview.questions.length)}</span>
      </header>

      <StepHeader {...STEP_LOOK.produce} title={question.en} detail={question.vi} right={<SpeakButton text={question.en} size="sm" />} />

      {stage === 'saved' ? (
        <>
          <Note tone="good" icon={<CircleCheck size={18} />}>{vi.interview.saved(cards)}</Note>
          <Card>
            <Eyebrow tone="produce">{vi.interview.yourAnswer}</Eyebrow>
            <p className="mt-2 text-lg leading-relaxed whitespace-pre-wrap" lang="en">{text}</p>
            <div className="mt-2"><SpeakButton text={text} slow /></div>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setStage('compose')}>{vi.interview.edit}</Button>
            {next && <Button onClick={() => navigate(`/interview/${next.id}`)}>{vi.interview.next}</Button>}
          </div>
          <div className="flex-1" />
          <PrimaryAction label={vi.interview.practise} onClick={() => navigate(`/speak?interview=${id}`)} />
        </>
      ) : (
        <>
          <Card>
            <p>{question.tipVi}</p>
            {question.shape.length > 0 && (
              <ol className="mt-3 list-decimal space-y-1 pl-5">{question.shape.map((step) => <li key={step}>{step}</li>)}</ol>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold">{vi.interview.yourAnswer}</h2>
            {answer && <p className="mt-1 text-sm text-ink-soft">{vi.interview.hasSaved}</p>}
            <textarea
              value={text}
              onChange={(e) => write(e.target.value)}
              rows={7}
              lang="en"
              spellCheck={false}
              placeholder={question.hints[1]}
              className="mt-3 w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 text-lg leading-relaxed outline-none focus:border-primary"
            />
            {text.includes('[') && <Note tone="accent">{vi.interview.fillBrackets}</Note>}
            {note && <p className="mt-2 text-sm text-ink-soft">{note}</p>}
            {failed && <p className="mt-2 text-sm text-accent-ink">{vi.interview.aiFailed}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {withAi && plan?.profile && (
                <Button onClick={() => void ask()} disabled={asking}>
                  <Sparkles size={16} className={asking ? 'animate-pulse' : ''} />{asking ? vi.interview.asking : vi.interview.askAi}
                </Button>
              )}
              {!text.trim() && <Button onClick={() => write(question.model, false)}>{vi.interview.fromModel}</Button>}
              {answer && <Link to={`/speak?interview=${id}`} className={linkButton}><Mic size={16} />{vi.interview.practise}</Link>}
            </div>
            {withAi && !plan?.profile && <p className="mt-2 text-sm text-ink-soft">{vi.interview.needProfile} <Link to="/interview" className="font-medium text-primary underline">{vi.interview.addProfile}</Link></p>}
          </Card>

          <details className="rounded-2xl border border-line bg-surface">
            <summary className="flex min-h-13 cursor-pointer list-none items-center px-5 font-medium [&::-webkit-details-marker]:hidden">{vi.interview.model}</summary>
            <div className="border-t border-line px-5 py-4">
              <p className="leading-relaxed" lang="en">{question.model}</p>
              <div className="mt-2"><SpeakButton text={question.model} slow /></div>
            </div>
          </details>

          <div className="flex-1" />
          <PrimaryAction label={vi.interview.check} disabled={words < 5} onClick={() => { setStage('check'); window.scrollTo(0, 0); }} />
        </>
      )}
    </main>
  );
}
