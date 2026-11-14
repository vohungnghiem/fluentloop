import { getSettings, saveSettings } from './settings';
import { trackSchema, unitSchema, type Chunk, type Library, type Snippet, type Task, type Track, type Unit } from '../core/content/schema';

/** All content packs under content/tracks, parsed once at start (they are checked at build). */

const trackFiles = import.meta.glob('../../content/tracks/*/track.json', { eager: true, import: 'default' });
const unitFiles = import.meta.glob('../../content/tracks/*/units/*.json', { eager: true, import: 'default' });

export const library: Library = {
  tracks: Object.values(trackFiles).map((data) => trackSchema.parse(data)),
  units: Object.values(unitFiles).map((data) => unitSchema.parse(data)),
};

/**
 * The learner's track, from the settings. Read once at start: changing the track reloads the app.
 */
export const currentTrack = library.tracks.find((track) => track.id === getSettings().trackId) ?? library.tracks[0];

/** The foundation pack (core), learnt first below B1, and the industry packs. */
export const foundationTrack = library.tracks.find((track) => track.foundation);
export const industryTracks = library.tracks.filter((track) => !track.foundation);

/** The industry the learner chose: the current track, or the one to move on to after the foundation. */
export function chosenIndustry(): Track {
  if (!currentTrack.foundation) return currentTrack;
  return industryTracks.find((track) => track.id === getSettings().nextTrackId) ?? industryTracks[0] ?? currentTrack;
}

/**
 * Change the track; the caller reloads (content is read at start). Going to the foundation keeps
 * the industry to come back to; leaving it forgets that.
 */
export function chooseTrack(id: string) {
  const to = library.tracks.find((track) => track.id === id);
  if (!to || to.id === currentTrack.id) return false;
  saveSettings({ trackId: to.id, nextTrackId: to.foundation ? chosenIndustry().id : '' });
  return true;
}

/** Choose the industry without leaving the foundation (it is where the learner goes next). */
export function chooseIndustry(id: string) {
  if (currentTrack.foundation) {
    saveSettings({ nextTrackId: id });
    return false;
  }
  return chooseTrack(id);
}

/** Units of the current track, in course order. */
export const courseUnits: Unit[] = currentTrack.units.flatMap((id) => library.units.filter((unit) => unit.id === id));

const chunks = new Map<string, { chunk: Chunk; unit: Unit }>();
const snippets = new Map<string, { snippet: Snippet; unit: Unit }>();
const tasks = new Map<string, Task>();
for (const unit of library.units) {
  for (const chunk of unit.chunks) chunks.set(chunk.id, { chunk, unit });
  for (const snippet of unit.snippets) snippets.set(snippet.id, { snippet, unit });
  for (const task of unit.tasks) tasks.set(task.id, task);
}

export const findChunk = (id: string) => chunks.get(id)?.chunk;
export const findSnippet = (id: string) => snippets.get(id);
export const findTask = (id: string) => tasks.get(id);
export const snippetChunks = (snippet: Snippet) =>
  snippet.chunks.flatMap((id) => {
    const chunk = findChunk(id);
    return chunk ? [chunk] : [];
  });
