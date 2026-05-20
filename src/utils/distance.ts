/**
 * Haversine distance between two lat/lng points.
 * `distanceKm` is kept for the few callers that want raw kilometres;
 * UI helpers below render in imperial units (miles / feet).
 */
const R_KM = 6371;
const KM_PER_MILE = 1.609344;
const FEET_PER_METER = 3.28084;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export interface LatLng {
  latitude: number;
  longitude: number;
}

export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function distanceMeters(a: LatLng, b: LatLng): number {
  return distanceKm(a, b) * 1000;
}

/**
 * Format a kilometre value as miles / feet for the "X away" UI.
 *   < 0.1 mi → feet (e.g. "320 ft")
 *   < 10 mi  → "2.4 mi"
 *   else     → "23 mi"
 */
export function formatDistance(km: number): string {
  const miles = km / KM_PER_MILE;
  if (miles < 0.1) {
    const feet = km * 1000 * FEET_PER_METER;
    return `${Math.round(feet)} ft`;
  }
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

/** Imperial format for raw metre values used by the routing layer. */
export function formatDistanceMeters(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  const miles = meters / 1000 / KM_PER_MILE;
  if (miles < 0.1) {
    const feet = meters * FEET_PER_METER;
    return `${Math.round(feet)} ft`;
  }
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}
