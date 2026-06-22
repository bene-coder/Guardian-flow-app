/**
 * useTracking — turns the user's tracking preferences into running GPS
 * subscriptions. Mount this once from the (tabs) layout (after login).
 */

import { useEffect } from 'react';
import { useSettings } from '@/store/settings';
import {
  startForegroundTracking,
  stopForegroundTracking,
  startBackgroundTracking,
  stopBackgroundTracking,
} from '@/location/tracker';

export function useTracking(): void {
  const fg = useSettings((s) => s.foregroundTrackingEnabled);
  const bg = useSettings((s) => s.backgroundTrackingEnabled);
  const intervalSec = useSettings((s) => s.trackingIntervalSec);
  const myVehicleId = useSettings((s) => s.myVehicleId);

  useEffect(() => {
    if (!myVehicleId) return;
    let cancelled = false;

    (async () => {
      if (fg) await startForegroundTracking();
      else stopForegroundTracking();

      if (bg) await startBackgroundTracking();
      else await stopBackgroundTracking();
    })();

    return () => {
      cancelled = true;
      stopForegroundTracking();
      // Note: we deliberately do NOT stop the background task on unmount —
      // it should survive navigation between tabs. It's stopped on logout.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fg, bg, myVehicleId]);

  // If the user changes the interval, restart background tracking so the new
  // value takes effect.
  useEffect(() => {
    if (bg) {
      startBackgroundTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalSec]);
}
