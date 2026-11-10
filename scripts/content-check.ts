import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { contentProblems, trackSchema, unitSchema, type Library } from '../src/core/content/schema';

/** npm run content:check: every content file against its schema, then the links between them. */

const root = join(import.meta.dirname, '..', 'content', 'tracks');
const library: Library = { tracks: [], units: [] };
const problems: string[] = [];

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith('.json') ? [path] : [];
  });

for (const path of files(root)) {
  const name = relative(root, path);
  const isTrack = path.endsWith('track.json');
  const result = (isTrack ? trackSchema : unitSchema).safeParse(JSON.parse(readFileSync(path, 'utf8')));
  if (!result.success) {
    for (const issue of result.error.issues) problems.push(`${name}: ${issue.path.join('.')}: ${issue.message}`);
  } else if (isTrack) {
    library.tracks.push(result.data as Library['tracks'][number]);
  } else {
    library.units.push(result.data as Library['units'][number]);
  }
}
problems.push(...contentProblems(library));

if (problems.length > 0) {
  console.error(`Nội dung có ${problems.length} lỗi:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
const count = (pick: (unit: Library['units'][number]) => unknown[]) =>
  library.units.reduce((sum, unit) => sum + pick(unit).length, 0);
console.log(
  `Nội dung ổn: ${library.tracks.length} track, ${library.units.length} unit, ` +
    `${count((u) => u.snippets)} đoạn, ${count((u) => u.chunks)} cụm, ${count((u) => u.tasks)} nhiệm vụ.`,
);
