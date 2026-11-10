import { Check } from 'lucide-react';
import { currentTrack, library } from '../../services/content';
import { saveSettings } from '../../services/settings';

/**
 * Choose the industry. Content is read at start, so a change reloads the app; what was learnt
 * stays (cards of the other track keep coming back in reviews).
 */
export function TrackPicker() {
  if (library.tracks.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {library.tracks.map((track) => {
        const on = track.id === currentTrack.id;
        return (
          <button
            key={track.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              if (on) return;
              saveSettings({ trackId: track.id });
              location.reload();
            }}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 font-medium ${on ? 'border-primary bg-primary-tint' : 'border-line bg-surface hover:border-primary'}`}
          >
            <span className="size-3 rounded-full" style={{ background: track.color }} />
            {track.titleVi}
            {on && <Check size={16} />}
          </button>
        );
      })}
    </div>
  );
}
