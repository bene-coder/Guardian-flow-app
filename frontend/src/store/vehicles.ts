/**
 * Vehicles store — fetches /api/vehicles, holds the list, and keeps it
 * live-updated from socket events (vehicle-registered, vehicle-status-changed).
 */

import { create } from 'zustand';
import { listVehicles, registerVehicle, updateVehicleStatus } from '@/api/vehicles';
import type { Vehicle, VehicleStatus } from '@/api/types';

interface VehiclesState {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  fetch: () => Promise<void>;
  addVehicle: (v: Vehicle) => void;
  upsertVehicle: (v: Vehicle) => void;
  setStatus: (vehicleId: string, status: VehicleStatus) => void;
  register: (payload: {
    id: string;
    name: string;
    driverName?: string;
    driverPhone?: string;
  }) => Promise<Vehicle>;
  patchStatus: (vehicleId: string, status: VehicleStatus) => Promise<void>;
}

export const useVehicles = create<VehiclesState>((set, get) => ({
  vehicles: [],
  loading: false,
  error: null,
  lastFetch: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const vehicles = await listVehicles();
      set({ vehicles, loading: false, lastFetch: Date.now() });
    } catch (e: any) {
      set({ loading: false, error: e?.message || 'Failed to load vehicles' });
    }
  },

  addVehicle: (v) => set((s) => ({ vehicles: [v, ...s.vehicles] })),

  upsertVehicle: (v) =>
    set((s) => {
      const idx = s.vehicles.findIndex((x) => x.id === v.id);
      if (idx === -1) return { vehicles: [v, ...s.vehicles] };
      const next = [...s.vehicles];
      next[idx] = { ...next[idx], ...v };
      return { vehicles: next };
    }),

  setStatus: (vehicleId, status) =>
    set((s) => ({
      vehicles: s.vehicles.map((v) =>
        v.id === vehicleId ? { ...v, status } : v,
      ),
    })),

  register: async (payload) => {
    const v = await registerVehicle(payload);
    get().addVehicle(v);
    return v;
  },

  patchStatus: async (vehicleId, status) => {
    // Optimistic update.
    get().setStatus(vehicleId, status);
    try {
      await updateVehicleStatus(vehicleId, status);
    } catch (e) {
      // Revert by refetching.
      get().fetch();
      throw e;
    }
  },
}));
