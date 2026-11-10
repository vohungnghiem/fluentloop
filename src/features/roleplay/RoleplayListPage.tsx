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
    <main className="mx-auto max-w-[640px] space-y-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{vi.roleplay.title}</h1>
        <Link to="/" className="text-primary hover:underline">← {vi.micCheck.back}</Link>
      </header>
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
