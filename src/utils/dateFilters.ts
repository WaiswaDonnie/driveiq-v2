/**
 * Date-range helpers that power the Today / Tomorrow / Next 3 Days / This Week filter bar.
 *
 * Each filter returns an inclusive [start, end] window in local time so the API services
 * can request only the relevant slice of data.
 */

export type FilterKey = 'today' | 'tomorrow' | 'next3' | 'all';

export interface DateRange {
  start: Date;
  end: Date;
}

export const FILTER_LABELS: Record<FilterKey, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  next3: 'Next 3 Days',
  all: 'All',
};

const startOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const addDays = (d: Date, days: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

/**
 * Build the date range for a given filter, anchored at `now` (defaults to current time).
 *
 * - `today`     — start of today → end of today
 * - `tomorrow`  — start of tomorrow → end of tomorrow
 * - `next3`     — start of today → end of (today + 2)  (today + next 2 days = 3 days total)
 * - `all`       — start of today → end of (today + 6) — a full 7-day rolling window
 */
export function rangeFor(filter: FilterKey, now: Date = new Date()): DateRange {
  const today = startOfDay(now);
  switch (filter) {
    case 'today':
      return { start: today, end: endOfDay(today) };
    case 'tomorrow': {
      const t = addDays(today, 1);
      return { start: t, end: endOfDay(t) };
    }
    case 'next3':
      return { start: today, end: endOfDay(addDays(today, 2)) };
    case 'all':
      return { start: today, end: endOfDay(addDays(today, 6)) };
  }
}

/** Returns true if `iso` falls inside `range` (inclusive on both ends). */
export function isInRange(iso: string, range: DateRange): boolean {
  const t = new Date(iso).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
}

/** Format an ISO date for display: "Tue 5 May · 19:30". */
export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString(undefined, { weekday: 'short' });
  const date = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${day} ${date} · ${time}`;
}
