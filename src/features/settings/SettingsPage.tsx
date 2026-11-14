import { PageHeader } from '../../ui/shell';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { Briefcase, CalendarCheck, ChevronDown, CircleCheck, ClipboardPaste, CloudUpload, Eye, EyeOff, HardDriveDownload, Mic, SlidersHorizontal, Sparkles, Trash2 } from 'lucide-react';
import { vi } from '../../copy/vi';
import { aiCallsToday, testConnection } from '../../services/ai/correct';
import type { AiErrorKind } from '../../services/ai/providers';
import { now } from '../../services/clock';
import { saveSettings, useSettings, type AiProvider } from '../../services/settings';
import { Button, Card, Chip, Choice, Field, NavList, NavRow, Note, Section, inputClass } from '../../ui/ui';
import { DeleteData } from './DeleteData';
import { aiReady } from '../../services/settings';
import { useSync } from '../../services/sync/sync';
import { getPlan } from '../../services/plan';
import { planWeek } from '../../core/plan/plan';
import { dayKey } from '../../core/date';
import { BackupCard } from '../backup/BackupCard';
import { SyncCard } from '../sync/SyncCard';
import { TrackPicker } from './TrackPicker';
import { library } from '../../services/content';
import { PlanSettings } from './PlanSettings';
import { KeyQr } from './KeyQr';
import { cleanKey, keyLooksRight, maskKey, takeKeyFromLink, type KeyProvider } from '../../services/keyTransfer';

const FIELDS = {
  gemini: { key: 'geminiKey', model: 'geminiModel' },
  openai: { key: 'openaiKey', model: 'openaiModel' },
  openrouter: { key: 'openrouterKey', model: 'openrouterModel' },
  compatible: { key: 'compatKey', model: 'compatModel' },
} as const;

const PROVIDERS = ['none', 'gemini', 'openai', 'openrouter', 'compatible'] as const;

/** Settings: AI is optional and bring-your-own-key; the key stays in this browser. */
export function SettingsPage() {
  const settings = useSettings();
  const sync = useSync();
  const plan = useLiveQuery(getPlan);
  // Opened from a badge (AI, sync): straight to that part, and back to where the learner was.
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  useEffect(() => {
    const id = location.hash.slice(1);
    if (!(id in vi.settings.sections)) return;
    // After the app's own scroll-to-top on a new screen.
    const timer = setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 50);
    return () => clearTimeout(timer);
  }, [location.hash]);
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<'running' | { ok: true } | { ok: false; kind: AiErrorKind }>();
  const used = useLiveQuery(() => aiCallsToday(now()), [], 0);
  const provider = settings.aiProvider === 'fake' ? 'none' : settings.aiProvider;
  const keyField = provider === 'none' ? 'openrouterKey' : FIELDS[provider].key;
  const modelField = provider === 'none' ? 'openrouterModel' : FIELDS[provider].model;
  const keyPage = { gemini: 'aistudio.google.com/apikey', openai: 'platform.openai.com/api-keys', openrouter: 'openrouter.ai/keys', compatible: '', none: '' }[provider];
  const placeholder = { gemini: 'AIza…', openai: 'sk-…', openrouter: 'sk-or-…', compatible: '', none: '' }[provider];

  // A key handed over by QR code from another device: ask before keeping it.
  const [received, setReceived] = useState(takeKeyFromLink);
  const [pasteNote, setPasteNote] = useState<string>();
  /** Save a key (cleaned) and, when it looks right, try it straight away. */
  const keepKey = (p: KeyProvider, raw: string, baseUrl?: string) => {
    const key = cleanKey(raw);
    const next = { aiProvider: p, [FIELDS[p].key]: key, ...(baseUrl ? { compatBaseUrl: baseUrl } : {}) } as const;
    saveSettings(next);
    const looksRight = !!key && keyLooksRight(p, key);
    setPasteNote(key && !looksRight ? vi.settings.keyShape(vi.settings.providers[p]) : undefined);
    if (looksRight) {
      setTest('running');
      void testConnection({ ...settings, ...next }).then(setTest);
    } else setTest(undefined);
  };
  const paste = async () => {
    if (provider === 'none') return;
    try {
      keepKey(provider, await navigator.clipboard.readText());
    } catch {
      setPasteNote(vi.settings.pasteBlocked);
    }
  };

  const choose = (next: AiProvider) => {
    saveSettings({ aiProvider: next });
    setTest(undefined);
  };

  const needsModel = provider === 'compatible' && !settings.compatModel.trim();
  const needsUrl = provider === 'compatible' && !settings.compatBaseUrl.trim();
  const canTest = provider !== 'none' && !!settings[keyField].trim() && !needsModel && !needsUrl && test !== 'running';
  const runTest = () => {
    setTest('running');
    void testConnection(settings).then(setTest);
  };

  return (
    <main className="page">
      <PageHeader title={vi.settings.title} look={{ tone: 'produce', icon: SlidersHorizontal }} back={{ to: from ?? '/', label: vi.micCheck.back }} />
      <JumpNav />

      <Section id="plan" tone="wrap" icon={CalendarCheck} {...sectionText('plan')} status={plan && <Chip>{vi.plan.weekOf(Math.min(planWeek(plan.startDay, dayKey(now())).week, 16), 16)}</Chip>}>
        <PlanSettings />
      </Section>

      {library.tracks.length > 1 && (
        <Section id="track" tone="input" icon={Briefcase} title={vi.settings.sections.track.title} detail={`${vi.settings.sections.track.detail} ${vi.settings.trackBody}`}>
          <TrackPicker />
        </Section>
      )}

      <Section id="ai" tone="review" icon={Sparkles} {...sectionText('ai')} status={<OnOff on={aiReady(settings)} />}>
        <Card className="space-y-4">
          {received && (
            <div className="rounded-xl border-2 border-primary p-4">
              <p className="font-medium">{vi.settings.received.title(vi.settings.providers[received.provider])}</p>
              <p className="mt-1 text-sm text-ink-soft">{vi.settings.received.body(maskKey(received.key))}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="primary" onClick={() => { keepKey(received.provider, received.key, received.baseUrl); setReceived(undefined); }}>{vi.settings.received.save}</Button>
                <Button onClick={() => setReceived(undefined)}>{vi.settings.received.cancel}</Button>
              </div>
            </div>
          )}
          {settings.aiProvider === 'fake' && <Note tone="accent">{vi.settings.fakeOn}</Note>}

          <Field label={vi.settings.provider}>
            <Choice value={provider} options={PROVIDERS.map((p) => ({ value: p, label: vi.settings.providers[p] }))} onChange={choose} />
          </Field>

          {provider !== 'none' && (
            <>
              {provider === 'compatible' && (
                <Field label={vi.settings.baseUrl} hint={vi.settings.baseUrlHint}>
                  <input
                    value={settings.compatBaseUrl}
                    onChange={(event) => { saveSettings({ compatBaseUrl: event.target.value }); setTest(undefined); }}
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="https://proxy.example.com/v1"
                    className={`${inputClass} font-mono text-sm`}
                  />
                </Field>
              )}

              <Field
                label={vi.settings.key}
                hint={keyPage && (
                  <>
                    {vi.settings.getKey}{' '}
                    <a className="text-primary hover:underline" target="_blank" rel="noreferrer" href={`https://${keyPage}`}>{keyPage}</a>
                    {provider === 'openai' && <> · {vi.settings.openaiPaidShort}</>}
                  </>
                )}
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={settings[keyField]}
                      onChange={(event) => { saveSettings({ [keyField]: event.target.value }); setTest(undefined); setPasteNote(undefined); }}
                      onBlur={(event) => event.target.value && event.target.value !== cleanKey(event.target.value) && keepKey(provider, event.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      className={`${inputClass} pr-11 font-mono text-sm`}
                      placeholder={placeholder}
                    />
                    <button type="button" onClick={() => setShowKey(!showKey)} className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center text-ink-soft" aria-label={vi.settings.showKey}>
                      {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <Button className="shrink-0" onClick={() => void paste()}><ClipboardPaste size={16} />{vi.settings.paste}</Button>
                </div>
              </Field>
              {pasteNote && <Note tone="accent">{pasteNote}</Note>}

              {provider === 'compatible' && (
                <Field label={vi.settings.model}>
                  <input value={settings.compatModel} onChange={(event) => saveSettings({ compatModel: event.target.value })} spellCheck={false} placeholder="gpt-4o-mini, deepseek-chat…" className={`${inputClass} font-mono text-sm`} />
                </Field>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Button variant="primary" disabled={!canTest} onClick={runTest}>{test === 'running' ? vi.settings.testing : vi.settings.test}</Button>
                {test && test !== 'running' && (test.ok ? (
                  <span className="inline-flex items-center gap-1 text-good"><CircleCheck size={16} />{vi.settings.testOk}</span>
                ) : (
                  <span className="text-sm text-accent-ink">{vi.correct.aiError[test.kind]}{provider === 'compatible' && test.kind === 'offline' && <span className="mt-1 block">{vi.settings.baseUrlCors}</span>}</span>
                ))}
              </div>

              <div className="hidden sm:block"><KeyQr provider={provider} apiKey={settings[keyField].trim()} baseUrl={provider === 'compatible' ? settings.compatBaseUrl : undefined} /></div>

              <details className="group rounded-xl border border-line">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  {vi.settings.advanced}
                  <ChevronDown size={16} className="text-ink-soft transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-4 border-t border-line p-3">
                  {provider !== 'compatible' && (
                    <Field label={vi.settings.model}>
                      <input value={settings[modelField]} onChange={(event) => saveSettings({ [modelField]: event.target.value })} spellCheck={false} className={`${inputClass} font-mono text-sm`} />
                    </Field>
                  )}
                  <Field label={vi.settings.limit} hint={vi.settings.usedToday(used)}>
                    <input type="number" min={1} max={500} value={settings.aiDailyLimit} onChange={(event) => saveSettings({ aiDailyLimit: Math.max(1, Number(event.target.value) || 1) })} className={`${inputClass} w-28`} />
                  </Field>
                  <Button onClick={() => { if (confirm(vi.settings.removeKeyConfirm)) saveSettings({ [keyField]: '' }); }}>{vi.settings.removeKey}</Button>
                </div>
              </details>
            </>
          )}
          <p className="text-xs text-ink-soft">{vi.settings.privacy}</p>
        </Card>
      </Section>

      <Section id="sync" tone="produce" icon={CloudUpload} {...sectionText('sync')} status={<OnOff on={sync.on} />}>
        <SyncCard />
      </Section>

      <Section id="backup" tone="fix" icon={HardDriveDownload} {...sectionText('backup')}>
        <BackupCard />
      </Section>

      <Section id="other" tone="shadow" icon={Mic} {...sectionText('other')}>
        <NavList>
          <NavRow to="/mic-check" look={{ tone: 'shadow', icon: Mic }} title={vi.micCheck.link} />
        </NavList>
      </Section>

      <div className="mt-4 border-t border-line pt-8">
        <Section id="data" icon={Trash2} {...sectionText('data')}>
          <DeleteData />
        </Section>
      </div>
    </main>
  );
}

type SectionId = keyof typeof vi.settings.sections;
const sectionText = (id: SectionId) => ({ title: vi.settings.sections[id].title, detail: vi.settings.sections[id].detail });

function OnOff({ on }: { on: boolean }) {
  return <Chip tone={on ? 'good' : 'plain'}>{on ? vi.settings.on : vi.settings.off}</Chip>;
}

/** Chips to jump to a part of this long page; stays at the top while scrolling. */
function JumpNav() {
  const ids = (Object.keys(vi.settings.sections) as SectionId[]).filter((id) => id !== 'track' || library.tracks.length > 1);
  return (
    <nav aria-label={vi.settings.jump} className="sticky top-0 z-10 -mx-4 -my-2 border-b border-line/60 bg-paper/95 px-4 py-2 backdrop-blur">
      <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ids.map((id) => (
          <li key={id} className="shrink-0">
            <button
              type="button"
              onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={`min-h-9 rounded-full border px-3 text-sm font-medium whitespace-nowrap transition hover:border-primary ${id === 'data' ? 'border-line text-danger' : 'border-line bg-surface text-ink'}`}
            >
              {vi.settings.sections[id].short}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
