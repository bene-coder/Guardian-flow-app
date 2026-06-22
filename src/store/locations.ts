/**
 * Locations store — holds the latest position of every vehicle.
 *
 * Updated in two ways:
 *   1. GET /api/location/latest on app launch (or refresh)
 *   2. socket event 'location-update' pushes incremental updates
 *
 * For the driver, also keeps the device's own current GPS reading for
 * the live map + status card.
 */

import { create } from 'zustand';
import { getLatestLocations } from '@/api/location';
import type { LatestLocation } from '@/api/types';

interface LocationsState {
  latest: Record<string, LatestLocation>; // keyed by vehicle_id
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  // Driver's own current GPS reading (from expo-location, not the server).
  myPosition: {
    lat: number;
    lng: number;
    speed: number;
    heading: number;
    accuracy: number;
    timestamp: number;
  } | null;

  fetch: () => Promise<void>;
  ingestUpdate: (u: {
    vehicleId: string;
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
    timestamp: number;
  }) => void;
  setMyPosition: (p: LocationsState['myPosition']) => void;
  clear: () => void;
}

export const useLocations = create<LocationsState>((set) => ({
  latest: {},
  loading: false,
  error: null,
  lastFetch: null,
  myPosition: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const rows = await getLatestLocations();
      const map: Record<string, LatestLocation> = {};
      rows.forEach((r) => {
        const id = r.vehicle_id;
        if (id) map[id] = r;
      });
      set({ latest: map, loading: false, lastFetch: Date.now() });
    } catch (e: any) {
      set({ loading: false, error: e?.message || 'Failed to load locations' });
    }
  },

  ingestUpdate: (u) =>
    set((s) => ({
      latest: {
        ...s.latest,
        [u.vehicleId]: {
          ...(s.latest[u.vehicleId] || {}),
          vehicle_id: u.vehicleId,
          lat: u.lat,
          lng: u.lng,
          speed: u.speed,
          heading: u.heading,
          accuracy: u.accuracy,
          recorded_at: new Date(u.timestamp).toISOString(),
          timestamp: u.timestamp,
        },
      },
    })),

  setMyPosition: (p) => set({ myPosition: p }),

  clear: () => set({ latest: {}, myPosition: null }),
}));
