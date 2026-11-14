import { z } from 'zod';
import { scenarioSchema, sentences, taskPointSchema, type Task } from './schema';

/**
 * The interview pack (content/interview.json): the questions asked in most job interviews, each with
 * how to build an answer, and a mock interview. The learner writes their own answer to each one
 * (from their CV with AI, or from the model), practises it, and keeps it as review cards.
 */

const id = z.string().regex(/^[a-z0-9-]+$/);

export const interviewQuestionSchema = z.object({
  id,
  /** The question as an interviewer asks it. */
  en: z.string().min(1),
  vi: z.string().min(1),
  /** What the interviewer wants to hear, and the trap to avoid. */
  tipVi: z.string().min(1),
  /** The shape of a good answer, one step per line (STAR for stories). */
  shape: z.array(z.string().min(1)).default([]),
  points: z.array(taskPointSchema).min(1),
  /** [a guiding question in Vietnamese, the start of an answer in English]. */
  hints: z.array(z.string().min(1)).length(2),
  /** A model answer from someone in software, at about B1. */
  model: z.string().min(1),
});
export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;

export const interviewSchema = z.object({
  questions: z.array(interviewQuestionSchema).min(1),
  /** The mock interview: with AI it asks from the questions and the CV; without, the script asks them in turn. */
  scenario: scenarioSchema,
});
export type Interview = z.infer<typeof interviewSchema>;

/** A question as a writing (or talking) task: the learner's own answer is the model to aim at, when there is one. */
export function interviewTask(question: InterviewQuestion, mine?: string): Task {
  return {
    id: `interview-${question.id}`,
    promptVi: `Trả lời câu hỏi: “${question.en}” (${question.vi})`,
    situation: 'Job interview.',
    required: [],
    models: mine ? [mine, question.model] : [question.model],
    tipVi: question.tipVi,
    points: question.points,
    hints: question.hints,
  };
}

/** The sentences of an answer that become cards, at most `max`. */
export const answerSentences = (text: string, max = 6) =>
  text.split(/\n+/).flatMap(sentences).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 3).slice(0, max);

export function interviewProblems(data: Interview): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const question of data.questions) {
    if (seen.has(question.id)) problems.push(`interview: câu "${question.id}" bị trùng id`);
    seen.add(question.id);
  }
  const nodes = new Set(data.scenario.script.map((node) => node.id));
  for (const node of data.scenario.script) {
    for (const next of [...node.replies.map((r) => r.next), node.any]) {
      if (next && !nodes.has(next)) problems.push(`interview: node "${node.id}" trỏ tới "${next}" không tồn tại`);
    }
  }
  return problems;
}
