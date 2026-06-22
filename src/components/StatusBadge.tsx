/**
 * StatusBadge — colored pill for vehicle status + alert status.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, typography, spacing } from '@/theme';
import {
  vehicleStatusColor,
  alertStatusColor,
  type VehicleStatus,
  type AlertStatus,
} from '@/theme';

type Props = {
  variant: 'vehicle' | 'alert';
  status: VehicleStatus | AlertStatus;
  size?: 'sm' | 'md';
  style?: ViewStyle;
};

export function StatusBadge({ variant, status, size = 'md', style }: Props) {
  const color =
    variant === 'vehicle'
      ? vehicleStatusColor[status as VehicleStatus]
      : alertStatusColor[status as AlertStatus];

  const label = String(status).toUpperCase();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${color}22`,
          borderColor: `${color}55`,
          paddingVertical: size === 'sm' ? 2 : 4,
          paddingHorizontal: size === 'sm' ? 8 : 10,
        },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text
        style={[
          styles.text,
          { color, fontSize: size === 'sm' ? typography.size.xs : typography.size.sm },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  text: {
    fontFamily: typography.fontFamily,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5,
  },
});
