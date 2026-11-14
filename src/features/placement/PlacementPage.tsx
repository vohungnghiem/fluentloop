import { useNavigate } from 'react-router';
import { vi } from '../../copy/vi';
import { needsFoundation } from '../../core/plan/plan';
import { chooseTrack, currentTrack, foundationTrack } from '../../services/content';
import { PageHeader } from '../../ui/shell';
import { SECTION_LOOK } from '../../ui/tones';
import { PlacementTest } from './PlacementTest';

/** The placement test on its own: redone from Progress or Settings to see the level move. */
export function PlacementPage() {
  const navigate = useNavigate();
  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col space-y-5 px-4 pt-6">
      <PageHeader title={vi.placement.title} look={SECTION_LOOK.progress} back={{ to: '/progress', label: vi.progress.title }} />
      <PlacementTest
        header={false}
        onDone={(level) => {
          // Below B1: the foundation pack, as the result said (another pack loads the app again).
          if (needsFoundation(level) && foundationTrack && !currentTrack.foundation && chooseTrack(foundationTrack.id)) location.assign(`${import.meta.env.BASE_URL}progress`);
          else navigate('/progress');
        }}
      />
    </main>
  );
}
