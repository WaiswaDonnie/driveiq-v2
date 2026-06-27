import { findLondonPlace } from '@/data/londonVenues';
import type { AppEvent, EventCategory } from '@/types/event';
import type { DateRange } from '@/utils/dateFilters';
import { defaultEndsAt } from '@/utils/duration';

/**
 * Ticketmaster Discovery API — non-sports events search.
 *
 * Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 *
 * Ticketmaster is the non-sports provider for DriveIQ — music, theatre,
 * comedy, film, family, miscellaneous. Sports events are owned by the
 * football APIs (ESPN, football-data.org). Any event Ticketmaster returns
 * in the "Sports" segment is filtered out below; this is intentional and
 * not up for relitigation.
 *
 * Pinned to London via `marketId=202` + `city=London`. Time window passed
 * as ISO-8601 UTC `startDateTime` / `endDateTime`.
 */

const API_KEY = process.env.EXPO_PUBLIC_TICKETMASTER_API_KEY ?? '';
const BASE_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';
const LONDON_MARKET_ID = '202';

interface TmVenue {
  name?: string;
  city?: { name?: string };
  location?: { latitude?: string; longitude?: string };
}

interface TmClassification {
  segment?: { name?: string };
  genre?: { name?: string };
}

interface TmEvent {
  id: string;
  name: string;
  url?: string;
  info?: string;
  description?: string;
  pleaseNote?: string;
  dates?: {
    start?: { dateTime?: string; localDate?: string; localTime?: string };
    end?: { dateTime?: string; localDate?: string; localTime?: string };
  };
  classifications?: TmClassification[];
  _embedded?: { venues?: TmVenue[] };
}

interface TmResponse {
  _embedded?: { events?: TmEvent[] };
  page?: { totalElements?: number; totalPages?: number };
}

// Ticketmaster caps page size at 200 and refuses deep paging beyond the first
// 1000 results ((page * size) must stay < 1000). size 200 × pages 0–4 = the
// full 1000 we're allowed to read, which is plenty for a 60-day London window
// and far better than the old single page of 100.
const PAGE_SIZE = 200;
const MAX_PAGES = 5;

const toIsoUtc = (d: Date): string => {
  // Ticketmaster wants UTC ISO without milliseconds: "2026-05-05T00:00:00Z"
  const x = new Date(d);
  x.setMilliseconds(0);
  return x.toISOString().replace(/\.\d{3}Z$/, 'Z');
};

// Ticketmaster files certain arena entertainment under its "Sports" segment
// even though they aren't team-sport fixtures and aren't covered by ESPN /
// football-data (e.g. WWE/wrestling, darts, e-sports). We let ONLY these
// genres through from Ticketmaster's Sports segment; real team sports
// (football, rugby, cricket, boxing, basketball…) still come solely from the
// football APIs to avoid duplicates. Match is substring, case-insensitive.
const ENTERTAINMENT_SPORTS_GENRES = ['wrestling', 'darts', 'e-sports', 'esports'];

const isAllowedEntertainmentSport = (genre?: string): boolean => {
  const g = (genre ?? '').toLowerCase();
  return ENTERTAINMENT_SPORTS_GENRES.some((k) => g.includes(k));
};

const classify = (segment?: string): { category: EventCategory; sub?: string } => {
  const s = (segment ?? '').toLowerCase();
  if (s === 'music') return { category: 'other', sub: 'Music' };
  if (s === 'arts & theatre') return { category: 'other', sub: 'Theatre' };
  if (s === 'film') return { category: 'other', sub: 'Film' };
  if (s === 'miscellaneous') return { category: 'other', sub: 'Other' };
  return { category: 'other', sub: segment };
};

const toNum = (v: string | undefined): number | null => {
  if (!v) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/** Fetch a single page of London events. Returns the raw events plus paging meta. */
async function fetchTicketmasterPage(
  range: DateRange,
  page: number,
): Promise<{ events: TmEvent[]; totalPages: number }> {
  const params = new URLSearchParams({
    apikey: API_KEY,
    // marketId 202 *is* London — passing city=London on top of it was
    // redundant and silently dropped venues whose recorded city differed
    // (e.g. Wembley, Twickenham, Croydon). marketId alone is the wider net.
    marketId: LONDON_MARKET_ID,
    countryCode: 'GB',
    size: String(PAGE_SIZE),
    page: String(page),
    sort: 'date,asc',
    startDateTime: toIsoUtc(range.start),
    endDateTime: toIsoUtc(range.end),
  });

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}?${params.toString()}`);
  } catch (e) {
    console.warn('[ticketmaster] network error (page', page, ')', e);
    return { events: [], totalPages: 0 };
  }
  if (!res.ok) {
    console.warn('[ticketmaster] non-OK (page', page, ')', res.status);
    return { events: [], totalPages: 0 };
  }

  const json = (await res.json()) as TmResponse;
  return {
    events: json._embedded?.events ?? [],
    totalPages: json.page?.totalPages ?? 0,
  };
}

export async function fetchTicketmasterLondon(range: DateRange): Promise<AppEvent[]> {
  if (!API_KEY) {
    console.warn('[ticketmaster] EXPO_PUBLIC_TICKETMASTER_API_KEY not set — skipping');
    return [];
  }

  // Page through the result set so the whole window is covered, not just the
  // nearest ~100 events. Stop once we've read every page TM reports or hit the
  // API's hard deep-paging ceiling, whichever comes first.
  const events: TmEvent[] = [];
  const first = await fetchTicketmasterPage(range, 0);
  events.push(...first.events);
  const lastPage = Math.min(first.totalPages, MAX_PAGES);
  for (let page = 1; page < lastPage; page++) {
    const next = await fetchTicketmasterPage(range, page);
    if (next.events.length === 0) break;
    events.push(...next.events);
  }

  // Tally per segment and drop reasons.
  const segmentCounts: Record<string, number> = {};
  let droppedSports = 0;
  let droppedNoCoords = 0;
  let droppedNoStart = 0;

  const out: AppEvent[] = [];
  for (const e of events) {
    const segName = e.classifications?.[0]?.segment?.name ?? 'Unknown';
    const genreName = e.classifications?.[0]?.genre?.name ?? '';
    segmentCounts[segName] = (segmentCounts[segName] ?? 0) + 1;

    // Team sports are owned by the football APIs (ESPN + football-data), so we
    // drop Ticketmaster's Sports segment — EXCEPT for arena entertainment that
    // those feeds don't carry (WWE/wrestling, darts, e-sports), which we let
    // through so big O2/Wembley dates like WWE Monday Night Raw still show.
    const isSports = segName.toLowerCase() === 'sports';
    if (isSports && !isAllowedEntertainmentSport(genreName)) {
      droppedSports++;
      continue;
    }

    const venue = e._embedded?.venues?.[0];
    let lat = toNum(venue?.location?.latitude);
    let lon = toNum(venue?.location?.longitude);

    // Ticketmaster sometimes omits coordinates for big, well-known rooms (the
    // O2, Wembley, OVO Arena, Tottenham Hotspur Stadium, Alexandra Palace…).
    // Rather than drop those marquee events, resolve the venue/city name
    // against our curated London venue table. Only drop if that fails too.
    if (lat == null || lon == null) {
      const place = findLondonPlace(venue?.name, venue?.city?.name);
      if (place) {
        lat = place.latitude;
        lon = place.longitude;
      } else {
        droppedNoCoords++;
        continue;
      }
    }

    const startsAt = e.dates?.start?.dateTime;
    if (!startsAt) {
      droppedNoStart++;
      continue;
    }

    // Allowed entertainment-sports keep a 'sports' category (so they sit under
    // the Sports filter + get a sport glyph); everything else uses the normal
    // non-sports classification.
    const cls = e.classifications?.[0];
    let category: EventCategory;
    let subCategory: string | undefined;
    if (isSports) {
      category = 'sports';
      subCategory = genreName || 'Sports';
    } else {
      const c = classify(cls?.segment?.name);
      category = c.category;
      subCategory = cls?.genre?.name ?? c.sub;
    }

    // Ticketmaster occasionally returns dates.end.dateTime for concerts and
    // festivals; otherwise fall back to a sane duration default keyed off
    // the sub-category (3h for music/theatre, 2h for film, etc.).
    const endsAt =
      e.dates?.end?.dateTime ?? defaultEndsAt(startsAt, subCategory);

    out.push({
      id: `ticketmaster-${e.id}`,
      source: 'ticketmaster',
      category,
      title: e.name,
      startsAt,
      endsAt,
      venue: venue?.name ?? venue?.city?.name ?? 'London',
      latitude: lat,
      longitude: lon,
      description: e.info ?? e.description ?? e.pleaseNote,
      subCategory,
      url: e.url,
    });
  }

  const segSummary =
    Object.entries(segmentCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}=${v}`)
      .join(', ') || 'none';
  console.log(
    `[ticketmaster] ${events.length} raw events across up to ${Math.min(first.totalPages, MAX_PAGES)} page(s) → ${out.length} usable ` +
      `(segments: ${segSummary}; dropped: ${droppedSports} sports (owned by ESPN/football-data), ${droppedNoCoords} no-coords, ${droppedNoStart} no-start)`,
  );
  return out;
}
