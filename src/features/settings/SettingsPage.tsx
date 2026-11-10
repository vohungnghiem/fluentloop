import { PageHeader } from '../../ui/shell';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CircleCheck, Eye, EyeOff, KeyRound, Mic } from 'lucide-react';
import { vi } from '../../copy/vi';
import { aiCallsToday, testConnection } from '../../services/ai/correct';
import type { AiErrorKind } from '../../services/ai/providers';
import { now } from '../../services/clock';
import { saveSettings, useSettings, type AiProvider } from '../../services/settings';
import { Button, Card, NavList, NavRow, Note } from '../../ui/ui';
import { BackupCard } from '../backup/BackupCard';
import { TrackPicker } from './TrackPicker';

const field = 'mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-primary';

/** Settings: AI is optional and bring-your-own-key; the key stays in this browser. */
export function SettingsPage() {
  const settings = useSettings();
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<'running' | { ok: true } | { ok: false; kind: AiErrorKind }>();
  const used = useLiveQuery(() => aiCallsToday(now()), [], 0);
  const provider = settings.aiProvider === 'fake' ? 'none' : settings.aiProvider;
  const keyField = provider === 'gemini' ? 'geminiKey' : provider === 'openai' ? 'openaiKey' : 'openrouterKey';
  const modelField = provider === 'gemini' ? 'geminiModel' : provider === 'openai' ? 'openaiModel' : 'openrouterModel';
  const keyPage = { gemini: 'aistudio.google.com/apikey', openai: 'platform.openai.com/api-keys', openrouter: 'openrouter.ai/keys', none: '' }[provider];
  const placeholder = { gemini: 'AIza…', openai: 'sk-…', openrouter: 'sk-or-…', none: '' }[provider];

  const choose = (next: AiProvider) => {
    saveSettings({ aiProvider: next });
    setTest(undefined);
  };

  return (
    <main className="page">
      <PageHeader title={vi.settings.title} back={{ to: '/', label: vi.micCheck.back }} />

      <Card>
        <h2 className="font-semibold">{vi.settings.track}</h2>
        <p className="mt-1 text-sm text-ink-soft">{vi.settings.trackBody}</p>
        <div className="mt-3"><TrackPicker /></div>
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 font-semibold"><KeyRound size={18} />{vi.settings.aiTitle}</h2>
        <p className="mt-1 text-sm text-ink-soft">{vi.settings.aiBody}</p>
        {settings.aiProvider === 'fake' && <div className="mt-3"><Note tone="accent">{vi.settings.fakeOn}</Note></div>}
        <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup">
          {(['none', 'gemini', 'openai', 'openrouter'] as const).map((option) => (
            <Button key={option} role="radio" aria-checked={provider === option} variant={provider === option ? 'primary' : 'secondary'} onClick={() => choose(option)}>
              {vi.settings.providers[option]}
            </Button>
          ))}
        </div>

        {provider !== 'none' && (
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium">{vi.settings.key}</span>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={settings[keyField]}
                  onChange={(event) => { saveSettings({ [keyField]: event.target.value }); setTest(undefined); }}
                  autoComplete="off"
                  spellCheck={false}
                  className={`${field} pr-11 font-mono text-sm`}
                  placeholder={placeholder}
                />
                <button type="button" onClick={() => setShowKey(!showKey)} className="absolute top-1/2 right-2 mt-0.5 -translate-y-1/2 p-1.5 text-ink-soft" aria-label={vi.settings.showKey}>
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span className="mt-1 block text-sm text-ink-soft">
                {vi.settings.getKey}{' '}
                <a className="text-primary hover:underline" target="_blank" rel="noreferrer" href={`https://${keyPage}`}>
                  {keyPage}
                </a>
                {provider === 'openai' && <span className="mt-1 block">{vi.settings.openaiPaid}</span>}
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-medium">{vi.settings.model}</span>
              <input value={settings[modelField]} onChange={(event) => saveSettings({ [modelField]: event.target.value })} spellCheck={false} className={`${field} font-mono text-sm`} />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={!settings[keyField].trim() || test === 'running'}
                onClick={() => {
                  setTest('running');
                  void testConnection(settings).then(setTest);
                }}
              >
                {test === 'running' ? vi.settings.testing : vi.settings.test}
              </Button>
              {test && test !== 'running' && (test.ok ? (
                <span className="inline-flex items-center gap-1 text-good"><CircleCheck size={16} />{vi.settings.testOk}</span>
              ) : (
                <span className="text-accent-ink">{vi.correct.aiError[test.kind]}</span>
              ))}
            </div>
            <label className="block">
              <span className="text-sm font-medium">{vi.settings.limit}</span>
              <input type="number" min={1} max={500} value={settings.aiDailyLimit} onChange={(event) => saveSettings({ aiDailyLimit: Math.max(1, Number(event.target.value) || 1) })} className={`${field} w-28`} />
              <span className="mt-1 block text-sm text-ink-soft">{vi.settings.usedToday(used)}</span>
            </label>
            <Button variant="quiet" onClick={() => saveSettings({ [keyField]: '' })}>{vi.settings.removeKey}</Button>
          </div>
        )}
        <p className="mt-4 text-xs text-ink-soft">{vi.settings.privacy}</p>
      </Card>

      <BackupCard />

      <NavList>
        <NavRow to="/mic-check" icon={<Mic size={18} />} title={vi.micCheck.link} />
      </NavList>
    </main>
  );
}
