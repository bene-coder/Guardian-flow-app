/**
 * Geofence Manager — manager-only.
 *
 * Lists all geofences with delete buttons, plus a "create" flow that drops
 * a pin on a small map and asks for a name + radius (in km).
 *
 * Geofences are stored on the backend as: { name, centerLat, centerLng, radius (km) }.
 * The backend checks every incoming location against all geofences and
 * emits a `geofence-violation` socket event when a vehicle exits.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Circle, Marker, Region } from 'react-native-maps';

import { colors, typography, spacing, radius, shadows } from '@/theme';
import { useGeofences } from '@/store/geofences';
import { useRefresh } from '@/hooks/useRefresh';
import { Card, SectionHeader } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { DEFAULT_MAP_CENTER, getDistanceKm } from '@/utils/geo';
import { formatDateTime } from '@/utils/format';
import type { Geofence } from '@/api/types';

export default function GeofenceScreen() {
  const geofences = useGeofences((s) => s.geofences);
  const fetch = useGeofences((s) => s.fetch);
  const del = useGeofences((s) => s.del);
  const create = useGeofences((s) => s.create);
  const { refreshing, refresh } = useRefresh(fetch);

  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const onDelete = (g: Geofence) => {
    Alert.alert(
      'Delete geofence',
      `Delete "${g.name}"? Vehicles will no longer be checked against this zone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => del(g.id).catch((e) => Alert.alert('Delete failed', e?.message)),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Geofences"
        subtitle={`${geofences.length} zone${geofences.length === 1 ? '' : 's'} defined`}
        actionLabel="Create"
        onAction={() => setCreateOpen(true)}
      />

      <FlatList
        data={geofences}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GeofenceRow geofence={item} onDelete={() => onDelete(item)} />
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
            icon="location-outline"
            title="No geofences"
            subtitle="Create a geofence to get alerts when a vehicle leaves the zone."
            action={
              <Button
                label="Create geofence"
                onPress={() => setCreateOpen(true)}
                style={{ marginTop: spacing.lg }}
              />
            }
          />
        }
      />

      <CreateGeofenceModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (payload) => {
          try {
            await create(payload);
            setCreateOpen(false);
          } catch (e: any) {
            Alert.alert('Create failed', e?.message);
          }
        }}
      />
    </View>
  );
}

function GeofenceRow({ geofence, onDelete }: { geofence: Geofence; onDelete: () => void }) {
  return (
    <Card padded={false} style={styles.rowCard}>
      <View style={styles.rowStripe} />
      <View style={styles.rowBody}>
        <View style={styles.rowHeader}>
          <View style={styles.rowIcon}>
            <Ionicons name="location" size={16} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName} numberOfLines={1}>{geofence.name}</Text>
            <Text style={styles.rowId} numberOfLines={1}>{geofence.id}</Text>
          </View>
          <TouchableOpacity onPress={onDelete} hitSlop={12}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
        <View style={styles.rowMeta}>
          <Meta label="RADIUS" value={`${geofence.radius} km`} />
          <Meta
            label="CENTER"
            value={`${geofence.center_lat.toFixed(4)}, ${geofence.center_lng.toFixed(4)}`}
          />
        </View>
        {geofence.created_at && (
          <Text style={styles.rowTime}>Created {formatDateTime(geofence.created_at)}</Text>
        )}
      </View>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

// ─── Create modal ───────────────────────────────────────────────────────────

function CreateGeofenceModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; centerLat: number; centerLng: number; radius: number }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [radius, setRadius] = useState('1');
  const [region, setRegion] = useState<Region>(DEFAULT_MAP_CENTER);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    const r = parseFloat(radius);
    if (isNaN(r) || r <= 0) {
      Alert.alert('Invalid radius', 'Radius must be a positive number in km.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        centerLat: region.latitude,
        centerLng: region.longitude,
        radius: r,
      });
      setName(''); setRadius('1');
    } catch (e: any) {
      Alert.alert('Failed', e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Geofence</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Lagos Depot"
            placeholderTextColor={colors.textMuted}
            style={styles.fieldInput}
          />

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Radius (km)</Text>
          <TextInput
            value={radius}
            onChangeText={setRadius}
            placeholder="1"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.fieldInput}
          />

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
            Drag the map to set the center
          </Text>
          <View style={styles.mapWrap}>
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={DEFAULT_MAP_CENTER}
              onRegionChangeComplete={setRegion}
              userInterfaceStyle="dark"
              customMapStyle={colors.mapDarkStyle}
              liteMode
            >
              {/* The "pin" is rendered as a fixed marker at map center,
                  plus a circle previewing the radius. */}
              <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }}>
                <View style={styles.centerPin}>
                  <Ionicons name="location" size={28} color={colors.warning} />
                </View>
              </Marker>
              <Circle
                center={{ latitude: region.latitude, longitude: region.longitude }}
                radius={(parseFloat(radius) || 1) * 1000}
                strokeColor={colors.warning}
                fillColor={`${colors.warning}22`}
                strokeWidth={1.5}
              />
            </MapView>
            {/* Crosshair overlay */}
            <View pointerEvents="none" style={styles.crosshair}>
              <View style={styles.crosshairH} />
              <View style={styles.crosshairV} />
            </View>
          </View>

          <Text style={styles.centerReadout}>
            {region.latitude.toFixed(4)}, {region.longitude.toFixed(4)}  ·  {(parseFloat(radius) || 1).toFixed(1)} km
          </Text>

          <Button
            label={submitting ? 'Creating…' : 'Create geofence'}
            onPress={submit}
            loading={submitting}
            disabled={!name.trim()}
            size="lg"
            style={{ marginTop: spacing.md }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  rowCard: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    overflow: 'hidden',
  } as any,
  rowStripe: { width: 4, backgroundColor: colors.warning },
  rowBody: { flex: 1, padding: spacing.md },
  rowHeader: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: `${colors.warning}22`,
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
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  metaLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  metaValue: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.xs,
    color: colors.text,
    marginTop: 2,
  },
  rowTime: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

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
    maxHeight: '90%',
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
  mapWrap: {
    height: 200,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    marginTop: spacing.xs,
  },
  centerPin: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshair: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairH: {
    position: 'absolute',
    left: 0, right: 0,
    height: 1,
    backgroundColor: `${colors.primary}55`,
  },
  crosshairV: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 1,
    backgroundColor: `${colors.primary}55`,
  },
  centerReadout: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
