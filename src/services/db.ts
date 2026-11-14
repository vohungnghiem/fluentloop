import Dexie, { type EntityTable } from 'dexie';
import type { AnswerResult } from '../core/check/text';
import type { SessionPlan } from '../core/session/plan';
import type { FsrsState, RatingName } from '../core/srs/srs';
import type { Task } from '../core/content/schema';
import type { Level } from '../core/plan/plan';
import type { Skill } from '../core/plan/placement';
import type { WrittenVersion } from '../core/progress/writing';

/** Everything the learner has done, in IndexedDB. Ids are UUIDs or stable keys; rows carry updatedAt. */

export interface CardRow {
  /** `chunk:<chunkId>` from content, `error:<uuid>` from the learner's mistakes, `capture:<uuid>` from pasted text. */
  id: string;
  source: 'content' | 'error' | 'capture';
  /** Content cards only. */
  chunkId?: string;
  unitId: string;
  kind: 'cloze' | 'fix';
  /** Error cards: the learner's sentence as written, and as it should be. */
  wrongSentence?: string;
  rightSentence?: string;
  mistakeId?: string;
  /** Capture cards: the sentence, the part blanked out, and (from AI) their meanings. */
  sentence?: string;
  answer?: string;
  sentenceVi?: string;
  meaningVi?: string;
  captureId?: string;
  fsrs: FsrsState;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRow {
  id: string;
  cardId: string;
  at: string;
  /** Local day of the review, for the daily cap. */
  day: string;
  rating: RatingName;
  result: AnswerResult;
  ms: number;
  /** Days since the card was last reviewed (or learnt): retention after a week uses it. */
  gapDays?: number;
}

export interface AttemptRow {
  id: string;
  taskId: string;
  snippetId: string;
  text: string;
  usedRequired: string[];
  missingRequired: string[];
  /** The learner's own verdict against the model answer. */
  selfCheck?: 'same' | 'different';
  /** Earlier versions, oldest first: the learner checked them and wrote again. */
  revisions?: string[];
  /** Task points still missing in the final version. */
  missingPoints?: string[];
  /** Every checked version, oldest first, with the feedback shown (since Sprint 18; older rows have `revisions` only). */
  versions?: WrittenVersion[];
  /** The task, in Vietnamese, as it was asked (tasks from a capture or a talk are not in the content). */
  promptVi?: string;
  source: 'rules' | 'ai';
  at: string;
  updatedAt: string;
}

export interface SessionStats {
  reviewed: number;
  remembered: number;
  newCards: number;
  written: number;
  /** Sentences shadowed, and how many of their words the machine heard on the best try. */
  errorCards?: number;
  shadowed?: number;
  heardRatio?: number;
  skipped: string[];
}

export interface SessionRow {
  id: string;
  /** Local day the session started. */
  day: string;
  plan: SessionPlan;
  stepIndex: number;
  /** The furthest step reached: the step bar goes back to any step up to it. */
  reachedIndex?: number;
  /** Reviews done inside this session, so a resumed warm-up starts where it stopped. */
  reviewedIds: string[];
  status: 'active' | 'done';
  stats: SessionStats;
  startedAt: string;
  finishedAt?: string;
  updatedAt: string;
}

export interface ReadRow {
  snippetId: string;
  lastReadAt: string;
  updatedAt: string;
}

/** One mistake in one answer. The error book counts these by label and week. */
export interface MistakeRow {
  id: string;
  attemptId: string;
  taskId: string;
  at: string;
  day: string;
  wrong: string;
  right: string;
  label: string;
  vi: string;
  source: 'ai' | 'rules';
  /** Set when the learner turned it into a review card. */
  cardId?: string;
  updatedAt: string;
}

/** A pasted text and what was learnt from it. */
export interface CaptureRow {
  id: string;
  at: string;
  text: string;
  /** Where it came from: a page URL (bookmarklet) or what the learner typed. */
  source?: string;
  cardIds: string[];
  /** A writing task made from the text by AI, to practise later. */
  task?: Task;
  /** Done writing the task. */
  taskDone?: boolean;
  updatedAt: string;
}

/** A benchmark: a minute of speaking or a short text, redone every four weeks to compare. */
export interface BaselineRow {
  id: string;
  kind: 'writing' | 'audio';
  at: string;
  day: string;
  text?: string;
  audio?: Blob;
  seconds?: number;
  updatedAt: string;
}

/** A roleplay played to the end, so the path can tick it and suggestions move on. */
export interface RoleplayRow {
  scenarioId: string;
  at: string;
  goalMet: boolean;
  updatedAt: string;
}

export interface AiCacheRow {
  hash: string;
  result: unknown;
  at: string;
}

export interface AiUsageRow {
  day: string;
  count: number;
}

/** What the learner is typing, saved as they type so leaving or reloading loses nothing. Synced, not backed up. */
export interface DraftRow {
  /** Where it was typed: `write:<session or source>:<task>`, `capture`, `roleplay:<id>`… */
  key: string;
  value: unknown;
  /** Cleared: kept as a marker for a while so the other devices clear it too. */
  deleted?: boolean;
  updatedAt: string;
}

/** The learner's 16-week plan: one row, `main`. */
export interface PlanRow {
  id: 'main';
  /** First day of week 1. */
  startDay: string;
  /** Minutes a day the learner means to study, in and out of the app. */
  minutesPerDay: number;
  /** The level of the last placement test, if one was done. */
  level?: Level;
  /** The learner's CV or project notes (pasted), for AI to help write their own interview answers. */
  profile?: string;
  /** The welcome flow was finished (or skipped): Today stops sending a new learner there. */
  onboarded?: boolean;
  updatedAt: string;
}

/** One placement test taken, kept to see the level move over the plan. */
export interface PlacementRow {
  id: string;
  at: string;
  day: string;
  level: Level;
  correct: number;
  answered: number;
  bySkill: Record<Skill, [number, number]>;
  answers: Record<string, number>;
  updatedAt: string;
}

/** Seconds of real use of the app, per device and day (each device writes only its own row). */
export interface StudyTimeRow {
  /** `<device>:<day>` */
  id: string;
  device: string;
  day: string;
  seconds: number;
  updatedAt: string;
}

/** Time the learner studied outside the app and logged by hand. */
export interface StudyLogRow {
  id: string;
  day: string;
  at: string;
  minutes: number;
  kind: 'listen' | 'speak' | 'read' | 'other';
  /** Undone: kept as a marker so the other devices drop it too. */
  deleted?: boolean;
  updatedAt: string;
}

/**
 * A time the learner spoke: a one- or two-minute talk on a topic, a voice conversation with the
 * app, or a conversation with real people logged afterwards. Speed and pauses are compared week to week.
 */
export interface TalkRow {
  id: string;
  at: string;
  day: string;
  kind: 'talk' | 'conversation' | 'real';
  /** What it was about, in Vietnamese: the prompt, the conversation's title, or what the learner wrote. */
  topic: string;
  taskId?: string;
  scenarioId?: string;
  seconds: number;
  /** What the machine heard (corrected by the learner when it misheard). */
  transcript?: string;
  words?: number;
  wpm?: number;
  pauses?: number;
  longestPause?: number;
  fillers?: number;
  /** Conversations: how many times the learner spoke. */
  turns?: number;
  /** Real conversations: with whom, what was hard, and the sentences the learner wanted to say. */
  partner?: string;
  hardVi?: string;
  phrases?: Array<{ vi: string; en?: string }>;
  audio?: Blob;
  updatedAt: string;
}

/** The learner's own answer to an interview question, kept as review cards (one per sentence). */
export interface AnswerRow {
  questionId: string;
  text: string;
  /** Drafted by AI from the CV (then checked), or written by the learner. */
  source: 'ai' | 'own';
  cardIds: string[];
  at: string;
  updatedAt: string;
}

/** Facts about this device only, never synced: `resetAt`, the last data reset this device knows of. */
export interface MetaRow {
  key: string;
  value: string;
}

export const db = new Dexie('fluentloop') as Dexie & {
  cards: EntityTable<CardRow, 'id'>;
  reviews: EntityTable<ReviewRow, 'id'>;
  attempts: EntityTable<AttemptRow, 'id'>;
  sessions: EntityTable<SessionRow, 'id'>;
  reads: EntityTable<ReadRow, 'snippetId'>;
  mistakes: EntityTable<MistakeRow, 'id'>;
  aiCache: EntityTable<AiCacheRow, 'hash'>;
  aiUsage: EntityTable<AiUsageRow, 'day'>;
  captures: EntityTable<CaptureRow, 'id'>;
  baselines: EntityTable<BaselineRow, 'id'>;
  roleplays: EntityTable<RoleplayRow, 'scenarioId'>;
  drafts: EntityTable<DraftRow, 'key'>;
  plans: EntityTable<PlanRow, 'id'>;
  placements: EntityTable<PlacementRow, 'id'>;
  studyTime: EntityTable<StudyTimeRow, 'id'>;
  studyLog: EntityTable<StudyLogRow, 'id'>;
  talks: EntityTable<TalkRow, 'id'>;
  answers: EntityTable<AnswerRow, 'questionId'>;
  meta: EntityTable<MetaRow, 'key'>;
};

db.version(1).stores({
  cards: 'id, chunkId, unitId',
  reviews: 'id, cardId, day',
  attempts: 'id, taskId, at',
  sessions: 'id, day, status',
  reads: 'snippetId, lastReadAt',
});

db.version(2).stores({
  cards: 'id, chunkId, unitId, source',
  mistakes: 'id, attemptId, day, label',
  aiCache: 'hash, at',
  aiUsage: 'day',
});

db.version(3).stores({
  captures: 'id, at',
});

db.version(4).stores({
  baselines: 'id, kind, at',
});

db.version(5).stores({
  roleplays: 'scenarioId, at',
});

db.version(6).stores({
  drafts: 'key, updatedAt',
});

db.version(7).stores({
  plans: 'id',
  placements: 'id, at',
  studyTime: 'id, day',
  studyLog: 'id, day',
});

db.version(8).stores({
  meta: 'key',
});

db.version(9).stores({
  talks: 'id, at, day, kind',
});

db.version(10).stores({
  answers: 'questionId, at',
});
