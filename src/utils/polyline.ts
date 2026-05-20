/**
 * Google's encoded-polyline format → array of {lat, lng} points.
 * Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 *
 * Returns [] on any input that isn't a non-empty string so callers can
 * blindly map / pass to <Polyline coordinates>.
 */
import type { LatLng } from '@/utils/distance';

export function decodePolyline(encoded: string | undefined | null): LatLng[] {
  if (!encoded || typeof encoded !== 'string') return [];

  const points: LatLng[] = [];
  const len = encoded.length;
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < len);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < len);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}
