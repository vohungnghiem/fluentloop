import { AiBadge } from '../../ui/AiBadge';
import { PageHeader } from '../../ui/shell';
import { SECTION_LOOK } from '../../ui/tones';
import { Link } from 'react-router';
import { MessagesSquare } from 'lucide-react';
import { vi } from '../../copy/vi';
import { courseUnits } from '../../services/content';
import { aiReady, useSettings } from '../../services/settings';
import { Card, Note } from '../../ui/ui';

/** The roleplays of the learner's track, by unit. */
export function RoleplayListPage() {
  const settings = useSettings();
  return (
    <main className="page">
      <PageHeader title={vi.roleplay.title} look={SECTION_LOOK.roleplay} back={{ to: '/path', label: vi.lesson.back }}><AiBadge /></PageHeader>
      <p className="text-ink-soft">{vi.roleplay.intro}</p>
      <Note tone="plain">{aiReady(settings) ? vi.roleplay.withAi : vi.roleplay.withoutAi}</Note>
      {courseUnits.flatMap((unit) =>
        unit.scenarios.map((scenario) => (
          <Link key={scenario.id} to={`/roleplay/${scenario.id}`} className="block">
            <Card className="hover:border-primary">
              <div className="flex items-start gap-3">
                <MessagesSquare className="mt-0.5 shrink-0 text-track" size={22} />
                <div>
                  <div className="text-sm text-ink-soft">{unit.titleVi} · {scenario.partner}</div>
                  <h2 className="text-lg font-semibold">{scenario.titleVi}</h2>
                  <p className="mt-1 text-ink-soft">{scenario.situationVi}</p>
                  <p className="mt-2 text-sm"><b>{vi.roleplay.goal}</b> {scenario.goalVi}</p>
                </div>
              </div>
            </Card>
          </Link>
        )),
      )}
    </main>
  );
}
