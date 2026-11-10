/**
 * Pasted text (an email, a ticket, docs) into sentences worth learning: lines and bullets are
 * split, greetings, signatures, links and code are dropped, very short or very long pieces too.
 */

const ABBREVIATIONS = /\b(e\.g|i\.e|etc|vs|Mr|Mrs|Ms|Dr|approx|no)\.$/i;

export function splitSentences(text: string): string[] {
  const lines = text
    .replace(/\r/g, '')
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-*•>]+|\d+[.)])\s+/, '').trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const line of lines) {
    let current = '';
    for (const piece of line.split(/(?<=[.!?])\s+(?=[A-Z0-9"“'(])/)) {
      current = current ? `${current} ${piece}` : piece;
      if (!ABBREVIATIONS.test(current)) {
        out.push(current.trim());
        current = '';
      }
    }
    if (current) out.push(current.trim());
  }
  return out.filter(worthLearning);
}

function worthLearning(sentence: string): boolean {
  const words = sentence.split(/\s+/);
  if (words.length < 4 || words.length > 40) return false;
  // Greetings and sign-offs, when that is all the line says.
  if (words.length <= 5 && /^(hi|hello|hey|dear|thanks|thank you|best|regards|cheers|sent from)\b/i.test(sentence)) return false;
  if (/https?:\/\/|```|[{};]\s*$|^\$ /.test(sentence)) return false;
  // Mostly letters: skips stack traces, tables and code.
  const letters = sentence.replace(/[^a-z]/gi, '').length;
  return letters / sentence.length > 0.6;
}

const STOP = new Set(
  'the a an and or but to of in on at for with by from is are was were be been am i you we they he she it this that these those my your our their its as if then so do does did have has had will would can could should may might not no yes just also very all any some before after about into over under until while when where what which who how because than there here out up down off only still already now today tomorrow yesterday please'.split(' '),
);

/**
 * Which part of the sentence to blank by default when the learner does not choose: the longest
 * run of 1–3 content words (a phrase is better than a single word). The learner can change it.
 */
export function suggestBlank(sentence: string): string {
  const words = sentence.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
  let best = '';
  for (let i = 0; i < words.length; i++) {
    for (let n = 1; n <= 3 && i + n <= words.length; n++) {
      const run = words.slice(i, i + n);
      if (run.some((w) => STOP.has(w.toLowerCase())) || run.some((w) => /^[A-Z]{2,}$/.test(w))) break;
      const text = run.join(' ');
      if (!sentence.includes(text)) break;
      if (text.length > best.length) best = text;
    }
  }
  return best || words[0] || '';
}
