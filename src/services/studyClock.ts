import { now } from './clock';
import { addStudySeconds } from './plan';
import { speaking } from './speech/tts';

/**
 * Real time in the app: seconds count while the tab is visible and the learner did something in
 * the last 90 seconds (or the app is reading aloud). Settings and the debug page do not count.
 * Written every two minutes and when the tab is hidden, so the sync is not woken for every tick.
 */

const TICK_MS = 5_000;
const IDLE_MS = 90_000;
const FLUSH_MS = 120_000;
const NOT_STUDY = /\/(settings|debug)(\/|$)/;

let started = false;

export function startStudyClock() {
  if (started || typeof window === 'undefined') return;
  started = true;
  let lastActive = Date.now();
  let pending = 0;
  let lastFlush = Date.now();

  const active = () => {
    lastActive = Date.now();
  };
  for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart']) window.addEventListener(event, active, { passive: true });
  window.addEventListener('scroll', active, { passive: true });

  const flush = () => {
    const seconds = pending;
    pending = 0;
    lastFlush = Date.now();
    void addStudySeconds(seconds, now());
  };

  setInterval(() => {
    const visible = document.visibilityState === 'visible';
    const studying = !NOT_STUDY.test(location.pathname) && (Date.now() - lastActive < IDLE_MS || speaking());
    if (visible && studying) pending += TICK_MS / 1000;
    if (pending > 0 && Date.now() - lastFlush >= FLUSH_MS) flush();
  }, TICK_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
    else active();
  });
  window.addEventListener('pagehide', flush);
}
