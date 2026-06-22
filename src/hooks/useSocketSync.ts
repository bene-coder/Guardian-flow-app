/**
 * useSocketSync — wires up the single socket connection to all Zustand stores.
 *
 * Call this once from the root layout. It connects the socket on mount and
 * registers handlers that push incoming events into the vehicles / alerts /
 * geofences / locations stores. Disconnects on unmount (effectively: logout).
 */

import { useEffect } from 'react';
import { connectSocket, disconnectSocket, on, emit } from '@/api/socket';
import { useVehicles } from '@/store/vehicles';
import { useAlerts } from '@/store/alerts';
import { useGeofences } from '@/store/geofences';
import { useLocations } from '@/store/locations';

export function useSocketSync(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const socket = connectSocket();

    // Ask backend for the full initial state (vehicles, alerts, geofences).
    emit('request-initial-state');

    const unsubs: Array<() => void> = [];

    unsubs.push(on('initial-state', (payload) => {
      if (!payload) return;
      const v = useVehicles.getState();
      const a = useAlerts.getState();
      const g = useGeofences.getState();
      if (payload.vehicles?.length) {
        v.fetch(); // re-fetch to get clean normalized shapes
      }
      if (payload.alerts?.length) {
        payload.alerts.forEach((alert: any) => useAlerts.getState().ingest(alert));
      }
      if (payload.geofences?.length) {
        g.fetch();
      }
    }));

    unsubs.push(on('location-update', (u) => {
      if (!u?.vehicleId) return;
      useLocations.getState().ingestUpdate(u);
    }));

    unsubs.push(on('panic-alert', (a) => useAlerts.getState().ingest(a)));
    unsubs.push(on('geofence-violation', (a) => useAlerts.getState().ingest(a)));
    unsubs.push(on('dead-man-alert', (a) => useAlerts.getState().ingest(a)));
    unsubs.push(on('alert-updated', (a) => useAlerts.getState().patchStatus(a)));

    unsubs.push(on('vehicle-registered', (v) => {
      if (v) useVehicles.getState().upsertVehicle(v);
    }));
    unsubs.push(on('vehicle-status-changed', ({ vehicleId, status }) => {
      if (vehicleId && status) useVehicles.getState().setStatus(vehicleId, status);
    }));

    unsubs.push(on('geofence-created', (g) => {
      if (g) useGeofences.getState().add(g);
    }));
    unsubs.push(on('geofence-deleted', ({ geofenceId }) => {
      if (geofenceId) useGeofences.getState().remove(geofenceId);
    }));

    return () => {
      unsubs.forEach((u) => u());
      // Don't disconnect here — the socket is shared across the whole app.
      // Disconnect happens on logout (see useAuth.logout).
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
