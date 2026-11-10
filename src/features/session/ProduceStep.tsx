import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { findSnippet, findTask } from '../../services/content';
import type { SessionRow } from '../../services/db';
import { nextStep } from '../../services/learning';
import { PrimaryAction } from '../../ui/ui';
import { WritingTask } from './WritingTask';

/** The session's Produce step: the snippet's task, written with the chunks just met. */
export function ProduceStep({ session }: { session: SessionRow }) {
  const found = findSnippet(session.plan.snippetId);
  const task = found ? findTask(found.snippet.task) : undefined;
  const skip = () => void nextStep(session.id, now(), 'produce');
  if (!found || !task) return <PrimaryAction label={vi.session.next} onClick={skip} />;
  return (
    <WritingTask
      task={task}
      sessionId={session.id}
      snippetId={found.snippet.id}
      unitId={found.unit.id}
      onDone={() => nextStep(session.id, now())}
      onSkip={skip}
    />
  );
}
