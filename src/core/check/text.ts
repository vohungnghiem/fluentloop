/**
 * Checking without AI: normalising, edit distance, a word diff and "did you use the chunk".
 * Only suggestions; free writing is finally judged by the learner against a model answer.
 */

const CONTRACTIONS: Array<[RegExp, string]> = [
  [/\bi'm\b/g, 'i am'],
  [/\b(you|we|they)'re\b/g, '$1 are'],
  [/\b(he|she|it|that|there|what)'s\b/g, '$1 is'],
  [/\b(i|you|we|they)'ve\b/g, '$1 have'],
  [/\b(i|you|we|they|he|she|it)'ll\b/g, '$1 will'],
  [/\b(i|you|we|they|he|she|it)'d\b/g, '$1 would'],
  [/\bcan't\b/g, 'cannot'],
  [/\bwon't\b/g, 'will not'],
  [/\b(\w+)n't\b/g, '$1 not'],
];

/** Lowercase, straight quotes, contractions spelt out, no punctuation, single spaces. */
export function normalize(text: string): string {
  let result = text.toLowerCase().replace(/[‘’`]/g, "'").replace(/[“”]/g, '"');
  for (const [pattern, replacement] of CONTRACTIONS) result = result.replace(pattern, replacement);
  return result
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/(^|\s)['-]+|['-]+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const words = (text: string): string[] => {
  const normal = normalize(text);
  return normal === '' ? [] : normal.split(' ');
};

/** Levenshtein distance. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

export type AnswerResult = 'correct' | 'close' | 'wrong';

/** A fill-in answer: right, a small slip away from right (one typo per 5 letters), or not it. */
export function checkAnswer(given: string, wanted: string): AnswerResult {
  const a = normalize(given);
  const b = normalize(wanted);
  if (a === '') return 'wrong';
  if (a === b) return 'correct';
  const allowed = Math.floor(b.replace(/\s/g, '').length / 5);
  return allowed > 0 && editDistance(a, b) <= allowed ? 'close' : 'wrong';
}

export type DiffPart = { kind: 'same' | 'removed' | 'added'; text: string };

/** Word diff (LCS) from what was written to what was wanted. Normalized words. */
export function wordDiff(given: string, wanted: string): DiffPart[] {
  const a = words(given);
  const b = words(wanted);
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const parts: DiffPart[] = [];
  const push = (kind: DiffPart['kind'], text: string) => {
    const last = parts.at(-1);
    if (last?.kind === kind) last.text += ` ${text}`;
    else parts.push({ kind, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push('same', a[i]);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      push('removed', a[i++]);
    } else {
      push('added', b[j++]);
    }
  }
  while (i < a.length) push('removed', a[i++]);
  while (j < b.length) push('added', b[j++]);
  return parts;
}

/** Whether a normalized phrase appears in the text as whole words. */
export function containsPhrase(text: string, phrase: string): boolean {
  const haystack = ` ${normalize(text)} `;
  const needle = normalize(phrase);
  return needle !== '' && haystack.includes(` ${needle} `);
}

/** Share of words of `model` that also appear in `given` (0 to 1): a rough "how close". */
export function overlap(given: string, model: string): number {
  const have = new Set(words(given));
  const want = words(model);
  if (want.length === 0) return 0;
  return want.filter((word) => have.has(word)).length / want.length;
}

/**
 * A whole typed sentence (dictation): right, a word or two off (one slip per six words), or not
 * it. A misspelt word counts as one slip, not two.
 */
export function checkSentence(given: string, wanted: string): AnswerResult {
  if (normalize(given) === normalize(wanted)) return 'correct';
  if (words(given).length === 0) return 'wrong';
  const parts = wordDiff(given, wanted);
  const removed = parts.filter((p) => p.kind === 'removed').reduce((n, p) => n + p.text.split(' ').length, 0);
  const added = parts.filter((p) => p.kind === 'added').reduce((n, p) => n + p.text.split(' ').length, 0);
  const slips = Math.max(removed, added);
  return slips <= Math.max(1, Math.floor(words(wanted).length / 6)) ? 'close' : 'wrong';
}

/**
 * Word diff for showing: the same alignment as `wordDiff`, but in the words as written (case and
 * punctuation kept), so the learner sees their own sentence.
 */
export function displayDiff(given: string, wanted: string): DiffPart[] {
  const a = given.split(/\s+/).filter(Boolean);
  const b = wanted.split(/\s+/).filter(Boolean);
  const key = (token: string) => normalize(token);
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = key(a[i]) === key(b[j]) ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const parts: DiffPart[] = [];
  const push = (kind: DiffPart['kind'], text: string) => {
    const last = parts.at(-1);
    if (last?.kind === kind) last.text += ` ${text}`;
    else parts.push({ kind, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (key(a[i]) === key(b[j])) {
      push('same', b[j]);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) push('removed', a[i++]);
    else push('added', b[j++]);
  }
  while (i < a.length) push('removed', a[i++]);
  while (j < b.length) push('added', b[j++]);
  return parts;
}
