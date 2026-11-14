import { AiBadge } from '../../ui/AiBadge';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDraftText } from '../../ui/useDraft';
import { Link, useParams } from 'react-router';
import { ArrowLeft, CircleCheck, Keyboard, Lightbulb, Mic, Send } from 'lucide-react';
import type { Scenario } from '../../core/content/schema';
import type { Correction } from '../../core/errors/labels';
import { nextNode } from '../../core/roleplay/script';
import { displayDiff } from '../../core/check/text';
import { vi } from '../../copy/vi';
import { roleplayTurn, type Line } from '../../services/ai/roleplay';
import { now } from '../../services/clock';
import { courseUnits } from '../../services/content';
import { interview } from '../../services/interview';
import { getPlan } from '../../services/plan';
import { useLiveQuery } from 'dexie-react-hooks';
import { recordAttempt, recordRoleplay, saveMistakes } from '../../services/learning';
import { aiReady, useSettings } from '../../services/settings';
import { speak } from '../../services/speech/tts';
import { sttSupported } from '../../services/speech/stt';
import { saveTalk } from '../../services/talk';
import { wordCount } from '../../core/speech/fluency';
import { useSupport } from '../../ui/useSupport';
import { Diff } from '../../ui/Diff';
import { Button, Note } from '../../ui/ui';
import { MicButton, SpeakButton } from '../../ui/speech';

/** Turns before the partner wraps up: enough for five minutes of talking. */
const MAX_TURNS = 20;

type Message = Line & { vi?: string; correction?: Correction | null };

function findScenario(id: string): { scenario: Scenario; unitId: string } | undefined {
  if (id === interview.scenario.id) return { scenario: interview.scenario, unitId: 'interview' };
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
  // The mock interview asks about the learner's own background, when they gave one.
  const profile = useLiveQuery(async () => (await getPlan())?.profile, []);
  const settings = useSettings();
  const withAi = aiReady(settings);
  const opening = found?.scenario.script[0];
  const [messages, setMessages] = useState<Message[]>(() => (opening ? [{ who: 'partner', text: opening.say, vi: opening.sayVi }] : []));
  const [nodeId, setNodeId] = useState(opening?.id ?? '');
  const [draft, setDraft] = useDraftText(`roleplay:${id}`);
  const [thinking, setThinking] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [hint, setHint] = useState<string>();
  const [done, setDone] = useState<'goal' | 'end' | 'limit'>();
  const [saved, setSaved] = useState(false);
  const [showVi, setShowVi] = useState<number>();
  // Speaking is the way in when the browser can listen; typing stays one tap away.
  const canListen = sttSupported();
  const [typing, setTyping] = useState(!canListen);
  const support = useSupport();
  /** When the learner first spoke, for the length of the conversation. */
  const startedAt = useRef<number>(undefined);
  const [elapsed, setElapsed] = useState(0);
  // Played to the end with at least one turn: the path ticks it and suggestions move on.
  const spoke = messages.some((m) => m.who === 'learner');
  useEffect(() => {
    if (!done || !spoke) return;
    void recordRoleplay(id, done !== 'limit', now());
    // Kept with the other times the learner spoke (Progress compares them).
    const said = messages.filter((m) => m.who === 'learner').map((m) => m.text).join('\n');
    const seconds = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
    void saveTalk({ kind: 'conversation', topic: found?.scenario.titleVi ?? id, scenarioId: id, seconds, transcript: said, words: wordCount(said), turns: messages.filter((m) => m.who === 'learner').length }, now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, spoke, id]);
  useEffect(() => {
    if (!spoke || done) return;
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [spoke, done]);
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
    if (last?.who === 'partner') void speak(last.text, support ? 'slow' : 'normal');
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
    startedAt.current ??= Date.now();

    if (!withAi) {
      if (!node) return;
      const nextId = nextNode(node, said);
      if (nextId === undefined) return setNotice(node.any ? vi.roleplay.tooShort : vi.roleplay.noMatch);
      const next = scenario.script.find((n) => n.id === nextId);
      setDraft('');
      setMessages((list) => [...list, learner, ...(next ? [{ who: 'partner' as const, text: next.say, vi: next.sayVi }] : [])]);
      if (next) setNodeId(next.id);
      if (!next || (next.replies.length === 0 && !next.any)) setDone('end');
      return;
    }

    const lines = [...messages, learner];
    setMessages(lines);
    setDraft('');
    setThinking(true);
    const withProfile = id === interview.scenario.id && profile ? { ...scenario, persona: `${scenario.persona}\nCandidate's background (from their CV):\n${profile.slice(0, 3000)}` } : scenario;
    const outcome = await roleplayTurn(withProfile, lines, now());
    setThinking(false);
    if (!outcome.ok) {
      setNotice(`${vi.roleplay.aiFailed}: ${vi.correct.aiError[outcome.kind as keyof typeof vi.correct.aiError] ?? outcome.kind}`);
      return;
    }
    const turn = outcome.data;
    setMessages((list) => {
      const copy = [...list];
      copy[copy.length - 1] = { ...learner, correction: turn.correction };
      return [...copy, { who: 'partner', text: turn.reply, vi: turn.replyVi }];
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
    startedAt.current = undefined;
    setElapsed(0);
    setNotice(undefined);
    setHint(undefined);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col px-4 pt-6">
      <header className="flex items-center gap-2">
        <Link to={id === interview.scenario.id ? '/interview' : '/path'} className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-ink" aria-label={vi.lesson.back} title={vi.lesson.back}><ArrowLeft size={20} /></Link>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{scenario.titleVi}</h1>
          <p className="text-sm text-ink-soft">{scenario.partner}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {spoke && <span className="text-sm tabular-nums text-ink-soft" title={vi.roleplay.elapsed}>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>}
          <AiBadge />
        </div>
      </header>
      <p className="mt-2 rounded-xl bg-paper px-3 py-2 text-sm ring-1 ring-line"><b>{vi.roleplay.goal}</b> {scenario.goalVi}</p>

      <ol className="mt-4 flex-1 space-y-3">
        {messages.map((m, i) => (
          <li key={i} className={`flex flex-col ${m.who === 'learner' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[17px] leading-relaxed ${m.who === 'learner' ? 'rounded-br-md bg-primary text-on-primary' : 'rounded-bl-md border border-line bg-surface'}`} lang="en">
              {m.text}
            </div>
            {m.who === 'partner' && (
              <div className="mt-1 max-w-[85%] text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <SpeakButton text={m.text} slow size="sm" />
                  {m.vi && (
                    <button type="button" className="min-h-10 rounded-lg px-2 font-medium text-ink-soft hover:bg-surface hover:text-ink" aria-expanded={showVi === i} onClick={() => setShowVi(showVi === i ? undefined : i)}>{vi.roleplay.showVi}</button>
                  )}
                </div>
                {showVi === i && <p className="mt-1 text-ink">{m.vi}</p>}
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
                <p className="text-xs text-ink-soft">{typing ? vi.roleplay.suggestions : vi.roleplay.sayLike}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {node.replies.map((r) =>
                    typing ? (
                      <button key={r.text} type="button" onClick={() => { setDraft(r.text); input.current?.focus(); }} className="rounded-full border border-line bg-surface px-3 py-1 text-left text-sm hover:border-primary" lang="en">{r.text}</button>
                    ) : (
                      <span key={r.text} className="rounded-full bg-surface px-3 py-1 text-sm ring-1 ring-line" lang="en">{r.text}</span>
                    ),
                  )}
                </div>
              </div>
            )}
            {typing ? (
              <>
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
                {canListen && <div className="text-center"><Button variant="quiet" onClick={() => setTyping(false)}><Mic size={16} />{vi.roleplay.speakInstead}</Button></div>}
              </>
            ) : (
              <>
                {/* Speaking: what is heard is sent as it is; a misheard line is simply said again. */}
                <MicButton key={messages.length} expected={!withAi && node?.replies[0] ? node.replies[0].text : ''} onHeard={(t) => void send(t)} />
                <div className="text-center"><Button variant="quiet" onClick={() => setTyping(true)}><Keyboard size={16} />{vi.roleplay.typeInstead}</Button></div>
              </>
            )}
            {learnerTurns > 0 && <div className="text-center"><Button variant="quiet" onClick={() => setDone('end')}>{vi.roleplay.finish}</Button></div>}
          </>
        )}
      </div>
    </main>
  );
}

