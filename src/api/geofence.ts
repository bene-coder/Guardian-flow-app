/** Geofence API — mirrors backend/routes/geofence.js */
import { http } from './client';
import { normalizeGeofence, type Geofence, type GeofenceViolationResult } from './types';

export async function listGeofences(): Promise<Geofence[]> {
  const res = await http().get('/api/geofence');
  return (res.data || []).map(normalizeGeofence);
}

export async function createGeofence(payload: {
  name: string;
  centerLat: number;
  centerLng: number;
  radius: number; // km
}): Promise<Geofence> {
  const res = await http().post('/api/geofence', payload);
  return normalizeGeofence(res.data.geofence);
}

export async function deleteGeofence(id: string): Promise<void> {
  await http().delete(`/api/geofence/${encodeURIComponent(id)}`);
}

export async function checkGeofence(
  vehicleId: string,
  lat: number,
  lng: number,
): Promise<GeofenceViolationResult> {
  const res = await http().post('/api/geofence/check', { vehicleId, lat, lng });
  return res.data;
}
