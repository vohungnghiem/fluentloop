import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CircleCheck, Mic, Square } from 'lucide-react';
import { dayKey } from '../../core/date';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { db } from '../../services/db';
import { startRecording, type RecordError, type Recording } from '../../services/speech/record';
import { Button, Card, Note, PrimaryAction } from '../../ui/ui';
import { AudioPlayer } from './ProgressPage';

const MAX_SECONDS = 120;

/** The benchmark: a short text and a minute of speech, both optional, kept on this device. */
export function BaselinePage() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [savedText, setSavedText] = useState(false);
  const [recording, setRecording] = useState<Recording>();
  const [seconds, setSeconds] = useState(0);
  const [clip, setClip] = useState<{ blob: Blob; seconds: number }>();
  const [savedAudio, setSavedAudio] = useState(false);
  const [error, setError] = useState<RecordError>();
  const stopRef = useRef<() => void>(undefined);
  const words = text.split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => setSeconds((s) => {
      if (s + 1 >= MAX_SECONDS) stopRef.current?.();
      return s + 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [recording]);
  useEffect(() => () => recording?.cancel(), [recording]);

  const save = async (row: { kind: 'writing' | 'audio'; text?: string; audio?: Blob; seconds?: number }) => {
    const at = now();
    await db.baselines.add({ id: crypto.randomUUID(), at: at.toISOString(), day: dayKey(at), updatedAt: at.toISOString(), ...row });
  };
  const start = async () => {
    setError(undefined);
    setClip(undefined);
    setSavedAudio(false);
    const result = await startRecording();
    if (typeof result === 'string') return setError(result);
    setSeconds(0);
    setRecording(result);
  };
  const stop = async () => {
    if (!recording) return;
    const done = await recording.stop();
    setRecording(undefined);
    setClip(done);
  };
  stopRef.current = () => void stop();

  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col space-y-5 px-4 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{vi.baseline.title}</h1>
        <Link to="/progress" className="text-primary hover:underline">← {vi.progress.title}</Link>
      </header>
      <p className="text-ink-soft">{vi.baseline.intro}</p>

      <Card>
        <h2 className="font-semibold">{vi.baseline.writingTitle}</h2>
        <p className="mt-1">{vi.baseline.writingPrompt}</p>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setSavedText(false); }}
          rows={7}
          lang="en"
          placeholder={vi.baseline.writingPlaceholder}
          className="mt-3 w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 leading-relaxed outline-none focus:border-primary"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-sm text-ink-soft">{vi.progress.words(words)}</span>
          {savedText ? (
            <span className="inline-flex items-center gap-1 text-good"><CircleCheck size={16} />{vi.baseline.savedWriting}</span>
          ) : (
            <Button disabled={words < 10} onClick={() => void save({ kind: 'writing', text }).then(() => setSavedText(true))}>{vi.baseline.saveWriting}</Button>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">{vi.baseline.audioTitle}</h2>
        <p className="mt-1">{vi.baseline.audioPrompt}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {recording ? (
            <>
              <Button variant="primary" onClick={() => void stop()}><Square size={16} />{vi.baseline.stop}</Button>
              <span className="text-accent-ink">{vi.baseline.recording(seconds)}</span>
            </>
          ) : (
            <Button onClick={() => void start()}><Mic size={16} />{clip ? vi.baseline.redoAudio : vi.baseline.record}</Button>
          )}
        </div>
        {error && <div className="mt-3"><Note tone="accent">{vi.baseline.errors[error]}</Note></div>}
        {clip && (
          <div className="mt-3 space-y-2">
            <AudioPlayer blob={clip.blob} />
            {savedAudio ? (
              <span className="inline-flex items-center gap-1 text-good"><CircleCheck size={16} />{vi.baseline.savedAudio}</span>
            ) : (
              <Button onClick={() => void save({ kind: 'audio', audio: clip.blob, seconds: clip.seconds }).then(() => setSavedAudio(true))}>{vi.baseline.saveAudio}</Button>
            )}
          </div>
        )}
      </Card>

      <div className="flex-1" />
      <PrimaryAction label={vi.baseline.done} onClick={() => navigate('/progress')} />
    </main>
  );
}
