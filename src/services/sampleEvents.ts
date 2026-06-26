import type { AppEvent } from '@/types/event';
import { isInRange, type DateRange } from '@/utils/dateFilters';
import { defaultEndsAt } from '@/utils/duration';

/**
 * Fallback events shown when no API keys are configured. Real London venues, with synthetic
 * dates anchored against "today" so the filter chips still feel responsive.
 */

const now = (): Date => new Date();
const offsetIso = (days: number, hour: number, minute = 0): string => {
  const d = now();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// Built from a Partial template so each entry only declares startsAt + sub;
// `endsAt` is computed downstream from defaultEndsAt(startsAt, sub).
type SampleSeed = Omit<AppEvent, 'endsAt'>;

const SAMPLE_SEEDS: SampleSeed[] = [
  {
    id: 'sample-1',
    source: 'sample',
    category: 'sports',
    title: 'Arsenal vs Chelsea',
    startsAt: offsetIso(0, 19, 30),
    venue: 'Emirates Stadium',
    latitude: 51.5549,
    longitude: -0.1084,
    description: 'Premier League fixture',
    subCategory: 'Football',
  },
  {
    id: 'sample-2',
    source: 'sample',
    category: 'sports',
    title: 'Tottenham vs Liverpool',
    startsAt: offsetIso(1, 17, 30),
    venue: 'Tottenham Hotspur Stadium',
    latitude: 51.6043,
    longitude: -0.0664,
    description: 'Premier League fixture',
    subCategory: 'Football',
  },
  {
    id: 'sample-3',
    source: 'sample',
    category: 'sports',
    title: 'England vs Australia — Test',
    startsAt: offsetIso(2, 11, 0),
    venue: "Lord's Cricket Ground",
    latitude: 51.5294,
    longitude: -0.1727,
    description: 'Day one of the second Test',
    subCategory: 'Cricket',
  },
  {
    id: 'sample-4',
    source: 'sample',
    category: 'other',
    title: 'Coldplay — Music of the Spheres',
    startsAt: offsetIso(3, 20, 0),
    venue: 'Wembley Stadium',
    latitude: 51.5560,
    longitude: -0.2796,
    description: 'European tour, opening night.',
    subCategory: 'Music',
  },
  {
    id: 'sample-5',
    source: 'sample',
    category: 'other',
    title: 'Hamilton',
    startsAt: offsetIso(0, 19, 30),
    venue: 'Victoria Palace Theatre',
    latitude: 51.4965,
    longitude: -0.1429,
    description: "Lin-Manuel Miranda's award-winning musical.",
    subCategory: 'Theatre',
  },
  {
    id: 'sample-6',
    source: 'sample',
    category: 'other',
    title: 'Tate Modern Late: Surrealism',
    startsAt: offsetIso(4, 18, 0),
    venue: 'Tate Modern',
    latitude: 51.5076,
    longitude: -0.0994,
    description: 'After-hours gallery event with live music and talks.',
    subCategory: 'Arts',
  },
  {
    id: 'sample-7',
    source: 'sample',
    category: 'sports',
    title: 'London Marathon — Elite Race',
    startsAt: offsetIso(5, 9, 0),
    venue: 'Greenwich Park',
    latitude: 51.4769,
    longitude: 0.0005,
    description: '26.2 miles around central London.',
    subCategory: 'Running',
  },
  {
    id: 'sample-8',
    source: 'sample',
    category: 'other',
    title: 'Stand-Up Comedy Night',
    startsAt: offsetIso(1, 21, 0),
    venue: 'Soho Theatre',
    latitude: 51.5145,
    longitude: -0.1330,
    description: 'New material night with rotating headliners.',
    subCategory: 'Comedy',
  },
];

// Materialise the seeds into real AppEvents with computed end times.
const SAMPLE: AppEvent[] = SAMPLE_SEEDS.map((s) => ({
  ...s,
  endsAt: defaultEndsAt(s.startsAt, s.subCategory),
}));

export function fetchSampleEvents(range: DateRange): AppEvent[] {
  return SAMPLE.filter((e) => isInRange(e.startsAt, range));
}
