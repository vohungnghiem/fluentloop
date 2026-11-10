import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CircleCheck, Lightbulb, RotateCcw } from 'lucide-react';
import { checkSentence, displayDiff, type AnswerResult } from '../../core/check/text';
import { ERROR_LABELS, type ErrorLabel } from '../../core/errors/labels';
import { ratingFor, type RatingName } from '../../core/srs/srs';
import { vi } from '../../copy/vi';
import { db, type CardRow } from '../../services/db';
import { Button, Chip, Note, PrimaryAction } from '../../ui/ui';
import { Diff } from '../../ui/Diff';
import { SpeakButton } from '../../ui/speech';

/** An error card: the learner's own wrong sentence, to be typed back right. */
export function FixReview({
  card,
  position,
  total,
  onSettle,
  onNext,
}: {
  card: CardRow;
  position: number;
  total: number;
  onSettle: (outcome: { rating: RatingName; result: AnswerResult; ms: number }) => void;
  onNext: () => void;
}) {
  const mistakes = useLiveQuery(() => db.mistakes.filter((m) => m.cardId === card.id).toArray(), [card.id]) ?? [];
  const mistake = mistakes[0];
  const [answer, setAnswer] = useState(card.wrongSentence ?? '');
  const [tries, setTries] = useState(0);
  const [hintShown, setHintShown] = useState(false);
  const [outcome, setOutcome] = useState<AnswerResult>();
  const startedAt = useRef(Date.now());
  const right = card.rightSentence ?? '';

  const settle = (result: AnswerResult, gaveUp: boolean) => {
    setOutcome(result);
    onSettle({ rating: ratingFor({ result, hintShown, gaveUp, tries: tries + 1 }), result, ms: Date.now() - startedAt.current });
  };
  const check = () => {
    const result = checkSentence(answer, right);
    if (result !== 'correct' && tries === 0) {
      setTries(1);
      return;
    }
    settle(result === 'correct' ? 'correct' : result, false);
  };

  return (
    <section className="flex flex-1 flex-col pt-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">{vi.fix.title}</h1>
        <span className="text-sm text-ink-soft">{vi.review.progress(position, total)}</span>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{vi.fix.instruction}</p>
      <p className="mt-5 rounded-xl bg-accent-tint px-4 py-3 text-[21px] leading-relaxed" lang="en">{card.wrongSentence}</p>
      {mistakes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {[...new Set(mistakes.map((m) => m.label))].map((label) => (
            <Chip key={label} tone="accent">{ERROR_LABELS[label as ErrorLabel] ?? label}</Chip>
          ))}
        </div>
      )}

      {!outcome && (
        <>
          <textarea
            autoFocus
            rows={2}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            lang="en"
            spellCheck={false}
            className="mt-5 w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 text-lg outline-none focus:border-primary"
          />
          {tries > 0 && <div className="mt-3"><Note tone="accent" icon={<RotateCcw size={18} />}>{vi.review.tryAgain}</Note></div>}
          {hintShown && mistake && <div className="mt-3"><Note tone="plain" icon={<Lightbulb size={18} />}>{mistakes.map((m) => m.vi).join(' ')}</Note></div>}
          <div className="mt-3 flex gap-2">
            {!hintShown && mistake && <Button variant="quiet" onClick={() => setHintShown(true)}><Lightbulb size={16} />{vi.review.hint}</Button>}
            <Button variant="quiet" onClick={() => settle('wrong', true)}>{vi.review.giveUp}</Button>
          </div>
        </>
      )}

      {outcome && (
        <div className="mt-6 space-y-3">
          {outcome === 'correct' ? (
            <Note tone="good" icon={<CircleCheck size={18} />}>{vi.fix.fixed}</Note>
          ) : (
            <>
              <Note tone="accent">{vi.review.sentenceIs}</Note>
              <Diff parts={displayDiff(answer, right)} />
            </>
          )}
          <p className="flex items-start gap-2 text-lg" lang="en"><span className="flex-1">{right}</span><SpeakButton text={right} size="sm" /></p>
          {mistakes.map((m) => <p key={m.id} className="text-sm text-ink-soft">{m.vi}</p>)}
        </div>
      )}

      <div className="flex-1" />
      {outcome ? (
        <PrimaryAction key="next" label={vi.session.next} onClick={onNext} />
      ) : (
        <PrimaryAction key="check" label={vi.review.check} keys="Ctrl + ↵" onClick={check} disabled={answer.trim() === ''} />
      )}
    </section>
  );
}
