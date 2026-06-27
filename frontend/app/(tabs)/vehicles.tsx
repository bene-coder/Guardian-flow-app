/**
 * Vehicles screen — role-conditional.
 *
 * Driver mode:
 *   - Shows "my vehicle" card with status, driver info, current trip stats,
 *     maintenance toggle.
 *
 * Manager mode:
 *   - Shows full vehicle list with status badges.
 *   - "Register vehicle" button opens a small bottom-sheet form.
 *   - Tap any vehicle to navigate to /vehicle/[id] detail.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors, typography, spacing, radius, shadows, vehicleStatusColor } from '@/theme';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { useVehicles } from '@/store/vehicles';
import { useLocations } from '@/store/locations';
import { useRefresh } from '@/hooks/useRefresh';
import { Card, SectionHeader } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import type { Vehicle, VehicleStatus } from '@/api/types';
import { formatSpeed, formatCoords, timeAgo } from '@/utils/format';

const STATUSES: VehicleStatus[] = ['active', 'maintenance', 'emergency', 'inactive'];

export default function VehiclesScreen() {
  const role = useAuth((s) => s.role);
  const router = useRouter();
  const myVehicleId = useSettings((s) => s.myVehicleId);
  const vehicles = useVehicles((s) => s.vehicles);
  const fetch = useVehicles((s) => s.fetch);
  const patchStatus = useVehicles((s) => s.patchStatus);
  const register = useVehicles((s) => s.register);
  const latest = useLocations((s) => s.latest);
  const { refreshing, refresh } = useRefresh(fetch);

  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    fetch();
  }, [fetch]);

  if (role === 'driver') {
    const mine = vehicles.find((v) => v.id === myVehicleId);
    const myLoc = latest[myVehicleId];
    return (
      <DriverVehicleView
        vehicle={mine}
        location={myLoc}
        onStatusChange={(s) => patchStatus(myVehicleId, s).catch(() => {})}
        onRefresh={refresh}
        refreshing={refreshing}
      />
    );
  }

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Fleet"
        subtitle={`${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'} registered`}
        actionLabel="Register"
        onAction={() => setRegisterOpen(true)}
      />
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VehicleRow
            vehicle={item}
            location={latest[item.id]}
            onPress={() => router.push(`/vehicle/${item.id}`)}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="car-outline"
            title="No vehicles yet"
            subtitle="Register your first vehicle to start tracking."
            action={
              <Button
                label="Register vehicle"
                onPress={() => setRegisterOpen(true)}
                style={{ marginTop: spacing.lg }}
              />
            }
          />
        }
      />

      <RegisterModal
        visible={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSubmit={async (payload) => {
          await register(payload);
          setRegisterOpen(false);
        }}
      />
    </View>
  );
}

// ─── Driver view ────────────────────────────────────────────────────────────

function DriverVehicleView({
  vehicle,
  location,
  onStatusChange,
  onRefresh,
  refreshing,
}: {
  vehicle: Vehicle | undefined;
  location: any;
  onStatusChange: (s: VehicleStatus) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  if (!vehicle) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="car-outline"
          title="Vehicle not registered"
          subtitle="Switch to manager mode to register this vehicle, or update your Vehicle ID in Settings."
        />
      </View>
    );
  }

  return (
    <FlatList
      data={[{}]}
      keyExtractor={() => 'driver'}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      renderItem={() => (
        <>
          {/* Vehicle identity card */}
          <Card>
            <View style={styles.driverHeader}>
              <View style={styles.driverAvatar}>
                <Ionicons name="car" size={26} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{vehicle.name}</Text>
                <Text style={styles.driverSub}>{vehicle.id}</Text>
              </View>
              <StatusBadge variant="vehicle" status={vehicle.status} />
            </View>

            <View style={styles.driverMetaRow}>
              <View style={styles.driverMetaItem}>
                <Text style={styles.driverMetaLabel}>DRIVER</Text>
                <Text style={styles.driverMetaValue}>
                  {vehicle.driver_name || '—'}
                </Text>
              </View>
              <View style={styles.driverMetaItem}>
                <Text style={styles.driverMetaLabel}>PHONE</Text>
                <Text style={styles.driverMetaValue}>
                  {vehicle.driver_phone || '—'}
                </Text>
              </View>
            </View>
          </Card>

          {/* Live trip stats */}
          <SectionHeader title="Live Stats" />
          <Card>
            <View style={styles.statsGrid}>
              <Stat
                icon="speedometer"
                label="Speed"
                value={`${formatSpeed(location?.speed)} km/h`}
                color={colors.primary}
              />
              <Stat
                icon="navigate"
                label="Heading"
                value={location?.heading != null ? `${Math.round(location.heading)}°` : '—'}
                color={colors.info}
              />
              <Stat
                icon="location"
                label="Latitude"
                value={location?.lat != null ? location.lat.toFixed(4) : '—'}
                color={colors.textSecondary}
              />
              <Stat
                icon="location"
                label="Longitude"
                value={location?.lng != null ? location.lng.toFixed(4) : '—'}
                color={colors.textSecondary}
              />
            </View>
            {location?.recorded_at && (
              <Text style={styles.lastUpdate}>
                Last update: {timeAgo(location.recorded_at)}
              </Text>
            )}
            {location?.lat != null && location?.lng != null && (
              <Text style={styles.coords}>{formatCoords(location.lat, location.lng)}</Text>
            )}
          </Card>

          {/* Status switcher */}
          <SectionHeader title="Vehicle Status" subtitle="Update to notify dispatch" />
          <Card>
            <View style={styles.statusGrid}>
              {STATUSES.map((s) => {
                const active = vehicle.status === s;
                const color = vehicleStatusColor[s];
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => onStatusChange(s)}
                    style={[
                      styles.statusBtn,
                      active && { backgroundColor: `${color}22`, borderColor: color },
                    ]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: color }]} />
                    <Text
                      style={[
                        styles.statusLabel,
                        active && { color },
                      ]}
                    >
                      {s.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        </>
      )}
    />
  );
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.statBox}>
      <View style={[styles.statIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

// ─── Manager row ────────────────────────────────────────────────────────────

function VehicleRow({
  vehicle,
  location,
  onPress,
}: {
  vehicle: Vehicle;
  location: any;
  onPress: () => void;
}) {
  const color = vehicleStatusColor[vehicle.status] || colors.textMuted;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card padded={false} style={styles.rowCard}>
        <View style={[styles.rowStripe, { backgroundColor: color }]} />
        <View style={styles.rowBody}>
          <View style={styles.rowHeader}>
            <View style={styles.rowAvatar}>
              <Ionicons name="car" size={18} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName} numberOfLines={1}>{vehicle.name}</Text>
              <Text style={styles.rowId} numberOfLines={1}>{vehicle.id}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
          <View style={styles.rowMeta}>
            <StatusBadge variant="vehicle" status={vehicle.status} size="sm" />
            <Text style={styles.rowSpeed}>
              {location ? `${formatSpeed(location.speed)} km/h` : 'no data'}
            </Text>
            {location?.recorded_at && (
              <Text style={styles.rowTime}>{timeAgo(location.recorded_at)}</Text>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ─── Register modal ─────────────────────────────────────────────────────────

function RegisterModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: { id: string; name: string; driverName?: string; driverPhone?: string }) => Promise<void>;
}) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!id || !name) return;
    setSubmitting(true);
    try {
      await onSubmit({
        id: id.trim(),
        name: name.trim(),
        driverName: driverName.trim() || undefined,
        driverPhone: driverPhone.trim() || undefined,
      });
      setId(''); setName(''); setDriverName(''); setDriverPhone('');
    } catch (e: any) {
      console.warn('register failed', e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Register Vehicle</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Field label="Vehicle ID *" value={id} onChangeText={setId} placeholder="vehicle-002" autoCapitalize="none" />
          <Field label="Name *" value={name} onChangeText={setName} placeholder="Toyota Hiace — LAG-ABC-123" />
          <Field label="Driver name" value={driverName} onChangeText={setDriverName} placeholder="Driver name" />
          <Field label="Driver phone" value={driverPhone} onChangeText={setDriverPhone} placeholder="+234 800 000 0000" keyboardType="phone-pad" />

          <Button label={submitting ? 'Registering…' : 'Register vehicle'} onPress={submit} loading={submitting} disabled={!id || !name} size="lg" style={{ marginTop: spacing.lg }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label, value, onChangeText, placeholder, keyboardType, autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={styles.fieldInput}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Driver view
  driverHeader: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: `${colors.primary}22`,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  driverName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  driverSub: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  driverMetaRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.lg,
  },
  driverMetaItem: { flex: 1 },
  driverMetaLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  driverMetaValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    color: colors.text,
    marginTop: 2,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  statIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  statValue: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
    marginTop: 2,
  },
  lastUpdate: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  coords: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },

  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statusDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  statusLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
  },

  // Manager row
  rowCard: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    overflow: 'hidden',
  } as any,
  rowStripe: { width: 4 },
  rowBody: { flex: 1, padding: spacing.md },
  rowHeader: { flexDirection: 'row', alignItems: 'center' },
  rowAvatar: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  rowId: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  rowSpeed: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  rowTime: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },

  // Register modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  fieldLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  fieldInput: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
