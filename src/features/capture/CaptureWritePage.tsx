import { AiBadge } from '../../ui/AiBadge';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router';
import { PageHeader } from '../../ui/shell';
import { SECTION_LOOK } from '../../ui/tones';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { db } from '../../services/db';
import { WritingTask } from '../session/WritingTask';

/** The writing task AI made from a captured text, outside any session. */
export function CaptureWritePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const capture = useLiveQuery(() => db.captures.get(id), [id]);
  if (capture === undefined) return null;
  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col px-4 pt-6">
      <PageHeader title={vi.capture.writeTitle} look={SECTION_LOOK.capture} back={{ to: '/capture', label: vi.capture.back }}><AiBadge /></PageHeader>
      {capture?.task ? (
        <WritingTask
          task={capture.task}
          snippetId={`capture:${capture.id}`}
          unitId="capture"
          onDone={async () => {
            await db.captures.update(capture.id, { taskDone: true, updatedAt: now().toISOString() });
            navigate('/capture');
          }}
        />
      ) : (
        <p className="mt-6 text-ink-soft">{vi.capture.noSentences}</p>
      )}
    </main>
  );
}
