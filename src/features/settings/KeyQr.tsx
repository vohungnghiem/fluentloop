import { useEffect, useState } from 'react';
import qrcode from 'qrcode-generator';
import { QrCode } from 'lucide-react';
import { vi } from '../../copy/vi';
import { transferLink, type KeyProvider } from '../../services/keyTransfer';
import { Button } from '../../ui/ui';

const SHOW_SECONDS = 60;

/** On the computer: a QR code that opens the app on the phone with this key filled in. Hides itself. */
export function KeyQr({ provider, apiKey, baseUrl }: { provider: KeyProvider; apiKey: string; baseUrl?: string }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  useEffect(() => setLeft(0), [provider, apiKey, baseUrl]);

  if (left <= 0)
    return (
      <Button onClick={() => setLeft(SHOW_SECONDS)} disabled={!apiKey}>
        <QrCode size={16} />{vi.settings.qr.show}
      </Button>
    );

  const qr = qrcode(0, 'M');
  qr.addData(transferLink(provider, apiKey, baseUrl));
  qr.make();
  return (
    <div className="rounded-xl border border-line bg-surface p-4 text-center">
      <div className="mx-auto w-56 rounded-lg bg-white p-2 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }) }} />
      <p className="mt-3 text-sm">{vi.settings.qr.how}</p>
      <p className="mt-1 text-xs text-ink-soft">{vi.settings.qr.hides(left)}</p>
      <Button className="mt-3" onClick={() => setLeft(0)}>{vi.settings.qr.hide}</Button>
    </div>
  );
}
