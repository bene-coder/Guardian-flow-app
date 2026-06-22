/**
 * Login screen — local-only authentication.
 *
 * The backend has no auth endpoint yet, so we treat this as a role picker +
 * identity declaration. The user picks "Driver" or "Fleet Manager", types
 * their name + vehicle ID (driver only), and we drop them into the app.
 *
 * To plug in real auth later (Supabase OTP, JWT, etc.), replace the body of
 * `handleLogin` — the rest of the app reads identity from the settings store.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors, typography, spacing, radius, shadows } from '@/theme';
import { useAuth } from '@/store/auth';
import { useSettings, type Role } from '@/store/settings';
import { Button } from '@/components/Button';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const login = useAuth((s) => s.login);

  const [role, setRole] = useState<Role>('driver');
  const [name, setName] = useState('');
  const [vehicleId, setVehicleId] = useState('vehicle-001');
  const [phone, setPhone] = useState('');

  const handleLogin = () => {
    const driverId = `driver-${Date.now().toString(36)}`;
    useSettings.getState().setIdentity(driverId, name || 'Driver', vehicleId);
    login(role);
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.xxxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand */}
        <View style={styles.brandWrap}>
          <View style={styles.logo}>
            <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
          </View>
          <Text style={styles.brandName}>GuardianFlow</Text>
          <Text style={styles.tagline}>Fleet safety, on chain.</Text>
        </View>

        {/* Role picker */}
        <Text style={styles.label}>I am a…</Text>
        <View style={styles.roleRow}>
          <RoleCard
            selected={role === 'driver'}
            onPress={() => setRole('driver')}
            icon="car"
            label="Driver"
            description="Broadcast my location & trigger panic alerts"
          />
          <RoleCard
            selected={role === 'manager'}
            onPress={() => setRole('manager')}
            icon="grid"
            label="Fleet Manager"
            description="Monitor all vehicles & manage geofences"
          />
        </View>

        {/* Identity */}
        <Text style={styles.label}>Your name</Text>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="e.g. Onyiriagha Benedictus"
          icon="person-outline"
        />

        <Text style={styles.label}>Phone (optional)</Text>
        <Input
          value={phone}
          onChangeText={setPhone}
          placeholder="+234 800 000 0000"
          icon="call-outline"
          keyboardType="phone-pad"
        />

        {role === 'driver' && (
          <>
            <Text style={styles.label}>Vehicle ID</Text>
            <Input
              value={vehicleId}
              onChangeText={setVehicleId}
              placeholder="vehicle-001"
              icon="car-sport-outline"
              autoCapitalize="none"
            />
          </>
        )}

        <View style={{ height: spacing.xxl }} />

        <Button label="Enter GuardianFlow" onPress={handleLogin} size="lg" />

        <Text style={styles.fineprint}>
          By entering you agree to broadcast your device location to the
          GuardianFlow backend while the app is in use.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RoleCard({
  selected,
  onPress,
  icon,
  label,
  description,
}: {
  selected: boolean;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.roleCard,
        selected && styles.roleCardSelected,
      ]}
    >
      <View
        style={[
          styles.roleIcon,
          selected && { backgroundColor: `${colors.primary}22` },
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={selected ? colors.primary : colors.textSecondary}
        />
      </View>
      <Text
        style={[
          styles.roleLabel,
          selected && { color: colors.primary },
        ]}
      >
        {label}
      </Text>
      <Text style={styles.roleDesc}>{description}</Text>
      {selected && (
        <View style={styles.checkPill}>
          <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType,
  autoCapitalize,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  icon: keyof typeof Ionicons.glyphMap;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  return (
    <View style={styles.inputWrap}>
      <Ionicons name={icon} size={18} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  brandName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  tagline: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.primary,
    marginTop: 4,
    letterSpacing: 0.8,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  roleCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    position: 'relative',
    minHeight: 130,
  },
  roleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}0D`,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  roleLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  roleDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: typography.lineHeight.relaxed * typography.size.xs,
  },
  checkPill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  input: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    color: colors.text,
    padding: 0,
  },
  fineprint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: typography.lineHeight.relaxed * typography.size.xs,
  },
});
