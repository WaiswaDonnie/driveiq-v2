/**
 * Push / local notifications for DriveIQ.
 *
 * Three channels — user-toggleable in Settings:
 *   1. road-accidents — Severe/Serious incidents or new closures on London
 *      and surrounding motorways (M1, M25, M3, M4 etc.).
 *   2. line-closures — Tube / National Rail / Elizabeth / DLR / tram lines
 *      moving into the "Closed" or "Severe" status bucket.
 *   3. saved-events — pings the day-of and an hour before each event the
 *      user has saved or followed.
 *
 * Implementation strategy: we run all of this with `expo-notifications`
 * scheduling **local** notifications from the foreground/background poll
 * (no Anthropic-side push server needed). The fetcher already runs every
 * 5 minutes; we diff the latest snapshot against the previous one and
 * schedule a notification whenever something escalates into a category
 * the user opted into.
 *
 * `expo-notifications` and `AsyncStorage` are loaded lazily via require()
 * so the bundle keeps compiling before the packages are installed; the
 * functions degrade to no-ops if the modules are missing.
 */

import type { TrafficIncident } from './tflTraffic';
import type { LineStatus } from './tflLines';
import type { AppEvent } from '@/types/event';

export type NotificationChannel =
  | 'road-accidents'
  | 'line-closures'
  | 'saved-events';

export interface NotificationPrefs {
  'road-accidents': boolean;
  'line-closures': boolean;
  'saved-events': boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  'road-accidents': true,
  'line-closures': true,
  'saved-events': true,
};

const STORAGE_KEY_PREFS = 'driveiq.notif.prefs.v1';
const STORAGE_KEY_INCIDENTS = 'driveiq.notif.lastIncidents.v1';
const STORAGE_KEY_LINES = 'driveiq.notif.lastLines.v1';

// Lazy module loaders — the require() lives behind a try so a missing
// package never crashes startup. The package is wired up at build time
// once the user runs `bun add expo-notifications @react-native-async-storage/async-storage`.
let _Notifications: any = null;
let _Storage: any = null;

const getNotifications = (): any => {
  if (_Notifications !== null) return _Notifications;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _Notifications = require('expo-notifications');
  } catch {
    _Notifications = false;
  }
  return _Notifications || null;
};

const getStorage = (): any => {
  if (_Storage !== null) return _Storage;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _Storage = require('@react-native-async-storage/async-storage').default;
  } catch {
    _Storage = false;
  }
  return _Storage || null;
};

const safeGet = async (key: string): Promise<string | null> => {
  const s = getStorage();
  if (!s) return null;
  try {
    return (await s.getItem(key)) as string | null;
  } catch {
    return null;
  }
};

const safeSet = async (key: string, value: string): Promise<void> => {
  const s = getStorage();
  if (!s) return;
  try {
    await s.setItem(key, value);
  } catch {
    /* ignore */
  }
};

/** Read user prefs from disk, falling back to defaults. */
export async function loadPrefs(): Promise<NotificationPrefs> {
  const raw = await safeGet(STORAGE_KEY_PREFS);
  if (!raw) return { ...DEFAULT_PREFS };
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function savePrefs(prefs: NotificationPrefs): Promise<void> {
  await safeSet(STORAGE_KEY_PREFS, JSON.stringify(prefs));
}

/**
 * Ask for permission to show local notifications. Call once at app start
 * (idempotent — returns true if already granted).
 */
export async function ensurePermission(): Promise<boolean> {
  const N = getNotifications();
  if (!N) return false;
  try {
    const existing = await N.getPermissionsAsync();
    if (existing?.status === 'granted') return true;
    const req = await N.requestPermissionsAsync();
    return req?.status === 'granted';
  } catch {
    return false;
  }
}

const fire = async (
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> => {
  const N = getNotifications();
  if (!N) {
    console.log('[notif] (no-op)', title, body);
    return;
  }
  try {
    await N.scheduleNotificationAsync({
      content: { title, body, data, sound: 'default' },
      trigger: null, // fire immediately
    });
  } catch (e) {
    console.warn('[notif] schedule failed', e);
  }
};

/**
 * Compare a fresh traffic snapshot against the last one we saw and ping
 * the user about anything new and meaningful (severe/serious or closures).
 */
export async function diffAndNotifyIncidents(
  next: TrafficIncident[],
  prefs: NotificationPrefs,
): Promise<void> {
  if (!prefs['road-accidents']) {
    await safeSet(STORAGE_KEY_INCIDENTS, JSON.stringify(next.map((i) => i.id)));
    return;
  }

  const raw = await safeGet(STORAGE_KEY_INCIDENTS);
  let prevIds = new Set<string>();
  if (raw) {
    try {
      prevIds = new Set(JSON.parse(raw) as string[]);
    } catch {
      prevIds = new Set();
    }
  }

  // First-run guard — don't ping on initial population.
  const isFirstRun = prevIds.size === 0;

  for (const inc of next) {
    if (prevIds.has(inc.id)) continue;
    const isMajor =
      inc.severity === 'Severe' ||
      inc.severity === 'Serious' ||
      inc.hasClosures ||
      String(inc.category).toLowerCase() === 'accident';
    if (!isMajor) continue;
    if (isFirstRun) continue;

    const where = inc.location ?? 'major route';
    await fire(
      `${inc.severity} on ${where}`,
      inc.comments ?? `${inc.category}${inc.hasClosures ? ' · closure' : ''}`,
      { kind: 'road-accident', incidentId: inc.id },
    );
  }

  await safeSet(STORAGE_KEY_INCIDENTS, JSON.stringify(next.map((i) => i.id)));
}

/**
 * Compare a fresh line-status snapshot and ping when any line drops into
 * the Closed or Severe disruption bucket since last poll.
 */
export async function diffAndNotifyLines(
  next: LineStatus[],
  prefs: NotificationPrefs,
): Promise<void> {
  const snapshot: Record<string, string> = {};
  for (const l of next) snapshot[l.id] = l.severityBucket;

  if (!prefs['line-closures']) {
    await safeSet(STORAGE_KEY_LINES, JSON.stringify(snapshot));
    return;
  }

  const raw = await safeGet(STORAGE_KEY_LINES);
  let prev: Record<string, string> = {};
  if (raw) {
    try {
      prev = JSON.parse(raw) as Record<string, string>;
    } catch {
      prev = {};
    }
  }

  const isFirstRun = Object.keys(prev).length === 0;

  for (const l of next) {
    const before = prev[l.id];
    const after = l.severityBucket;
    if (before === after) continue;

    // Only ping for transitions INTO closed/severe — recoveries can stay quiet.
    const escalated =
      (after === 'closed' && before !== 'closed') ||
      (after === 'severe' && before !== 'severe' && before !== 'closed');
    if (!escalated) continue;
    if (isFirstRun) continue;

    await fire(
      `${l.name}: ${l.statusDescription}`,
      l.reason?.replace(/https?:\/\/\S+/gi, '').trim() ||
        'Tap Connections for full details.',
      { kind: 'line-closure', lineId: l.id },
    );
  }

  await safeSet(STORAGE_KEY_LINES, JSON.stringify(snapshot));
}

/**
 * Schedule a one-shot reminder for a saved event, fired one hour before
 * the start time. No-ops if `saved-events` is disabled or the event is
 * already past.
 */
export async function scheduleEventReminder(
  event: AppEvent,
  prefs: NotificationPrefs,
): Promise<void> {
  if (!prefs['saved-events']) return;
  const N = getNotifications();
  if (!N) return;

  const startMs = Date.parse(event.startsAt);
  if (!Number.isFinite(startMs)) return;
  const fireAt = startMs - 60 * 60 * 1000;
  if (fireAt < Date.now() + 30_000) return; // skip if it's already too late

  try {
    await N.scheduleNotificationAsync({
      content: {
        title: `${event.title} starts in 1 hour`,
        body: event.venue ? `at ${event.venue}` : 'Tap to plan your route.',
        data: { kind: 'saved-event', eventId: event.id },
        sound: 'default',
      },
      trigger: { date: new Date(fireAt) },
    });
  } catch (e) {
    console.warn('[notif] event reminder failed', e);
  }
}
