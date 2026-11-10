import { trackSchema, unitSchema, type Chunk, type Library, type Snippet, type Task, type Unit } from '../core/content/schema';

/** All content packs under content/tracks, parsed once at start (they are checked at build). */

const trackFiles = import.meta.glob('../../content/tracks/*/track.json', { eager: true, import: 'default' });
const unitFiles = import.meta.glob('../../content/tracks/*/units/*.json', { eager: true, import: 'default' });

export const library: Library = {
  tracks: Object.values(trackFiles).map((data) => trackSchema.parse(data)),
  units: Object.values(unitFiles).map((data) => unitSchema.parse(data)),
};

/** The learner's track. One for now; onboarding chooses it later. */
export const currentTrack = library.tracks.find((track) => track.id === 'dev') ?? library.tracks[0];

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
