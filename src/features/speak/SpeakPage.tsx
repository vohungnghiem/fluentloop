import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Mic, Square } from 'lucide-react';
import { vi } from '../../copy/vi';
import { courseState } from '../../core/course/course';
import type { Task } from '../../core/content/schema';
import { fluency, type Fluency } from '../../core/speech/fluency';
import { now } from '../../services/clock';
import { courseUnits } from '../../services/content';
import { interviewTask } from '../../core/content/interview';
import { findQuestion } from '../../services/interview';
import { db, type TalkRow } from '../../services/db';
import { recordSupported, startRecording, type RecordError, type Recording } from '../../services/speech/record';
import { listenLong, sttSupported, type LongListening } from '../../services/speech/stt';
import { stopSpeaking } from '../../services/speech/tts';
import { previousTalk, saveTalk, updateTalk } from '../../services/talk';
import { Meter } from '../../ui/shell';
import { STEP_LOOK } from '../../ui/tones';
import { Button, Card, ChunkChips, Eyebrow, Note, OptionButton, PrimaryAction, StatTile, StepHeader } from '../../ui/ui';
import { useSupport } from '../../ui/useSupport';
import { AudioPlayer } from '../progress/ProgressPage';
import { WritingTask } from '../session/WritingTask';

/** Stop on its own after this long: a talk is one or two minutes. */
const MAX_SECONDS = 180;

type Stage = 'ready' | 'recording' | 'done' | 'feedback';

/** Topics to talk about: the tasks of the units learnt so far (the latest first), else the first unit's. */
function useTopics(): Array<{ task: Task; unitId: string; unitTitle: string }> | undefined {
  const reads = useLiveQuery(() => db.reads.toArray(), []);
  return useMemo(() => {
    if (!reads) return undefined;
    const course = courseState(courseUnits, reads.map((r) => r.snippetId));
    const started = course.units.filter((u) => u.read > 0);
    const units = (started.length ? started : course.units.slice(0, 1)).reverse();
    return units.flatMap((u) => u.unit.tasks.map((task) => ({ task, unitId: u.unit.id, unitTitle: u.unit.titleVi })));
  }, [reads]);
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * Talking for a minute or two on one topic: get ready with the ideas in view, talk while the app
 * records and writes down what it hears, then see speed and pauses next to last time, listen back,
 * fix what was misheard, and get feedback on it as on a written answer.
 */
export function SpeakPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const topics = useTopics();
  const support = useSupport();
  // An interview question (from its page): the learner's own answer is what they aim to say.
  const question = findQuestion(params.get('interview') ?? '');
  const answer = useLiveQuery(() => (question ? db.answers.get(question.id) : undefined), [question?.id]);
  const asked = question ? { task: interviewTask(question, answer?.text), unitId: 'interview', unitTitle: vi.interview.title } : undefined;
  const chosen = asked ?? topics?.find((t) => t.task.id === params.get('task')) ?? topics?.[0];
  const target = support ? 60 : 120;

  const [stage, setStage] = useState<Stage>('ready');
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<RecordError | 'no-input'>();
  const [talk, setTalk] = useState<TalkRow>();
  const [before, setBefore] = useState<TalkRow>();
  const [transcript, setTranscript] = useState('');
  const recording = useRef<Recording>(undefined);
  const listening = useRef<LongListening>(undefined);
  const active = useRef(0);
  const stopRef = useRef<() => void>(undefined);

  useEffect(() => {
    if (stage !== 'recording') return;
    const timer = setInterval(() => setSeconds((s) => {
      if (s + 1 >= MAX_SECONDS) stopRef.current?.();
      return s + 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [stage]);
  // Leaving mid-talk lets go of the microphone.
  useEffect(() => () => {
    recording.current?.cancel();
    void listening.current?.stop();
  }, []);

  if (!topics || support === undefined) return null;
  if (!chosen) return <main className="p-6"><Link to="/roleplay" className="text-primary">{vi.talk.back}</Link></main>;
  const { task } = chosen;

  const start = async () => {
    setError(undefined);
    stopSpeaking();
    setCaption('');
    setSeconds(0);
    // Recognition first, inside the tap (iPhone Safari ignores a later start); then the recorder.
    listening.current = sttSupported() ? listenLong(setCaption, task.models[0]) : undefined;
    const result = recordSupported() ? await startRecording(setLevel) : 'unsupported';
    if (typeof result === 'string') {
      if (!listening.current) return setError(result === 'unsupported' ? 'no-input' : result);
      recording.current = undefined;
    } else {
      recording.current = result;
    }
    setStage('recording');
  };

  const stop = async () => {
    if (stage !== 'recording') return;
    const id = ++active.current;
    const [clip, heard] = await Promise.all([recording.current?.stop(), listening.current?.stop()]);
    recording.current = undefined;
    listening.current = undefined;
    if (id !== active.current) return;
    const text = heard?.transcript ?? '';
    const length = clip?.seconds ?? seconds;
    const measured: Fluency = fluency({ transcript: text, seconds: length, levels: clip?.levels });
    const row = { kind: 'talk' as const, topic: task.promptVi, taskId: task.id, seconds: length, transcript: text || undefined, ...measured, audio: clip?.blob };
    const talkId = await saveTalk(row, now());
    const saved = await db.talks.get(talkId);
    setTalk(saved);
    setBefore(saved ? await previousTalk(saved) : undefined);
    setTranscript(text);
    setStage('done');
    window.scrollTo(0, 0);
  };
  stopRef.current = () => void stop();

  /** The learner fixed what was misheard: count the words again over the same talking time. */
  const keepTranscript = async () => {
    if (!talk || transcript === (talk.transcript ?? '')) return;
    const talking = talk.wpm && talk.words ? (talk.words / talk.wpm) * 60 : talk.seconds;
    const measured = fluency({ transcript, seconds: Math.round(talking) });
    const patch = { transcript, words: measured.words, wpm: measured.wpm, fillers: measured.fillers };
    await updateTalk(talk.id, patch, now());
    setTalk({ ...talk, ...patch });
  };

  if (stage === 'feedback' && talk) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col px-4 pb-6">
        <WritingTask
          task={task}
          snippetId={`talk:${talk.id}`}
          unitId={chosen.unitId}
          initialText={transcript}
          title={vi.talk.feedbackTitle}
          onDone={() => navigate('/progress#speaking', { replace: true })}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col space-y-5 px-4 pt-6">
      <header className="flex items-center gap-2">
        <Link to={question ? `/interview/${question.id}` : '/roleplay'} className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-ink" aria-label={vi.talk.back} title={vi.talk.back}><ArrowLeft size={20} /></Link>
        <span className="font-semibold">{vi.talk.title}</span>
      </header>

      {stage === 'ready' && (
        <>
          <StepHeader {...STEP_LOOK.shadow} title={vi.talk.readyTitle(target / 60)} detail={vi.talk.readyBody} />
          <Card>
            <Eyebrow tone="shadow" right={chosen.unitTitle}>{vi.talk.topic}</Eyebrow>
            <p className="mt-1.5 text-xl leading-snug font-medium">{task.promptVi}</p>
            {task.points.length > 0 && (
              <>
                <p className="mt-3 text-sm font-medium">{vi.talk.points}</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">{task.points.map((p) => <li key={p.vi}>{p.vi}</li>)}</ul>
              </>
            )}
            {task.required.length > 0 && <div className="mt-3"><ChunkChips label={vi.produce.use} chunks={task.required.map((r) => r.label)} /></div>}
            {task.hints[1] && <p className="mt-3 text-sm"><span className="text-ink-soft">{vi.talk.opener}</span> <i lang="en">{task.hints[1]}</i></p>}
          </Card>
          <Note tone="plain">{sttSupported() ? vi.talk.howWithStt : vi.talk.howWithout}</Note>
          {error && <Note tone="accent">{vi.talk.errors[error]}</Note>}
          <details className="rounded-2xl border border-line bg-surface">
            <summary className="flex min-h-13 cursor-pointer list-none items-center px-5 font-medium [&::-webkit-details-marker]:hidden">{vi.talk.otherTopic}</summary>
            <ul className="grid gap-2 border-t border-line p-3">
              {topics.map((t) => (
                <li key={t.task.id}>
                  <OptionButton selected={t.task.id === task.id} onClick={() => setParams({ task: t.task.id }, { replace: true })}>
                    <span className="block">{t.task.promptVi}</span>
                    <span className="block text-sm font-normal text-ink-soft">{t.unitTitle}</span>
                  </OptionButton>
                </li>
              ))}
            </ul>
          </details>
          <div className="flex-1" />
          <PrimaryAction label={vi.talk.start} onClick={() => void start()} />
        </>
      )}

      {stage === 'recording' && (
        <>
          <StepHeader {...STEP_LOOK.shadow} title={vi.talk.recordingTitle} right={`${clock(seconds)} / ${clock(target)}`} />
          <p className="text-xl leading-snug font-medium">{task.promptVi}</p>
          <Meter value={Math.min(seconds, target)} max={target} />
          <div className="flex items-center gap-3" aria-hidden="true">
            <Mic className="text-accent-ink" size={22} />
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper ring-1 ring-line">
              <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.min(100, level * 400)}%` }} />
            </div>
          </div>
          <div className="min-h-24 rounded-2xl border border-line bg-surface p-4" aria-live="polite">
            {caption ? <p className="text-lg leading-relaxed" lang="en">{caption}</p> : <p className="text-ink-soft">{listening.current ? vi.talk.listening : vi.talk.recordingOnly}</p>}
          </div>
          {seconds >= target && <Note tone="good">{vi.talk.enough}</Note>}
          <div className="flex-1" />
          <PrimaryAction label={vi.talk.stop} onClick={() => void stop()}>
            <span className="mb-2 flex items-center justify-center gap-1 text-sm text-ink-soft"><Square size={14} />{vi.talk.stopHint}</span>
          </PrimaryAction>
        </>
      )}

      {stage === 'done' && talk && (
        <>
          <StepHeader {...STEP_LOOK.wrap} title={vi.talk.doneTitle} detail={vi.talk.doneBody(talk.seconds)} />
          <div className="grid grid-cols-3 gap-2">
            <StatTile value={talk.wpm ?? '–'} label={vi.talk.wpm} tone="shadow" />
            <StatTile value={talk.pauses ?? '–'} label={vi.talk.pauses} tone="fix" />
            <StatTile value={talk.fillers ?? 0} label={vi.talk.fillers} />
          </div>
          <Note tone={before?.wpm && talk.wpm && talk.wpm >= before.wpm ? 'good' : 'plain'}>
            {before?.wpm && talk.wpm ? vi.talk.compare(before.wpm, talk.wpm, before.pauses, talk.pauses) : vi.talk.first}
          </Note>
          {talk.audio && (
            <Card>
              <h2 className="font-semibold">{vi.talk.listenBack}</h2>
              <AudioPlayer blob={talk.audio} />
            </Card>
          )}
          <Card>
            <h2 className="font-semibold">{vi.talk.transcriptTitle}</h2>
            <p className="mt-1 text-sm text-ink-soft">{talk.transcript ? vi.talk.transcriptFix : vi.talk.transcriptType}</p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              onBlur={() => void keepTranscript()}
              rows={6}
              lang="en"
              spellCheck={false}
              className="mt-3 w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 text-lg leading-relaxed outline-none focus:border-primary"
            />
            <p className="mt-2 text-xs text-ink-soft">{vi.talk.measureNote}</p>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { setStage('ready'); setTalk(undefined); }}>{vi.talk.again}</Button>
            <Link to="/progress#speaking" className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-primary hover:underline">{vi.talk.history}</Link>
          </div>
          <div className="flex-1" />
          <PrimaryAction
            label={vi.talk.getFeedback}
            disabled={transcript.trim().split(/\s+/).length < 3}
            onClick={() => void keepTranscript().then(() => { setStage('feedback'); window.scrollTo(0, 0); })}
          />
        </>
      )}
    </main>
  );
}
