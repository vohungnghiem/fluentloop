import { PartyPopper } from 'lucide-react';
import { vi } from '../../copy/vi';
import { chooseTrack, chosenIndustry } from '../../services/content';
import { Button, Note } from '../../ui/ui';

/** The foundation pack is learnt: on to the industry chosen (Today and the path say the same). */
export function FoundationDone() {
  const industry = chosenIndustry();
  return (
    <Note tone="good" icon={<PartyPopper size={18} />}>
      <b>{vi.track.foundationDoneTitle}</b> {vi.track.foundationDoneBody(industry.titleVi)}
      <div className="mt-2">
        <Button variant="primary" onClick={() => chooseTrack(industry.id) && location.reload()}>{vi.track.moveTo(industry.titleVi)}</Button>
      </div>
    </Note>
  );
}
