import { findLondonPlace } from '@/data/londonVenues';
import type { AppEvent } from '@/types/event';
import { isInRange, type DateRange } from '@/utils/dateFilters';
import { defaultEndsAt } from '@/utils/duration';

/**
 * ESPN Cricinfo — cricket fixtures.
 *
 * ESPN's main site.api.espn.com endpoints have weak cricket coverage. Their
 * actual cricket data lives on a separate sub-domain under the Cricinfo
 * brand — Cricinfo is owned by ESPN but uses different infrastructure.
 *
 * Endpoints (unofficial, no auth required):
 *   https://hsapi.espncricinfo.com/v1/pages/series?lang=en&latest=true
 *   https://hsapi.espncricinfo.com/v1/pages/matches?lang=en&latest=true
 *   https://hs-consumer-api.espncricinfo.com/v1/pages/matches/current?lang=en
 *
 * IMPORTANT: same unofficial / unsupported caveat as the rest of the ESPN
 * pipeline. We use it because there's no comparable free + commercial
 * cricket schedule source for London venues.
 *
 * Coverage during May–September is heavy: England Tests at Lord's & Oval,
 * Middlesex / Surrey home games at the same venues, T20 Blast group stage,
 * One-Day Cup, The Hundred (Lord's: London Spirit; Oval: Oval Invincibles).
 */

const ENDPOINTS = [
  // Current and upcoming matches across all formats.
  'https://hs-consumer-api.espncricinfo.com/v1/pages/matches/current?lang=en',
  // Series listing, used as a fallback if the matches endpoint is empty.
  'https://hs-consumer-api.espncricinfo.com/v1/pages/series?lang=en&latest=true',
];

interface CricVenue {
  id?: number;
  name?: string;
  fullName?: string;
  city?: string;
  country?: { name?: string };
}

interface CricTeamObj {
  team?: { name?: string; longName?: string; abbreviation?: string };
  score?: string;
}

interface CricMatch {
  id?: number;
  objectId?: number;
  slug?: string;
  startTime?: string; // ISO
  endTime?: string;
  status?: string;
  stage?: string;
  format?: string;
  series?: { name?: string; alternateName?: string };
  venue?: CricVenue;
  teams?: CricTeamObj[];
}

interface CricResponse {
  content?: {
    matches?: CricMatch[];
    series?: { matches?: CricMatch[] }[];
  };
  matches?: CricMatch[];
}

const fetchOne = async (url: string): Promise<CricMatch[]> => {
  try {
    // Cricinfo's CDN (Akamai) 403s when the request looks too bot-ish.
    // Send a regular mobile UA + Referer/Origin from espncricinfo.com so the
    // edge accepts us. Still unsupported — they can break this any time.
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Referer: 'https://www.espncricinfo.com/',
        Origin: 'https://www.espncricinfo.com',
      },
    });
    if (!res.ok) {
      // 403 here means Akamai is blocking the request from this network.
      // Quiet log — the wider events fetch still succeeds via other providers.
      console.warn('[cricinfo] non-OK', res.status);
      return [];
    }
    const json = (await res.json()) as CricResponse;
    // The "matches" feed returns content.matches; the "series" feed wraps
    // matches inside content.series[].matches. Merge BOTH shapes always —
    // previously series matches were only used when the direct feed was
    // empty, which silently dropped county fixtures (Middlesex at Lord's,
    // Surrey at the Oval) whenever internationals filled the featured feed.
    // That's how today's cricket vanished from both grounds (client report,
    // 8 July 2026). The caller dedupes by match id.
    const direct = json.content?.matches ?? json.matches ?? [];
    const fromSeries = (json.content?.series ?? []).flatMap(
      (s) => s.matches ?? [],
    );
    return [...direct, ...fromSeries];
  } catch (e) {
    console.warn('[cricinfo] network error', e);
    return [];
  }
};

const buildTitle = (m: CricMatch): string => {
  const teams = m.teams ?? [];
  const a =
    teams[0]?.team?.abbreviation ??
    teams[0]?.team?.name ??
    teams[0]?.team?.longName ??
    '';
  const b =
    teams[1]?.team?.abbreviation ??
    teams[1]?.team?.name ??
    teams[1]?.team?.longName ??
    '';
  const aScore = teams[0]?.score;
  const bScore = teams[1]?.score;
  if (a && b) {
    if (aScore || bScore) {
      return `${a} ${aScore ?? '-'} vs ${b} ${bScore ?? '-'}`;
    }
    return `${a} vs ${b}`;
  }
  return m.series?.name ?? 'Cricket match';
};

export async function fetchCricinfoLondon(
  range: DateRange,
): Promise<AppEvent[]> {
  // Hit both endpoints in parallel; merge + dedupe by match id.
  const results = await Promise.all(ENDPOINTS.map(fetchOne));
  const seenIds = new Set<number>();
  const matches: CricMatch[] = [];
  for (const list of results) {
    for (const m of list) {
      const id = m.id ?? m.objectId;
      if (id == null || seenIds.has(id)) continue;
      seenIds.add(id);
      matches.push(m);
    }
  }

  let droppedNotLondon = 0;
  let droppedOutOfRange = 0;
  let droppedNoDate = 0;
  const out: AppEvent[] = [];
  const seen = new Set<string>();

  for (const m of matches) {
    const id = `cric-${m.id ?? m.objectId ?? m.slug ?? ''}`;
    if (seen.has(id)) continue;

    if (!m.startTime) {
      droppedNoDate++;
      continue;
    }

    const venueName = m.venue?.fullName ?? m.venue?.name ?? null;

    // Resolve via curated London venue map. We don't synthesise coords from a
    // city name alone — without a known venue the pin would land arbitrarily.
    const place = findLondonPlace(venueName);
    if (!place) {
      droppedNotLondon++;
      continue;
    }

    if (!isInRange(m.startTime, range)) {
      droppedOutOfRange++;
      continue;
    }

    // Cricinfo gives us a real endTime for multi-day formats; for limited-
    // overs games it's the scheduled close of play. Fall back to a duration
    // default keyed off the format (T20 vs ODI vs Test) when missing.
    const subCategory =
      m.format === 'T20' || m.format === 'T20I'
        ? 'Cricket T20'
        : m.format === 'ODI'
          ? 'Cricket ODI'
          : m.format === 'Test'
            ? 'Cricket Test'
            : 'Cricket';
    const endsAt = m.endTime ?? defaultEndsAt(m.startTime, subCategory);

    seen.add(id);
    out.push({
      id,
      source: 'espn',
      category: 'sports',
      title: buildTitle(m),
      startsAt: m.startTime,
      endsAt,
      venue: place.venue,
      latitude: place.latitude,
      longitude: place.longitude,
      description: m.series?.name ?? m.format ?? 'Cricket',
      subCategory,
    });
  }

  console.log(
    `[cricinfo] ${matches.length} raw matches → ${out.length} London events ` +
      `(dropped: ${droppedNotLondon} non-London, ${droppedOutOfRange} out of range, ${droppedNoDate} no-date)`,
  );
  return out;
}
