import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { CircleCheck, Download, Trash2 } from 'lucide-react';
import { vi } from '../../copy/vi';
import { downloadBackup } from '../../services/backup';
import { now } from '../../services/clock';
import { hasLearningData, learningCounts, resetLearningData } from '../../services/reset';
import { useSync } from '../../services/sync/sync';
import { Button, Card, Note } from '../../ui/ui';

/**
 * Deleting what was learnt, to start over. Two steps: the first only opens the confirmation, which
 * offers a backup and needs a tick before the red button works. Then the welcome flow starts again.
 */
export function DeleteData() {
  const navigate = useNavigate();
  const sync = useSync();
  const counts = useLiveQuery(learningCounts);
  const [open, setOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [backedUp, setBackedUp] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!counts) return null;
  const any = hasLearningData(counts);

  const close = () => {
    setOpen(false);
    setUnderstood(false);
  };
  const remove = async () => {
    setBusy(true);
    await resetLearningData(now());
    navigate('/start', { replace: true });
  };

  return (
    <Card className="space-y-3">
      {any ? (
        <p><span className="text-ink-soft">{vi.reset.has}</span> <span className="font-medium">{vi.reset.counts(counts)}</span></p>
      ) : (
        <p className="text-ink-soft">{vi.reset.empty}</p>
      )}
      <p className="text-sm">{vi.reset.deletes}</p>
      <p className="text-sm text-ink-soft">{vi.reset.keeps}</p>

      {!open ? (
        <Button className="w-full text-danger hover:border-danger sm:w-auto" disabled={!any} onClick={() => setOpen(true)}>
          <Trash2 size={16} />{vi.reset.open}
        </Button>
      ) : (
        <div className="rise space-y-4 rounded-xl border-2 border-danger/40 bg-danger-tint p-4">
          <p className="text-lg font-semibold">{vi.reset.confirmTitle}</p>

          <div>
            <p className="text-sm">{vi.reset.backupFirst}</p>
            {backedUp ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-good"><CircleCheck size={16} />{vi.reset.backedUp}</p>
            ) : (
              <Button className="mt-2" onClick={() => void downloadBackup(now()).then(() => setBackedUp(true))}><Download size={16} />{vi.reset.backup}</Button>
            )}
          </div>

          {sync.on && <Note tone="accent">{vi.reset.synced}</Note>}

          <label className="flex cursor-pointer items-start gap-3 rounded-lg py-1">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--danger)]" />
            <span className="text-sm">{vi.reset.understand}</span>
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={close}>{vi.reset.cancel}</Button>
            <Button variant="danger" disabled={!understood || busy} onClick={() => void remove()}>
              <Trash2 size={16} />{busy ? vi.reset.deleting : vi.reset.confirm}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
