import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CircleCheck } from 'lucide-react';
import { vi } from '../../copy/vi';
import { now } from '../../services/clock';
import { db } from '../../services/db';
import { interview, saveProfile } from '../../services/interview';
import { getPlan } from '../../services/plan';
import { aiReady, useSettings } from '../../services/settings';
import { Meter, PageHeader, PageSkeleton } from '../../ui/shell';
import { SECTION_LOOK } from '../../ui/tones';
import { Card, NavList, NavRow, Note } from '../../ui/ui';

/**
 * Getting ready for interviews: the learner's CV (for AI to draft from), their own answer to each
 * common question, and a mock interview by voice.
 */
export function InterviewPage() {
  const settings = useSettings();
  const plan = useLiveQuery(getPlan, [], null);
  const answers = useLiveQuery(() => db.answers.toArray(), []);
  const [profile, setProfile] = useState<string>();
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (plan !== null && profile === undefined) setProfile(plan?.profile ?? '');
  }, [plan]);
  // Saved a moment after each change, like every other box: a paste then a reload loses nothing.
  useEffect(() => {
    if (profile === undefined || plan === null || profile.trim() === (plan?.profile ?? '')) return;
    const timer = setTimeout(() => void saveProfile(profile, now()).then(() => setSaved(true)), 600);
    return () => clearTimeout(timer);
  }, [profile]);
  if (plan === null || !answers || profile === undefined) return <PageSkeleton />;

  const done = new Set(answers.map((a) => a.questionId));

  return (
    <main className="page">
      <PageHeader title={vi.interview.title} look={SECTION_LOOK.interview} back={{ to: '/roleplay', label: vi.talk.back }} />
      <p className="-mt-2">{vi.interview.intro}</p>

      <Card>
        <h2 className="font-semibold">{vi.interview.profileTitle}</h2>
        <p className="mt-1 text-sm text-ink-soft">{aiReady(settings) ? vi.interview.profileBody : vi.interview.profileNoAi}</p>
        <textarea
          value={profile}
          onChange={(e) => { setProfile(e.target.value); setSaved(false); }}
          rows={6}
          placeholder={vi.interview.profilePlaceholder}
          className="mt-3 w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 leading-relaxed outline-none focus:border-primary"
        />
        {saved && <p className="mt-1 inline-flex items-center gap-1 text-sm text-good"><CircleCheck size={14} />{vi.interview.profileSaved}</p>}
      </Card>

      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">{vi.interview.answered(done.size, interview.questions.length)}</span>
        </div>
        <Meter value={done.size} max={interview.questions.length} className="mt-2" />
      </div>

      <NavList title={vi.interview.questionsTitle}>
        {interview.questions.map((q, i) => (
          <NavRow key={q.id} to={`/interview/${q.id}`} title={`${i + 1}. ${q.en}`} detail={done.has(q.id) ? `✓ ${vi.interview.hasAnswer}` : q.vi} />
        ))}
      </NavList>

      <NavList title={vi.interview.practiceTitle}>
        <NavRow to={`/roleplay/${interview.scenario.id}`} look={SECTION_LOOK.roleplay} title={vi.interview.mockTitle} detail={vi.interview.mockBody} />
      </NavList>
      {done.size < 3 && <Note tone="plain">{vi.interview.mockTip}</Note>}
    </main>
  );
}
