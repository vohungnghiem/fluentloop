import { currentTrack, library } from '../../services/content';
import { ChevronDown } from 'lucide-react';
import { saveSettings } from '../../services/settings';

/**
 * Choose the industry. Content is read at start, so a change reloads the app; what was learnt
 * stays (cards of the other track keep coming back in reviews).
 */
export function TrackPicker() {
  if (library.tracks.length < 2) return null;
  const choose = (id: string) => {
    if (id === currentTrack.id) return;
    saveSettings({ trackId: id });
    location.reload();
  };
  // Past three the pill no longer fits a phone: use the system list (a wheel on iPhone).
  if (library.tracks.length > 3)
    return (
      <label className="relative flex min-h-11 w-full items-center rounded-xl border border-line bg-surface focus-within:border-primary sm:max-w-sm">
        <span className="pointer-events-none absolute left-4 size-2.5 rounded-full" style={{ background: currentTrack.color }} />
        <select
          value={currentTrack.id}
          onChange={(e) => choose(e.target.value)}
          className="w-full appearance-none bg-transparent py-2.5 pr-10 pl-9 font-medium outline-none"
        >
          {library.tracks.map((track) => <option key={track.id} value={track.id}>{track.titleVi}</option>)}
        </select>
        <ChevronDown size={18} className="pointer-events-none absolute right-3 text-ink-soft" />
      </label>
    );
  return (
    <div className="inline-flex w-full rounded-full bg-line/60 p-1 sm:w-auto" role="radiogroup">
      {library.tracks.map((track) => {
        const on = track.id === currentTrack.id;
        return (
          <button
            key={track.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => choose(track.id)}
            className={`flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm font-medium whitespace-nowrap transition sm:flex-none ${on ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink'}`}
          >
            <span className="size-2 shrink-0 rounded-full" style={{ background: track.color }} />
            {track.titleVi}
          </button>
        );
      })}
    </div>
  );
}
