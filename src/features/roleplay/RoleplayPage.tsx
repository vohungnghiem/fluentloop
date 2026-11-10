import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { CircleCheck, Lightbulb, Send } from 'lucide-react';
import type { Scenario } from '../../core/content/schema';
import type { Correction } from '../../core/errors/labels';
import { matchReply } from '../../core/roleplay/script';
import { displayDiff } from '../../core/check/text';
import { vi } from '../../copy/vi';
import { roleplayTurn, type Line } from '../../services/ai/roleplay';
import { now } from '../../services/clock';
import { courseUnits } from '../../services/content';
import { recordAttempt, recordRoleplay, saveMistakes } from '../../services/learning';
import { aiReady, useSettings } from '../../services/settings';
import { speak } from '../../services/speech/tts';
import { sttSupported } from '../../services/speech/stt';
import { Diff } from '../../ui/Diff';
import { Button, Note } from '../../ui/ui';
import { MicButton, SpeakButton } from '../../ui/speech';

const MAX_TURNS = 10;

type Message = Line & { vi?: string; correction?: Correction | null };

function findScenario(id: string): { scenario: Scenario; unitId: string } | undefined {
  for (const unit of courseUnits) {
    const scenario = unit.scenarios.find((s) => s.id === id);
    if (scenario) return { scenario, unitId: unit.id };
  }
  return undefined;
}

/** A conversation with a colleague: free with AI, along the script without. */
export function RoleplayPage() {
  const { id = '' } = useParams();
  const found = findScenario(id);
  const settings = useSettings();
  const withAi = aiReady(settings);
  const opening = found?.scenario.script[0];
  const [messages, setMessages] = useState<Message[]>(() => (opening ? [{ who: 'partner', text: opening.say, vi: opening.sayVi }] : []));
  const [nodeId, setNodeId] = useState(opening?.id ?? '');
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [hint, setHint] = useState<string>();
  const [done, setDone] = useState<'goal' | 'end' | 'limit'>();
  const [saved, setSaved] = useState(false);
  const [showVi, setShowVi] = useState<number>();
  // Played to the end with at least one turn: the path ticks it and suggestions move on.
  const spoke = messages.some((m) => m.who === 'learner');
  useEffect(() => {
    if (done && spoke) void recordRoleplay(id, done !== 'limit', now());
  }, [done, spoke, id]);
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  const node = found?.scenario.script.find((n) => n.id === nodeId);
  const learnerTurns = messages.filter((m) => m.who === 'learner').length;
  const mistakes = useMemo(
    () => messages.flatMap((m) => (m.who === 'learner' && m.correction ? m.correction.mistakes.map((mistake) => ({ line: m, mistake })) : [])),
    [messages],
  );

  // The partner speaks each new line aloud, and the view follows the conversation.
  useEffect(() => {
    const last = messages.at(-1);
    if (last?.who === 'partner') void speak(last.text);
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  if (!found || !opening) return <main className="p-6"><Link to="/path" className="text-primary">{vi.lesson.back}</Link></main>;
  const { scenario, unitId } = found;

  const send = async (text: string) => {
    const said = text.trim();
    if (!said || thinking || done) return;
    setNotice(undefined);
    setHint(undefined);
    const learner: Message = { who: 'learner', text: said };

    if (!withAi) {
      if (!node) return;
      const index = matchReply(node, said);
      if (index < 0) return setNotice(vi.roleplay.noMatch);
      const nextId = node.replies[index].next;
      const next = scenario.script.find((n) => n.id === nextId);
      setDraft('');
      setMessages((list) => [...list, learner, ...(next ? [{ who: 'partner' as const, text: next.say, vi: next.sayVi }] : [])]);
      if (next) setNodeId(next.id);
      if (!next || next.replies.length === 0) setDone('end');
      return;
    }

    const lines = [...messages, learner];
    setMessages(lines);
    setDraft('');
    setThinking(true);
    const outcome = await roleplayTurn(scenario, lines, now());
    setThinking(false);
    if (!outcome.ok) {
      setNotice(`${vi.roleplay.aiFailed}: ${vi.correct.aiError[outcome.kind as keyof typeof vi.correct.aiError] ?? outcome.kind}`);
      return;
    }
    const turn = outcome.data;
    setMessages((list) => {
      const copy = [...list];
      copy[copy.length - 1] = { ...learner, correction: turn.correction };
      return [...copy, { who: 'partner', text: turn.reply }];
    });
    if (turn.hintVi) setHint(turn.hintVi);
    if (turn.goalMet) setDone('goal');
    else if (learnerTurns + 1 >= MAX_TURNS) setDone('limit');
  };

  const saveAll = async () => {
    const learnerLines = messages.filter((m) => m.who === 'learner');
    const attemptId = await recordAttempt(undefined, {
      taskId: scenario.id,
      snippetId: `roleplay:${scenario.id}`,
      text: learnerLines.map((m) => m.text).join('\n'),
      usedRequired: [],
      missingRequired: [],
      source: 'ai',
    }, now());
    for (const line of learnerLines) {
      if (!line.correction || line.correction.mistakes.length === 0) continue;
      await saveMistakes(undefined, { id: attemptId, taskId: scenario.id, text: line.text, corrected: line.correction.corrected, unitId },
        line.correction.mistakes, line.correction.mistakes.map((_, i) => i), 'ai', now());
    }
    setSaved(true);
  };

  const restart = () => {
    setMessages([{ who: 'partner', text: opening.say, vi: opening.sayVi }]);
    setNodeId(opening.id);
    setDone(undefined);
    setSaved(false);
    setNotice(undefined);
    setHint(undefined);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col px-4 pt-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{scenario.titleVi}</h1>
          <p className="text-sm text-ink-soft">{scenario.partner}</p>
        </div>
        <Link to="/path" className="shrink-0 text-primary hover:underline">← {vi.lesson.back}</Link>
      </header>
      <p className="mt-2 rounded-xl bg-primary-tint px-3 py-2 text-sm"><b>{vi.roleplay.goal}</b> {scenario.goalVi}</p>

      <ol className="mt-4 flex-1 space-y-3">
        {messages.map((m, i) => (
          <li key={i} className={`flex flex-col ${m.who === 'learner' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[17px] leading-relaxed ${m.who === 'learner' ? 'rounded-br-md bg-primary text-on-primary' : 'rounded-bl-md border border-line bg-surface'}`} lang="en">
              {m.text}
            </div>
            {m.who === 'partner' && (
              <div className="mt-1 flex items-center gap-2 text-sm">
                <SpeakButton text={m.text} size="sm" />
                {m.vi && (
                  <button type="button" className="text-ink-soft hover:text-ink" onClick={() => setShowVi(showVi === i ? undefined : i)}>{vi.roleplay.showVi}</button>
                )}
                {showVi === i && <span className="text-ink-soft">{m.vi}</span>}
              </div>
            )}
            {m.who === 'learner' && m.correction && m.correction.mistakes.length > 0 && (
              <div className="mt-1 w-full max-w-[85%] space-y-1">
                <Diff parts={displayDiff(m.text, m.correction.corrected)} />
                {m.correction.mistakes.map((mistake, k) => <p key={k} className="text-sm text-ink-soft">{mistake.vi}</p>)}
              </div>
            )}
          </li>
        ))}
        {thinking && <li className="text-sm text-ink-soft">{scenario.partner.split(',')[0]} {vi.roleplay.thinking}</li>}
        <div ref={bottom} />
      </ol>

      <div className="sticky bottom-0 -mx-4 mt-4 space-y-3 border-t border-line bg-paper/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        {done ? (
          <div className="space-y-3">
            <Note tone="good" icon={<CircleCheck size={18} />}>
              {done === 'goal' ? vi.roleplay.goalMet : done === 'limit' ? vi.roleplay.turnsLimit : vi.roleplay.ended} {vi.roleplay.summary(learnerTurns, mistakes.length)}
            </Note>
            <div className="flex flex-wrap gap-2">
              {mistakes.length > 0 && !saved && <Button variant="primary" onClick={() => void saveAll()}>{vi.roleplay.saveMistakes(mistakes.length)}</Button>}
              {saved && <span className="self-center text-good">{vi.roleplay.saved}</span>}
              <Button onClick={restart}>{vi.roleplay.again}</Button>
            </div>
          </div>
        ) : (
          <>
            {notice && <Note tone="accent">{notice}</Note>}
            {hint && <Note tone="plain" icon={<Lightbulb size={18} />}>{hint}</Note>}
            {!withAi && node && node.replies.length > 0 && (
              <div>
                <p className="text-xs text-ink-soft">{vi.roleplay.suggestions}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {node.replies.map((r) => (
                    <button key={r.text} type="button" onClick={() => { setDraft(r.text); input.current?.focus(); }} className="rounded-full border border-line bg-surface px-3 py-1 text-left text-sm hover:border-primary" lang="en">{r.text}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send(draft);
                  }
                }}
                rows={2}
                lang="en"
                placeholder={vi.roleplay.placeholder}
                className="min-h-12 flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2 outline-none focus:border-primary"
              />
              <Button variant="primary" aria-label={vi.roleplay.send} onClick={() => void send(draft)} disabled={!draft.trim() || thinking}><Send size={18} /></Button>
            </div>
            {sttSupported() && (
              <div className="flex justify-center">
                <div className="scale-75">
                  <MicButton key={messages.length} expected={!withAi && node?.replies[0] ? node.replies[0].text : ''} onHeard={(t) => { setDraft(t); input.current?.focus(); }} />
                </div>
              </div>
            )}
            {learnerTurns > 0 && <div className="text-center"><Button variant="quiet" onClick={() => setDone('end')}>{vi.roleplay.finish}</Button></div>}
          </>
        )}
      </div>
    </main>
  );
}

