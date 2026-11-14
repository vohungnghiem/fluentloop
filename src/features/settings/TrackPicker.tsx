import { vi } from '../../copy/vi';
import { chooseIndustry, chooseTrack, chosenIndustry, currentTrack, industryTracks, library } from '../../services/content';
import { useSettings } from '../../services/settings';
import { OptionButton } from '../../ui/ui';

/**
 * Choose the pack. Content is read at start, so a change reloads the app; what was learnt stays
 * (cards of the other track keep coming back in reviews). One row per track, so long names fit on
 * a phone. `industries`: only the industries (the welcome flow asks "which job"); on the
 * foundation pack that picks where the learner goes after it, without leaving it.
 */
export function TrackPicker({ industries = false }: { industries?: boolean }) {
  useSettings(); // the industry chosen while on the foundation changes no track, only settings
  const tracks = industries ? industryTracks : library.tracks;
  if (tracks.length < 2) return null;
  const selected = industries ? chosenIndustry().id : currentTrack.id;
  return (
    <ul className="grid gap-2" role="radiogroup">
      {tracks.map((t) => (
        <li key={t.id}>
          <OptionButton
            selected={t.id === selected}
            dot={t.color}
            onClick={() => {
              if ((industries ? chooseIndustry : chooseTrack)(t.id)) location.reload();
            }}
          >
            {t.titleVi}
            {t.foundation && <span className="block text-sm font-normal text-ink-soft">{vi.track.foundationNote}</span>}
          </OptionButton>
        </li>
      ))}
    </ul>
  );
}
