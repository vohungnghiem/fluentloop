import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheck, Lightbulb, RotateCcw, Turtle } from 'lucide-react';
import { checkAnswer, checkSentence, displayDiff, type AnswerResult } from '../../core/check/text';
import { cardKind, type CardKind } from '../../core/srs/kind';
import { speak, ttsSupported } from '../../services/speech/tts';
import { SpeakButton } from '../../ui/speech';
import { Diff } from '../../ui/Diff';
import { FixReview } from './FixReview';
import { ratingFor, type RatingName } from '../../core/srs/srs';
import type { Chunk } from '../../core/content/schema';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { findChunk } from '../../services/content';
import type { SessionRow } from '../../services/db';
import { db } from '../../services/db';
import { nextStep, recordReview } from '../../services/learning';
import { Button, Note, PrimaryAction } from '../../ui/ui';
import { useLiveQuery } from 'dexie-react-hooks';

/** The example sentence cut around the answer, so the blank can sit where the answer was. */
function cloze(chunk: Chunk) {
  const start = chunk.example.toLowerCase().indexOf(chunk.answer.toLowerCase());
  return {
    before: chunk.example.slice(0, start),
    answer: chunk.example.slice(start, start + chunk.answer.length),
    after: chunk.example.slice(start + chunk.answer.length),
  };
}

/** "w_____ o_": first letter of every word, the rest as blanks. */
const hintFor = (answer: string) =>
  answer.split(' ').map((word) => word[0] + '_'.repeat(Math.max(0, word.length - 1))).join(' ');

type Outcome = { result: AnswerResult; rating: RatingName };

export function ReviewStep({ session }: { session: SessionRow }) {
  const cards = useLiveQuery(() => db.cards.bulkGet(session.plan.reviewCardIds), [session.plan.reviewCardIds]);
  const remaining = session.plan.reviewCardIds.filter((id) => !session.reviewedIds.includes(id));
  const [currentId, setCurrentId] = useState<string | undefined>(remaining[0]);
  const [answer, setAnswer] = useState('');
  const [tries, setTries] = useState(0);
  const [hintShown, setHintShown] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>();
  const [wrongOnce, setWrongOnce] = useState(false);
  const startedAt = useRef(Date.now());
  // The kind is fixed when a card is shown: grading it must not turn it into another kind on screen.
  const kinds = useRef(new Map<string, CardKind>());
  const input = useRef<HTMLInputElement>(null);

  const card = cards?.find((row) => row?.id === currentId);
  // Capture cards carry their own sentence; they review exactly like a content chunk.
  const chunk = useMemo<Chunk | undefined>(() => {
    if (card?.chunkId) return findChunk(card.chunkId);
    if (card?.sentence && card.answer && card.sentence.toLowerCase().includes(card.answer.toLowerCase())) {
      return { id: card.id, en: card.answer, vi: card.meaningVi ?? '', forms: [], example: card.sentence, exampleVi: card.sentenceVi ?? '', answer: card.answer };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]);
  const parts = useMemo(() => (chunk ? cloze(chunk) : undefined), [chunk]);
  if (card && card.kind !== 'fix' && !kinds.current.has(card.id)) kinds.current.set(card.id, cardKind(card.fsrs, ttsSupported()));
  const kind = card ? kinds.current.get(card.id)! : 'cloze';
  const dictation = kind === 'dictation';

  // A dictation card starts by playing its sentence.
  useEffect(() => {
    if (dictation && chunk) void speak(chunk.example);
  }, [dictation, chunk]);

  // Everything reviewed (or the cards are gone): this step is done.
  if (!currentId) {
    return <PrimaryAction label={vi.session.next} onClick={() => void nextStep(session.id, now())} />;
  }
  if (!cards) return null;

  const next = () => {
    const following = remaining.find((id) => id !== currentId);
    setOutcome(undefined);
    setAnswer('');
    setTries(0);
    setHintShown(false);
    setWrongOnce(false);
    startedAt.current = Date.now();
    if (following) {
      setCurrentId(following);
      setTimeout(() => input.current?.focus(), 0);
    } else {
      void nextStep(session.id, now());
    }
  };

  if (card?.kind === 'fix') {
    return (
      <FixReview
        key={card.id}
        card={card}
        position={session.plan.reviewCardIds.indexOf(card.id) + 1}
        total={session.plan.reviewCardIds.length}
        onSettle={(outcome) => void recordReview(session.id, card.id, outcome, now())}
        onNext={next}
      />
    );
  }

  // A card whose content no longer exists: let it pass.
  if (!chunk || !parts) return <PrimaryAction label={vi.session.next} onClick={next} />;

  const position = session.plan.reviewCardIds.indexOf(currentId) + 1;
  const total = session.plan.reviewCardIds.length;

  const settle = (result: AnswerResult, gaveUp: boolean) => {
    const rating = ratingFor({ result, hintShown, gaveUp, tries: tries + 1 });
    setOutcome({ result, rating });
    void recordReview(session.id, currentId, { rating, result, ms: Date.now() - startedAt.current }, now());
  };

  const check = () => {
    const result = dictation ? checkSentence(answer, chunk.example) : checkAnswer(answer, parts.answer);
    if (result === 'wrong' && tries === 0) {
      setTries(1);
      setWrongOnce(true);
      input.current?.select();
      return;
    }
    setTries(tries + 1);
    settle(result, false);
  };

  return (
    <section className="flex flex-1 flex-col pt-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">{dictation ? vi.review.dictationTitle : vi.review.title}</h1>
        <span className="text-sm text-ink-soft">{vi.review.progress(position, total)}</span>
      </div>

      {dictation ? (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <SpeakButton text={chunk.example} slow />
          {outcome && <p className="w-full pt-3 text-[22px] leading-relaxed font-medium" lang="en">{chunk.example}</p>}
        </div>
      ) : (
        <p className="mt-6 flex items-start gap-2 text-[22px] leading-relaxed font-medium" lang="en">
          <span className="flex-1">
            {parts.before}
            {outcome ? (
              <mark className={`rounded px-1 ${outcome.result === 'correct' ? 'bg-good-tint text-good' : 'bg-accent-tint text-accent-ink'}`}>{parts.answer}</mark>
            ) : (
              <span className="mx-0.5 inline-block min-w-16 border-b-2 border-primary text-center text-primary">
                {hintShown ? hintFor(parts.answer) : '\u00a0'.repeat(6)}
              </span>
            )}
            {parts.after}
          </span>
          {outcome && <SpeakButton text={chunk.example} size="sm" />}
        </p>
      )}
      {chunk.exampleVi && <p className="mt-2 text-ink-soft">{chunk.exampleVi}</p>}
      {chunk.vi && (
        <p className="mt-4 text-sm text-ink-soft">
          {vi.review.meaning}: <span className="text-ink">{chunk.vi}</span>
        </p>
      )}
      {card?.source === 'capture' && <p className="mt-3 text-xs text-ink-soft">{vi.capture.fromCapture}</p>}

      {!outcome && (
        <>
          <input
            ref={input}
            autoFocus
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder={dictation ? vi.review.dictationPlaceholder : vi.review.placeholder}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            lang="en"
            className="mt-6 min-h-13 w-full rounded-xl border border-line bg-surface px-4 text-lg outline-none focus:border-primary"
          />
          {wrongOnce && <div className="mt-3"><Note tone="accent" icon={<RotateCcw size={18} />}>{vi.review.tryAgain}</Note></div>}
          <div className="mt-3 flex gap-2">
            {!hintShown && (
              <Button
                variant="quiet"
                onClick={() => {
                  setHintShown(true);
                  if (dictation) void speak(chunk.example, 'slow');
                  input.current?.focus();
                }}
              >
                {dictation ? <Turtle size={16} /> : <Lightbulb size={16} />}
                {dictation ? vi.speech.listenSlow : vi.review.hint}
              </Button>
            )}
            <Button variant="quiet" onClick={() => settle('wrong', true)}>{vi.review.giveUp}</Button>
          </div>
        </>
      )}

      {outcome && dictation && (
        <div className="mt-6 space-y-3">
          {outcome.result === 'correct' && <Note tone="good" icon={<CircleCheck size={18} />}>{vi.review.correct}</Note>}
          {outcome.result !== 'correct' && (
            <>
              <Note tone="accent">{outcome.result === 'close' ? vi.review.dictationClose : vi.review.dictationWrong}</Note>
              {answer.trim() && <Diff parts={displayDiff(answer, chunk.example)} />}
              {outcome.result === 'wrong' && <p className="text-sm text-ink-soft">{vi.review.again}</p>}
            </>
          )}
        </div>
      )}

      {outcome && !dictation && (
        <div className="mt-6 space-y-2">
          {outcome.result === 'correct' && <Note tone="good" icon={<CircleCheck size={18} />}>{vi.review.correct}</Note>}
          {outcome.result === 'close' && <Note tone="accent">{vi.review.close} {vi.review.answerIs} <b lang="en">{parts.answer}</b></Note>}
          {outcome.result === 'wrong' && (
            <Note tone="accent">
              {vi.review.answerIs} <b lang="en">{parts.answer}</b>. {vi.review.again}
            </Note>
          )}
        </div>
      )}

      <div className="flex-1" />
      {outcome ? (
        <PrimaryAction key="next" label={vi.session.next} onClick={next} />
      ) : (
        <PrimaryAction key="check" label={vi.review.check} onClick={check} disabled={answer.trim() === ''} />
      )}
    </section>
  );
}
