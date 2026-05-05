import type { AppEvent, EventCategory } from '@/types/event';
import type { DateRange } from '@/utils/dateFilters';

/**
 * Ticketmaster Discovery API — events search.
 *
 * Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 *
 * We pin to London via `marketId=202` (London market) and additionally pass
 * `city=London` for redundancy. Time window is supplied as `startDateTime` /
 * `endDateTime` in ISO-8601 UTC.
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
  dates?: { start?: { dateTime?: string; localDate?: string; localTime?: string } };
  classifications?: TmClassification[];
  _embedded?: { venues?: TmVenue[] };
}

interface TmResponse {
  _embedded?: { events?: TmEvent[] };
  page?: { totalElements?: number };
}

const toIsoUtc = (d: Date): string => {
  // Ticketmaster wants UTC ISO without milliseconds: "2026-05-05T00:00:00Z"
  const x = new Date(d);
  x.setMilliseconds(0);
  return x.toISOString().replace(/\.\d{3}Z$/, 'Z');
};

const classify = (segment?: string): { category: EventCategory; sub?: string } => {
  const s = (segment ?? '').toLowerCase();
  if (s === 'sports') return { category: 'sports', sub: 'Sports' };
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

export async function fetchTicketmasterLondon(range: DateRange): Promise<AppEvent[]> {
  if (!API_KEY) return [];

  const params = new URLSearchParams({
    apikey: API_KEY,
    marketId: LONDON_MARKET_ID,
    city: 'London',
    countryCode: 'GB',
    size: '100',
    sort: 'date,asc',
    startDateTime: toIsoUtc(range.start),
    endDateTime: toIsoUtc(range.end),
  });

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}?${params.toString()}`);
  } catch (e) {
    console.warn('[ticketmaster] network error', e);
    return [];
  }
  if (!res.ok) {
    console.warn('[ticketmaster] non-OK response', res.status);
    return [];
  }

  const json = (await res.json()) as TmResponse;
  const events = json._embedded?.events ?? [];

  const out: AppEvent[] = [];
  for (const e of events) {
    const venue = e._embedded?.venues?.[0];
    const lat = toNum(venue?.location?.latitude);
    const lon = toNum(venue?.location?.longitude);
    if (lat == null || lon == null) continue;

    const startsAt = e.dates?.start?.dateTime;
    if (!startsAt) continue;

    const cls = e.classifications?.[0];
    const { category, sub } = classify(cls?.segment?.name);

    out.push({
      id: `ticketmaster-${e.id}`,
      source: 'ticketmaster',
      category,
      title: e.name,
      startsAt,
      venue: venue?.name ?? venue?.city?.name ?? 'London',
      latitude: lat,
      longitude: lon,
      description: e.info ?? e.description ?? e.pleaseNote,
      subCategory: cls?.genre?.name ?? sub,
      url: e.url,
    });
  }
  return out;
}
