import type { FsrsState } from './srs';

/**
 * The card gets harder as memory gets firmer: fill in the blank while it is fresh, then hear the
 * whole sentence and type it (dictation) once it has held for a few days.
 */
export type CardKind = 'cloze' | 'dictation';

export const DICTATION_FROM_STABILITY = 4;

export function cardKind(state: FsrsState, canSpeak: boolean): CardKind {
  return canSpeak && state.reps > 0 && state.stability >= DICTATION_FROM_STABILITY ? 'dictation' : 'cloze';
}
