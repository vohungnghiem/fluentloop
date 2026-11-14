import { describe, expect, it } from 'vitest';
import { contentWarnings, levelProblems, trackSchema, unitSchema, type Library } from './schema';

const track = (foundation: boolean) =>
  trackSchema.parse({ id: 'core', titleVi: 'Nền', color: '#0F766E', units: ['u'], foundation, audience: 'adults', baseline: { writingVi: 'a', speakingVi: 'b' } });

const unit = (patch: Record<string, unknown> = {}) =>
  unitSchema.parse({
    id: 'u', track: 'core', title: 'U', titleVi: 'U', cefr: 'A2',
    snippets: [{ id: 's', genre: 'chat', titleVi: 'S', cefr: 'A2', text: ['I work at a bank.'], translationVi: ['Mình làm ở ngân hàng.'], chunks: ['c'], task: 't'}],
    chunks: [{ id: 'c', en: 'work at', vi: 'làm ở', example: 'I work at home.', exampleVi: 'Mình làm ở nhà.', answer: 'work at' }],
    tasks: [{ id: 't', promptVi: 'Viết', models: ['I work at a bank.'], points: [{ vi: 'Nơi làm', variants: ['work at'] }], hints: ['Bạn làm ở đâu?', 'I work at …'] }],
    pattern: { titleVi: 'P', forms: ['I + V'], examples: [{ en: 'I work.', vi: 'Mình làm.' }] },
    ...patch,
  });

const lib = (u = unit(), foundation = true): Library => ({ tracks: [track(foundation)], units: [u] });

describe('levelProblems', () => {
  it('passes a short A2 unit with points, hints and a pattern', () => {
    expect(levelProblems(lib())).toEqual([]);
  });

  it('flags A2 sentences over 14 words, wherever they are', () => {
    const long = 'Yesterday I worked on the new login page and then I fixed three small bugs too.';
    const problems = levelProblems(lib(unit({ tasks: [{ id: 't', promptVi: 'Viết', models: [`Hi. ${long}`], points: [{ vi: 'x' }], hints: ['a', 'b'] }] })));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('task "t"');
    expect(problems[0]).toContain('16 từ');
  });

  it('asks A2 tasks for points and both hints', () => {
    const problems = levelProblems(lib(unit({ tasks: [{ id: 't', promptVi: 'Viết', models: ['I work.'] }] })));
    expect(problems.some((p) => p.includes('"points"'))).toBe(true);
    expect(problems.some((p) => p.includes('"hints"'))).toBe(true);
  });

  it('asks a foundation unit for its pattern, not an industry one', () => {
    expect(levelProblems(lib(unit({ pattern: undefined })))).toEqual([`unit "u": gói Nền cần có "pattern"`]);
    expect(levelProblems(lib(unit({ pattern: undefined }), false))).toEqual([]);
  });

  it('leaves B1 sentences long', () => {
    const long = 'Yesterday I worked on the new login page and then I fixed three small bugs too.';
    expect(levelProblems(lib(unit({ cefr: 'B1', snippets: [{ id: 's', genre: 'chat', titleVi: 'S', cefr: 'B1', text: [`${long} I work at a bank.`], translationVi: ['x'], chunks: ['c'], task: 't' }] })))).toEqual([]);
  });
});

describe('contentWarnings', () => {
  it('reminds of the cross-check and of sounds missing from the texts', () => {
    const warnings = contentWarnings(lib(unit({ sounds: [{ en: 'think', tipVi: 'lưỡi giữa răng' }] })));
    expect(warnings).toHaveLength(2);
    expect(contentWarnings(lib(unit({ review: { by: 'gemini', on: '2026-11-14' }, sounds: [{ en: 'work', tipVi: '/wɜːk/' }] })))).toEqual([]);
  });
});
