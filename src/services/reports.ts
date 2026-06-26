import { colors } from '@/theme/colors';
import { getJSON, setJSON } from './storage';

/**
 * Community reports.
 *
 * Lightweight, locally-stored "drop a pin on what's happening" feature — the
 * spiritual successor to the old add/report flow, rebuilt around the map. A
 * report is a category + optional note pinned to a coordinate. Reports auto-
 * expire so the map doesn't fill up with stale hazards.
 *
 * NOTE: this is device-local for now (no shared backend). When we wire a
 * backend, `loadReports` / `addReport` become the network boundary and the
 * rest of the UI stays unchanged.
 */

export type ReportCategory =
  | 'hazard'
  | 'accident'
  | 'roadworks'
  | 'police'
  | 'closure'
  | 'event'
  | 'other';

export interface UserReport {
  id: string;
  category: ReportCategory;
  note?: string;
  latitude: number;
  longitude: number;
  /** ISO timestamp. */
  createdAt: string;
}

export interface ReportMeta {
  label: string;
  /** Ionicons name. */
  icon: string;
  color: string;
  /** Hours before the report auto-expires off the map. */
  ttlHours: number;
}

export const REPORT_META: Record<ReportCategory, ReportMeta> = {
  hazard: { label: 'Hazard', icon: 'warning', color: '#E8A317', ttlHours: 6 },
  accident: { label: 'Accident', icon: 'car-sport', color: '#DC2626', ttlHours: 6 },
  roadworks: { label: 'Roadworks', icon: 'construct', color: '#F97316', ttlHours: 24 },
  police: { label: 'Police', icon: 'shield', color: '#2563EB', ttlHours: 4 },
  closure: { label: 'Road closed', icon: 'remove-circle', color: '#B91C1C', ttlHours: 12 },
  event: { label: 'Event', icon: 'sparkles', color: colors.primary, ttlHours: 48 },
  other: { label: 'Other', icon: 'flag', color: colors.textSecondary, ttlHours: 6 },
};

export const REPORT_ORDER: ReportCategory[] = [
  'hazard',
  'accident',
  'roadworks',
  'closure',
  'police',
  'event',
  'other',
];

const STORAGE_KEY = 'driveiq.reports.v1';

/** Drop reports past their per-category TTL. */
function prune(reports: UserReport[]): UserReport[] {
  const now = Date.now();
  return reports.filter((r) => {
    const ttl = (REPORT_META[r.category]?.ttlHours ?? 6) * 60 * 60 * 1000;
    const age = now - Date.parse(r.createdAt);
    return Number.isFinite(age) && age < ttl;
  });
}

export async function loadReports(): Promise<UserReport[]> {
  const all = await getJSON<UserReport[]>(STORAGE_KEY, []);
  const fresh = prune(all);
  if (fresh.length !== all.length) await setJSON(STORAGE_KEY, fresh);
  return fresh;
}

export async function addReport(
  input: Omit<UserReport, 'id' | 'createdAt'>,
): Promise<UserReport[]> {
  const report: UserReport = {
    ...input,
    id: `report-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    createdAt: new Date().toISOString(),
  };
  const current = await loadReports();
  const next = [report, ...current];
  await setJSON(STORAGE_KEY, next);
  return next;
}

export async function removeReport(id: string): Promise<UserReport[]> {
  const current = await loadReports();
  const next = current.filter((r) => r.id !== id);
  await setJSON(STORAGE_KEY, next);
  return next;
}
