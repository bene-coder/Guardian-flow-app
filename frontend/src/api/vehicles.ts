/** Vehicles API — mirrors backend/routes/vehicles.js */
import { http } from './client';
import { normalizeVehicle, type Vehicle, type VehicleStatus } from './types';

export async function listVehicles(): Promise<Vehicle[]> {
  const res = await http().get('/api/vehicles');
  return (res.data || []).map(normalizeVehicle);
}

export async function getVehicle(id: string): Promise<Vehicle> {
  const res = await http().get(`/api/vehicles/${encodeURIComponent(id)}`);
  return normalizeVehicle(res.data);
}

export async function registerVehicle(payload: {
  id: string;
  name: string;
  driverName?: string;
  driverPhone?: string;
}): Promise<Vehicle> {
  const res = await http().post('/api/vehicles', payload);
  return normalizeVehicle(res.data.vehicle);
}

export async function updateVehicleStatus(id: string, status: VehicleStatus): Promise<Vehicle> {
  const res = await http().patch(`/api/vehicles/${encodeURIComponent(id)}/status`, { status });
  return normalizeVehicle(res.data.vehicle);
}

export async function deactivateVehicle(id: string): Promise<Vehicle> {
  const res = await http().delete(`/api/vehicles/${encodeURIComponent(id)}`);
  return normalizeVehicle(res.data.vehicle);
}
