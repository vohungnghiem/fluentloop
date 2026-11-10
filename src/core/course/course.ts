import type { Snippet, Unit } from '../content/schema';

/**
 * Where the learner is in the course: every lesson (snippet) read or not, the next one in order,
 * and whether the course is finished. Pure, so Today, the path and the wrap-up all agree.
 */

export type LessonStatus = 'read' | 'next' | 'later';

export interface CourseUnit {
  unit: Unit;
  index: number;
  lessons: Array<{ snippet: Snippet; index: number; status: LessonStatus }>;
  read: number;
  status: 'done' | 'current' | 'later';
}

export interface CourseState {
  units: CourseUnit[];
  /** The next lesson in course order; undefined once every lesson is read. */
  next?: { unit: Unit; unitIndex: number; snippet: Snippet; lessonIndex: number };
  read: number;
  total: number;
  finished: boolean;
}

export function courseState(units: readonly Unit[], readSnippets: Iterable<string>): CourseState {
  const read = new Set(readSnippets);
  let next: CourseState['next'];
  const out = units.map((unit, unitIndex): CourseUnit => {
    const lessons = unit.snippets.map((snippet, index) => {
      let status: LessonStatus = read.has(snippet.id) ? 'read' : 'later';
      if (status === 'later' && !next) {
        next = { unit, unitIndex, snippet, lessonIndex: index };
        status = 'next';
      }
      return { snippet, index, status };
    });
    const readCount = lessons.filter((l) => l.status === 'read').length;
    return {
      unit,
      index: unitIndex,
      lessons,
      read: readCount,
      status: readCount === lessons.length ? 'done' : next?.unit === unit ? 'current' : 'later',
    };
  });
  const total = out.reduce((a, u) => a + u.lessons.length, 0);
  const readTotal = out.reduce((a, u) => a + u.read, 0);
  return { units: out, next, read: readTotal, total, finished: !next };
}

/** A lesson by id, with its place in the course. */
export function findLesson(state: CourseState, snippetId: string) {
  for (const unit of state.units) {
    const lesson = unit.lessons.find((l) => l.snippet.id === snippetId);
    if (lesson) return { unit, lesson };
  }
  return undefined;
}
