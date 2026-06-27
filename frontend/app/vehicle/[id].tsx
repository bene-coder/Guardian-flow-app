/**
 * Vehicle detail — opens when a manager taps a vehicle on the map or list.
 *
 * Shows:
 *   - Identity + status badge
 *   - Latest position (lat/lng, speed, heading, accuracy, last update)
 *   - Status switcher (manager only)
 *   - Recent alerts for this vehicle
 *   - Mini map of the latest position
 *   - Button to view full trip history (jumps to History tab — TBD: deep link)
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Circle } from 'react-native-maps';

import { colors, typography, spacing, radius, shadows, vehicleStatusColor } from '@/theme';
import { useVehicles } from '@/store/vehicles';
import { useLocations } from '@/store/locations';
import { useAlerts } from '@/store/alerts';
import { useGeofences } from '@/store/geofences';
import { useRefresh } from '@/hooks/useRefresh';
import { Card, SectionHeader } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { AlertCard } from '@/components/AlertCard';
import { EmptyState } from '@/components/EmptyState';
import type { VehicleStatus } from '@/api/types';
import { formatSpeed, formatCoords, timeAgo, formatDateTime } from '@/utils/format';
import { isValidCoords, getDistanceKm } from '@/utils/geo';

const STATUSES: VehicleStatus[] = ['active', 'maintenance', 'emergency', 'inactive'];

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const vehicle = useVehicles((s) => s.vehicles.find((v) => v.id === id));
  const fetchVehicles = useVehicles((s) => s.fetch);
  const patchStatus = useVehicles((s) => s.patchStatus);
  const latest = useLocations((s) => s.latest);
  const alerts = useAlerts((s) => s.alerts);
  const fetchAlerts = useAlerts((s) => s.fetch);
  const geofences = useGeofences((s) => s.geofences);
  const { refreshing, refresh } = useRefresh(async () => {
    await Promise.all([fetchVehicles(), fetchAlerts()]);
  });

  useEffect(() => {
    fetchVehicles();
    fetchAlerts();
  }, [fetchVehicles, fetchAlerts]);

  const loc = latest[id || ''];

  const vehicleAlerts = useMemo(() => {
    return alerts
      .filter((a) => (a.vehicle_id || a.vehicleId) === id)
      .slice(0, 10);
  }, [alerts, id]);

  const nearestGeofence = useMemo(() => {
    if (!loc || !isValidCoords(loc.lat, loc.lng)) return null;
    let best: { name: string; distanceKm: number; radiusKm: number } | null = null;
    for (const g of geofences) {
      const d = getDistanceKm(loc.lat, loc.lng, g.center_lat, g.center_lng);
      if (!best || d < best.distanceKm) {
        best = { name: g.name, distanceKm: d, radiusKm: g.radius };
      }
    }
    return best;
  }, [loc, geofences]);

  if (!vehicle) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="car-outline"
          title="Vehicle not found"
          subtitle="This vehicle may have been deactivated. Pull to refresh."
          action={
            <Button label="Back" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
          }
        />
      </View>
    );
  }

  const color = vehicleStatusColor[vehicle.status];
  const mapRegion = loc && isValidCoords(loc.lat, loc.lng)
    ? {
        latitude: loc.lat,
        longitude: loc.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : undefined;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Header */}
      <Card>
        <View style={styles.headerRow}>
          <View style={[styles.avatar, { backgroundColor: `${color}22` }]}>
            <Ionicons name="car" size={26} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleName}>{vehicle.name}</Text>
            <Text style={styles.vehicleId}>{vehicle.id}</Text>
          </View>
          <StatusBadge variant="vehicle" status={vehicle.status} />
        </View>

        <View style={styles.metaRow}>
          <Meta label="DRIVER" value={vehicle.driver_name || '—'} />
          <Meta label="PHONE" value={vehicle.driver_phone || '—'} />
        </View>
        {vehicle.created_at && (
          <Text style={styles.createdTime}>Registered {formatDateTime(vehicle.created_at)}</Text>
        )}
      </Card>

      {/* Live position */}
      <SectionHeader title="Latest Position" />
      <Card>
        {loc && isValidCoords(loc.lat, loc.lng) ? (
          <>
            <View style={styles.statGrid}>
              <Stat icon="speedometer" label="Speed" value={`${formatSpeed(loc.speed)} km/h`} color={colors.primary} />
              <Stat icon="navigate" label="Heading" value={loc.heading != null ? `${Math.round(loc.heading)}°` : '—'} color={colors.info} />
              <Stat icon="location" label="Lat" value={loc.lat.toFixed(4)} color={colors.textSecondary} />
              <Stat icon="location" label="Lng" value={loc.lng.toFixed(4)} color={colors.textSecondary} />
            </View>
            <Text style={styles.lastUpdate}>
              Last update: {loc.recorded_at ? timeAgo(loc.recorded_at) : 'unknown'}
            </Text>
            <Text style={styles.coords}>{formatCoords(loc.lat, loc.lng)}</Text>
          </>
        ) : (
          <EmptyState
            icon="location-outline"
            title="No location data"
            subtitle="This vehicle has not broadcast a position yet."
          />
        )}
      </Card>

      {/* Mini map */}
      {mapRegion && (
        <View style={styles.miniMap}>
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={mapRegion}
            userInterfaceStyle="dark"
            customMapStyle={colors.mapDarkStyle}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <Marker
              coordinate={{ latitude: loc!.lat, longitude: loc!.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.mapMarker, { borderColor: color }]}>
                <Ionicons name="navigate" size={16} color={color} />
              </View>
            </Marker>
            {geofences.map((g) => (
              <Circle
                key={g.id}
                center={{ latitude: g.center_lat, longitude: g.center_lng }}
                radius={g.radius * 1000}
                strokeColor={colors.warning}
                fillColor={`${colors.warning}22`}
                strokeWidth={1}
              />
            ))}
          </MapView>
        </View>
      )}

      {/* Nearest geofence */}
      {nearestGeofence && (
        <Card style={{ marginTop: spacing.md }}>
          <View style={styles.nearestRow}>
            <Ionicons name="location" size={16} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.nearestLabel}>Nearest geofence</Text>
              <Text style={styles.nearestValue}>{nearestGeofence.name}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.nearestDistance}>
                {nearestGeofence.distanceKm.toFixed(2)} km
              </Text>
              <Text
                style={[
                  styles.nearestStatus,
                  { color: nearestGeofence.distanceKm > nearestGeofence.radiusKm ? colors.danger : colors.success },
                ]}
              >
                {nearestGeofence.distanceKm > nearestGeofence.radiusKm ? 'OUTSIDE ZONE' : 'in zone'}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Status switcher */}
      <SectionHeader title="Status" subtitle="Update vehicle status" />
      <Card>
        <View style={styles.statusGrid}>
          {STATUSES.map((s) => {
            const active = vehicle.status === s;
            const c = vehicleStatusColor[s];
            return (
              <TouchableOpacity
                key={s}
                onPress={() => patchStatus(vehicle.id, s).catch(() => {})}
                style={[
                  styles.statusBtn,
                  active && { backgroundColor: `${c}22`, borderColor: c },
                ]}
              >
                <View style={[styles.statusDot, { backgroundColor: c }]} />
                <Text style={[styles.statusLabel, active && { color: c }]}>
                  {s.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Recent alerts */}
      <SectionHeader
        title="Recent Alerts"
        subtitle={`${vehicleAlerts.length} alert${vehicleAlerts.length === 1 ? '' : 's'} for this vehicle`}
        actionLabel="View all"
        onAction={() => router.push('/(tabs)/alerts')}
      />
      {vehicleAlerts.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>No alerts for this vehicle.</Text>
        </Card>
      ) : (
        vehicleAlerts.map((a) => <AlertCard key={a.id} alert={a} />)
      )}

      <Button
        label="View trip history"
        onPress={() => router.push('/(tabs)/history')}
        variant="secondary"
        size="lg"
        style={{ marginTop: spacing.md }}
      />
    </ScrollView>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Stat({
  icon, label, value, color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.statBox}>
      <View style={[styles.statIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={13} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  vehicleName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  vehicleId: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metaRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.lg },
  metaLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  metaValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    color: colors.text,
    marginTop: 2,
  },
  createdTime: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
  },

  statGrid: {
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
    width: 26, height: 26, borderRadius: 7,
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

  miniMap: {
    height: 200,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  mapMarker: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: `${colors.background}AA`,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },

  nearestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  nearestLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  nearestValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
    marginTop: 2,
  },
  nearestDistance: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  nearestStatus: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.6,
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

  emptyText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
