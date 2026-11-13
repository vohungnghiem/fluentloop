import { useEffect, useState } from 'react';
import qrcode from 'qrcode-generator';
import { QrCode } from 'lucide-react';
import { vi } from '../copy/vi';
import { Button } from './ui';

const SHOW_SECONDS = 60;

/** On the computer: a button that shows a QR code of a secret link for a minute, then hides it. */
export function QrReveal({ link, label, how }: { link: string; label: string; how: string }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  useEffect(() => setLeft(0), [link]);

  if (left <= 0)
    return (
      <Button onClick={() => setLeft(SHOW_SECONDS)} disabled={!link}>
        <QrCode size={16} />{label}
      </Button>
    );

  const qr = qrcode(0, 'M');
  qr.addData(link);
  qr.make();
  return (
    <div className="rounded-xl border border-line bg-surface p-4 text-center">
      <div className="mx-auto w-56 rounded-lg bg-white p-2 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }) }} />
      <p className="mt-3 text-sm">{how}</p>
      <p className="mt-1 text-xs text-ink-soft">{vi.settings.qr.hides(left)}</p>
      <Button className="mt-3" onClick={() => setLeft(0)}>{vi.settings.qr.hide}</Button>
    </div>
  );
}
