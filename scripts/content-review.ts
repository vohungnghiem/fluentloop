import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_WORDS, unitSchema } from '../src/core/content/schema';

/**
 * npm run -s content:review -- <unit-id>: the cross-check prompt (content/prompts/review.md) with the
 * unit filled in, to paste into a second model. Without an id: the units not cross-checked yet.
 */

const content = join(import.meta.dirname, '..', 'content');
const units = readdirSync(join(content, 'tracks')).flatMap((track) => {
  const dir = join(content, 'tracks', track, 'units');
  return readdirSync(dir).filter((name) => name.endsWith('.json')).map((name) => {
    const raw = readFileSync(join(dir, name), 'utf8');
    return { raw, unit: unitSchema.parse(JSON.parse(raw)) };
  });
});

const id = process.argv[2];
if (!id) {
  const todo = units.filter(({ unit }) => !unit.review).map(({ unit }) => `  ${unit.id} (${unit.cefr})`);
  console.log(todo.length ? `Chưa kiểm chéo:\n${todo.join('\n')}\n\nnpm run -s content:review -- <unit-id>` : 'Mọi unit đã được kiểm chéo.');
  process.exit(0);
}
const found = units.find(({ unit }) => unit.id === id);
if (!found) {
  console.error(`Không có unit "${id}".`);
  process.exit(1);
}
const template = readFileSync(join(content, 'prompts', 'review.md'), 'utf8');
const prompt = template.slice(template.indexOf('\n---\n') + 5).trim();
// The unit as written, minus an earlier review stamp (a second look starts fresh).
const { review: _review, ...unit } = JSON.parse(found.raw);
console.log(
  prompt
    .replaceAll('{{LEVEL}}', found.unit.cefr)
    .replaceAll('{{MAX_WORDS}}', String(MAX_WORDS[found.unit.cefr] ?? 20))
    .replace('{{UNIT}}', JSON.stringify(unit, null, 2)),
);
