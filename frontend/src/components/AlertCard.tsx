/**
 * AlertCard — single alert row used by the Alerts feed and the vehicle detail.
 *
 * Renders:
 *   - color stripe by alert type
 *   - icon by alert type (panic / geofence / dead-man)
 *   - vehicleId, type label, time-ago
 *   - status badge
 *   - blockchain badge (if tx present)
 *   - lat/lng in mono
 *   - manager actions: Acknowledge / Resolve
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typography, spacing, shadows, alertTypeColor } from '@/theme';
import type { Alert } from '@/api/types';
import { timeAgo, formatCoords, humanize } from '@/utils/format';
import { StatusBadge } from './StatusBadge';
import { BlockchainBadge } from './BlockchainBadge';

type Props = {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  style?: ViewStyle;
};

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  PANIC: 'warning',
  PANIC_ALERT: 'warning',
  GEOFENCE_VIOLATION: 'location-outline',
  DEAD_MAN_SWITCH: 'skull-outline',
};

export function AlertCard({ alert, onAcknowledge, onResolve, style }: Props) {
  const color = alertTypeColor[alert.type] || colors.warning;
  const vehicleId = alert.vehicle_id || alert.vehicleId || '—';
  const tx = alert.blockchain_tx || alert.blockchainTx;
  const dataHash = alert.metadata?.dataHash as string | undefined;

  return (
    <View style={[styles.card, style]}>
      <View style={[styles.stripe, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={TYPE_ICON[alert.type] || 'notifications'}
              size={18}
              color={color}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.typeLabel}>{humanize(alert.type)}</Text>
            <Text style={styles.vehicleId} numberOfLines={1}>
              {vehicleId}
            </Text>
          </View>
          <StatusBadge variant="alert" status={alert.status} size="sm" />
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.time}>
            {alert.created_at
              ? timeAgo(alert.created_at)
              : alert.timestamp
                ? timeAgo(alert.timestamp)
                : 'just now'}
          </Text>
          {alert.lat != null && alert.lng != null && (
            <Text style={styles.coords}>
              {formatCoords(alert.lat, alert.lng)}
            </Text>
          )}
        </View>

        {alert.metadata?.geofenceName && (
          <Text style={styles.metaLine}>
            Geofence: <Text style={styles.metaBold}>{alert.metadata.geofenceName}</Text>
            {alert.metadata.exceededBy ? `  ·  exceeded by ${alert.metadata.exceededBy} km` : ''}
          </Text>
        )}
        {alert.metadata?.stoppedDuration != null && (
          <Text style={styles.metaLine}>
            Stopped for <Text style={styles.metaBold}>{alert.metadata.stoppedDuration} min</Text>
          </Text>
        )}

        {tx && <BlockchainBadge txSignature={tx} dataHash={dataHash} style={styles.chain} />}

        {(alert.status === 'active' || alert.status === 'acknowledged') &&
          (onAcknowledge || onResolve) && (
            <View style={styles.actions}>
              {alert.status === 'active' && onAcknowledge && (
                <TouchableOpacity
                  style={[styles.btn, { borderColor: colors.warning }]}
                  onPress={() => onAcknowledge(alert.id)}
                >
                  <Text style={[styles.btnText, { color: colors.warning }]}>Acknowledge</Text>
                </TouchableOpacity>
              )}
              {onResolve && (
                <TouchableOpacity
                  style={[styles.btn, { borderColor: colors.success }]}
                  onPress={() => onResolve(alert.id)}
                >
                  <Text style={[styles.btnText, { color: colors.success }]}>Resolve</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  } as ViewStyle,
  stripe: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  typeLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text,
  } as TextStyle,
  vehicleId: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  time: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginRight: spacing.md,
  },
  coords: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  metaLine: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  metaBold: {
    color: colors.text,
    fontWeight: typography.weight.semibold,
  },
  chain: {
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
});
