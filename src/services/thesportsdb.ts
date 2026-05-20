import { findLondonPlace } from '@/data/londonVenues';
import type { AppEvent } from '@/types/event';
import { isInRange, type DateRange } from '@/utils/dateFilters';

/**
 * TheSportsDB — multi-sport events for London.
 *
 * TheSportsDB exposes a `/eventsday.php?d=YYYY-MM-DD&s=<Sport>` endpoint that
 * returns every event of a given sport on a given calendar day. We fan out
 * across the (date × sport) cartesian product for the active filter range,
 * then resolve each event against our curated `londonVenues` map. If neither
 * the venue name nor the home-team name matches a known London location, the
 * event is dropped — that's how we strictly limit results to "in London".
 *
 * Free API key "3" works without registration (rate-limited but plenty for
 * this app). For higher quotas, add `EXPO_PUBLIC_THESPORTSDB_API_KEY` to
 * your `.env` (TheSportsDB's Patreon supporters get a personal key).
 */

const API_KEY = process.env.EXPO_PUBLIC_THESPORTSDB_API_KEY ?? '3';
const BASE = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

/** Sports we query — ordered by likelihood of having a London event. */
const SPORTS: { tsdb: string; sub: string }[] = [
  { tsdb: 'Soccer', sub: 'Football' },
  { tsdb: 'Cricket', sub: 'Cricket' },
  { tsdb: 'Rugby', sub: 'Rugby' },
  { tsdb: 'Tennis', sub: 'Tennis' },
  { tsdb: 'Boxing', sub: 'Boxing' },
  { tsdb: 'American Football', sub: 'American Football' },
  { tsdb: 'Basketball', sub: 'Basketball' },
  { tsdb: 'Ice Hockey', sub: 'Ice Hockey' },
  { tsdb: 'MMA', sub: 'MMA' },
  { tsdb: 'Motorsport', sub: 'Motorsport' },
];

interface TsdbEvent {
  idEvent: string;
  strEvent?: string;
  strEventAlternate?: string;
  dateEvent?: string;          // "2026-05-05"
  strTime?: string;            // "19:30:00"
  strTimestamp?: string;       // "2026-05-05T19:30:00+00:00"
  strVenue?: string | null;
  strHomeTeam?: string | null;
  strAwayTeam?: string | null;
  strLeague?: string | null;
  strSport?: string | null;
  strDescriptionEN?: string | null;
}

interface TsdbResponse {
  events: TsdbEvent[] | null;
}

const pad = (n: number): string => String(n).padStart(2, '0');

const datesInRange = (range: DateRange): string[] => {
  const out: string[] = [];
  const cur = new Date(range.start);
  cur.setHours(0, 0, 0, 0);
  const stop = new Date(range.end);
  stop.setHours(0, 0, 0, 0);
  while (cur.getTime() <= stop.getTime()) {
    out.push(`${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
};

const buildIso = (e: TsdbEvent): string | null => {
  if (e.strTimestamp) {
    // "2026-05-05T19:30:00+00:00" → "2026-05-05T19:30:00Z"
    return e.strTimestamp.replace(/\+00:00$/, 'Z');
  }
  if (e.dateEvent) {
    const time = e.strTime && e.strTime !== '00:00:00' ? e.strTime : '12:00:00';
    return `${e.dateEvent}T${time}Z`;
  }
  return null;
};

const fetchOne = async (date: string, sport: string): Promise<TsdbEvent[]> => {
  const url = `${BASE}/eventsday.php?d=${date}&s=${encodeURIComponent(sport)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('[thesportsdb] non-OK', sport, date, res.status);
      return [];
    }
    const json = (await res.json()) as TsdbResponse;
    return json.events ?? [];
  } catch (e) {
    console.warn('[thesportsdb] network error', sport, date, e);
    return [];
  }
};

export async function fetchSportsLondon(range: DateRange): Promise<AppEvent[]> {
  const dates = datesInRange(range);
  if (dates.length === 0) return [];

  // Fan out (date × sport). The free API tolerates this volume comfortably.
  const requests: Promise<{ events: TsdbEvent[]; sub: string }>[] = [];
  for (const date of dates) {
    for (const sport of SPORTS) {
      requests.push(
        fetchOne(date, sport.tsdb).then((events) => ({ events, sub: sport.sub })),
      );
    }
  }

  const batches = await Promise.all(requests);

  const out: AppEvent[] = [];
  const seen = new Set<string>();

  for (const { events, sub } of batches) {
    for (const e of events) {
      if (seen.has(e.idEvent)) continue;

      // Strict London check: prefer the venue, fall back to home team.
      const place = findLondonPlace(e.strVenue, e.strHomeTeam);
      if (!place) continue;

      const iso = buildIso(e);
      if (!iso || !isInRange(iso, range)) continue;

      const title =
        e.strEvent ||
        e.strEventAlternate ||
        (e.strHomeTeam && e.strAwayTeam
          ? `${e.strHomeTeam} vs ${e.strAwayTeam}`
          : `${sub} fixture`);

      seen.add(e.idEvent);
      out.push({
        id: `tsdb-${e.idEvent}`,
        source: 'thesportsdb',
        category: 'sports',
        title,
        startsAt: iso,
        venue: place.venue,
        latitude: place.latitude,
        longitude: place.longitude,
        description:
          e.strLeague ?? e.strDescriptionEN?.slice(0, 200) ?? undefined,
        subCategory: sub,
      });
    }
  }

  console.log(
    `[thesportsdb] ${dates[0]}→${dates[dates.length - 1]}: ${out.length} London events across ${SPORTS.length} sports`,
  );
  return out.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}
