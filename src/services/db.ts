import Dexie, { type EntityTable } from 'dexie';
import type { AnswerResult } from '../core/check/text';
import type { SessionPlan } from '../core/session/plan';
import type { FsrsState, RatingName } from '../core/srs/srs';
import type { Task } from '../core/content/schema';

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
