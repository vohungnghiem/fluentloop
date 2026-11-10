import { useRef, useState } from 'react';
import { CircleCheck, Download, Share2, Upload } from 'lucide-react';
import { vi } from '../../copy/vi';
import { downloadBackup, lastExport, readBackup, shareBackup, shareSupported } from '../../services/backup';
import { now } from '../../services/clock';
import { Button, Card, Note } from '../../ui/ui';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

/** Export and import of all learning data (settings page): share sheet on phones, file and drag-and-drop on computers. */
export function BackupCard() {
  const [last, setLast] = useState(lastExport());
  const [message, setMessage] = useState<{ tone: 'good' | 'accent'; text: string }>();
  const [dragging, setDragging] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const canShare = shareSupported();

  const onFile = async (picked: File | undefined) => {
    if (!picked) return;
    const preview = readBackup(await picked.text());
    if (file.current) file.current.value = '';
    if (!preview.ok) return setMessage({ tone: 'accent', text: vi.backup.importBad });
    if (!confirm(vi.backup.importConfirm(fmt(preview.exportedAt), preview.counts.cards ?? 0))) return;
    await preview.apply();
    setMessage({ tone: 'good', text: `${vi.backup.imported} ${vi.backup.noKey}` });
  };

  const onShare = async () => {
    if (await shareBackup(now())) {
      setLast(lastExport());
      setMessage({ tone: 'good', text: vi.backup.shared });
    }
  };

  return (
    <Card>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void onFile(e.dataTransfer.files?.[0]);
        }}
        className=""
      >
        <p className="text-sm text-ink-soft">{vi.backup.body}</p>
        <p className="mt-2 text-sm">{last ? vi.backup.last(fmt(last)) : vi.backup.never}</p>

        <h3 className="mt-5 text-sm font-semibold">{vi.backup.sendTitle}</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {canShare && <Button variant="primary" className="w-full" onClick={() => void onShare()}><Share2 size={16} />{vi.backup.share}</Button>}
          <Button variant={canShare ? 'secondary' : 'primary'} className="w-full" onClick={() => void downloadBackup(now()).then(() => setLast(lastExport()))}><Download size={16} />{vi.backup.export}</Button>
        </div>
        <p className="mt-2 text-sm text-ink-soft">{canShare ? vi.backup.sendHintShare : vi.backup.sendHintFile}</p>

        <h3 className="mt-5 text-sm font-semibold">{vi.backup.receiveTitle}</h3>
        <button
          type="button"
          onClick={() => file.current?.click()}
          className={`mt-2 flex min-h-20 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-3 text-center transition ${dragging ? 'border-primary bg-primary-tint' : 'border-line hover:border-primary'}`}
        >
          <span className="inline-flex items-center gap-2 font-medium"><Upload size={18} />{vi.backup.import}</span>
          <span className="text-sm text-ink-soft">{vi.backup.receiveHint}</span>
        </button>
        <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        {message && <div className="mt-3"><Note tone={message.tone} icon={message.tone === 'good' ? <CircleCheck size={18} /> : undefined}>{message.text}</Note></div>}
      </div>
    </Card>
  );
}
