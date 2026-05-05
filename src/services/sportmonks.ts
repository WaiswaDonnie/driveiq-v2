import type { AppEvent } from '@/types/event';
import type { DateRange } from '@/utils/dateFilters';

/**
 * SportMonks Football API — fixtures between two dates.
 *
 * Docs: https://docs.sportmonks.com/football/endpoints-and-entities/endpoints/fixtures/get-fixtures-by-date-range
 *
 * The free-tier "Football" API returns fixtures for the leagues your subscription includes.
 * We use the `/fixtures/between/{start}/{end}` endpoint and pull venue + participants in one
 * shot via `include=`. Results are filtered to venues whose city is "London" so we only
 * surface London fixtures.
 */

const API_KEY = process.env.EXPO_PUBLIC_SPORTMONKS_API_KEY ?? '';
const BASE_URL = 'https://api.sportmonks.com/v3/football';

// Locality match — SportMonks returns city names like "London". We accept a small allow-list
// to catch boroughs that English football venues commonly sit in.
const LONDON_CITIES = new Set([
  'london',
  'wembley',
  'stratford',
  'fulham',
  'islington',
  'tottenham',
  'west ham',
  'hammersmith',
  'kensington',
  'brentford',
]);

interface SmVenue {
  id: number;
  name: string;
  city_name?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
}

interface SmParticipant {
  name: string;
  meta?: { location?: 'home' | 'away' | string | null } | null;
}

interface SmFixture {
  id: number;
  name?: string;
  starting_at: string; // "2026-05-05 19:30:00" (UTC)
  league?: { name?: string };
  venue?: SmVenue | null;
  participants?: SmParticipant[];
}

interface SmPagination {
  count: number;
  per_page: number;
  current_page: number;
  next_page: string | null;
  has_more: boolean;
}

interface SmListResponse<T> {
  data: T[];
  pagination?: SmPagination;
}

const fmtDate = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const isLondon = (v: SmVenue | null | undefined): boolean => {
  const city = (v?.city_name ?? '').trim().toLowerCase();
  if (!city) return false;
  return LONDON_CITIES.has(city) || city.includes('london');
};

const toIso = (raw: string): string => {
  // SportMonks returns "YYYY-MM-DD HH:mm:ss" in UTC. Convert to ISO.
  const [date, time] = raw.split(' ');
  return `${date}T${time ?? '00:00:00'}Z`;
};

const toNum = (v: string | number | null | undefined): number | null => {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

// Sportmonks does not guarantee participants[0] is the home side. Use the
// per-participant `meta.location` field; fall back to array order if missing.
const matchupTitle = (f: SmFixture): string => {
  const parts = f.participants ?? [];
  const home = parts.find((p) => p.meta?.location === 'home')?.name;
  const away = parts.find((p) => p.meta?.location === 'away')?.name;
  if (home && away) return `${home} vs ${away}`;
  if (f.name) return f.name;
  const a = parts[0]?.name;
  const b = parts[1]?.name;
  if (a && b) return `${a} vs ${b}`;
  return 'Football fixture';
};

export async function fetchSportmonksLondon(range: DateRange): Promise<AppEvent[]> {
  if (!API_KEY) {
    console.warn('[sportmonks] EXPO_PUBLIC_SPORTMONKS_API_KEY is not set');
    return [];
  }

  const start = fmtDate(range.start);
  const end = fmtDate(range.end);

  // Sportmonks caps `per_page` at 25 on most plans, so we follow `next_page`
  // rather than relying on a single bumped-up page size. Cap iterations to
  // avoid runaway loops if the API ever returns a malformed cursor.
  const baseUrl =
    `${BASE_URL}/fixtures/between/${start}/${end}` +
    `?api_token=${encodeURIComponent(API_KEY)}` +
    `&include=venue;participants;league` +
    `&per_page=50`;

  const fixtures: SmFixture[] = [];
  let nextUrl: string | null = baseUrl;
  let page = 0;
  const MAX_PAGES = 20;

  while (nextUrl && page < MAX_PAGES) {
    page += 1;
    let res: Response;
    try {
      res = await fetch(nextUrl);
    } catch (e) {
      console.warn('[sportmonks] network error', e);
      return [];
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[sportmonks] non-OK response', res.status, body.slice(0, 200));
      return [];
    }

    const json = (await res.json()) as SmListResponse<SmFixture>;
    fixtures.push(...(json.data ?? []));
    nextUrl = json.pagination?.has_more ? json.pagination.next_page : null;
  }

  const events: AppEvent[] = [];
  for (const f of fixtures) {
    const lat = toNum(f.venue?.latitude);
    const lon = toNum(f.venue?.longitude);
    if (lat == null || lon == null) continue;
    if (!isLondon(f.venue)) continue;

    events.push({
      id: `sportmonks-${f.id}`,
      source: 'sportmonks',
      category: 'sports',
      title: matchupTitle(f),
      startsAt: toIso(f.starting_at),
      venue: f.venue?.name ?? 'London',
      latitude: lat,
      longitude: lon,
      description: f.league?.name ? `${f.league.name} fixture` : undefined,
      subCategory: 'Football',
    });
  }
  console.log(`[sportmonks] ${start}→${end}: ${fixtures.length} fixtures, ${events.length} in London`);
  return events;
}
