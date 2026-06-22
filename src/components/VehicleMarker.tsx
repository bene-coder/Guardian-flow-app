/**
 * VehicleMarker — marker overlay rendered above react-native-maps.
 * Pure presentational helper: given a vehicle + its latest location,
 * returns the props needed by <Marker>.
 */

import type { Vehicle, LatestLocation } from '@/api/types';
import { vehicleStatusColor } from '@/theme';
import { isValidCoords } from '@/utils/geo';

export type MarkerVm = {
  vehicle: Vehicle;
  location?: LatestLocation;
};

export function isMarkerVisible(m: MarkerVm): boolean {
  if (!m.location) return false;
  return isValidCoords(m.location.lat, m.location.lng);
}

export function markerColor(m: MarkerVm): string {
  return vehicleStatusColor[m.vehicle.status] || '#888';
}
