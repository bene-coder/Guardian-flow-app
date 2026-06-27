/**
 * Shared API types — mirror the backend's request/response shapes.
 * Backend routes are the source of truth:
 *   /api/location  /api/alerts  /api/vehicles  /api/geofence
 */

export type VehicleStatus = 'active' | 'inactive' | 'maintenance' | 'emergency';

export interface Vehicle {
  id: string;
  name: string;
  driver_name?: string | null;
  driver_phone?: string | null;
  status: VehicleStatus;
  created_at?: string;
}

export interface LocationPoint {
  id?: string;
  vehicle_id: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  recorded_at: string;
  timestamp?: number;
}

export interface LatestLocation extends LocationPoint {
  vehicleName?: string;
  vehicleStatus?: VehicleStatus;
}

export type AlertType = 'PANIC' | 'PANIC_ALERT' | 'GEOFENCE_VIOLATION' | 'DEAD_MAN_SWITCH';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  type: AlertType;
  vehicle_id?: string;
  vehicleId?: string;       // backend sometimes uses camelCase in broadcasts
  driver_id?: string;
  driverId?: string;
  lat?: number;
  lng?: number;
  status: AlertStatus;
  metadata?: Record<string, any>;
  blockchain_tx?: string | null;
  blockchainTx?: string | null;
  created_at?: string;
  updated_at?: string;
  timestamp?: number;
}

export interface Geofence {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius: number; // km
  type?: string;
  created_at?: string;
}

export interface HealthResponse {
  status: 'ok' | string;
  timestamp: number;
  uptime: number;
  environment: string;
  memory?: { used: string; total: string };
}

export interface LocationUpdatePayload {
  vehicleId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  timestamp: number;
}

export interface GeofenceViolationResult {
  vehicleId: string;
  violations: Array<{
    geofenceId: string;
    geofenceName: string;
    distance: string;
  }>;
  isViolating: boolean;
}

export interface VehicleHistoryResponse {
  vehicleId: string;
  points: number;
  data: LocationPoint[];
}

// ─── Normalization helpers ──────────────────────────────────────────────────
// Backend sometimes returns snake_case (DB rows) and sometimes camelCase
// (broadcast payloads). Normalize at the edge so UI code can rely on one shape.

export function normalizeAlert(a: any): Alert {
  return {
    id: a.id,
    type: (a.type || 'PANIC').toUpperCase() as AlertType,
    vehicle_id: a.vehicle_id ?? a.vehicleId,
    vehicleId: a.vehicleId ?? a.vehicle_id,
    driver_id: a.driver_id ?? a.driverId,
    driverId: a.driverId ?? a.driver_id,
    lat: a.lat,
    lng: a.lng,
    status: a.status || 'active',
    metadata: a.metadata || {},
    blockchain_tx: a.blockchain_tx ?? a.blockchainTx ?? null,
    blockchainTx: a.blockchainTx ?? a.blockchain_tx ?? null,
    created_at: a.created_at,
    updated_at: a.updated_at,
    timestamp: a.timestamp,
  };
}

export function normalizeGeofence(g: any): Geofence {
  return {
    id: g.id,
    name: g.name,
    center_lat: g.center_lat ?? g.centerLat,
    center_lng: g.center_lng ?? g.centerLng,
    radius: Number(g.radius),
    type: g.type || 'circular',
    created_at: g.created_at,
  };
}

export function normalizeVehicle(v: any): Vehicle {
  return {
    id: v.id,
    name: v.name,
    driver_name: v.driver_name ?? v.driverName,
    driver_phone: v.driver_phone ?? v.driverPhone,
    status: v.status || 'active',
    created_at: v.created_at,
  };
}
