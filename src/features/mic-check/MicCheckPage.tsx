import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CircleCheck } from 'lucide-react';
import { matchSpoken, type ShadowResult } from '../../core/check/shadow';
import { vi } from '../../copy/vi';
import { englishVoices, ttsSupported } from '../../services/speech/tts';
import { micSimulation, sttSupported } from '../../services/speech/stt';
import { Card, Note } from '../../ui/ui';
import { MicButton, SpeakButton } from '../../ui/speech';

/** Check the speaker and the microphone before (or instead of) finding out mid-session. */
export function MicCheckPage() {
  const [voices, setVoices] = useState(() => englishVoices());
  const [heard, setHeard] = useState<ShadowResult & { transcript: string }>();
  useEffect(() => {
    const refresh = () => setVoices(englishVoices());
    window.speechSynthesis?.addEventListener?.('voiceschanged', refresh);
    refresh();
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', refresh);
  }, []);
  const sample = vi.micCheck.sample;
  const sim = micSimulation();

  return (
    <main className="mx-auto max-w-[560px] space-y-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{vi.micCheck.title}</h1>
        <Link to="/" className="text-primary hover:underline">← {vi.micCheck.back}</Link>
      </header>
      {sim !== 'real' && <Note tone="accent">Debug: micro đang được giả lập ({sim}).</Note>}

      <Card>
        <h2 className="font-semibold">{vi.micCheck.speakerTitle}</h2>
        <p className="mt-1 text-ink-soft">{vi.micCheck.speakerBody}</p>
        <div className="mt-3">
          {ttsSupported() ? <SpeakButton text="Good morning! This is your daily English practice." slow /> : <Note tone="accent">{vi.speech.noTts}</Note>}
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          {vi.micCheck.voice} {voices.length > 0 ? `${voices.length} giọng tiếng Anh (${voices.slice(0, 3).map((v) => v.name).join(', ')}${voices.length > 3 ? '…' : ''})` : vi.micCheck.noVoice}
        </p>
      </Card>

      <Card>
        <h2 className="font-semibold">{vi.micCheck.micTitle}</h2>
        <p className="mt-1 text-ink-soft">{vi.micCheck.micBody}</p>
        <div className="mt-5">
          {sttSupported() ? (
            <MicButton expected={sample} onHeard={(t) => setHeard({ ...matchSpoken(sample, t), transcript: t })} />
          ) : (
            <Note tone="accent">{vi.speech.mic.unsupported}</Note>
          )}
        </div>
        {heard && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-ink-soft">{vi.shadow.you} <i lang="en">“{heard.transcript}”</i></p>
            {heard.ratio >= 0.6 ? (
              <Note tone="good" icon={<CircleCheck size={18} />}>{vi.micCheck.ok}</Note>
            ) : (
              <Note tone="accent">{vi.shadow.heardSome(heard.words.filter((w) => w.heard).length, heard.words.length)}</Note>
            )}
          </div>
        )}
        <p className="mt-4 text-xs text-ink-soft">
          {vi.micCheck.support} {sttSupported() ? 'nghe được giọng nói' : 'chưa nghe được giọng nói'} · {ttsSupported() ? 'đọc được' : 'chưa đọc được'}. Nhận dạng giọng nói của Chrome cần mạng.
        </p>
      </Card>
    </main>
  );
}
