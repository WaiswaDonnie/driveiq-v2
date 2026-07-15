import {
  findLondonPlace,
  LONDON_VENUE_LIST,
  type LondonPlace,
} from '@/data/londonVenues';
import type { AppEvent } from '@/types/event';
import { isInRange, type DateRange } from '@/utils/dateFilters';
import { defaultEndsAt } from '@/utils/duration';

/**
 * Unified TheSportsDB service — covers every professional sport happening in
 * London by iterating over our curated `LONDON_VENUE_LIST` and asking
 * TheSportsDB what's next at each venue. This replaces both `sportmonks.ts`
 * (football-only, expensive) and the prior `thesportsdb.ts` (sport-by-day
 * enumeration, lots of wasted calls).
 *
 * Two execution paths:
 *
 *   1. Premium (recommended) — `EXPO_PUBLIC_SPORTSDB_API_KEY` is set to a
 *      personal Premium key ($9/month). We call the v2 endpoint
 *      `/api/v2/json/schedule/next/venue/{idVenue}` per venue with the key
 *      in the `X-API-KEY` header. One call per venue gets the next ~10
 *      events at that venue of any sport — football, rugby, cricket,
 *      tennis, NFL, basketball, boxing, MMA, darts, etc.
 *
 *   2. Free-tier fallback — when no Premium key is configured we fall back
 *      to the v1 `eventsday.php?d=...&s=<sport>` per-day-per-sport
 *      enumeration the old service used. Less efficient and rate-limited,
 *      but means the map still populates without a paid subscription.
 *
 * Both paths normalise output to the same `AppEvent` shape and resolve
 * coordinates through `londonVenues.ts` so the downstream UI sees a single
 * consistent stream.
 */

const PREMIUM_KEY = process.env.EXPO_PUBLIC_SPORTSDB_API_KEY ?? '';
const FREE_KEY = '123';

const V1_BASE = (key: string) => `https://www.thesportsdb.com/api/v1/json/${key}`;
const V2_BASE = 'https://www.thesportsdb.com/api/v2/json';

/**
 * Leagues queried in the free-tier fallback.
 *
 * `eventsday.php?d=YYYY-MM-DD` is documented as "Free Limit: 3", but in
 * practice the free `123` key only returns data for the seeded example
 * date (2014-10-10) — current dates come back empty. So we use
 * `eventsnextleague.php?id={idLeague}` instead, which works on free for
 * the leagues TheSportsDB has seeded (notably idLeague 4328 = English
 * Premier League).
 *
 * Other league IDs are included opportunistically — they'll either return
 * data on free tier (great) or silently fail (we shrug and move on).
 * Upgrading to Premium is what unlocks the full breadth via the v2
 * venue-loop path.
 */
const FREE_TIER_LEAGUES: { id: number; name: string; sub: string }[] = [
  { id: 4328, name: 'English Premier League', sub: 'Football' },
  { id: 4329, name: 'English Championship', sub: 'Football' },
  { id: 4396, name: 'English League One', sub: 'Football' },
  { id: 4480, name: 'English League Two', sub: 'Football' },
  { id: 4481, name: 'English National League', sub: 'Football' },
  { id: 4395, name: 'FA Cup', sub: 'Football' },
  { id: 4346, name: 'NFL', sub: 'American Football' },
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
  events?: TsdbEvent[] | null;
  schedule?: TsdbEvent[] | null;
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
    return e.strTimestamp.replace(/\+00:00$/, 'Z');
  }
  if (e.dateEvent) {
    const time = e.strTime && e.strTime !== '00:00:00' ? e.strTime : '12:00:00';
    return `${e.dateEvent}T${time}Z`;
  }
  return null;
};

/**
 * Map a sport string to the bucket the UI uses for sub-category filtering.
 * Matches the heuristic in `eventIcons.ts` so the right pin glyph renders.
 */
const subCategoryFor = (sport: string | undefined | null): string => {
  const s = (sport ?? '').toLowerCase();
  if (s.includes('american') || s.includes('nfl')) return 'American Football';
  if (s.includes('soccer') || s.includes('football')) return 'Football';
  if (s.includes('rugby')) return 'Rugby';
  if (s.includes('cricket')) return 'Cricket';
  if (s.includes('basketball')) return 'Basketball';
  if (s.includes('tennis')) return 'Tennis';
  if (s.includes('box')) return 'Boxing';
  if (s.includes('mma') || s.includes('ufc')) return 'MMA';
  if (s.includes('ice hockey') || s.includes('hockey')) return 'Hockey';
  if (s.includes('motorsport') || s.includes('formula')) return 'Motorsport';
  if (s.includes('darts')) return 'Darts';
  return sport ?? 'Sports';
};

/**
 * Normalise a raw TheSportsDB event into the AppEvent shape. Coordinates are
 * pulled from the curated `londonVenues.ts` first (most accurate), with the
 * venue's known lat/lon as the fallback when the event doesn't match any
 * recognised London venue.
 */
const normalise = (
  e: TsdbEvent,
  range: DateRange,
  knownPlace?: LondonPlace,
): AppEvent | null => {
  const iso = buildIso(e);
  if (!iso || !isInRange(iso, range)) return null;

  const place =
    knownPlace ?? findLondonPlace(e.strVenue, e.strHomeTeam) ?? null;
  if (!place) return null;

  const title =
    e.strEvent ||
    e.strEventAlternate ||
    (e.strHomeTeam && e.strAwayTeam
      ? `${e.strHomeTeam} vs ${e.strAwayTeam}`
      : `${subCategoryFor(e.strSport)} fixture`);

  const sub = subCategoryFor(e.strSport);
  return {
    id: `tsdb-${e.idEvent}`,
    source: 'thesportsdb',
    category: 'sports',
    title,
    startsAt: iso,
    endsAt: defaultEndsAt(iso, sub),
    venue: place.venue,
    latitude: place.latitude,
    longitude: place.longitude,
    description: e.strLeague ?? e.strDescriptionEN?.slice(0, 200) ?? undefined,
    subCategory: sub,
  };
};

// ─── Premium path: v2 venue schedule ─────────────────────────────────────

const fetchVenueSchedule = async (
  venueId: number,
): Promise<TsdbEvent[]> => {
  const url = `${V2_BASE}/schedule/next/venue/${venueId}`;
  try {
    const res = await fetch(url, {
      headers: { 'X-API-KEY': PREMIUM_KEY },
    });
    if (!res.ok) {
      console.warn('[sportsdb v2] non-OK', venueId, res.status);
      return [];
    }
    const json = (await res.json()) as TsdbResponse;
    return json.schedule ?? json.events ?? [];
  } catch (e) {
    console.warn('[sportsdb v2] network error', venueId, e);
    return [];
  }
};

// ─── Runtime venue-id resolution ─────────────────────────────────────────
// The hardcoded sportsdbVenueId fields were never populated (all null), so
// the venue loop iterated over an EMPTY list — the "always check the big
// venues" guarantee never actually ran, which is how today's cricket at
// Lord's and the Oval went missing (client report, 8 July 2026). Instead of
// depending on a manual script, resolve each venue's id via searchvenues.php
// on first use and cache it for the app session.

const venueIdCache = new Map<string, number | null>();

/** Search terms tried in order — full name first, then a trimmed alias. */
const searchTermsFor = (place: LondonPlace): string[] => {
  const full = place.venue;
  const trimmed = full
    .replace(/\b(Cricket Ground|Community Stadium|National Sports Centre)\b/i, '')
    .trim();
  return trimmed && trimmed !== full ? [full, trimmed] : [full];
};

const resolveVenueId = async (place: LondonPlace): Promise<number | null> => {
  if (typeof place.sportsdbVenueId === 'number') return place.sportsdbVenueId;
  if (venueIdCache.has(place.venue)) return venueIdCache.get(place.venue) ?? null;

  for (const term of searchTermsFor(place)) {
    try {
      const res = await fetch(
        `${V1_BASE(PREMIUM_KEY || FREE_KEY)}/searchvenues.php?t=${encodeURIComponent(term)}`,
      );
      if (!res.ok) continue;
      const json = (await res.json()) as {
        venues?: { idVenue?: string; strVenue?: string; strCountry?: string }[];
      };
      const candidates = json.venues ?? [];
      // Prefer an English venue; fall back to the first hit.
      const hit =
        candidates.find((v) => (v.strCountry ?? '').toLowerCase().includes('england')) ??
        candidates[0];
      const id = hit?.idVenue != null ? parseInt(hit.idVenue, 10) : NaN;
      if (Number.isFinite(id)) {
        venueIdCache.set(place.venue, id);
        return id;
      }
    } catch (e) {
      console.warn('[sportsdb] venue-id lookup failed', place.venue, e);
    }
  }
  venueIdCache.set(place.venue, null);
  return null;
};

const fetchPremiumByVenue = async (range: DateRange): Promise<AppEvent[]> => {
  // Resolve ids for every curated venue (cached after the first fetch), then
  // ask TheSportsDB what's next at each — cricket, football, rugby, anything.
  const resolved = await Promise.all(
    LONDON_VENUE_LIST.map(async (v) => ({
      place: v,
      id: await resolveVenueId(v),
    })),
  );
  const venuesWithIds = resolved
    .filter((r): r is { place: LondonPlace; id: number } => r.id != null)
    .map((r) => ({ ...r.place, sportsdbVenueId: r.id }));

  console.log(
    `[sportsdb v2] venue ids resolved for ${venuesWithIds.length}/${LONDON_VENUE_LIST.length} venues`,
  );

  if (venuesWithIds.length === 0) {
    console.warn(
      '[sportsdb v2] no venue IDs could be resolved — venue loop skipped this fetch.',
    );
    return [];
  }

  // Parallel — bounded only by TheSportsDB's 100 req/min Premium rate limit,
  // which is well above the ~30 venues we'd ever iterate here.
  const batches = await Promise.all(
    venuesWithIds.map(async (v) => ({
      events: await fetchVenueSchedule(v.sportsdbVenueId),
      place: v,
    })),
  );

  const out: AppEvent[] = [];
  const seen = new Set<string>();
  for (const { events, place } of batches) {
    for (const e of events) {
      if (seen.has(e.idEvent)) continue;
      const norm = normalise(e, range, place);
      if (!norm) continue;
      seen.add(e.idEvent);
      out.push(norm);
    }
  }
  console.log(
    `[sportsdb v2] ${venuesWithIds.length} venues queried, ${out.length} London events in range`,
  );
  return out;
};

// ─── Free-tier fallback: v1 league-next enumeration ─────────────────────

const fetchLeagueNext = async (
  leagueId: number,
  leagueName: string,
): Promise<TsdbEvent[]> => {
  const url = `${V1_BASE(FREE_KEY)}/eventsnextleague.php?id=${leagueId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('[sportsdb v1] non-OK', leagueName, res.status);
      return [];
    }
    const json = (await res.json()) as TsdbResponse;
    return json.events ?? [];
  } catch (e) {
    console.warn('[sportsdb v1] network error', leagueName, e);
    return [];
  }
};

const fetchFreeTierByLeague = async (
  range: DateRange,
): Promise<AppEvent[]> => {
  const batches = await Promise.all(
    FREE_TIER_LEAGUES.map(async (l) => ({
      events: await fetchLeagueNext(l.id, l.name),
      league: l,
    })),
  );

  let totalRaw = 0;
  let droppedNotLondon = 0;
  let droppedOutOfRange = 0;
  const out: AppEvent[] = [];
  const seen = new Set<string>();

  for (const { events, league } of batches) {
    totalRaw += events.length;
    for (const e of events) {
      if (seen.has(e.idEvent)) continue;

      // Resolve via curated London venue map.
      const place = findLondonPlace(e.strVenue, e.strHomeTeam);
      if (!place) {
        droppedNotLondon++;
        continue;
      }

      const norm = normalise(
        { ...e, strSport: e.strSport ?? league.sub },
        range,
        place,
      );
      if (!norm) {
        droppedOutOfRange++;
        continue;
      }

      seen.add(e.idEvent);
      out.push(norm);
    }
  }

  // Verbose breakdown so it's obvious whether the API returned nothing,
  // returned non-London fixtures, or returned fixtures outside the active
  // date range. Helps spot which step is silently filtering everything out.
  console.log(
    `[sportsdb v1] ${FREE_TIER_LEAGUES.length} leagues queried, ` +
      `${totalRaw} raw fixtures → ${out.length} London events ` +
      `(dropped: ${droppedNotLondon} non-London, ${droppedOutOfRange} out of range)`,
  );
  return out;
};

// ─── Public entry point ────────────────────────────────────────────────

/**
 * Returns every London sports event in the date range, regardless of league
 * or sport. Routes through Premium (v2 venue schedule) when a Premium key is
 * configured, falling back to the free-tier sport-by-day pull otherwise.
 */
export async function fetchSportsLondon(range: DateRange): Promise<AppEvent[]> {
  const out = PREMIUM_KEY
    ? await fetchPremiumByVenue(range)
    : await fetchFreeTierByLeague(range);

  return out.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}
