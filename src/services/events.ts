import type { AppEvent } from '@/types/event';
import type { DateRange } from '@/utils/dateFilters';

import { fetchCricinfoLondon } from './cricinfo';
import { fetchEspnLondon } from './espn';
import { fetchFeaturedLondon } from './featuredEvents';
import { fetchFootballDataLondon } from './footballData';
import { fetchSampleEvents } from './sampleEvents';
import { fetchSportsLondon } from './sportsdb';
import { fetchTicketmasterLondon } from './ticketmaster';

/**
 * Single entry-point used by the UI. Fans out to every provider in parallel,
 * merges the result, de-duplicates by id, and falls back to sample data if
 * none of them returned anything (e.g. no API keys configured yet).
 *
 *   - espn          → ALL sports across every London-relevant feed:
 *                     soccer (every English division + friendlies + WSL +
 *                     UCL/UEL/WC), cricket (Test, county, T20 Blast,
 *                     internationals), rugby (Premiership, Six Nations,
 *                     World Cup), NFL, NBA, WNBA, boxing, UFC/MMA.
 *                     Unofficial but no rate limit, no auth.
 *   - football-data → backup football source for when ESPN endpoints
 *                     change. Free tier covers PL, Championship, FA Cup,
 *                     Champions League.
 *   - sportsdb      → multi-sport coverage. Premium path uses v2 venue
 *                     loop; free path falls back to league-next on the
 *                     limited free `123` key.
 *   - ticketmaster  → non-sports only: music, theatre, comedy, film,
 *                     family, misc. Sports come from ESPN/football-data.
 */
export async function fetchAllEvents(range: DateRange): Promise<AppEvent[]> {
  const [espn, cricinfo, footballData, sports, ticketmaster, featured] =
    await Promise.all([
      fetchEspnLondon(range).catch((e) => {
        console.warn('[events] espn failed', e);
        return [] as AppEvent[];
      }),
      fetchCricinfoLondon(range).catch((e) => {
        console.warn('[events] cricinfo failed', e);
        return [] as AppEvent[];
      }),
      fetchFootballDataLondon(range).catch((e) => {
        console.warn('[events] football-data failed', e);
        return [] as AppEvent[];
      }),
      fetchSportsLondon(range).catch((e) => {
        console.warn('[events] sportsdb failed', e);
        return [] as AppEvent[];
      }),
      fetchTicketmasterLondon(range).catch((e) => {
        console.warn('[events] ticketmaster failed', e);
        return [] as AppEvent[];
      }),
      fetchFeaturedLondon(range).catch((e) => {
        console.warn('[events] featured failed', e);
        return [] as AppEvent[];
      }),
    ]);

  const apiCombined = [...espn, ...cricinfo, ...footballData, ...sports, ...ticketmaster];

  // Curated featured events (Ascot, Wimbledon, …) always ride alongside the
  // API results. When no API keys are configured we still want the demo to
  // look populated, so fall back to sample data — but keep featured on top.
  const base = apiCombined.length === 0 ? await fetchSampleEvents(range) : apiCombined;
  const combined = [...featured, ...base];

  // De-duplicate just in case two sources surface the same fixture (featured
  // wins since it's inserted first).
  const byId = new Map<string, AppEvent>();
  for (const e of combined) if (!byId.has(e.id)) byId.set(e.id, e);
  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
  warnOnEmptyMarqueeVenues(merged);
  return merged;
}

/**
 * Marquee venues that must ALWAYS be checked (client requirement): if any of
 * these has zero events in the next 7 days, shout in the logs. In season
 * these grounds are never genuinely dark for a week — an empty result almost
 * always means a provider gap (e.g. the county cricket fixtures that went
 * missing at Lord's and the Oval on 8 July 2026), so this is the tripwire
 * that catches it before the client does.
 */
const MARQUEE_VENUES = [
  "Lord's Cricket Ground",
  'The Oval',
  'Wembley Stadium',
  'Twickenham Stadium',
  'The O2 Arena',
  'Emirates Stadium',
  'Tottenham Hotspur Stadium',
  'Stamford Bridge',
  'London Stadium',
  'All England Lawn Tennis Club',
];

function warnOnEmptyMarqueeVenues(events: AppEvent[]): void {
  const now = Date.now();
  const weekOut = now + 7 * 24 * 60 * 60 * 1000;
  const counts = new Map<string, number>(MARQUEE_VENUES.map((v) => [v, 0]));
  for (const e of events) {
    if (!counts.has(e.venue)) continue;
    const t = new Date(e.startsAt).getTime();
    if (t >= now - 12 * 60 * 60 * 1000 && t <= weekOut) {
      counts.set(e.venue, (counts.get(e.venue) ?? 0) + 1);
    }
  }
  const empty = MARQUEE_VENUES.filter((v) => (counts.get(v) ?? 0) === 0);
  if (empty.length > 0) {
    console.warn(
      `[events] ⚠️ MARQUEE VENUES WITH NO EVENTS IN NEXT 7 DAYS: ${empty.join(', ')} — ` +
        'verify against the venues\' own fixture lists; likely a provider gap.',
    );
  }
}
