/**
 * Button — primary / secondary / danger variants.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, typography, radius, spacing } from '@/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'md' | 'lg';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  icon,
  style,
}: Props) {
  const bg = {
    primary: colors.primary,
    secondary: colors.surfaceElevated,
    danger: colors.danger,
    ghost: 'transparent',
  }[variant];
  const fg = {
    primary: '#06141A',
    secondary: colors.text,
    danger: '#fff',
    ghost: colors.primary,
  }[variant];
  const borderColor = {
    primary: 'transparent',
    secondary: colors.border,
    danger: 'transparent',
    ghost: 'transparent',
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.btn,
        {
          backgroundColor: bg,
          borderColor,
          paddingVertical: size === 'lg' ? spacing.md : spacing.sm + 2,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.label,
              { color: fg, fontSize: size === 'lg' ? typography.size.lg : typography.size.md },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: spacing.xs,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontWeight: typography.weight.semibold,
  } as TextStyle,
});
