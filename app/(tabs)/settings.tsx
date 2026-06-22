/**
 * Settings screen — backend URL, tracking toggles, role switch, logout.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors, typography, spacing, radius, shadows } from '@/theme';
import { useAuth } from '@/store/auth';
import { useSettings, type Role } from '@/store/settings';
import { Card, SectionHeader } from '@/components/Card';
import { Button } from '@/components/Button';
import { ConnectionPill } from '@/components/ConnectionPill';
import { restartTrackingForSettings } from '@/location/tracker';
import { disconnectSocket } from '@/api/socket';
import { getBackendUrl } from '@/api/client';

export default function SettingsScreen() {
  const router = useRouter();
  const role = useAuth((s) => s.role);
  const logout = useAuth((s) => s.logout);

  const settings = useSettings();
  const [urlDraft, setUrlDraft] = useState(settings.backendUrl);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setUrlDraft(getBackendUrl());
  }, [settings.backendUrl]);

  const saveUrl = async () => {
    await settings.setBackendUrl(urlDraft);
    const ok = await settings.probeBackend();
    Alert.alert(
      ok ? 'Connected' : 'Cannot reach backend',
      ok
        ? `GuardianFlow backend reachable at ${urlDraft}.`
        : `Could not reach ${urlDraft}. Check that your backend is running and that the URL is reachable from your device/emulator. (Android emulator: use http://10.0.2.2:3000 to reach your dev machine's localhost.)`,
    );
  };

  const testConnection = async () => {
    setTesting(true);
    await settings.setBackendUrl(urlDraft);
    const ok = await settings.probeBackend();
    setTesting(false);
    Alert.alert(ok ? '✅ Live' : '❌ Unreachable', ok ? 'Backend is reachable.' : 'Cannot reach backend at that URL.');
  };

  const onToggleBackground = async (on: boolean) => {
    settings.setBackgroundTracking(on);
    if (on) {
      // Trigger permission request implicitly via restartTrackingForSettings.
      await restartTrackingForSettings();
    } else {
      await restartTrackingForSettings();
    }
  };

  const onToggleForeground = async (on: boolean) => {
    settings.setForegroundTracking(on);
    await restartTrackingForSettings();
  };

  const switchRole = (r: Role) => {
    useAuth.getState().login(r); // re-uses login which sets role + isAuthed
    // Re-render by replacing the route — the tab layout will adjust.
    router.replace('/(tabs)');
  };

  const onLogout = () => {
    Alert.alert('Sign out', 'Stop broadcasting location and return to login?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          disconnectSocket();
          logout();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Backend connection */}
      <SectionHeader title="Backend Connection" />
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Status</Text>
          <ConnectionPill />
        </View>

        <Text style={[styles.label, { marginTop: spacing.md }]}>Backend URL</Text>
        <TextInput
          value={urlDraft}
          onChangeText={setUrlDraft}
          placeholder="http://10.0.2.2:3000"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
        />
        <Text style={styles.hint}>
          Point this at your GuardianFlow backend. On Android emulator, use{' '}
          <Text style={styles.mono}>http://10.0.2.2:3000</Text> to reach your dev
          machine's localhost:3000.
        </Text>

        <View style={styles.btnRow}>
          <Button label="Save" onPress={saveUrl} variant="primary" style={{ flex: 1 }} />
          <Button
            label={testing ? 'Testing…' : 'Test'}
            onPress={testConnection}
            variant="secondary"
            loading={testing}
            style={{ flex: 1, marginLeft: spacing.sm }}
          />
        </View>
      </Card>

      {/* Tracking */}
      <SectionHeader title="Location Tracking" />
      <Card>
        <ToggleRow
          icon="radio-button-on"
          label="Foreground tracking"
          subtitle="Broadcast GPS while the app is open"
          value={settings.foregroundTrackingEnabled}
          onValueChange={onToggleForeground}
          color={colors.primary}
        />
        <Divider />
        <ToggleRow
          icon="moon"
          label="Background tracking"
          subtitle="Keep broadcasting every minute when app is closed"
          value={settings.backgroundTrackingEnabled}
          onValueChange={onToggleBackground}
          color={colors.info}
        />
        <Divider />
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <Text style={styles.rowLabel}>Interval (sec)</Text>
            <Text style={styles.rowSub}>Background ping frequency</Text>
          </View>
          <View style={styles.stepper}>
            <TouchableOpacity
              onPress={() => settings.setTrackingInterval(settings.trackingIntervalSec - 15)}
              style={styles.stepBtn}
            >
              <Ionicons name="remove" size={16} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.stepValue}>{settings.trackingIntervalSec}s</Text>
            <TouchableOpacity
              onPress={() => settings.setTrackingInterval(settings.trackingIntervalSec + 15)}
              style={styles.stepBtn}
            >
              <Ionicons name="add" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>

      {/* Role */}
      <SectionHeader title="Active Role" />
      <Card>
        <Text style={styles.label}>Switch role</Text>
        <Text style={styles.hint}>
          Driver mode shows your vehicle + panic button. Manager mode shows
          the full fleet + geofence manager + trip history.
        </Text>
        <View style={styles.roleRow}>
          <RolePill
            label="Driver"
            icon="car"
            active={role === 'driver'}
            onPress={() => switchRole('driver')}
          />
          <RolePill
            label="Manager"
            icon="grid"
            active={role === 'manager'}
            onPress={() => switchRole('manager')}
          />
        </View>
      </Card>

      {/* Identity */}
      <SectionHeader title="Identity" />
      <Card>
        <IdentityRow label="Driver ID" value={settings.driverId || '—'} />
        <Divider />
        <IdentityRow label="Name" value={settings.driverName || '—'} />
        <Divider />
        <IdentityRow label="Vehicle ID" value={settings.myVehicleId} />
      </Card>

      {/* About */}
      <SectionHeader title="About" />
      <Card>
        <View style={styles.rowBetween}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
            <Text style={styles.rowLabel}>GuardianFlow</Text>
          </View>
          <Text style={styles.version}>v1.0.0</Text>
        </View>
        <Divider />
        <TouchableOpacity
          style={styles.rowBetween}
          onPress={() => Linking.openURL('https://explorer.solana.com?cluster=devnet')}
        >
          <Text style={styles.link}>View Solana Devnet Explorer</Text>
          <Ionicons name="open-outline" size={14} color={colors.primary} />
        </TouchableOpacity>
      </Card>

      {/* Sign out */}
      <View style={{ padding: spacing.lg }}>
        <Button label="Sign out" onPress={onLogout} variant="danger" size="lg" />
      </View>
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  subtitle,
  value,
  onValueChange,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  color: string;
}) {
  return (
    <View style={styles.rowBetween}>
      <View style={{ flex: 1, marginRight: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={[styles.tinyIcon, { backgroundColor: `${color}22` }]}>
            <Ionicons name={icon} size={14} color={color} />
          </View>
          <Text style={styles.rowLabel}>{label}</Text>
        </View>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.surfaceElevated, true: `${colors.primary}55` }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

function IdentityRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.identityValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function RolePill({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.rolePill, active && styles.rolePillActive]}
      activeOpacity={0.85}
    >
      <Ionicons
        name={icon}
        size={16}
        color={active ? colors.background : colors.textSecondary}
      />
      <Text
        style={[
          styles.rolePillLabel,
          active && styles.rolePillLabelActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingBottom: spacing.xxxl,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  hint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: typography.lineHeight.relaxed * typography.size.xs,
  },
  input: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.sm,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  rowLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  rowSub: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  tinyIcon: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  stepBtn: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  stepValue: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text,
    minWidth: 50,
    textAlign: 'center',
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  rolePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
  },
  rolePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rolePillLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
  },
  rolePillLabelActive: {
    color: colors.background,
  },
  identityValue: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    maxWidth: 200,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  version: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  link: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },
  mono: {
    fontFamily: typography.fontFamilyMono,
    color: colors.text,
  },
});
