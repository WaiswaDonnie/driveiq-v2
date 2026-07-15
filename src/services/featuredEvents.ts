import type { AppEvent } from '@/types/event';
import { isInRange, type DateRange } from '@/utils/dateFilters';

/**
 * Curated "featured" events.
 *
 * Some of the biggest events in and around London simply aren't in any of our
 * API feeds (ESPN / football-data / SportsDB cover team sport; Ticketmaster
 * covers ticketed entertainment). Marquee fixtures like Royal Ascot, the Epsom
 * Derby or the Wimbledon Championships fall through the cracks — yet they're
 * exactly what drives traffic and transport demand on those days.
 *
 * This is a hand-maintained list that renders alongside the API events with a
 * gold "featured" pin + star badge so it stands out. To add an event, append
 * an entry below with accurate date, venue and coordinates. Past entries are
 * filtered out automatically by the date range, so the list can be pruned
 * occasionally but doesn't need constant gardening.
 *
 * All times are local London time (BST, UTC+1, in summer) written with an
 * explicit offset so they're unambiguous.
 */

const FEATURED: AppEvent[] = [
  // ── Royal Ascot 2026 — Tue 16 to Sat 20 June ──────────────────────────
  // Gates 10:30, Royal Procession 14:00, racing 14:30 → ~18:00.
  // Ascot Racecourse, Berkshire.
  ascot('1 · Opening Day', '2026-06-16'),
  ascot('2', '2026-06-17'),
  ascot('3 · Ladies Day', '2026-06-18'),
  ascot('4', '2026-06-19'),
  ascot('5', '2026-06-20'),

  // ── The Championships, Wimbledon 2026 — one pin per day, 29 June–12 July ─
  // All England Lawn Tennis & Croquet Club, SW19. Matches run ~11:00–21:00.
  ...wimbledonDays(),
];

/** Build a Royal Ascot day entry. */
function ascot(dayLabel: string, date: string): AppEvent {
  return {
    id: `featured-royal-ascot-2026-${date}`,
    source: 'featured',
    category: 'sports',
    title: `Royal Ascot 2026 — Day ${dayLabel}`,
    startsAt: `${date}T14:00:00+01:00`,
    endsAt: `${date}T18:00:00+01:00`,
    venue: 'Ascot Racecourse',
    latitude: 51.4106,
    longitude: -0.6785,
    description:
      'Royal Ascot, the showpiece of the British flat-racing season. Gates 10:30, Royal Procession 14:00, first race 14:30.',
    subCategory: 'Horse Racing',
  };
}

/**
 * Generate one featured entry per day across an inclusive date range. Reusable
 * for any multi-day event where roughly the same daily window applies
 * (Wimbledon fortnight, a cricket Test, a festival run). Times are local London
 * (BST, +01:00 in summer).
 */
function recurringDaily(opts: {
  idPrefix: string;
  title: (dayLabel: string, date: string, index: number) => string;
  startDate: string; // 'YYYY-MM-DD' inclusive
  endDate: string; // 'YYYY-MM-DD' inclusive
  startLocal: string; // 'HH:MM'
  endLocal: string; // 'HH:MM'
  venue: string;
  latitude: number;
  longitude: number;
  description: string;
  subCategory: string;
  category: AppEvent['category'];
  offset?: string; // tz offset, default '+01:00'
}): AppEvent[] {
  const off = opts.offset ?? '+01:00';
  const out: AppEvent[] = [];
  const start = new Date(`${opts.startDate}T00:00:00Z`);
  const end = new Date(`${opts.endDate}T00:00:00Z`);
  let index = 0;
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    index += 1;
    const date = d.toISOString().slice(0, 10);
    const dayLabel = `Day ${index}`;
    out.push({
      id: `${opts.idPrefix}-${date}`,
      source: 'featured',
      category: opts.category,
      title: opts.title(dayLabel, date, index),
      startsAt: `${date}T${opts.startLocal}:00${off}`,
      endsAt: `${date}T${opts.endLocal}:00${off}`,
      venue: opts.venue,
      latitude: opts.latitude,
      longitude: opts.longitude,
      description: opts.description,
      subCategory: opts.subCategory,
    });
  }
  return out;
}

/** Wimbledon 2026 — a pin every day of the fortnight. */
function wimbledonDays(): AppEvent[] {
  return recurringDaily({
    idPrefix: 'featured-wimbledon-2026',
    title: (label) => `Wimbledon 2026 — ${label}`,
    startDate: '2026-06-29',
    endDate: '2026-07-12',
    startLocal: '11:00',
    endLocal: '21:00',
    venue: 'All England Lawn Tennis Club',
    latitude: 51.4336,
    longitude: -0.214,
    description:
      'The Championships, Wimbledon. Grand Slam tennis at SW19 — matches across the day, 29 June to 12 July 2026.',
    subCategory: 'Tennis',
    category: 'sports',
  });
}

/**
 * Return curated events that fall inside the requested range. Mirrors the
 * provider fetchers' signature so it slots straight into the events fan-out,
 * even though it's synchronous local data.
 */
export async function fetchFeaturedLondon(range: DateRange): Promise<AppEvent[]> {
  return FEATURED.filter((e) => isInRange(e.startsAt, range));
}
