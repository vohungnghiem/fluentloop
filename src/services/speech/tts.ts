/**
 * Reading aloud with the browser's own voices (Web Speech API). Free, offline on most systems.
 * The best English voice is picked once: a local en-US/en-GB voice from a known good family first.
 */

export type Rate = 'slow' | 'normal';
const RATES: Record<Rate, number> = { slow: 0.75, normal: 1 };
const PREFERRED = [/google us english/i, /samantha/i, /microsoft (aria|jenny|guy)/i, /daniel/i, /google uk english/i];

const synth = () => (typeof window !== 'undefined' ? window.speechSynthesis : undefined);

export const ttsSupported = () => !!synth();

let chosen: SpeechSynthesisVoice | undefined;

export function englishVoices(): SpeechSynthesisVoice[] {
  return (synth()?.getVoices() ?? []).filter((voice) => /^en[-_]/i.test(voice.lang));
}

function bestVoice(): SpeechSynthesisVoice | undefined {
  if (chosen) return chosen;
  const voices = englishVoices();
  chosen =
    PREFERRED.map((pattern) => voices.find((voice) => pattern.test(voice.name))).find(Boolean) ??
    voices.find((voice) => /en[-_](US|GB)/i.test(voice.lang) && voice.localService) ??
    voices[0];
  return chosen;
}

// Voices arrive late in Chrome: forget the pick when the list changes.
synth()?.addEventListener?.('voiceschanged', () => {
  chosen = undefined;
});

/** Speak `text`; resolves when done (or at once when there is no speech). Stops what was playing. */
export function speak(text: string, rate: Rate = 'normal'): Promise<void> {
  const engine = synth();
  if (!engine) return Promise.resolve();
  engine.cancel();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    const voice = bestVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = RATES[rate];
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    engine.speak(utterance);
    // Some engines never fire onend: never hang the caller.
    setTimeout(resolve, 1500 + text.length * 120);
  });
}

export const stopSpeaking = () => synth()?.cancel();

/** Whether something is being read aloud right now. */
export const speaking = () => !!synth()?.speaking;
