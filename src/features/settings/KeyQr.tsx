import { vi } from '../../copy/vi';
import { transferLink, type KeyProvider } from '../../services/keyTransfer';
import { QrReveal } from '../../ui/QrReveal';

/** On the computer: a QR code that opens the app on the phone with this key filled in. Hides itself. */
export function KeyQr({ provider, apiKey, baseUrl }: { provider: KeyProvider; apiKey: string; baseUrl?: string }) {
  return <QrReveal link={apiKey ? transferLink(provider, apiKey, baseUrl) : ''} label={vi.settings.qr.show} how={vi.settings.qr.how} />;
}
