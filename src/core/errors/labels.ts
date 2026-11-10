import { z } from 'zod';

/** Error labels: the categories the error book counts. Tuned to what Vietnamese speakers get wrong. */
export const ERROR_LABELS = {
  article: 'Mạo từ (a/an/the)',
  'plural-s': 'Số nhiều (-s)',
  'third-person-s': 'Ngôi thứ ba (-s)',
  'past-tense': 'Quá khứ (-ed)',
  tense: 'Thì của động từ',
  'be-verb': 'Thiếu/thừa am/is/are',
  preposition: 'Giới từ',
  'word-order': 'Trật tự từ',
  'word-choice': 'Chọn từ',
  'missing-word': 'Thiếu từ',
  spelling: 'Chính tả',
  punctuation: 'Dấu câu, viết hoa',
  naturalness: 'Chưa tự nhiên',
  other: 'Khác',
} as const;

export type ErrorLabel = keyof typeof ERROR_LABELS;
export const errorLabelSchema = z.enum(Object.keys(ERROR_LABELS) as [ErrorLabel, ...ErrorLabel[]]);

/** One mistake found in a written answer, by AI or by a rule. */
export const mistakeSchema = z.object({
  /** The learner's wrong piece, as written. */
  wrong: z.string(),
  /** The fixed piece. */
  right: z.string(),
  label: errorLabelSchema.catch('other'),
  /** Short explanation in Vietnamese. */
  vi: z.string(),
});
export type Mistake = z.infer<typeof mistakeSchema>;

/** What a correction returns, from AI (validated) or rules. */
export const correctionSchema = z.object({
  /** The learner's text with only the errors fixed (keeps their wording). */
  corrected: z.string(),
  /** How a native colleague would say it, optional. */
  natural: z.string().optional().catch(undefined),
  mistakes: z.array(mistakeSchema).max(12),
  /** One line of specific praise in Vietnamese. */
  praiseVi: z.string().optional().catch(undefined),
});
export type Correction = z.infer<typeof correctionSchema>;
