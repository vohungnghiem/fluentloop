import type { Mistake } from './labels';

/**
 * A few cheap rules for errors Vietnamese speakers make often. Only hints: they miss a lot and
 * must never flag correct English. Each returns the sentence-level fix it suggests.
 */

const BASE_TO_PAST: Record<string, string> = {
  work: 'worked', fix: 'fixed', finish: 'finished', push: 'pushed', find: 'found', go: 'went',
  have: 'had', do: 'did', start: 'started', meet: 'met', send: 'sent', write: 'wrote',
  talk: 'talked', check: 'checked', test: 'tested', deploy: 'deployed', review: 'reviewed',
  update: 'updated', try: 'tried', make: 'made', get: 'got', call: 'called', help: 'helped',
  wrap: 'wrapped', pick: 'picked', look: 'looked', merge: 'merged', build: 'built', is: 'was', are: 'were',
};
const THIRD_PERSON: Record<string, string> = {
  work: 'works', need: 'needs', want: 'wants', look: 'looks', fail: 'fails', run: 'runs',
  take: 'takes', make: 'makes', have: 'has', do: 'does', go: 'goes', seem: 'seems', return: 'returns',
  break: 'breaks', crash: 'crashes', show: 'shows', use: 'uses', know: 'knows', say: 'says',
};
const PAST_MARKERS = /\b(yesterday|last (?:week|night|friday|monday|sprint|month)|this morning|ago)\b/i;

const sentencesOf = (text: string) => text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [];

export function ruleMistakes(text: string): Mistake[] {
  const found: Mistake[] = [];
  for (const sentence of sentencesOf(text)) {
    // "Yesterday I work on…" → worked
    if (PAST_MARKERS.test(sentence)) {
      const match = sentence.match(/\b(I|we|they|you|he|she|it)\s+([a-z]+)\b/i);
      const verb = match?.[2].toLowerCase();
      if (match && verb && BASE_TO_PAST[verb] && !/^(will|would|can|could|should|might|'ll)$/i.test(verb)) {
        found.push({
          wrong: `${match[1]} ${match[2]}`,
          right: `${match[1]} ${BASE_TO_PAST[verb]}`,
          label: 'past-tense',
          vi: `Có “${sentence.match(PAST_MARKERS)![0]}” nên động từ chia quá khứ: ${verb} → ${BASE_TO_PAST[verb]}.`,
        });
      }
    }
    // "The test fail" / "He need" → fails / needs
    const third = sentence.match(/\b(he|she|it|the (?:test|build|app|page|api|server|bug|job|team|client))\s+([a-z]+)\b/i);
    const verb3 = third?.[2].toLowerCase();
    if (third && verb3 && THIRD_PERSON[verb3]) {
      found.push({
        wrong: `${third[1]} ${third[2]}`,
        right: `${third[1]} ${THIRD_PERSON[verb3]}`,
        label: 'third-person-s',
        vi: `Chủ ngữ số ít (${third[1]}) ở hiện tại thì động từ thêm -s: ${verb3} → ${THIRD_PERSON[verb3]}.`,
      });
    }
    // "a API", "a issue" → an
    for (const m of sentence.matchAll(/\ba ([aeio][a-z]+|API|SQL|HTML|UI|URL|HTTP)\b/gi)) {
      if (/^(user|unit|use|one|eu)/i.test(m[1])) continue;
      found.push({ wrong: `a ${m[1]}`, right: `an ${m[1]}`, label: 'article', vi: `Trước âm nguyên âm dùng “an”: an ${m[1]}.` });
    }
    // "I blocked by" / "I waiting on" → I'm
    const be = sentence.match(/\b(I|we|they|he|she|it)\s+(blocked|waiting|working|looking|going|done|almost done|ready|stuck)\b/i);
    if (be) {
      const verb = { i: 'am', we: 'are', they: 'are', he: 'is', she: 'is', it: 'is' }[be[1].toLowerCase()]!;
      found.push({
        wrong: `${be[1]} ${be[2]}`,
        right: `${be[1]} ${verb} ${be[2]}`,
        label: 'be-verb',
        vi: `Cần “${verb}” trước “${be[2]}”: ${be[1]} ${verb} ${be[2]}.`,
      });
    }
  }
  return found;
}

/** Apply rule fixes to the text (first occurrence of each, whole words, case kept for the rest). */
export function applyMistakes(text: string, mistakes: readonly Mistake[]): string {
  return mistakes.reduce((result, m) => {
    const escaped = m.wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return result.replace(new RegExp(`\\b${escaped}\\b`, 'i'), m.right);
  }, text);
}
