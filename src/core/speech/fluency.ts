import { daysBetween } from '../date';
import { words } from '../check/text';

/**
 * How fluently a stretch of speech went, from what the machine heard and how loud the microphone
 * was over time: words a minute, pauses, filler sounds. Rough by nature (recognition misses words,
 * a quiet voice looks like a pause), so it is only compared with the learner's own earlier tries.
 */

/** Hesitation sounds recognition writes down (it drops most of them, so this undercounts). */
export const FILLERS = ['uh', 'um', 'uhm', 'umm', 'erm', 'er', 'ah', 'hmm', 'mm'];

export const fillerCount = (transcript: string) => words(transcript).filter((w) => FILLERS.includes(w)).length;
export const wordCount = (transcript: string) => words(transcript).filter((w) => !FILLERS.includes(w)).length;

export interface Silences {
  /** Quiet stretches of at least `minPause` seconds between speech. */
  pauses: number;
  longestPause: number;
  /** From the first sound to the last: the time actually spent talking (silence before and after left out). */
  activeSeconds: number;
}

/**
 * Pauses from microphone levels (one loudness value per frame). The line between quiet and speech
 * is set from this recording: a quarter of the way from its quiet floor to its loud end.
 */
export function silences(levels: readonly number[], frameSeconds = 0.1, minPause = 1): Silences {
  const none = { pauses: 0, longestPause: 0, activeSeconds: 0 };
  if (levels.length === 0) return none;
  const sorted = [...levels].sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.2)];
  const peak = sorted[Math.floor(sorted.length * 0.95)];
  if (peak - floor < 0.005) return none; // nothing but noise: no speech to measure
  const line = floor + (peak - floor) * 0.25;
  const loud = levels.map((level) => level > line);
  const first = loud.indexOf(true);
  const last = loud.lastIndexOf(true);
  let pauses = 0;
  let longest = 0;
  let run = 0;
  for (let i = first; i <= last; i++) {
    if (!loud[i]) {
      run++;
      continue;
    }
    const seconds = run * frameSeconds;
    if (seconds >= minPause) {
      pauses++;
      longest = Math.max(longest, seconds);
    }
    run = 0;
  }
  return { pauses, longestPause: Math.round(longest * 10) / 10, activeSeconds: Math.round((last - first + 1) * frameSeconds * 10) / 10 };
}

/** Shorter than this, a speed means nothing (a sentence or two): none is given. */
export const MIN_TALK_SECONDS = 20;

export interface Fluency {
  words: number;
  /** Words a minute of talking; undefined without a transcript or for a very short talk. */
  wpm?: number;
  fillers: number;
  pauses?: number;
  longestPause?: number;
}

export function fluency({ transcript = '', seconds, levels }: { transcript?: string; seconds: number; levels?: readonly number[] }): Fluency {
  const count = wordCount(transcript);
  const quiet = levels && levels.length > 0 ? silences(levels) : undefined;
  // The talking time from the levels when they found speech, else the whole recording.
  const talking = quiet && quiet.activeSeconds >= 5 ? quiet.activeSeconds : seconds;
  return {
    words: count,
    wpm: count > 0 && talking >= MIN_TALK_SECONDS ? Math.round(count / (talking / 60)) : undefined,
    fillers: fillerCount(transcript),
    pauses: quiet?.pauses,
    longestPause: quiet?.longestPause,
  };
}

/** Average speed of the last 7 days and of the 7 before: "this week" against "last week". */
export function weekSpeed(talks: ReadonlyArray<{ day: string; wpm?: number }>, today: string): { thisWeek?: number; lastWeek?: number; count: number } {
  const avg = (list: number[]) => (list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : undefined);
  const thisWeek: number[] = [];
  const lastWeek: number[] = [];
  for (const talk of talks) {
    if (!talk.wpm) continue;
    const ago = daysBetween(talk.day, today);
    if (ago >= 0 && ago < 7) thisWeek.push(talk.wpm);
    else if (ago >= 7 && ago < 14) lastWeek.push(talk.wpm);
  }
  return { thisWeek: avg(thisWeek), lastWeek: avg(lastWeek), count: thisWeek.length };
}
