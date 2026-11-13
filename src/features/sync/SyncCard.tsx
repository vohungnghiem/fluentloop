import { useState } from 'react';
import { CircleCheck, ClipboardPaste, CloudAlert, CloudOff, ExternalLink, LogIn, RefreshCw } from 'lucide-react';
import { vi } from '../../copy/vi';
import { canSignIn, fakeMode } from '../../services/sync/auth';
import { cleanToken, githubToken, syncLink, TOKEN_PAGE } from '../../services/sync/github';
import { connectGithub, startSignIn, stopSync, syncNow, useSync, type SyncState } from '../../services/sync/sync';
import { Button, Card, Field, MoreMenu, Note, inputClass, linkButton } from '../../ui/ui';
import { QrReveal } from '../../ui/QrReveal';

const time = (iso?: string) => iso && new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

/** What the last round did, in one line. */
export function syncStatusText(sync: SyncState): string {
  if (sync.status === 'ok') return vi.sync.status.ok(time(sync.lastSyncedAt));
  if (sync.status === 'needsLogin') return sync.method === 'github' ? vi.sync.status.needsToken : sync.noDrive ? vi.sync.status.noDrive : vi.sync.status.needsLogin;
  return vi.sync.status[sync.status];
}

/** Settings: paste a GitHub token once (the phone gets it by QR code), then everything follows on its own. */
export function SyncCard() {
  const sync = useSync();
  const needsToken = !sync.on || (sync.method === 'github' && sync.status === 'needsLogin');

  if (needsToken) {
    return (
      <Card>
        {!sync.on && <p className="mb-4">{vi.sync.intro}</p>}
        {sync.on && <div className="mb-4"><Note tone="accent" icon={<CloudAlert size={18} />}>{vi.sync.status.needsToken}</Note></div>}
        <TokenForm />
        {!sync.on && canSignIn() && (
          <Button className="mt-4 w-full" onClick={startSignIn}><LogIn size={16} />{vi.sync.google}</Button>
        )}
      </Card>
    );
  }

  const icon = { ok: <CircleCheck size={18} />, syncing: <RefreshCw size={18} className="animate-spin" />, needsLogin: <CloudAlert size={18} />, offline: <CloudOff size={18} />, error: <CloudAlert size={18} />, off: undefined }[sync.status];
  const token = sync.method === 'github' ? githubToken() : undefined;
  return (
    <Card>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-soft">{vi.sync.on[sync.method]}</p>
          <p className="font-medium [overflow-wrap:anywhere]">{sync.email ?? '—'}</p>
        </div>
        <MoreMenu label={vi.sync.more} items={[{ label: vi.sync.stop, onClick: () => confirm(vi.sync.stopConfirm) && stopSync() }]} />
      </div>
      <div className="mt-3">
        <Note tone={sync.status === 'ok' ? 'good' : sync.status === 'syncing' ? 'plain' : 'accent'} icon={icon}>{syncStatusText(sync)}</Note>
      </div>
      {sync.status === 'needsLogin' ? (
        <Button variant="primary" className="mt-3 w-full" onClick={startSignIn}><LogIn size={16} />{vi.sync.signInAgain}</Button>
      ) : (
        <Button className="mt-3 w-full" disabled={sync.status === 'syncing'} onClick={() => void syncNow()}><RefreshCw size={16} />{vi.sync.syncNow}</Button>
      )}
      {token && (
        <div className="mt-3 hidden sm:block">
          <QrReveal link={syncLink(token)} label={vi.sync.qr} how={vi.sync.qrHow} />
        </div>
      )}
      <p className="mt-3 text-xs text-ink-soft">{vi.sync.where[sync.method]} {vi.sync.keyNote}</p>
      {fakeMode() && sync.method === 'google' && <p className="mt-2 text-xs text-accent-ink">{vi.sync.fake}</p>}
    </Card>
  );
}

/** Two steps: open GitHub's pre-filled token page, paste what it shows. */
function TokenForm() {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const connect = async (raw: string) => {
    const token = cleanToken(raw);
    if (!token) return;
    setBusy(true);
    setProblem(undefined);
    const result = await connectGithub(token);
    setBusy(false);
    if (!result.ok) setProblem(vi.sync.tokenError[result.reason]);
  };
  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setValue(cleanToken(text));
      void connect(text);
    } catch {
      setProblem(vi.settings.pasteBlocked);
    }
  };

  return (
    <div className="space-y-4">
      <Field label={vi.sync.step1} hint={vi.sync.step1Hint}>
        <a href={TOKEN_PAGE} target="_blank" rel="noreferrer" className={linkButton}>
          {vi.sync.makeToken}<ExternalLink size={14} />
        </a>
      </Field>
      <Field label={vi.sync.step2} hint={vi.sync.phoneHint}>
        <div className="flex gap-2">
          <input
            type="password"
            value={value}
            onChange={(event) => { setValue(event.target.value); setProblem(undefined); }}
            onKeyDown={(event) => event.key === 'Enter' && void connect(value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="ghp_…"
            className={`${inputClass} min-w-0 flex-1 font-mono text-sm`}
          />
          <Button className="shrink-0" onClick={() => void paste()}><ClipboardPaste size={16} />{vi.settings.paste}</Button>
        </div>
      </Field>
      {problem && <Note tone="accent">{problem}</Note>}
      <Button variant="primary" className="w-full" disabled={busy || !value.trim()} onClick={() => void connect(value)}>
        {busy ? vi.sync.connecting : vi.sync.connect}
      </Button>
    </div>
  );
}
