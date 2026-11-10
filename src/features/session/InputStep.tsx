import { useState } from 'react';
import { Check } from 'lucide-react';
import { SnippetReader } from '../lesson/SnippetReader';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { findSnippet, snippetChunks } from '../../services/content';
import type { SessionRow } from '../../services/db';
import { finishReading, nextStep } from '../../services/learning';
import { PrimaryAction } from '../../ui/ui';


/** Read a short text; tap a chunk for its meaning; choose which chunks to review from tomorrow. */
export function InputStep({ session }: { session: SessionRow }) {
  const found = findSnippet(session.plan.snippetId);
  const chunks = found ? snippetChunks(found.snippet) : [];
  const [chosen, setChosen] = useState(() => new Set(chunks.map((chunk) => chunk.id)));

  const done = () => {
    if (!found) return void nextStep(session.id, now(), 'input');
    void finishReading(session.id, found.snippet.id, found.unit.id, [...chosen], now()).then(() =>
      nextStep(session.id, now()),
    );
  };
  if (!found) return <PrimaryAction label={vi.session.next} onClick={done} />;
  const { snippet } = found;

  return (
    <section className="flex flex-1 flex-col pt-8">
      <h1 className="text-lg font-semibold">{vi.input.title}</h1>
      <p className="mt-1 text-sm text-ink-soft">{vi.input.instruction}</p>

      <SnippetReader snippet={snippet} className="mt-5" />

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
