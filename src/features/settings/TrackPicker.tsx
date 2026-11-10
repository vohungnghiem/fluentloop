import { currentTrack, library } from '../../services/content';
import { saveSettings } from '../../services/settings';
import { Choice } from '../../ui/ui';

/**
 * Choose the industry. Content is read at start, so a change reloads the app; what was learnt
 * stays (cards of the other track keep coming back in reviews).
 */
export function TrackPicker() {
  if (library.tracks.length < 2) return null;
  return (
    <Choice
      value={currentTrack.id}
      options={library.tracks.map((t) => ({ value: t.id, label: t.titleVi, dot: t.color }))}
      onChange={(id) => {
        saveSettings({ trackId: id });
        location.reload();
      }}
    />
  );
}
