import { describe, expect, it } from 'vitest';
import standupJson from '../../../content/tracks/dev/units/standup.json';
import ticketJson from '../../../content/tracks/dev/units/ticket.json';
import { unitSchema } from '../content/schema';
import { courseState, findLesson } from './course';

const units = [unitSchema.parse(standupJson), unitSchema.parse(ticketJson)];
const ids = units.flatMap((u) => u.snippets.map((s) => s.id));

describe('courseState', () => {
  it('a new learner: the very first lesson is next', () => {
    const state = courseState(units, []);
    expect(state.next?.snippet.id).toBe(ids[0]);
    expect(state.units.map((u) => u.status)).toEqual(['current', 'later']);
    expect(state).toMatchObject({ read: 0, finished: false });
  });

  it('follows course order, even when a later lesson was read out of turn', () => {
    const state = courseState(units, [ids[0], ids[3]]);
    expect(state.next?.snippet.id).toBe(ids[1]);
    expect(state.units[0].lessons.map((l) => l.status)).toEqual(['read', 'next', 'later', 'read', 'later', 'later']);
  });

  it('moves to the next unit when one is done', () => {
    const first = units[0].snippets.map((s) => s.id);
    const state = courseState(units, first);
    expect(state.units[0].status).toBe('done');
    expect(state.next).toMatchObject({ unitIndex: 1, lessonIndex: 0 });
  });

  it('everything read: the course is finished', () => {
    const state = courseState(units, ids);
    expect(state).toMatchObject({ finished: true, read: ids.length, total: ids.length });
    expect(state.next).toBeUndefined();
    expect(findLesson(state, ids[7])?.unit.index).toBe(1);
  });
});
