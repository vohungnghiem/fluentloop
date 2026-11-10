import { matchSpoken } from '../../core/check/shadow';

/**
 * Listening with the browser's speech recognition (Chrome, Edge, Android; not Firefox; patchy on
 * iOS). Chrome sends audio to Google, so it needs the network. Every way it can fail is a status
 * the screen can explain; typing always works instead.
 */

export type MicStatus =
  | 'idle'
  | 'listening'
  | 'heard'
  | 'no-speech' // listened, nothing heard
  | 'blocked' // permission denied
  | 'no-mic' // no microphone found
  | 'offline' // recognition needs the network
  | 'unsupported' // this browser has no recognition
  | 'error';

export interface ListenResult {
  status: MicStatus;
  transcript: string;
}

/** Debug: pretend the microphone behaves a certain way (set on /debug). */
export type MicSimulation = 'real' | 'echo' | 'partial' | 'silent' | 'blocked' | 'unsupported' | 'offline';
const SIM_KEY = 'fluentloop.debug.mic';

export function micSimulation(): MicSimulation {
  try {
    return (localStorage.getItem(SIM_KEY) as MicSimulation | null) ?? 'real';
  } catch {
    return 'real';
  }
}
export function setMicSimulation(mode: MicSimulation) {
  try {
    if (mode === 'real') localStorage.removeItem(SIM_KEY);
    else localStorage.setItem(SIM_KEY, mode);
  } catch {
    // ignore
  }
}

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean; length: number }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

function recognitionClass(): (new () => Recognition) | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function sttSupported(): boolean {
  const sim = micSimulation();
  if (sim === 'unsupported') return false;
  if (sim !== 'real') return true;
  return !!recognitionClass();
}

const ERRORS: Record<string, MicStatus> = {
  'not-allowed': 'blocked',
  'service-not-allowed': 'blocked',
  'audio-capture': 'no-mic',
  network: 'offline',
  'no-speech': 'no-speech',
  aborted: 'idle',
};

/** The guess that matches the expected sentence best; the first (likeliest) one on a tie. */
export function closest(guesses: string[], expected: string): string {
  return guesses.reduce((best, guess) => (matchSpoken(expected, guess).ratio > matchSpoken(expected, best).ratio ? guess : best), guesses[0] ?? '');
}

/** Drop every other word: what a noisy room might give. */
const partial = (text: string) => text.split(/\s+/).filter((_, i) => i % 3 !== 1).join(' ');

export interface Listening {
  result: Promise<ListenResult>;
  /** Stop listening now and keep what was heard. */
  stop(): void;
  /** Words heard so far, for a live caption. */
  onInterim?: (text: string) => void;
}

/**
 * Listen once (until the speaker pauses, or `stop`). `expected` is only used by the debug
 * simulation, to "hear" the right sentence without a microphone.
 */
export function listen(expected = '', onInterim?: (text: string) => void): Listening {
  const sim = micSimulation();
  if (sim !== 'real') {
    let stop = () => {};
    const result = new Promise<ListenResult>((resolve) => {
      const outcomes: Record<Exclude<MicSimulation, 'real'>, ListenResult> = {
        echo: { status: 'heard', transcript: expected },
        partial: { status: 'heard', transcript: partial(expected) },
        silent: { status: 'no-speech', transcript: '' },
        blocked: { status: 'blocked', transcript: '' },
        unsupported: { status: 'unsupported', transcript: '' },
        offline: { status: 'offline', transcript: '' },
      };
      const timer = setTimeout(() => resolve(outcomes[sim]), 1200);
      stop = () => {
        clearTimeout(timer);
        resolve(outcomes[sim]);
      };
    });
    return { result, stop: () => stop() };
  }

  const Ctor = recognitionClass();
  if (!Ctor) return { result: Promise.resolve({ status: 'unsupported', transcript: '' }), stop: () => {} };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { result: Promise.resolve({ status: 'offline', transcript: '' }), stop: () => {} };
  }

  const recognition = new Ctor();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  // Recognition guesses the likeliest sentence, not what was said: ask for several guesses and
  // keep the one closest to the sentence being practised.
  recognition.maxAlternatives = 5;
  recognition.continuous = false;
  let finalText = '';
  let latest = '';
  let failure: MicStatus | undefined;

  const result = new Promise<ListenResult>((resolve) => {
    recognition.onresult = (event) => {
      let interim = '';
      finalText = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const guesses = Array.from({ length: result.length }, (_, k) => result[k]?.transcript ?? '');
          finalText += expected ? closest(guesses, expected) : guesses[0];
        } else interim += result[0]?.transcript ?? '';
      }
      latest = (finalText + ' ' + interim).trim();
      onInterim?.(latest);
    };
    recognition.onerror = (event) => {
      failure = ERRORS[event.error] ?? 'error';
    };
    recognition.onend = () => {
      const transcript = (finalText || latest).trim();
      if (transcript) resolve({ status: 'heard', transcript });
      else resolve({ status: failure && failure !== 'idle' ? failure : 'no-speech', transcript: '' });
    };
    try {
      recognition.start();
    } catch {
      resolve({ status: 'error', transcript: '' });
    }
  });
  return { result, stop: () => recognition.stop() };
}
