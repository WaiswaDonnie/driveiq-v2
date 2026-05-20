/**
 * Curated map of London sports venues + the teams that play in them, with
 * coordinates good enough for map pins. Used to strictly filter events down
 * to "actually happening in London" — TheSportsDB doesn't return lat/lng on
 * its events, so we resolve a venue or home-team name to a known location.
 *
 * The map is keyed by *normalised* lower-case names (no "FC", no punctuation)
 * so we can match resilient variants like "Tottenham Hotspur Women" or
 * "Surrey CCC" against a single canonical entry.
 */

export interface LondonPlace {
  /** Display venue name. */
  venue: string;
  latitude: number;
  longitude: number;
}

const VENUES = {
  // ── Football ────────────────────────────────────────────────────────
  emirates: { venue: 'Emirates Stadium', latitude: 51.5549, longitude: -0.1084 },
  stamfordBridge: { venue: 'Stamford Bridge', latitude: 51.4816, longitude: -0.1909 },
  tottenham: { venue: 'Tottenham Hotspur Stadium', latitude: 51.6043, longitude: -0.0664 },
  londonStadium: { venue: 'London Stadium', latitude: 51.5386, longitude: -0.0166 },
  selhurst: { venue: 'Selhurst Park', latitude: 51.3983, longitude: -0.0855 },
  cravenCottage: { venue: 'Craven Cottage', latitude: 51.475, longitude: -0.2216 },
  brentford: { venue: 'Gtech Community Stadium', latitude: 51.4906, longitude: -0.2885 },
  qpr: { venue: 'Loftus Road', latitude: 51.5093, longitude: -0.2326 },
  millwall: { venue: 'The Den', latitude: 51.4859, longitude: -0.0509 },
  charlton: { venue: 'The Valley', latitude: 51.4865, longitude: 0.0364 },
  leytonOrient: { venue: 'Brisbane Road', latitude: 51.5601, longitude: -0.0125 },
  afcWimbledon: { venue: 'Plough Lane', latitude: 51.4318, longitude: -0.1996 },
  barnet: { venue: 'The Hive Stadium', latitude: 51.6057, longitude: -0.2942 },
  suttonUnited: { venue: 'Gander Green Lane', latitude: 51.3669, longitude: -0.2017 },
  daghamRedbridge: { venue: 'Victoria Road', latitude: 51.5453, longitude: 0.1357 },

  // ── Cricket ─────────────────────────────────────────────────────────
  lords: { venue: "Lord's Cricket Ground", latitude: 51.5294, longitude: -0.1727 },
  oval: { venue: 'The Oval', latitude: 51.4837, longitude: -0.1145 },

  // ── Rugby Union ─────────────────────────────────────────────────────
  twickenham: { venue: 'Twickenham Stadium', latitude: 51.4561, longitude: -0.3415 },
  saracens: { venue: 'StoneX Stadium', latitude: 51.6191, longitude: -0.2244 },
  harlequins: { venue: 'The Stoop', latitude: 51.4538, longitude: -0.346 },

  // ── Tennis ──────────────────────────────────────────────────────────
  wimbledon: { venue: 'All England Lawn Tennis Club', latitude: 51.4348, longitude: -0.2138 },
  queens: { venue: "The Queen's Club", latitude: 51.4886, longitude: -0.2122 },

  // ── Multi-sport / arenas ────────────────────────────────────────────
  wembley: { venue: 'Wembley Stadium', latitude: 51.556, longitude: -0.2796 },
  o2: { venue: 'The O2 Arena', latitude: 51.503, longitude: 0.003 },
  copperBox: { venue: 'Copper Box Arena', latitude: 51.5462, longitude: -0.0153 },
  ovoWembley: { venue: 'OVO Arena Wembley', latitude: 51.5586, longitude: -0.2826 },
  crystalPalaceSC: {
    venue: 'Crystal Palace National Sports Centre',
    latitude: 51.418,
    longitude: -0.0735,
  },
  leeValleyVeloPark: { venue: 'Lee Valley VeloPark', latitude: 51.5471, longitude: -0.0124 },
  alexandraPalace: { venue: 'Alexandra Palace', latitude: 51.5963, longitude: -0.1107 },
  excel: { venue: 'ExCeL London', latitude: 51.5079, longitude: 0.0297 },
} satisfies Record<string, LondonPlace>;

/**
 * Lookup table keyed by lower-case names. Includes both team names and
 * venue names so we can match either the `strHomeTeam` or `strVenue` field
 * coming back from TheSportsDB. Multiple keys can resolve to the same venue
 * (e.g. "spurs" and "tottenham hotspur stadium" both → VENUES.tottenham).
 */
const PLACES: Record<string, LondonPlace> = {
  // Football clubs (men's & women's; "fc"/"afc" stripped before matching)
  arsenal: VENUES.emirates,
  chelsea: VENUES.stamfordBridge,
  tottenham: VENUES.tottenham,
  'tottenham hotspur': VENUES.tottenham,
  spurs: VENUES.tottenham,
  'west ham': VENUES.londonStadium,
  'west ham united': VENUES.londonStadium,
  'crystal palace': VENUES.selhurst,
  fulham: VENUES.cravenCottage,
  brentford: VENUES.brentford,
  qpr: VENUES.qpr,
  'queens park rangers': VENUES.qpr,
  millwall: VENUES.millwall,
  charlton: VENUES.charlton,
  'charlton athletic': VENUES.charlton,
  'leyton orient': VENUES.leytonOrient,
  orient: VENUES.leytonOrient,
  'afc wimbledon': VENUES.afcWimbledon,
  wimbledon: VENUES.afcWimbledon,
  barnet: VENUES.barnet,
  'sutton united': VENUES.suttonUnited,
  sutton: VENUES.suttonUnited,
  'dagenham and redbridge': VENUES.daghamRedbridge,
  'dagenham & redbridge': VENUES.daghamRedbridge,

  // Cricket
  surrey: VENUES.oval,
  'surrey ccc': VENUES.oval,
  middlesex: VENUES.lords,
  'middlesex ccc': VENUES.lords,

  // Rugby Union
  saracens: VENUES.saracens,
  harlequins: VENUES.harlequins,
  'london irish': VENUES.twickenham, // historical — exiled but still a London badge

  // Venue names
  'emirates stadium': VENUES.emirates,
  emirates: VENUES.emirates,
  'stamford bridge': VENUES.stamfordBridge,
  'tottenham hotspur stadium': VENUES.tottenham,
  'london stadium': VENUES.londonStadium,
  'selhurst park': VENUES.selhurst,
  'craven cottage': VENUES.cravenCottage,
  'gtech community stadium': VENUES.brentford,
  'brentford community stadium': VENUES.brentford,
  'kiyan prince foundation stadium': VENUES.qpr,
  'loftus road': VENUES.qpr,
  'the den': VENUES.millwall,
  'the valley': VENUES.charlton,
  'brisbane road': VENUES.leytonOrient,
  'breyer group stadium': VENUES.leytonOrient,
  'plough lane': VENUES.afcWimbledon,
  'cherry red records stadium': VENUES.afcWimbledon,
  'the hive stadium': VENUES.barnet,
  "lord's": VENUES.lords,
  "lord's cricket ground": VENUES.lords,
  lords: VENUES.lords,
  'the oval': VENUES.oval,
  'kia oval': VENUES.oval,
  oval: VENUES.oval,
  twickenham: VENUES.twickenham,
  'twickenham stadium': VENUES.twickenham,
  'stonex stadium': VENUES.saracens,
  'allianz park': VENUES.saracens,
  'the stoop': VENUES.harlequins,
  'twickenham stoop': VENUES.harlequins,
  'all england club': VENUES.wimbledon,
  'all england lawn tennis club': VENUES.wimbledon,
  "queen's club": VENUES.queens,
  'queens club': VENUES.queens,
  wembley: VENUES.wembley,
  'wembley stadium': VENUES.wembley,
  'o2 arena': VENUES.o2,
  'the o2 arena': VENUES.o2,
  'the o2': VENUES.o2,
  'copper box arena': VENUES.copperBox,
  'copper box': VENUES.copperBox,
  'ovo arena wembley': VENUES.ovoWembley,
  'wembley arena': VENUES.ovoWembley,
  'crystal palace national sports centre': VENUES.crystalPalaceSC,
  'lee valley velopark': VENUES.leeValleyVeloPark,
  'alexandra palace': VENUES.alexandraPalace,
  'ally pally': VENUES.alexandraPalace,
  'excel london': VENUES.excel,
  excel: VENUES.excel,
};

const PLACE_KEYS = Object.keys(PLACES);

/**
 * Strip the noise common to team / venue names before matching:
 *   "Arsenal F.C. (W)"        →  "arsenal"
 *   "Tottenham Hotspur Women" →  "tottenham hotspur women"
 *   "Surrey CCC"              →  "surrey"
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ') // drop parenthesised qualifiers
    .replace(/\b(fc|afc|cf|ccc|rfc)\b/g, ' ')
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve any of `candidates` (venue name, home team, …) to a London place,
 * or `null` if none of them are recognised. Tries exact match first, then
 * word-boundary contains, so "Arsenal Women" still resolves to Emirates.
 */
export function findLondonPlace(
  ...candidates: (string | undefined | null)[]
): LondonPlace | null {
  for (const raw of candidates) {
    if (!raw) continue;
    const norm = normalize(raw);
    if (!norm) continue;

    if (PLACES[norm]) return PLACES[norm];

    for (const key of PLACE_KEYS) {
      // word-boundary match — avoids "watford" matching "wat" etc.
      const re = new RegExp(`(^|\\s)${escapeRegExp(key)}(\\s|$)`);
      if (re.test(norm)) return PLACES[key];
    }
  }
  return null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
