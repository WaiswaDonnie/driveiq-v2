import type { AppEvent } from '@/types/event';
import type { DateRange } from '@/utils/dateFilters';

import { fetchSampleEvents } from './sampleEvents';
import { fetchSportmonksLondon } from './sportmonks';
import { fetchTicketmasterLondon } from './ticketmaster';

/**
 * Single entry-point used by the UI. Fans out to both providers in parallel,
 * merges the result, de-duplicates by id, and falls back to sample data if
 * neither provider returned anything (e.g. no API keys yet).
 */
export async function fetchAllEvents(range: DateRange): Promise<AppEvent[]> {
  const [sportmonks, ticketmaster] = await Promise.all([
    fetchSportmonksLondon(range).catch((e) => {
      console.warn('[events] sportmonks failed', e);
      return [] as AppEvent[];
    }),
    fetchTicketmasterLondon(range).catch((e) => {
      console.warn('[events] ticketmaster failed', e);
      return [] as AppEvent[];
    }),
  ]);

  const combined = [...sportmonks, ...ticketmaster];

  if (combined.length === 0) {
    // No keys configured (or both providers down) — show sample data so the UI
    // is still demonstrable.
    return fetchSampleEvents(range);
  }

  // De-duplicate just in case both providers surface the same fixture.
  const byId = new Map<string, AppEvent>();
  for (const e of combined) byId.set(e.id, e);
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}
