/** Location API — mirrors backend/routes/location.js */
import { http } from './client';
import type { LocationPoint, VehicleHistoryResponse, LatestLocation } from './types';

export async function sendLocation(payload: {
  vehicleId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
}): Promise<{ success: boolean; vehicleId: string; timestamp: string }> {
  const res = await http().post('/api/location', payload);
  return res.data;
}

export async function sendBulkLocations(
  vehicleId: string,
  locations: Array<{ lat: number; lng: number; speed?: number; heading?: number; accuracy?: number }>,
): Promise<{ success: boolean; synced: number }> {
  const res = await http().post('/api/location/bulk', { vehicleId, locations });
  return res.data;
}

export async function getLatestLocations(): Promise<LatestLocation[]> {
  const res = await http().get('/api/location/latest');
  // The backend calls a Supabase RPC `get_latest_locations` — be tolerant of
  // both array and {data: array} shapes.
  if (Array.isArray(res.data)) return res.data;
  return res.data?.data || res.data?.rows || [];
}

export async function getVehicleHistory(
  vehicleId: string,
  hours = 24,
): Promise<VehicleHistoryResponse> {
  const res = await http().get(
    `/api/location/${encodeURIComponent(vehicleId)}/history?hours=${hours}`,
  );
  return res.data;
}
