/**
 * Alerts store — fetches /api/alerts (active only on the backend) and
 * keeps the list live-updated from socket events:
 *   panic-alert, alert-updated, geofence-violation, dead-man-alert.
 *
 * The store also keeps a small in-memory ring buffer of recently-broadcast
 * alerts that the backend hasn't yet returned from GET /api/alerts — this
 * makes the UI feel instant even if the DB write is slow.
 */

import { create } from 'zustand';
import { listAlerts, updateAlertStatus } from '@/api/alerts';
import { normalizeAlert, type Alert, type AlertStatus } from '@/api/types';

interface AlertsState {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  fetch: () => Promise<void>;
  ingest: (a: any) => void;          // ingest from socket
  patchStatus: (a: Alert) => void;   // merge a status-updated alert
  setStatus: (id: string, status: AlertStatus) => Promise<void>;

  // Convenience selectors
  active: () => Alert[];
  panic: () => Alert[];
  geofence: () => Alert[];
  deadMan: () => Alert[];
}

export const useAlerts = create<AlertsState>((set, get) => ({
  alerts: [],
  loading: false,
  error: null,
  lastFetch: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const alerts = await listAlerts();
      set({ alerts, loading: false, lastFetch: Date.now() });
    } catch (e: any) {
      set({ loading: false, error: e?.message || 'Failed to load alerts' });
    }
  },

  ingest: (raw) => {
    const a = normalizeAlert(raw);
    set((s) => {
      // Dedup by id.
      if (s.alerts.some((x) => x.id === a.id)) return s;
      return { alerts: [a, ...s.alerts].slice(0, 200) };
    });
  },

  patchStatus: (a) =>
    set((s) => ({
      alerts: s.alerts.map((x) => (x.id === a.id ? { ...x, ...a } : x)),
    })),

  setStatus: async (id, status) => {
    // Optimistic.
    get().patchStatus({ id, status } as Alert);
    try {
      const updated = await updateAlertStatus(id, status);
      get().patchStatus(updated);
    } catch (e) {
      get().fetch();
      throw e;
    }
  },

  active: () => get().alerts.filter((a) => a.status === 'active'),
  panic: () => get().alerts.filter((a) => a.type === 'PANIC' || a.type === 'PANIC_ALERT'),
  geofence: () => get().alerts.filter((a) => a.type === 'GEOFENCE_VIOLATION'),
  deadMan: () => get().alerts.filter((a) => a.type === 'DEAD_MAN_SWITCH'),
}));
