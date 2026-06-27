/**
 * Geofences store — fetches /api/geofence, live-updates from socket events:
 *   geofence-created, geofence-deleted.
 */

import { create } from 'zustand';
import { listGeofences, createGeofence, deleteGeofence } from '@/api/geofence';
import type { Geofence } from '@/api/types';

interface GeofencesState {
  geofences: Geofence[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  fetch: () => Promise<void>;
  add: (g: Geofence) => void;
  remove: (id: string) => void;
  create: (payload: { name: string; centerLat: number; centerLng: number; radius: number }) => Promise<Geofence>;
  del: (id: string) => Promise<void>;
}

export const useGeofences = create<GeofencesState>((set, get) => ({
  geofences: [],
  loading: false,
  error: null,
  lastFetch: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const geofences = await listGeofences();
      set({ geofences, loading: false, lastFetch: Date.now() });
    } catch (e: any) {
      set({ loading: false, error: e?.message || 'Failed to load geofences' });
    }
  },

  add: (g) => set((s) => ({ geofences: [g, ...s.geofences] })),
  remove: (id) => set((s) => ({ geofences: s.geofences.filter((g) => g.id !== id) })),

  create: async (payload) => {
    const g = await createGeofence(payload);
    get().add(g);
    return g;
  },

  del: async (id) => {
    // Optimistic.
    get().remove(id);
    try {
      await deleteGeofence(id);
    } catch (e) {
      get().fetch();
      throw e;
    }
  },
}));
