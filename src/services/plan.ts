import { dayKey } from '../core/date';
import { checkpointDue, minutesByDay, needsFoundation, planWeek, type Level } from '../core/plan/plan';
import { currentTrack } from './content';
import { placementSchema, scorePlacement, type Answers } from '../core/plan/placement';
import placementData from '../../content/placement.json';
import { ttsSupported } from './speech/tts';
import { db, type PlanRow, type StudyLogRow } from './db';

/** The 16-week plan, the placement test and the time learnt. Every function takes `now`. */

export const placementItems = placementSchema.parse(placementData).items;

/** The questions this device can ask: listening needs a voice to read them. */
export const availablePlacementItems = () => (ttsSupported() ? placementItems : placementItems.filter((item) => item.skill !== 'listen'));

export const getPlan = () => db.plans.get('main');

/**
 * More help while learning (translation shown, the first hint open, simpler AI feedback): below B1,
 * or on the foundation pack when the level is not known.
 */
export const supportFor = (level: Level | undefined) => (level ? needsFoundation(level) : currentTrack.foundation);

/** The level and the help, for AI prompts (read when asking, so a new placement counts at once). */
export async function learnerLevel(): Promise<{ level?: Level; support: boolean }> {
  const level = (await getPlan())?.level;
  return { level, support: supportFor(level) };
}

/** Start the plan today, or change it (minutes, level…); the start day stays unless `restart`. */
export async function savePlan(patch: Partial<Omit<PlanRow, 'id' | 'updatedAt'>> & { restart?: boolean }, now: Date): Promise<PlanRow> {
  const { restart, ...rest } = patch;
  return db.transaction('rw', db.plans, async () => {
    const old = await getPlan();
    const row: PlanRow = {
      minutesPerDay: 60,
      ...old,
      ...rest,
      id: 'main',
      startDay: restart || !old ? dayKey(now) : old.startDay,
      updatedAt: now.toISOString(),
    };
    await db.plans.put(row);
    return row;
  });
}

/** Keep a finished placement test; its level becomes the plan's. */
export async function savePlacement(answers: Answers, items = availablePlacementItems(), now: Date): Promise<Level> {
  const result = scorePlacement(items, answers);
  const stamp = now.toISOString();
  await db.placements.add({
    id: crypto.randomUUID(),
    at: stamp,
    day: dayKey(now),
    level: result.level,
    correct: result.correct,
    answered: result.answered,
    bySkill: result.bySkill,
    answers: { ...answers },
    updatedAt: stamp,
  });
  await savePlan({ level: result.level }, now);
  return result.level;
}

/** Time studied outside the app (a podcast, a speaking club…), logged by hand. */
export async function logOutside(minutes: number, kind: StudyLogRow['kind'], now: Date) {
  const stamp = now.toISOString();
  await db.studyLog.add({ id: crypto.randomUUID(), day: dayKey(now), at: stamp, minutes, kind, updatedAt: stamp });
}

/** Undo a log: a marker stays so the other devices drop it too. */
export async function removeLog(id: string, now: Date) {
  await db.studyLog.update(id, { deleted: true, updatedAt: now.toISOString() });
}

// ---------- counting time in the app ----------

const DEVICE_KEY = 'fluentloop.deviceId';
let device: string | undefined;
function deviceId(): string {
  if (device) return device;
  try {
    device = localStorage.getItem(DEVICE_KEY) ?? undefined;
    if (!device) {
      device = crypto.randomUUID().slice(0, 8);
      localStorage.setItem(DEVICE_KEY, device);
    }
  } catch {
    device = 'this';
  }
  return device;
}

/** Add seconds of use to today's row of this device. */
export async function addStudySeconds(seconds: number, now: Date) {
  if (seconds <= 0) return;
  const day = dayKey(now);
  const id = `${deviceId()}:${day}`;
  await db.transaction('rw', db.studyTime, async () => {
    const row = await db.studyTime.get(id);
    await db.studyTime.put({ id, device: deviceId(), day, seconds: (row?.seconds ?? 0) + seconds, updatedAt: now.toISOString() });
  });
}

// ---------- what Today and Progress show ----------

/** Minutes per day from every source (sessions, time counted in the app, time logged outside). */
export async function studyMinutes() {
  const [sessions, appSeconds, logs] = await Promise.all([db.sessions.toArray(), db.studyTime.toArray(), db.studyLog.toArray()]);
  return minutesByDay({ sessions, appSeconds, logs });
}

export async function planToday(now: Date) {
  const [plan, minutes, logs, baselines] = await Promise.all([
    getPlan(),
    studyMinutes(),
    db.studyLog.where('day').equals(dayKey(now)).toArray(),
    db.baselines.toArray(),
  ]);
  const today = dayKey(now);
  if (!plan) return { plan: undefined, today: minutes.get(today) } as const;
  return {
    plan,
    week: planWeek(plan.startDay, today),
    today: minutes.get(today) ?? { app: 0, outside: 0, total: 0 },
    logs: logs.filter((log) => !log.deleted).sort((a, b) => a.at.localeCompare(b.at)),
    checkpointDue: checkpointDue(plan.startDay, today, baselines.map((b) => b.day)),
  } as const;
}
