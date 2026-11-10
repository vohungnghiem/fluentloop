import { PageHeader } from '../../ui/shell';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Check, CircleCheck, PenLine, Sparkles } from 'lucide-react';
import { splitSentences, suggestBlank } from '../../core/capture/split';
import type { Task } from '../../core/content/schema';
import { vi } from '../../copy/vi';
import { helpWithCapture } from '../../services/ai/capture';
import { now } from '../../services/clock';
import { db } from '../../services/db';
import { currentTrack } from '../../services/content';
import { saveCapture } from '../../services/learning';
import { aiReady, useSettings } from '../../services/settings';
import { Button, Card, Note, PrimaryAction, linkButton } from '../../ui/ui';
import { SpeakButton } from '../../ui/speech';

/** A sentence's choice. `aiRange` is the span AI explained: its meaning only fits that span. */
type Pick = { on: boolean; start: number; end: number; vi?: string; chunkVi?: string; aiRange?: [number, number] };

const meaningFits = (pick: Pick) => !!pick.chunkVi && pick.aiRange?.[0] === pick.start && pick.aiRange?.[1] === pick.end;

/** Words of a sentence with their character offsets, so a span of words maps back to text. */
function tokens(sentence: string) {
  return [...sentence.matchAll(/\S+/g)].map((m) => {
    const raw = m[0];
    const lead = raw.match(/^[^A-Za-z0-9]*/)![0].length;
    const core = raw.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
    return { raw, from: m.index! + lead, to: m.index! + lead + core.length };
  });
}

/** The word range [start, end] covering `phrase` in the sentence, or the first word. */
function rangeOf(sentence: string, phrase: string): [number, number] {
  const at = sentence.toLowerCase().indexOf(phrase.toLowerCase());
  const words = tokens(sentence);
  if (at < 0 || !phrase) return [0, 0];
  const start = Math.max(0, words.findIndex((w) => w.to > at));
  const endIndex = words.findIndex((w) => w.to >= at + phrase.length);
  return [start, endIndex < 0 ? start : endIndex];
}

const answerOf = (sentence: string, pick: Pick) => {
  const words = tokens(sentence);
  return sentence.slice(words[pick.start].from, words[pick.end].to);
};

export function CapturePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const settings = useSettings();
  const [text, setText] = useState(params.get('text') ?? '');
  const [source, setSource] = useState(params.get('src') ?? '');
  const [sentences, setSentences] = useState<string[]>();
  const [picks, setPicks] = useState<Pick[]>([]);
  const [ai, setAi] = useState<'loading' | 'done' | string>();
  const [task, setTask] = useState<Task>();
  const [saved, setSaved] = useState<{ id: string; count: number }>();
  const history = useLiveQuery(() => db.captures.orderBy('at').reverse().limit(20).toArray(), []);
  const bookmarklet = useRef<HTMLAnchorElement>(null);

  const bookmarkletCode = `javascript:(()=>{const t=String(getSelection()).trim();window.open('${location.origin}${import.meta.env.BASE_URL}capture?text='+encodeURIComponent(t)+'&src='+encodeURIComponent(location.href),'_blank')})()`;
  const [copied, setCopied] = useState(false);
  // React refuses javascript: links in JSX, so the bookmarklet's href is set by hand.
  useEffect(() => {
    bookmarklet.current?.setAttribute('href', bookmarkletCode);
  });

  const split = () => {
    const found = splitSentences(text);
    setSentences(found);
    setTask(undefined);
    // One sentence (from the bookmarklet) is chosen already; from a long text the learner picks.
    setPicks(found.map((s) => {
      const [start, end] = rangeOf(s, suggestBlank(s));
      return { on: found.length === 1, start, end };
    }));
    if (found.length > 0 && aiReady(settings)) {
      setAi('loading');
      void helpWithCapture(found.slice(0, 15), now()).then((outcome) => {
        if (!outcome.ok) {
          setAi(outcome.kind === 'off' ? undefined : vi.correct.aiError[outcome.kind as keyof typeof vi.correct.aiError] ?? '');
          return;
        }
        setPicks((current) => current.map((pick, i) => {
          const item = outcome.data.items[i];
          if (!item) return pick;
          const [start, end] = rangeOf(found[i], item.chunk);
          return { ...pick, start, end, vi: item.vi, chunkVi: item.chunkVi, aiRange: [start, end] };
        }));
        setTask(outcome.data.task);
        setAi('done');
      });
    }
  };

  // Bookmarklet: a sentence arrives in the URL, split it straight away.
  const auto = useRef(false);
  useEffect(() => {
    if (!auto.current && params.get('text')) {
      auto.current = true;
      split();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tapWord = (s: number, w: number) =>
    setPicks((current) => current.map((pick, i) => {
      if (i !== s) return pick;
      if (w === pick.start - 1) return { ...pick, on: true, start: w };
      if (w === pick.end + 1) return { ...pick, on: true, end: w };
      return { ...pick, on: true, start: w, end: w };
    }));

  const chosen = useMemo(() => (sentences ?? []).flatMap((s, i) => (picks[i]?.on ? [{ s, pick: picks[i] }] : [])), [sentences, picks]);

  const save = async () => {
    if (!sentences || chosen.length === 0) return;
    const id = await saveCapture(
      text,
      source.trim() || undefined,
      chosen.map(({ s, pick }) => ({ sentence: s, answer: answerOf(s, pick), sentenceVi: pick.vi, meaningVi: meaningFits(pick) ? pick.chunkVi : undefined })),
      task,
      now(),
    );
    setSaved({ id, count: chosen.length });
  };

  const reset = () => {
    setText('');
    setSource('');
    setSentences(undefined);
    setPicks([]);
    setAi(undefined);
    setTask(undefined);
    setSaved(undefined);
    navigate('/capture', { replace: true });
  };

  return (
    <main className="page">
      <PageHeader title={vi.capture.title} />

      {saved ? (
        <section className="mt-6 space-y-4">
          <Note tone="good" icon={<CircleCheck size={18} />}>{vi.capture.saved(saved.count)}</Note>
          {task && (
            <Card>
              <p className="text-sm text-ink-soft">{vi.capture.taskReady}</p>
              <p className="mt-1 text-lg font-medium">{task.promptVi}</p>
              <Link to={`/capture/${saved.id}/write`} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium text-on-primary">
                <PenLine size={18} />{vi.capture.writeNow}
              </Link>
            </Card>
          )}
          <Button onClick={reset}>{vi.capture.another}</Button>
        </section>
      ) : !sentences ? (
        <section className="mt-4 space-y-4">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="font-medium">{vi.capture.why}</p>
            <ol className="mt-3 space-y-2 text-sm">
              {vi.capture.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-paper text-xs font-semibold text-ink ring-1 ring-line">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-3 rounded-xl bg-paper px-3 py-2 text-sm">
              <span className="text-ink-soft">{vi.capture.exampleLabel}</span>{' '}
              <span lang="en">Could you <b className="text-track underline decoration-2 underline-offset-4">double-check</b> the retry logic?</span>
              <span className="text-ink-soft"> → </span>
              <span lang="en">Could you ____ the retry logic?</span>
            </div>
          </div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={8}
            lang="en"
            autoFocus
            placeholder={vi.capture.placeholder}
            className="w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 leading-relaxed outline-none focus:border-primary"
          />
          {!text && currentTrack.captureSample && (
            <Button variant="quiet" onClick={() => { setText(currentTrack.captureSample ?? ''); setSource(vi.capture.sampleSource); }}>{vi.capture.trySample}</Button>
          )}
          <label className="block">
            <span className="text-sm font-medium">{vi.capture.sourceLabel}</span>
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder={vi.capture.sourcePlaceholder} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-primary" />
          </label>
        </section>
      ) : (
        <section className="mt-4 space-y-3">
          {source && <p className="truncate text-sm text-ink-soft">{vi.capture.fromPage} {source}</p>}
          {sentences.length === 0 ? (
            <Note tone="accent">{vi.capture.noSentences}</Note>
          ) : (
            <>
              <h2 className="font-semibold">{vi.capture.chooseTitle(sentences.length)}</h2>
              <p className="text-sm text-ink-soft">{vi.capture.chooseHint}</p>
              {ai === 'loading' && <Note tone="plain" icon={<Sparkles size={18} className="animate-pulse" />}>{vi.capture.aiLoading}</Note>}
              {ai === 'done' && <Note tone="good" icon={<Sparkles size={18} />}>{vi.capture.aiDone}</Note>}
              {ai && ai !== 'loading' && ai !== 'done' && <Note tone="plain">{ai}</Note>}
              <ul className="space-y-2">
                {sentences.map((sentence, s) => {
                  const pick = picks[s];
                  return (
                    <li key={s} className={`rounded-xl border px-3 py-3 ${pick?.on ? 'border-primary bg-surface' : 'border-line bg-paper'}`}>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          aria-label={pick?.on ? 'Bỏ chọn' : 'Chọn'}
                          aria-pressed={pick?.on}
                          onClick={() => setPicks((c) => c.map((p, i) => (i === s ? { ...p, on: !p.on } : p)))}
                          className={`mt-1 flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${pick?.on ? 'border-primary bg-primary text-on-primary' : 'border-line'}`}
                        >
                          {pick?.on && <Check size={16} strokeWidth={3} />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-lg leading-relaxed" lang="en">
                            {tokens(sentence).map((word, w) => {
                              const inBlank = pick && w >= pick.start && w <= pick.end;
                              return (
                                <span key={w}>
                                  <button
                                    type="button"
                                    onClick={() => tapWord(s, w)}
                                    className={`rounded px-0.5 ${inBlank && pick.on ? 'bg-primary-tint text-track underline decoration-2 underline-offset-4' : inBlank ? 'underline decoration-line decoration-2 underline-offset-4' : 'hover:bg-paper'}`}
                                  >
                                    {word.raw}
                                  </button>{' '}
                                </span>
                              );
                            })}
                            <SpeakButton text={sentence} size="sm" />
                          </p>
                          {pick?.vi && <p className="mt-1 text-sm text-ink-soft">{pick.vi}</p>}
                          {pick?.on && meaningFits(pick) && (
                            <p className="mt-1 text-sm"><b lang="en">{answerOf(sentence, pick)}</b>: {pick.chunkVi}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          <Button variant="quiet" onClick={() => setSentences(undefined)}>{vi.produce.edit}</Button>
        </section>
      )}

      {!saved && !sentences && (
        <details className="mt-6 rounded-2xl border border-line bg-surface px-4 py-3">
          <summary className="flex min-h-10 cursor-pointer items-center justify-between font-medium">{vi.capture.bookmarkletTitle}<span className="text-sm font-normal text-ink-soft">▾</span></summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {vi.capture.bookmarkletSteps.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a ref={bookmarklet} onClick={(e) => e.preventDefault()} className="inline-block cursor-grab rounded-xl border-2 border-dashed border-primary px-4 py-2 font-medium text-primary">
              {vi.capture.bookmarklet}
            </a>
            <span className="text-sm text-ink-soft">{vi.capture.bookmarkletDrag}</span>
          </div>
          <p className="mt-4 text-sm text-ink-soft">{vi.capture.bookmarkletManual}</p>
          <Button
            className="mt-2"
            onClick={() => {
              void navigator.clipboard?.writeText(bookmarkletCode).then(() => setCopied(true));
            }}
          >
            {copied ? vi.capture.copied : vi.capture.copyCode}
          </Button>
          <p className="mt-3 text-xs text-ink-soft">{vi.capture.bookmarkletNote}</p>
        </details>
      )}

      {!saved && !sentences && history && history.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold">{vi.capture.history}</h2>
          <ul className="mt-2 divide-y divide-line">
            {history.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate" lang="en">{c.source || c.text.slice(0, 80)}</span>
                <span className="text-ink-soft">{vi.capture.cards(c.cardIds.length)}</span>
                {c.task && (c.taskDone ? (
                  <span className="text-good">{vi.capture.written}</span>
                ) : (
                  <Link to={`/capture/${c.id}/write`} className={linkButton}>{vi.capture.write}</Link>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex-1" />
      {!saved && !sentences && <PrimaryAction label={vi.capture.split} onClick={split} disabled={text.trim() === ''} keys="Ctrl + ↵" />}
      {!saved && sentences && sentences.length > 0 && <PrimaryAction label={vi.capture.save(chosen.length)} onClick={() => void save()} disabled={chosen.length === 0} />}
    </main>
  );
}
