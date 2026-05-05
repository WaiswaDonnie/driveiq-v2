/**
 * Haversine distance between two lat/lng points, in kilometres.
 * Good enough for showing "2.4 km away" in the event detail sheet.
 */
const R_KM = 6371;

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

/** "2.4 km" / "850 m". */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
