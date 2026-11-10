import { useState } from 'react';
import { Check, Languages } from 'lucide-react';
import { chunkSegments } from '../../core/content/highlight';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { findSnippet, snippetChunks } from '../../services/content';
import type { SessionRow } from '../../services/db';
import { finishReading, nextStep } from '../../services/learning';
import { Chip, PrimaryAction } from '../../ui/ui';
import { SpeakButton } from '../../ui/speech';

/** Labels for known kinds of text; any other kind shows as written (content decides). */
const GENRE: Record<string, string> = {
  standup: 'Standup', slack: 'Slack', email: 'Email', ticket: 'Ticket', pr: 'Pull request', docs: 'Docs', meeting: 'Họp',
  conversation: 'Hội thoại', phone: 'Điện thoại', chat: 'Tin nhắn', notice: 'Thông báo',
};

/** Read a short text; tap a chunk for its meaning; choose which chunks to review from tomorrow. */
export function InputStep({ session }: { session: SessionRow }) {
  const found = findSnippet(session.plan.snippetId);
  const chunks = found ? snippetChunks(found.snippet) : [];
  const [openChunk, setOpenChunk] = useState<string>();
  const [showVi, setShowVi] = useState(false);
  const [chosen, setChosen] = useState(() => new Set(chunks.map((chunk) => chunk.id)));

  const done = () => {
    if (!found) return void nextStep(session.id, now(), 'input');
    void finishReading(session.id, found.snippet.id, found.unit.id, [...chosen], now()).then(() =>
      nextStep(session.id, now()),
    );
  };
  if (!found) return <PrimaryAction label={vi.session.next} onClick={done} />;
  const { snippet } = found;
  const open = chunks.find((chunk) => chunk.id === openChunk);

  return (
    <section className="flex flex-1 flex-col pt-8">
      <h1 className="text-lg font-semibold">{vi.input.title}</h1>
      <p className="mt-1 text-sm text-ink-soft">{vi.input.instruction}</p>

      <article className="mt-5 rounded-2xl border border-line bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <Chip tone="track">{GENRE[snippet.genre] ?? snippet.genre}</Chip>
          {snippet.speaker && <span>{snippet.speaker}</span>}
          <span className="ml-auto">{snippet.cefr}</span>
        </div>
        {snippet.text.map((paragraph, index) => (
          <div key={index} className="mb-3 last:mb-0">
            <p className="text-[21px] leading-[1.6]" lang="en">
              <span className="float-right ml-2"><SpeakButton text={paragraph} size="sm" /></span>
              {chunkSegments(paragraph, chunks).map((segment, i) =>
                segment.chunkId ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setOpenChunk(segment.chunkId === openChunk ? undefined : segment.chunkId)}
                    className={`rounded px-0.5 underline decoration-track decoration-2 underline-offset-4 ${segment.chunkId === openChunk ? 'bg-primary-tint' : 'hover:bg-primary-tint'}`}
                  >
                    {segment.text}
                  </button>
                ) : (
                  <span key={i}>{segment.text}</span>
                ),
              )}
            </p>
            {showVi && <p className="mt-1 text-ink-soft">{snippet.translationVi[index]}</p>}
          </div>
        ))}
        <div aria-live="polite">
          {open ? (
            <div className="mt-4 rounded-xl bg-primary-tint px-4 py-3">
              <div className="font-semibold" lang="en">{open.en}</div>
              <div>{open.vi}</div>
              <div className="mt-1 text-sm text-ink-soft"><span lang="en">{open.example}</span></div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-soft">{vi.input.tapHint}</p>
          )}
        </div>
        <button type="button" onClick={() => setShowVi(!showVi)} className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <Languages size={16} />
          {showVi ? vi.input.hideTranslation : vi.input.showTranslation}
        </button>
      </article>

      <h2 className="mt-6 font-semibold">{vi.input.chunksTitle}</h2>
      <p className="mt-1 text-sm text-ink-soft">{vi.input.chunksHint}</p>
      <ul className="mt-3 space-y-2">
        {chunks.map((chunk) => {
          const on = chosen.has(chunk.id);
          return (
            <li key={chunk.id}>
              <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${on ? 'border-primary bg-surface' : 'border-line bg-paper'}`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() => {
                    const next = new Set(chosen);
                    if (on) next.delete(chunk.id);
                    else next.add(chunk.id);
                    setChosen(next);
                  }}
                />
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-primary bg-primary text-on-primary' : 'border-line'}`}>
                  {on && <Check size={16} strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className="font-medium" lang="en">{chunk.en}</span>
                  <span className="text-ink-soft"> · {chunk.vi}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="flex-1" />
      <PrimaryAction label={vi.session.next} onClick={done} />
    </section>
  );
}
