import { db, type AttemptRow, type TalkRow } from './db';
import { findSnippet, findTask } from './content';
import { findQuestion } from './interview';
import { interviewTask } from '../core/content/interview';
import { groupWritings, writingKind, type WritingGroup } from '../core/progress/writing';

/** The learner's writing, grouped by task, each group with what it was about and where to do it again. */

export interface WritingTopic {
  /** The task as asked, in Vietnamese. */
  title?: string;
  /** The lesson or section it belongs to. */
  where?: string;
  /** Where to write (or say) it again. */
  again?: string;
}

export interface Writings {
  groups: Array<WritingGroup<AttemptRow> & WritingTopic>;
  /** Talks by id: a spoken answer can be heard again next to what it was heard as. */
  talks: Map<string, TalkRow>;
}

const questionOf = (taskId: string) => (taskId.startsWith('interview-') ? findQuestion(taskId.slice('interview-'.length)) : undefined);

export async function loadWritings(): Promise<Writings> {
  const [attempts, talkRows, captures] = await Promise.all([db.attempts.toArray(), db.talks.toArray(), db.captures.toArray()]);
  const talks = new Map(talkRows.map((t) => [t.id, t]));
  const captureById = new Map(captures.map((c) => [c.id, c]));

  const topic = (group: WritingGroup<AttemptRow>): WritingTopic => {
    const { last, taskId } = group;
    const question = questionOf(taskId);
    const asked = [...group.attempts].reverse().find((a) => a.promptVi)?.promptVi;
    const [, ref = ''] = last.snippetId.split(':');
    switch (writingKind(last.snippetId)) {
      case 'lesson': {
        const found = findSnippet(last.snippetId);
        return { title: asked ?? findTask(taskId)?.promptVi, where: found?.snippet.titleVi, again: found ? `/lesson/${found.snippet.id}` : undefined };
      }
      case 'interview':
        return { title: asked ?? (question && interviewTask(question).promptVi), again: question ? `/interview/${question.id}` : undefined };
      case 'talk':
        return {
          title: asked ?? talks.get(ref)?.topic ?? findTask(taskId)?.promptVi,
          again: question ? `/speak?interview=${question.id}` : `/speak?task=${encodeURIComponent(taskId)}`,
        };
      case 'capture':
        return { title: asked ?? captureById.get(ref)?.task?.promptVi };
    }
  };

  return { groups: groupWritings(attempts).map((group) => ({ ...group, ...topic(group) })), talks };
}
