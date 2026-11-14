import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { CircleCheck, Plus, Sparkles, X } from 'lucide-react';
import { vi } from '../../copy/vi';
import { englishFor } from '../../services/ai/phrase';
import { now } from '../../services/clock';
import { aiReady, useSettings } from '../../services/settings';
import { saveRealTalk } from '../../services/talk';
import { PageHeader } from '../../ui/shell';
import { SECTION_LOOK } from '../../ui/tones';
import { Button, Card, Choice, Field, Note, PrimaryAction, inputClass } from '../../ui/ui';
import { useDraft } from '../../ui/useDraft';

const PARTNERS = ['colleague', 'friend', 'club', 'interview', 'other'] as const;
type Partner = (typeof PARTNERS)[number];
const MINUTES = ['5', '10', '15', '30', '60'] as const;

interface Form {
  topic: string;
  partner: Partner;
  minutes: (typeof MINUTES)[number];
  hardVi: string;
  phrases: Array<{ vi: string; en: string; noteVi?: string }>;
}
const EMPTY: Form = { topic: '', partner: 'colleague', minutes: '15', hardVi: '', phrases: [{ vi: '', en: '' }] };

/**
 * After speaking with real people: what it was about, what was hard, and the sentences the learner
 * wanted but could not say. Those (in English, by hand or from AI) become cards; the time counts.
 * The form is a draft until saved, so it can be filled bit by bit.
 */
export function TalkLogPage() {
  const navigate = useNavigate();
  const settings = useSettings();
  const draft = useDraft<Form>('talk-log');
  const [form, setForm] = useState<Form>();
  const [asking, setAsking] = useState<number>();
  const [failed, setFailed] = useState<number>();
  const [saved, setSaved] = useState<number>();
  useEffect(() => {
    if (draft.ready && !form) setForm(draft.saved ?? EMPTY);
  }, [draft.ready]);
  if (!form) return null;

  const change = (patch: Partial<Form>) => {
    const next = { ...form, ...patch };
    setForm(next);
    draft.save(next);
  };
  const phrase = (i: number, patch: Partial<Form['phrases'][number]>) =>
    change({ phrases: form.phrases.map((p, k) => (k === i ? { ...p, ...patch } : p)) });

  const suggest = async (i: number) => {
    setAsking(i);
    setFailed(undefined);
    const outcome = await englishFor(form.phrases[i].vi, now());
    setAsking(undefined);
    if (outcome.ok) phrase(i, { en: outcome.data.en, noteVi: outcome.data.noteVi || undefined });
    else setFailed(i);
  };

  const save = async () => {
    const cards = await saveRealTalk(
      { topic: form.topic, partner: vi.talkLog.partners[form.partner], minutes: Number(form.minutes), hardVi: form.hardVi, phrases: form.phrases },
      now(),
    );
    draft.clear();
    setSaved(cards);
    window.scrollTo(0, 0);
  };

  if (saved !== undefined) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col space-y-5 px-4 pt-6">
        <PageHeader title={vi.talkLog.title} look={SECTION_LOOK.talkLog} back={{ to: '/roleplay', label: vi.talk.back }} />
        <Note tone="good" icon={<CircleCheck size={18} />}>{vi.talkLog.saved(Number(form.minutes), saved)}</Note>
        <div className="flex-1" />
        <PrimaryAction label={vi.talkLog.done} onClick={() => navigate('/', { replace: true })} />
      </main>
    );
  }

  const withAi = aiReady(settings);
  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col space-y-5 px-4 pt-6">
      <PageHeader title={vi.talkLog.title} look={SECTION_LOOK.talkLog} back={{ to: '/roleplay', label: vi.talk.back }} />
      <p className="-mt-2">{vi.talkLog.intro}</p>

      <Card className="space-y-4">
        <Field label={vi.talkLog.topic}>
          <input value={form.topic} onChange={(e) => change({ topic: e.target.value })} placeholder={vi.talkLog.topicPlaceholder} className={inputClass} />
        </Field>
        <div>
          <p className="mb-1 text-sm font-medium">{vi.talkLog.partner}</p>
          <Choice value={form.partner} onChange={(partner) => change({ partner })} options={PARTNERS.map((p) => ({ value: p, label: vi.talkLog.partners[p] }))} />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">{vi.talkLog.minutes}</p>
          <Choice value={form.minutes} onChange={(minutes) => change({ minutes })} options={MINUTES.map((m) => ({ value: m, label: vi.plan.minutes(Number(m)) }))} />
        </div>
        <Field label={vi.talkLog.hard}>
          <textarea value={form.hardVi} onChange={(e) => change({ hardVi: e.target.value })} rows={3} placeholder={vi.talkLog.hardPlaceholder} className={`${inputClass} py-2`} />
        </Field>
      </Card>

      <Card>
        <h2 className="font-semibold">{vi.talkLog.phrasesTitle}</h2>
        <p className="mt-1 text-sm text-ink-soft">{withAi ? vi.talkLog.phrasesBodyAi : vi.talkLog.phrasesBody}</p>
        <ol className="mt-3 space-y-4">
          {form.phrases.map((p, i) => (
            <li key={i} className="space-y-2 rounded-xl bg-paper p-3 ring-1 ring-line">
              <div className="flex items-center gap-2">
                <input value={p.vi} onChange={(e) => phrase(i, { vi: e.target.value })} placeholder={vi.talkLog.viPlaceholder} className={inputClass} />
                {form.phrases.length > 1 && (
                  <button type="button" onClick={() => change({ phrases: form.phrases.filter((_, k) => k !== i) })} className="flex size-10 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface" aria-label={vi.talkLog.remove} title={vi.talkLog.remove}><X size={18} /></button>
                )}
              </div>
              <input value={p.en} onChange={(e) => phrase(i, { en: e.target.value, noteVi: undefined })} lang="en" placeholder={vi.talkLog.enPlaceholder} className={inputClass} />
              {p.noteVi && <p className="text-sm text-ink-soft">{p.noteVi}</p>}
              {withAi && p.vi.trim() && !p.en.trim() && (
                <Button onClick={() => void suggest(i)} disabled={asking !== undefined}>
                  <Sparkles size={16} className={asking === i ? 'animate-pulse' : ''} />{asking === i ? vi.talkLog.asking : vi.talkLog.suggest}
                </Button>
              )}
              {failed === i && <p className="text-sm text-accent-ink">{vi.talkLog.aiFailed}</p>}
            </li>
          ))}
        </ol>
        <div className="mt-3">
          <Button variant="quiet" onClick={() => change({ phrases: [...form.phrases, { vi: '', en: '' }] })}><Plus size={16} />{vi.talkLog.add}</Button>
        </div>
      </Card>

      <div className="flex-1" />
      <PrimaryAction label={vi.talkLog.save} disabled={!form.topic.trim()} onClick={() => void save()} />
    </main>
  );
}
