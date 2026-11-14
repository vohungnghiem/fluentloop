import type { Level } from '../../core/plan/plan';

/**
 * The part of every coaching prompt that depends on the learner's level: below B1 (`support`)
 * everything is shorter, plainer and in everyday Vietnamese, and "better" means one small step up.
 */
export const levelBrief = ({ level, support }: { level?: Level; support: boolean }) =>
  support
    ? `The learner is at about ${level && level !== 'A0' ? level : 'A1-A2'} (below B1). Keep everything simple:
- Vietnamese notes: everyday words, short, no grammar terms; give the rule as a pattern ("hôm qua → worked").
- English you write for them: short sentences (under 14 words), common words.
- A better phrasing is ONE small step up from their sentence, not a native-level rewrite.`
    : `The learner is at about ${level ?? 'B1'}.`;
