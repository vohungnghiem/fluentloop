import { editDistance, normalize } from './text';

/**
 * What the machine heard against what was to be said, word by word. Speech recognition is only
 * an approximation of pronunciation, so this is "the machine heard it", never a score.
 */

export interface HeardWord {
  /** The word as written in the target sentence (with its punctuation). */
  text: string;
  heard: boolean;
}

export interface ShadowResult {
  words: HeardWord[];
  /** Share of target words heard, 0 to 1. */
  ratio: number;
}

const NUMBERS: Record<string, string> = {
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five',
  '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten',
};

/** Normalized form of one written token, as recognition would spell it. */
function key(token: string): string[] {
  return normalize(token)
    .split(' ')
    .filter(Boolean)
    .map((word) => NUMBERS[word] ?? word);
}

/** Recognition often writes a near spelling ("standup" / "stand up", "pushed" / "push"). */
const same = (a: string, b: string) => a === b || (a.length >= 5 && editDistance(a, b) <= 1);

/**
 * Align the heard transcript to the target (LCS on normalized words) and mark each written word
 * heard or not. Words split by contractions ("I'll" → "i will") count as heard when all parts are.
 */
export function matchSpoken(target: string, transcript: string): ShadowResult {
  const tokens = target.split(/\s+/).filter(Boolean);
  const parts = tokens.flatMap((token, index) => key(token).map((word) => ({ word, index })));
  const heard = key(transcript.replace(/\b(stand)\s+(up)\b/gi, '$1$2'));
  const a = parts.map((part) => part.word);
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(heard.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = heard.length - 1; j >= 0; j--) {
      table[i][j] = same(a[i], heard[j]) ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const hit = new Array<boolean>(a.length).fill(false);
  let i = 0;
  let j = 0;
  while (i < a.length && j < heard.length) {
    if (same(a[i], heard[j])) {
      hit[i++] = true;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }
  const words = tokens.map((text, index) => {
    const mine = parts.map((part, k) => ({ part, k })).filter(({ part }) => part.index === index);
    // Pure punctuation ("—") has no parts: nothing to hear, count it as heard.
    return { text, heard: mine.every(({ k }) => hit[k]) };
  });
  const counted = words.filter((_, index) => parts.some((part) => part.index === index));
  const ratio = counted.length === 0 ? 0 : counted.filter((word) => word.heard).length / counted.length;
  return { words, ratio };
}

/** Split a paragraph into sentences (keeps the end punctuation). */
export function sentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
}
