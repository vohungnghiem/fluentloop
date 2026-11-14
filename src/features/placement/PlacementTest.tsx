import { useEffect, useMemo, useState } from 'react';
import { AudioLines, BookOpen, CircleHelp, PenLine, type LucideIcon } from 'lucide-react';
import { vi } from '../../copy/vi';
import { needsFoundation, type Level } from '../../core/plan/plan';
import { DONT_KNOW, nextItem, placementProgress, scorePlacement, type PlacementItem, type Skill } from '../../core/plan/placement';
import { now } from '../../services/clock';
import { chooseTrack, chosenIndustry, currentTrack, foundationTrack } from '../../services/content';
import { availablePlacementItems, savePlacement } from '../../services/plan';
import { speak, stopSpeaking, ttsSupported } from '../../services/speech/tts';
import { Meter } from '../../ui/shell';
import { SpeakButton } from '../../ui/speech';
import { toneClass, type Tone } from '../../ui/tones';
import { Button, Card, Eyebrow, Lu, Note, OptionButton, PrimaryAction, StepHeader, ToneIcon } from '../../ui/ui';
import { useDraft } from '../../ui/useDraft';

const SKILL_LOOK: Record<Skill, { tone: Tone; icon: LucideIcon }> = {
  listen: { tone: 'shadow', icon: AudioLines },
  read: { tone: 'input', icon: BookOpen },
  grammar: { tone: 'produce', icon: PenLine },
};

interface Progress {
  started?: boolean;
  answers: Record<string, number>;
  /** The result was saved; the draft stays until the learner moves on, so a reload shows it again. */
  saved?: boolean;
}

/**
 * The placement test, from its short intro to the result and the review of what was missed.
 * Answers are kept as a draft, so leaving halfway comes back to the same question.
 */
export function PlacementTest({ doneLabel = vi.placement.done, onDone, onLater, laterLabel, header = true }: { doneLabel?: string; onDone: (level: Level) => void; onLater?: () => void; laterLabel?: string; /** False when the page already has the title. */ header?: boolean }) {
  const items = useMemo(availablePlacementItems, []);
  const draft = useDraft<Progress>('placement');
  const [state, setState] = useState<Progress>();
  // The saved draft once it is read, and a newer one from another device.
  useEffect(() => {
    if (draft.ready && !state) setState(draft.saved ?? { answers: {} });
  }, [draft.ready]);
  useEffect(() => {
    if (draft.remote > 0) setState(draft.saved ?? { answers: {} });
  }, [draft.remote]);
  const progress: Progress = state ?? { answers: {} };
  const set = (next: Progress) => {
    setState(next);
    draft.save(next);
  };
  const current = nextItem(items, progress.answers);

  // The last answer given: save the result once.
  useEffect(() => {
    if (!state?.started || current || state.saved) return;
    const answers = state.answers;
    void savePlacement(answers, items, now()).then(() => set({ started: true, answers, saved: true }));
  }, [state, current]);

  if (!state) return null;

  if (!progress.started) {
    return (
      <>
        {header ? <StepHeader {...SKILL_LOOK.grammar} icon={CircleHelp} title={vi.placement.title} detail={vi.placement.intro} /> : <p className="text-ink-soft">{vi.placement.intro}</p>}
        <Card>
          <ul className="space-y-2">
            {vi.placement.rules.map((rule) => <li key={rule} className="flex gap-2"><span className="text-primary">•</span>{rule}</li>)}
          </ul>
          {!ttsSupported() && <div className="mt-3"><Note tone="accent">{vi.placement.noVoice}</Note></div>}
        </Card>
        <div className="flex-1" />
        <PrimaryAction label={vi.placement.start} onClick={() => set({ started: true, answers: {} })}>
          {onLater && <Button variant="quiet" className="mb-2 w-full" onClick={onLater}>{laterLabel}</Button>}
        </PrimaryAction>
      </>
    );
  }

  if (current) {
    const answer = (choice: number) => set({ ...progress, answers: { ...progress.answers, [current.id]: choice } });
    const { done, total } = placementProgress(items, progress.answers);
    return <Question key={current.id} item={current} number={done + 1} done={done} total={total} onAnswer={answer} />;
  }

  const result = scorePlacement(items, progress.answers);
  return (
    <>
      <section className="flex flex-col items-center pt-4 text-center">
        <Lu size={72} className="pop" />
        <p className="mt-4 text-sm font-medium text-ink-soft">{vi.placement.resultTitle}</p>
        <h1 className="mt-1 text-3xl font-semibold">{vi.levels[result.level].name}</h1>
        <p className="mt-3 max-w-md leading-relaxed">{vi.levels[result.level].body}</p>
        <p className="mt-2 text-sm text-ink-soft">{vi.placement.estimate(result.correct, result.answered)}</p>
      </section>

      <Card>
        <h2 className="font-semibold">{vi.placement.bySkill}</h2>
        <ul className="mt-3 space-y-3">
          {(Object.keys(result.bySkill) as Skill[]).filter((skill) => result.bySkill[skill][1] > 0).map((skill) => {
            const [right, asked] = result.bySkill[skill];
            return (
              <li key={skill} className="flex items-center gap-3">
                <ToneIcon {...SKILL_LOOK[skill]} size="sm" />
                <span className="w-36 shrink-0 text-sm">{vi.placement.skills[skill]}</span>
                <Meter value={right} max={asked} className="flex-1" />
                <span className="w-10 text-right text-sm tabular-nums text-ink-soft">{right}/{asked}</span>
              </li>
            );
          })}
        </ul>
      </Card>

      <PackNote level={result.level} />

      {result.missed.length > 0 && (
        <details className="group rounded-2xl border border-line bg-surface">
          <summary className="flex min-h-13 cursor-pointer list-none items-center px-5 font-medium [&::-webkit-details-marker]:hidden">{vi.placement.reviewTitle(result.missed.length)}</summary>
          <ul className="divide-y divide-line border-t border-line">
            {result.missed.map((item) => <Missed key={item.id} item={item} chosen={progress.answers[item.id]} />)}
          </ul>
        </details>
      )}

      <div className="flex-1" />
      <PrimaryAction
        label={doneLabel}
        disabled={!progress.saved}
        onClick={() => {
          draft.clear();
          onDone(result.level);
        }}
      />
    </>
  );
}

/**
 * Which pack fits the result: below B1 the foundation (the caller switches to it when done), at B1
 * and up on the foundation, an offer to move on to the industry.
 */
function PackNote({ level }: { level: Level }) {
  if (!foundationTrack) return null;
  if (needsFoundation(level)) {
    return <Note tone="plain">{currentTrack.foundation ? vi.placement.onFoundation : vi.placement.toFoundation(foundationTrack.titleVi, chosenIndustry().titleVi)}</Note>;
  }
  if (!currentTrack.foundation) return null;
  const industry = chosenIndustry();
  return (
    <Note tone="good">
      {vi.placement.leaveFoundation(industry.titleVi)}
      <span className="mt-2 block">
        <Button onClick={() => chooseTrack(industry.id) && location.reload()}>{vi.track.moveTo(industry.titleVi)}</Button>
      </span>
    </Note>
  );
}

function Question({ item, number, done, total, onAnswer }: { item: PlacementItem; number: number; done: number; total: number; onAnswer: (choice: number) => void }) {
  const look = SKILL_LOOK[item.skill];
  // A listening question plays as it appears (the tap on the last answer allows sound).
  useEffect(() => {
    if (item.audio) void speak(item.audio);
    return () => stopSpeaking();
  }, [item.audio]);
  // 1–4 pick an option on a keyboard, 0 is "don't know".
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const n = Number(event.key);
      if (event.key === '0') onAnswer(DONT_KNOW);
      else if (n >= 1 && n <= item.options.length) onAnswer(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, onAnswer]);

  return (
    <>
      <div className="space-y-2">
        <Eyebrow tone={look.tone} right={vi.placement.progress(number)}>{vi.placement.skills[item.skill]}</Eyebrow>
        <Meter value={done} max={total} />
      </div>

      <Card className={`rise space-y-4 ${toneClass(look.tone)}`}>
        {item.audio && (
          <div className="flex flex-wrap items-center gap-3">
            <ToneIcon {...look} />
            <SpeakButton text={item.audio} slow />
          </div>
        )}
        {item.audio && <p className="text-sm text-ink-soft">{vi.placement.listenFirst}</p>}
        {item.passage && <p className="rounded-xl bg-paper px-4 py-3 leading-relaxed whitespace-pre-line ring-1 ring-line" lang="en">{item.passage}</p>}
        <h1 className="text-xl leading-snug font-semibold" lang={item.skill === 'grammar' ? 'en' : 'vi'}>
          {item.question.split('___').map((part, i, parts) => (
            <span key={i}>
              {part}
              {i < parts.length - 1 && <span className="mx-1 inline-block w-16 border-b-2 border-tone align-baseline" aria-label="chỗ trống" />}
            </span>
          ))}
        </h1>
      </Card>

      <ul className="grid gap-2">
        {item.options.map((option, i) => (
          <li key={option}>
            <OptionButton onClick={() => onAnswer(i)} keyHint={String(i + 1)} lang={item.skill === 'grammar' ? 'en' : 'vi'}>{option}</OptionButton>
          </li>
        ))}
      </ul>
      <div className="flex justify-center">
        <Button variant="quiet" onClick={() => onAnswer(DONT_KNOW)}>{vi.placement.dontKnow}</Button>
      </div>
    </>
  );
}

function Missed({ item, chosen }: { item: PlacementItem; chosen: number }) {
  return (
    <li className="space-y-1.5 px-5 py-4 text-sm">
      {item.audio && <p><span className="text-ink-soft">{vi.placement.heard}</span> <span lang="en">{item.audio}</span> <SpeakButton text={item.audio} size="sm" /></p>}
      {item.passage && <p className="whitespace-pre-line text-ink-soft" lang="en">{item.passage}</p>}
      <p className="font-medium">{item.question}</p>
      <p><span className="text-ink-soft">{vi.placement.yourAnswer}</span> {chosen === DONT_KNOW ? vi.placement.dontKnow : item.options[chosen]}</p>
      <p><span className="text-ink-soft">{vi.placement.rightAnswer}</span> <span className="font-medium text-good">{item.options[item.answer]}</span></p>
      <p className="text-ink-soft">{item.explainVi}</p>
    </li>
  );
}

