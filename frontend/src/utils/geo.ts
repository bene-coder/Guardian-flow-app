/**
 * Geo helpers — mirrors backend/utils/geo.js so the frontend can do
 * local geofence / distance calculations without round-tripping the server.
 */

const R = 6371; // km
const EARTH_RADIUS_M = 6_371_000;

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two points in kilometers. */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Distance in meters (more useful for short geofence distances). */
export function getDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return getDistanceKm(lat1, lon1, lat2, lon2) * 1000;
}

/** Path length in km for an array of {lat,lng} points. */
export function pathDistanceKm(points: Array<{ lat: number; lng: number }>): number {
  if (!points || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += getDistanceKm(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
  }
  return total;
}

/**
 * Check if a point is outside a circular geofence.
 * Returns `false` if inside, or an object with distance + exceededBy (in km) if outside.
 */
export function checkGeofenceViolation(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  radiusKm: number,
): false | { violated: true; distance: string; exceededBy: string } {
  const distance = getDistanceKm(lat, lng, centerLat, centerLng);
  if (distance > radiusKm) {
    return {
      violated: true,
      distance: distance.toFixed(2),
      exceededBy: (distance - radiusKm).toFixed(2),
    };
  }
  return false;
}

/** Bearing in degrees (0–360) — used to rotate vehicle marker arrows. */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = deg2rad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(deg2rad(lat2));
  const x =
    Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) -
    Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(dLon);
  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360;
  return bearing;
}

export function isValidCoords(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) && !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

/** Default map center: world view if no vehicles, otherwise first vehicle. */
export const DEFAULT_MAP_CENTER = {
  // Lagos, Nigeria — the app's natural market.
  latitude: 6.5244,
  longitude: 3.3792,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

export { EARTH_RADIUS_M };
