/**
 * Settings store — backend URL, tracking preferences, role.
 * Persisted to AsyncStorage so they survive app restarts.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendUrl, setBackendUrl, pingBackend } from '@/api/client';

export type Role = 'driver' | 'manager';

interface SettingsState {
  // User identity
  role: Role;
  driverId: string;          // local-only "logged in as" identifier
  driverName: string;
  myVehicleId: string;       // which vehicle this phone is broadcasting as

  // Backend
  backendUrl: string;
  backendReachable: boolean | null; // null = unknown / not yet probed
  lastHealthCheck: number | null;

  // Tracking
  backgroundTrackingEnabled: boolean;
  trackingIntervalSec: number;     // how often to ping GPS in background
  foregroundTrackingEnabled: boolean;

  // Actions
  setRole: (r: Role) => void;
  setIdentity: (id: string, name: string, vehicleId: string) => void;
  setBackendUrl: (url: string) => Promise<void>;
  probeBackend: () => Promise<boolean>;
  setBackgroundTracking: (on: boolean) => void;
  setForegroundTracking: (on: boolean) => void;
  setTrackingInterval: (sec: number) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      role: 'driver',
      driverId: '',
      driverName: '',
      myVehicleId: 'vehicle-001',

      backendUrl: getBackendUrl(),
      backendReachable: null,
      lastHealthCheck: null,

      backgroundTrackingEnabled: true,
      trackingIntervalSec: 60,
      foregroundTrackingEnabled: true,

      setRole: (r) => set({ role: r }),

      setIdentity: (driverId, driverName, myVehicleId) =>
        set({ driverId, driverName, myVehicleId }),

      setBackendUrl: async (url) => {
        await setBackendUrl(url);
        set({ backendUrl: url, backendReachable: null });
      },

      probeBackend: async () => {
        const result = await pingBackend();
        set({
          backendReachable: result.ok,
          lastHealthCheck: Date.now(),
        });
        return result.ok;
      },

      setBackgroundTracking: (on) => set({ backgroundTrackingEnabled: on }),
      setForegroundTracking: (on) => set({ foregroundTrackingEnabled: on }),
      setTrackingInterval: (sec) =>
        set({ trackingIntervalSec: Math.max(15, Math.min(900, Math.round(sec))) }),
    }),
    {
      name: 'gf-settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist backendReachable — re-probe on every launch.
      partialize: (s) => ({
        role: s.role,
        driverId: s.driverId,
        driverName: s.driverName,
        myVehicleId: s.myVehicleId,
        backendUrl: s.backendUrl,
        backgroundTrackingEnabled: s.backgroundTrackingEnabled,
        foregroundTrackingEnabled: s.foregroundTrackingEnabled,
        trackingIntervalSec: s.trackingIntervalSec,
      }),
    },
  ),
);
