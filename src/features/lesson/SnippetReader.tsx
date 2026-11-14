import { useState } from 'react';
import { Languages } from 'lucide-react';
import { chunkSegments } from '../../core/content/highlight';
import type { Snippet } from '../../core/content/schema';
import { vi } from '../../copy/vi';
import { snippetChunks } from '../../services/content';
import { Chip, linkButton } from '../../ui/ui';
import { ChunkGloss, SpeakButton } from '../../ui/speech';
import { useSupport } from '../../ui/useSupport';

/** Labels for known kinds of text; any other kind shows as written (content decides). */
const GENRE: Record<string, string> = {
  standup: 'Standup', slack: 'Slack', email: 'Email', ticket: 'Ticket', pr: 'Pull request', docs: 'Docs', meeting: 'Họp',
  conversation: 'Hội thoại', phone: 'Điện thoại', chat: 'Tin nhắn', notice: 'Thông báo',
};

/** A lesson's text: listen per paragraph, tap a chunk for its meaning, show the translation. */
export function SnippetReader({ snippet, className = '' }: { snippet: Snippet; className?: string }) {
  const chunks = snippetChunks(snippet);
  const [openChunk, setOpenChunk] = useState<string>();
  // Open from the start for a learner below B1, until they close it.
  const support = useSupport();
  const [chosenVi, setShowVi] = useState<boolean>();
  const showVi = chosenVi ?? !!support;
  const open = chunks.find((chunk) => chunk.id === openChunk);
  return (
    <article className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>
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
          <div className="mt-4"><ChunkGloss en={open.en} meaning={open.vi} example={open.example} /></div>
        ) : (
          <p className="mt-4 text-sm text-ink-soft">{vi.input.tapHint}</p>
        )}
      </div>
      <button type="button" onClick={() => setShowVi(!showVi)} className={`mt-3 ${linkButton}`}>
        <Languages size={16} />
        {showVi ? vi.input.hideTranslation : vi.input.showTranslation}
      </button>
    </article>
  );
}
