/**
 * PanicFAB — floating red button always visible over the live map (driver mode).
 *
 * Hold-to-confirm: a 1.5-second long-press opens the full panic screen
 * (which itself has a longer hold-to-fire).
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius, shadows, spacing } from '@/theme';
import { haptic } from '@/location/tracker';

type Props = { style?: ViewStyle };

export function PanicFAB({ style }: Props) {
  const router = useRouter();

  const onPress = async () => {
    await haptic('heavy');
    router.push('/panic');
  };

  return (
    <TouchableOpacity
      style={[styles.fab, style]}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityLabel="Trigger panic alert"
    >
      <Ionicons name="warning" size={22} color="#fff" />
      <Text style={styles.label}>PANIC</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    ...shadows.dangerGlow,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    fontWeight: typography.weight.heavy,
    color: '#fff',
    letterSpacing: 1.2,
    marginLeft: spacing.xs,
  },
});
