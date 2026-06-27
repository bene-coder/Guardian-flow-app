import { colors, spacing, radius, typography, shadows, animation } from './colors';

export { colors, spacing, radius, typography, shadows, animation };

// Helper for status → color mapping (used across many components)
export type VehicleStatus = 'active' | 'inactive' | 'maintenance' | 'emergency';
export type AlertType = 'PANIC' | 'PANIC_ALERT' | 'GEOFENCE_VIOLATION' | 'DEAD_MAN_SWITCH';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export const vehicleStatusColor: Record<VehicleStatus, string> = {
  active: colors.success,
  inactive: colors.textMuted,
  maintenance: colors.warning,
  emergency: colors.danger,
};

export const alertTypeColor: Record<AlertType, string> = {
  PANIC: colors.danger,
  PANIC_ALERT: colors.danger,
  GEOFENCE_VIOLATION: colors.warning,
  DEAD_MAN_SWITCH: colors.info,
};

export const alertStatusColor: Record<AlertStatus, string> = {
  active: colors.danger,
  acknowledged: colors.warning,
  resolved: colors.success,
};
