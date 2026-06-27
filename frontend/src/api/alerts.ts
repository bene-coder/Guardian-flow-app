/** Alerts API — mirrors backend/routes/alerts.js */
import { http } from './client';
import { normalizeAlert, type Alert, type AlertStatus } from './types';

export async function triggerPanic(payload: {
  vehicleId: string;
  lat: number;
  lng: number;
  driverId?: string;
}): Promise<{ success: boolean; alertId: string; message: string }> {
  const res = await http().post('/api/alerts/panic', payload);
  return res.data;
}

export async function listAlerts(): Promise<Alert[]> {
  const res = await http().get('/api/alerts');
  return (res.data || []).map(normalizeAlert);
}

export async function updateAlertStatus(id: string, status: AlertStatus): Promise<Alert> {
  const res = await http().patch(`/api/alerts/${encodeURIComponent(id)}/status`, { status });
  return normalizeAlert(res.data.alert);
}
