import type { Region } from 'react-native-maps';

import type { AppEvent } from '@/types/event';

/**
 * Screen-space grid clustering for event pins.
 *
 * The client's ask (clarified 6 July 2026): "congested" means 10–20 events
 * within a mile — DIFFERENT venues packed close together, not just same-venue
 * stacks. So at city zoom, nearby pins collapse into a count bubble; zooming
 * in expands them to their exact locations. Same-venue stacking is handled
 * separately (one pin per venue + tap-to-list), so this module clusters the
 * per-venue representative pins it's given.
 *
 * Rules:
 *   - Featured events (Wimbledon, Ascot, …) are NEVER clustered — the caller
 *     keeps them out of the input list.
 *   - Airport pins are separate markers and never enter this pipeline.
 *   - At/below {@link CLUSTER_OFF_DELTA} clustering switches off entirely and
 *     every venue pin renders individually.
 */

export interface EventCluster {
  /** Stable-ish key: grid cell + membership; changing it remounts the marker. */
  id: string;
  /** Centroid of the member pins. */
  latitude: number;
  longitude: number;
  /** Representative (per-venue) events inside the bubble. */
  events: AppEvent[];
  /** TOTAL events inside the bubble (venue stacks counted in full). */
  count: number;
}

export interface ClusterResult {
  clusters: EventCluster[];
  singles: AppEvent[];
}

/**
 * When the visible longitude span drops to/below this, clustering is off.
 * 0.045° ≈ 3 km across the screen — roughly "neighbourhood" zoom, where
 * even Soho's pins have room to breathe.
 */
export const CLUSTER_OFF_DELTA = 0.045;

/**
 * A bubble only forms for genuinely congested patches (client, 6 July 2026:
 * "only group the 23 — the rest are kind of spread out"). Groups holding
 * fewer than this many EVENTS render as individual pins even if they share a
 * grid cell, so light overlap stays visible and only the dense central-London
 * knots collapse into a count.
 */
export const MIN_CLUSTER_COUNT = 10;

/**
 * Grouping radius is capped at the geography of THIS zoom level (the one the
 * client approved: Soho knot = "23", everything else separate). Without the
 * cap the radius scaled with the viewport, so zooming right out swallowed
 * Camden → Brixton into one "90" bubble (client, 6 July: "remove the 90, just
 * group the central ones"). With it, cluster membership is identical at every
 * zoom-out level — the central bubble stays the central bubble, spread-out
 * pins stay pins, they just draw closer together on screen.
 */
const CLUSTER_REF_DELTA = 0.09;

/**
 * How many grid cells fit across the screen width. A pin bubble is ~44 pt on
 * a ~390 pt screen, so ~7 cells means one cell is about one pin footprint —
 * two pins in the same cell genuinely overlap visually.
 */
const CELLS_ACROSS = 7;

/**
 * Degrees of latitude per degree of longitude for a screen-square cell at
 * London's latitude (cos 51.5° ≈ 0.62). Keeps cells visually square-ish.
 */
const LAT_ASPECT = 0.62;

/**
 * Cluster the given (per-venue representative) pins against the viewport.
 * `weightOf` returns how many actual events a pin stands for, so the bubble
 * count reflects events, not venues.
 */
export function clusterEvents(
  events: AppEvent[],
  region: Region,
  weightOf: (e: AppEvent) => number = () => 1,
): ClusterResult {
  if (region.longitudeDelta <= CLUSTER_OFF_DELTA) {
    return { clusters: [], singles: events };
  }

  const cellLng = Math.min(region.longitudeDelta, CLUSTER_REF_DELTA) / CELLS_ACROSS;
  const cellLat = cellLng * LAT_ASPECT;

  const cells = new Map<string, AppEvent[]>();
  for (const e of events) {
    const cx = Math.floor(e.longitude / cellLng);
    const cy = Math.floor(e.latitude / cellLat);
    const key = `${cx}:${cy}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(e);
    else cells.set(key, [e]);
  }

  const clusters: EventCluster[] = [];
  const singles: AppEvent[] = [];
  for (const [key, members] of cells) {
    if (members.length === 1) {
      singles.push(members[0]);
      continue;
    }
    clusters.push(makeCluster(key, members, weightOf));
  }

  const mergedClusters = mergeOverlapping(clusters, cellLng, cellLat, weightOf);

  // Absorb any lone pin that would sit underneath a bubble (grid-boundary
  // artifact: a pin one cell over can still overlap its neighbour's bubble).
  const freeSingles: AppEvent[] = [];
  for (const s of singles) {
    const hitIdx = mergedClusters.findIndex((c) => {
      const dx = (s.longitude - c.longitude) / cellLng;
      const dy = (s.latitude - c.latitude) / cellLat;
      return Math.sqrt(dx * dx + dy * dy) < 0.95;
    });
    if (hitIdx === -1) {
      freeSingles.push(s);
    } else {
      const c = mergedClusters[hitIdx];
      mergedClusters[hitIdx] = makeCluster(
        `m:${c.events[0].id}`,
        [...c.events, s],
        weightOf,
      );
    }
  }

  // Demote small groups: a bubble must represent a real congestion hotspot.
  // Anything under MIN_CLUSTER_COUNT events breaks back into its pins.
  const bigClusters: EventCluster[] = [];
  for (const c of mergedClusters) {
    if (c.count >= MIN_CLUSTER_COUNT) bigClusters.push(c);
    else freeSingles.push(...c.events);
  }

  return { clusters: bigClusters, singles: freeSingles };
}

/** Build a cluster with its centroid and full event count. */
function makeCluster(
  key: string,
  members: AppEvent[],
  weightOf: (e: AppEvent) => number,
): EventCluster {
  let lat = 0;
  let lng = 0;
  let count = 0;
  for (const m of members) {
    lat += m.latitude;
    lng += m.longitude;
    count += weightOf(m);
  }
  return {
    id: `cl-${key}-${members.length}-${count}`,
    latitude: lat / members.length,
    longitude: lng / members.length,
    events: members,
    count,
  };
}

/**
 * Grid cells are pin-sized, but two clusters in ADJACENT cells can still sit
 * close enough that their bubbles overlap on screen (seen in the 5 July
 * screenshot: the "56" bubble half-covering its neighbour). Merge any pair of
 * clusters whose bubbles would collide until none do. Cluster counts are
 * small (≤ ~50), so the O(n²) sweep is negligible.
 */
function mergeOverlapping(
  clusters: EventCluster[],
  cellLng: number,
  cellLat: number,
  weightOf: (e: AppEvent) => number,
): EventCluster[] {
  const out = [...clusters];
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i];
        const b = out[j];
        // Normalised screen-space distance: 1.0 ≈ one pin footprint apart.
        const dx = (a.longitude - b.longitude) / cellLng;
        const dy = (a.latitude - b.latitude) / cellLat;
        if (Math.sqrt(dx * dx + dy * dy) < 0.95) {
          const members = [...a.events, ...b.events];
          out.splice(j, 1);
          // Key on the first member's id — stable and collision-free even
          // for negative grid coordinates.
          out[i] = makeCluster(`m:${members[0].id}`, members, weightOf);
          merged = true;
          break outer;
        }
      }
    }
  }
  return out;
}
