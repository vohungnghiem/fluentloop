import { useEffect, useRef, useState } from 'react';
import { AudioLines, Mic, MicOff, Turtle, Volume2 } from 'lucide-react';
import { vi } from '../copy/vi';
import { speak, stopSpeaking, ttsSupported, type Rate } from '../services/speech/tts';
import { listen, type Listening, type MicStatus } from '../services/speech/stt';

/** Loudspeaker button: plays the sentence; the turtle plays it slowly. */
export function SpeakButton({ text, slow = false, size = 'md', label }: { text: string; slow?: boolean; size?: 'sm' | 'md'; label?: string }) {
  const [playing, setPlaying] = useState<Rate>();
  if (!ttsSupported()) return null;
  const play = async (rate: Rate) => {
    if (playing) {
      stopSpeaking();
      setPlaying(undefined);
      return;
    }
    setPlaying(rate);
    await speak(text, rate);
    setPlaying(undefined);
  };
  const on = (rate: Rate) => (playing === rate ? ' bg-primary-tint' : '');
  const cls =
    size === 'sm'
      ? 'inline-flex size-8 items-center justify-center rounded-full text-track hover:bg-primary-tint'
      : 'inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary-tint px-3 text-sm font-medium text-track hover:brightness-95';
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <button type="button" className={cls + on('normal')} onClick={() => void play('normal')} aria-label={vi.speech.listen} title={vi.speech.listen}>
        {playing === 'normal' ? <AudioLines size={size === 'sm' ? 18 : 16} className="animate-pulse" /> : <Volume2 size={size === 'sm' ? 18 : 16} />}
        {size === 'md' && (label ?? vi.speech.listen)}
      </button>
      {slow && (
        <button type="button" className={cls + on('slow')} onClick={() => void play('slow')} aria-label={vi.speech.listenSlow} title={vi.speech.listenSlow}>
          {playing === 'slow' ? <AudioLines size={size === 'sm' ? 18 : 16} className="animate-pulse" /> : <Turtle size={size === 'sm' ? 18 : 16} />}
          {size === 'md' && vi.speech.listenSlow}
        </button>
      )}
    </span>
  );
}

const PROBLEM: MicStatus[] = ['no-speech', 'blocked', 'no-mic', 'offline', 'unsupported', 'error'];

/**
 * The microphone with every state spelled out. `onHeard` gets the transcript. M toggles it on a
 * keyboard (unless typing).
 */
export function MicButton({ expected, onHeard, onStatus }: { expected: string; onHeard: (text: string) => void; onStatus?: (status: MicStatus) => void }) {
  const [status, setStatus] = useState<MicStatus>('idle');
  const [interim, setInterim] = useState('');
  const session = useRef<Listening>(undefined);
  const update = (next: MicStatus) => {
    setStatus(next);
    onStatus?.(next);
  };

  const toggle = async () => {
    if (session.current) {
      session.current.stop();
      return;
    }
    stopSpeaking();
    setInterim('');
    update('listening');
    const current = listen(expected, setInterim);
    session.current = current;
    const result = await current.result;
    session.current = undefined;
    update(result.status);
    if (result.status === 'heard') onHeard(result.transcript);
  };
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.repeat) return;
      if (event.key === 'm' || event.key === 'M') {
        event.preventDefault();
        void toggleRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      session.current?.stop();
    };
  }, []);

  const listening = status === 'listening';
  const problem = PROBLEM.includes(status);
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-pressed={listening}
        aria-label={listening ? vi.speech.stop : vi.speech.mic.idle}
        className={`relative flex size-20 items-center justify-center rounded-full text-on-primary shadow-sm transition ${listening ? 'bg-accent' : 'bg-primary hover:brightness-110'}`}
      >
        {listening && <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-40" />}
        {status === 'blocked' || status === 'unsupported' ? <MicOff size={32} /> : <Mic size={32} />}
      </button>
      <div className="min-h-6 text-center text-sm" aria-live="polite">
        {listening ? (
          <span className="text-ink-soft">{interim ? <i lang="en">“{interim}”</i> : vi.speech.mic.listening}</span>
        ) : problem ? (
          <span className="text-accent-ink">{vi.speech.mic[status as keyof typeof vi.speech.mic]}</span>
        ) : (
          <span className="text-ink-soft">
            {vi.speech.mic.idle} <kbd className="hidden rounded bg-line px-1.5 text-xs sm:inline">{vi.speech.micKey}</kbd>
          </span>
        )}
      </div>
    </div>
  );
}

/** Space replays: the hook for a screen with one main sentence. Ignored while typing. */
export function useSpaceToPlay(text: string | undefined, rate: Rate = 'normal') {
  const ref = useRef(text);
  ref.current = text;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (event.key !== ' ' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || !ref.current) return;
      event.preventDefault();
      void speak(ref.current, rate);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rate]);
}

/**
 * A chunk explained: the phrase (with listen and slow), its meaning, and the example sentence
 * (with listen). Nothing plays on its own; the learner taps a speaker.
 */
export function ChunkGloss({ en, meaning, example, tone = 'tint' }: { en: string; meaning: string; example?: string; tone?: 'tint' | 'card' }) {
  return (
    <div className={tone === 'tint' ? 'rounded-xl bg-primary-tint px-4 py-3' : 'rounded-xl border border-line bg-surface px-4 py-3'}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold" lang="en">{en}</span>
        <SpeakButton text={en} slow size="sm" />
      </div>
      <div>{meaning}</div>
      {example && (
        <div className="mt-1 flex items-center justify-between gap-2 text-sm text-ink-soft">
          <span lang="en">{example}</span>
          <SpeakButton text={example} size="sm" />
        </div>
      )}
    </div>
  );
}
