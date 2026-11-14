import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { contentProblems, contentWarnings, levelProblems, trackSchema, unitSchema, type Library } from '../src/core/content/schema';
import { placementProblems, placementSchema } from '../src/core/plan/placement';
import { interviewProblems, interviewSchema } from '../src/core/content/interview';

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
problems.push(...contentProblems(library), ...levelProblems(library));

// The placement test lives next to the tracks: content/placement.json.
const placement = placementSchema.safeParse(JSON.parse(readFileSync(join(root, '..', 'placement.json'), 'utf8')));
if (!placement.success) {
  for (const issue of placement.error.issues) problems.push(`placement.json: ${issue.path.join('.')}: ${issue.message}`);
} else {
  problems.push(...placementProblems(placement.data.items));
}

// The interview pack: content/interview.json.
const interview = interviewSchema.safeParse(JSON.parse(readFileSync(join(root, '..', 'interview.json'), 'utf8')));
if (!interview.success) {
  for (const issue of interview.error.issues) problems.push(`interview.json: ${issue.path.join('.')}: ${issue.message}`);
} else {
  problems.push(...interviewProblems(interview.data));
}

const warnings = contentWarnings(library);
if (warnings.length > 0) console.warn(`Cần làm (không chặn build):\n${warnings.map((w) => `  - ${w}`).join('\n')}`);

if (problems.length > 0) {
  console.error(`Nội dung có ${problems.length} lỗi:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
const count = (pick: (unit: Library['units'][number]) => unknown[]) =>
  library.units.reduce((sum, unit) => sum + pick(unit).length, 0);
console.log(
  `Nội dung ổn: ${library.tracks.length} track, ${library.units.length} unit, ` +
    `${count((u) => u.snippets)} đoạn, ${count((u) => u.chunks)} cụm, ${count((u) => u.tasks)} nhiệm vụ, ` +
    `${placement.success ? placement.data.items.length : 0} câu xếp mức, ${interview.success ? interview.data.questions.length : 0} câu phỏng vấn.`,
);
