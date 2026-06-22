/**
 * GuardianFlow location tracker
 * ─────────────────────────────────────────────────────────────────────────
 * Two layers of GPS:
 *
 *   1. Foreground subscription — high-frequency (every ~5s) while the app
 *      is open. Powers the live map + vehicle status card.
 *
 *   2. Background task — fires every ~1 minute via expo-task-manager +
 *      expo-background-fetch. Survives the app being backgrounded and is
 *      the minimum needed to keep a vehicle "tracked" while the driver's
 *      phone is in their pocket. Uses foreground-service notification on
 *      Android so the OS doesn't kill it.
 *
 * Both layers POST to /api/location and update the locations store.
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { sendLocation } from '@/api/location';
import { useLocations } from '@/store/locations';
import { useSettings } from '@/store/settings';

export const BACKGROUND_TASK_NAME = 'gf-background-location';
const FOREGROUND_SUBSCRIPTION: Location.LocationSubscription | null = (null as any);

let foregroundSub: Location.LocationSubscription | null = null;

// ─── Background task definition ─────────────────────────────────────────────
// Must be defined at module scope (before any component mounts) so the task
// manager can rehydrate it after a cold start.

type BackgroundTaskBody = {
  data?: { locations: Location.LocationObject[] };
  error?: TaskManager.TaskManagerError | null;
};

TaskManager.defineTask(
  BACKGROUND_TASK_NAME,
  async ({ data, error }: BackgroundTaskBody) => {
    if (error) {
      console.warn('[bg-location] task error:', error.message);
      return;
    }
    if (!data?.locations?.length) return;

    const loc = data.locations[data.locations.length - 1];
    const { myVehicleId } = useSettings.getState();
    if (!myVehicleId) return;

    try {
      await sendLocation({
        vehicleId: myVehicleId,
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        speed: loc.coords.speed ? loc.coords.speed * 3.6 : 0, // m/s → km/h
        heading: loc.coords.heading ?? 0,
        accuracy: loc.coords.accuracy ?? 0,
      });
      console.log('[bg-location] sent', loc.coords.latitude, loc.coords.longitude);
    } catch (e: any) {
      console.warn('[bg-location] send failed:', e?.message);
    }
  },
);

// ─── Permissions ────────────────────────────────────────────────────────────

export async function ensureLocationPermissions(background: boolean): Promise<boolean> {
  try {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== 'granted') return false;
    if (!background) return true;

    if (Platform.OS === 'android') {
      // On Android 10+, background location is a separate permission prompt.
      const { status: bg } = await Location.requestBackgroundPermissionsAsync();
      return bg === 'granted';
    }
    if (Platform.OS === 'ios') {
      const { status: bg } = await Location.requestBackgroundPermissionsAsync();
      return bg === 'granted';
    }
    return true;
  } catch (e) {
    console.warn('[location] permission error', e);
    return false;
  }
}

// ─── Foreground subscription ───────────────────────────────────────────────

export async function startForegroundTracking(): Promise<boolean> {
  if (foregroundSub) return true;
  const ok = await ensureLocationPermissions(false);
  if (!ok) {
    console.warn('[fg-location] foreground permission not granted');
    return false;
  }

  try {
    foregroundSub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5_000,
        distanceInterval: 5,
      },
      (loc) => {
        const pos = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          speed: loc.coords.speed ? loc.coords.speed * 3.6 : 0,
          heading: loc.coords.heading ?? 0,
          accuracy: loc.coords.accuracy ?? 0,
          timestamp: Date.now(),
        };
        useLocations.getState().setMyPosition(pos);

        const { myVehicleId, foregroundTrackingEnabled } = useSettings.getState();
        if (!myVehicleId || !foregroundTrackingEnabled) return;

        // Fire-and-forget — we don't want to block the UI thread.
        sendLocation({
          vehicleId: myVehicleId,
          ...pos,
        }).catch((e) => console.warn('[fg-location] send failed', e?.message));
      },
    );
    return true;
  } catch (e: any) {
    console.warn('[fg-location] start failed', e?.message);
    return false;
  }
}

export function stopForegroundTracking(): void {
  if (foregroundSub) {
    foregroundSub.remove();
    foregroundSub = null;
  }
}

// ─── Background task ────────────────────────────────────────────────────────

export async function startBackgroundTracking(): Promise<boolean> {
  const { backgroundTrackingEnabled } = useSettings.getState();
  if (!backgroundTrackingEnabled) return false;

  const ok = await ensureLocationPermissions(true);
  if (!ok) {
    console.warn('[bg-location] background permission not granted');
    return false;
  }

  try {
    await Location.startLocationUpdatesAsync(BACKGROUND_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60_000,
      distanceInterval: 50,
      // Android foreground service notification — required for background location.
      foregroundService: {
        notificationTitle: 'GuardianFlow is tracking',
        notificationBody: 'Your vehicle position is being broadcast for safety.',
        notificationColor: '#00E5C7',
      },
      showsBackgroundLocationIndicator: true,
    });
    console.log('[bg-location] started');
    return true;
  } catch (e: any) {
    console.warn('[bg-location] start failed', e?.message);
    return false;
  }
}

export async function stopBackgroundTracking(): Promise<void> {
  try {
    const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_TASK_NAME);
    if (started) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_TASK_NAME);
      console.log('[bg-location] stopped');
    }
  } catch (e: any) {
    console.warn('[bg-location] stop failed', e?.message);
  }
}

// ─── Convenience ────────────────────────────────────────────────────────────

export async function restartTrackingForSettings(): Promise<void> {
  // Called when the user toggles tracking settings.
  stopForegroundTracking();
  await stopBackgroundTracking();
  const s = useSettings.getState();
  if (s.foregroundTrackingEnabled) await startForegroundTracking();
  if (s.backgroundTrackingEnabled) await startBackgroundTracking();
}

export async function getCurrentPositionOnce(): Promise<{
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  accuracy: number;
} | null> {
  const ok = await ensureLocationPermissions(false);
  if (!ok) return null;
  try {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      speed: loc.coords.speed ? loc.coords.speed * 3.6 : 0,
      heading: loc.coords.heading ?? 0,
      accuracy: loc.coords.accuracy ?? 0,
    };
  } catch (e: any) {
    console.warn('[location] getCurrentPositionOnce failed', e?.message);
    return null;
  }
}

/** Haptic helper — used by the panic button. */
export async function haptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' = 'medium') {
  try {
    const map = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
      success: null,
      error: null,
      warning: null,
    } as const;
    if (map[type] != null) {
      await Haptics.impactAsync(map[type]);
    } else if (type === 'success') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (type === 'error') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else if (type === 'warning') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {}
}

export { FOREGROUND_SUBSCRIPTION };
