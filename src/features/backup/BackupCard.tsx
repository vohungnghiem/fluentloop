import { useRef, useState } from 'react';
import { CircleCheck, Download, Upload } from 'lucide-react';
import { vi } from '../../copy/vi';
import { downloadBackup, lastExport, readBackup } from '../../services/backup';
import { now } from '../../services/clock';
import { Button, Card, Note } from '../../ui/ui';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

/** Export and import of all learning data (settings page). */
export function BackupCard() {
  const [last, setLast] = useState(lastExport());
  const [message, setMessage] = useState<{ tone: 'good' | 'accent'; text: string }>();
  const file = useRef<HTMLInputElement>(null);

  const onFile = async (picked: File | undefined) => {
    if (!picked) return;
    const preview = readBackup(await picked.text());
    if (file.current) file.current.value = '';
    if (!preview.ok) return setMessage({ tone: 'accent', text: vi.backup.importBad });
    if (!confirm(vi.backup.importConfirm(fmt(preview.exportedAt), preview.counts.cards ?? 0))) return;
    await preview.apply();
    setMessage({ tone: 'good', text: `${vi.backup.imported} ${vi.backup.noKey}` });
  };

  return (
    <Card>
      <h2 className="font-semibold">{vi.backup.title}</h2>
      <p className="mt-1 text-sm text-ink-soft">{vi.backup.body}</p>
      <p className="mt-2 text-sm">{last ? vi.backup.last(fmt(last)) : vi.backup.never}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => void downloadBackup(now()).then(() => setLast(lastExport()))}><Download size={16} />{vi.backup.export}</Button>
        <Button onClick={() => file.current?.click()}><Upload size={16} />{vi.backup.import}</Button>
        <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      </div>
      {message && <div className="mt-3"><Note tone={message.tone} icon={message.tone === 'good' ? <CircleCheck size={18} /> : undefined}>{message.text}</Note></div>}
    </Card>
  );
}
