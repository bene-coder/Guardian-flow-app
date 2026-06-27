/**
 * ConnectionPill — small indicator shown over the map / in the header.
 *
 * Three states:
 *   - green dot  + "Live"          (socket connected)
 *   - amber dot  + "Connecting…"   (socket exists but not connected)
 *   - red dot    + "Offline"       (no socket / disconnected)
 *
 * Also folds in the backend reachability from the settings store.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, spacing, radius } from '@/theme';
import { isSocketConnected } from '@/api/socket';
import { useSettings } from '@/store/settings';
import { useEffect, useState } from 'react';

type Props = { style?: ViewStyle };

export function ConnectionPill({ style }: Props) {
  const backendReachable = useSettings((s) => s.backendReachable);
  const [connected, setConnected] = useState(isSocketConnected());

  useEffect(() => {
    const i = setInterval(() => setConnected(isSocketConnected()), 2_000);
    return () => clearInterval(i);
  }, []);

  let color: string = colors.danger;
  let label = 'Offline';
  if (connected) {
    color = colors.success;
    label = 'Live';
  } else if (backendReachable) {
    color = colors.warning;
    label = 'Connecting…';
  }

  return (
    <View style={[styles.wrap, { borderColor: `${color}55` }, style]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mapOverlayBg,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.4,
  },
});
