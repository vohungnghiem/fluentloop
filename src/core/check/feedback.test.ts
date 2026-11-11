import { describe, expect, it } from 'vitest';
import { taskSchema } from '../content/schema';
import { buildFeedback } from './feedback';

const task = taskSchema.parse({
  id: 'task-standup',
  promptVi: 'Viết standup: hôm qua làm gì, hôm nay làm gì.',
  required: [{ label: 'worked on', variants: ['worked on'] }, { label: 'pick up', variants: ['pick up'] }],
  models: ["Yesterday I worked on the search page. Today I'll pick up the next ticket."],
  points: [{ vi: 'Hôm qua làm gì', variants: ['yesterday'] }, { vi: 'Hôm nay sẽ làm gì', variants: ['today'] }, { vi: 'Có bị vướng không' }],
});

describe('buildFeedback', () => {
  it('a half answer is not complete, gets no praise, and still gets a better way to say it', () => {
    const feedback = buildFeedback(task, 'yesterday i worked on the login page,', {
      corrected: 'Yesterday, I worked on the login page,',
      mistakes: [{ wrong: 'yesterday i', right: 'Yesterday, I', label: 'punctuation', vi: 'Viết hoa đầu câu.' }],
      praiseVi: 'Câu rất rõ ràng.',
      upgrades: [{ en: 'Yesterday I wrapped up the login page.', vi: 'Wrapped up: làm xong hẳn.' }],
    });
    expect(feedback.points.map((p) => p.status)).toEqual(['ok', 'missing', 'unknown']);
    expect(feedback.complete).toBe(false);
    expect(feedback.praiseVi).toBeUndefined();
    expect(feedback.mistakes).toHaveLength(1);
    expect(feedback.upgrades).toHaveLength(1);
  });

  it("AI's verdict on a point wins over the rules, with its note", () => {
    const feedback = buildFeedback(task, "Yesterday I worked on login. Today I'll pick up a ticket. No blockers.", {
      corrected: "Yesterday I worked on login. Today I'll pick up a ticket. No blockers.",
      mistakes: [],
      coverage: [{ ok: true }, { ok: true }, { ok: true }],
      praiseVi: 'Đủ ba ý, rất gọn.',
    });
    expect(feedback.complete).toBe(true);
    expect(feedback.praiseVi).toBe('Đủ ba ý, rất gọn.');
    expect(feedback.points.every((p) => p.status === 'ok')).toBe(true);
  });

  it("a rule's mistake is added only when AI did not already cover that piece", () => {
    const text = 'Yesterday I work on a API.';
    const withAi = buildFeedback(task, text, {
      corrected: 'Yesterday I worked on a API.',
      mistakes: [{ wrong: 'I work on', right: 'I worked on', label: 'past-tense', vi: '' }],
    });
    expect(withAi.mistakes.map((m) => m.label)).toEqual(['past-tense', 'article']);
    expect(withAi.corrected).toBe('Yesterday I worked on an API.');
  });

  it('without AI: capitals are caught, no model is passed off as an upgrade, the closest model is known', () => {
    const feedback = buildFeedback(task, 'yesterday i worked on the search page.');
    expect(feedback.mistakes[0]).toMatchObject({ wrong: 'yesterday i', right: 'Yesterday I', label: 'punctuation' });
    expect(feedback.corrected).toBe('Yesterday I worked on the search page.');
    expect(feedback.upgrades).toEqual([]);
    expect(feedback.closestModel).toBe(task.models[0]);
  });
});
