/**
 * Trip History — manager-only.
 *
 * Pick a vehicle + time window, fetch its location history from
 * GET /api/location/:vehicleId/history?hours=N, render the route as a
 * polyline on a small map plus summary stats (distance, duration, max speed).
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, Marker } from 'react-native-maps';

import { colors, typography, spacing, radius } from '@/theme';
import { useVehicles } from '@/store/vehicles';
import { getVehicleHistory } from '@/api/location';
import { useRefresh } from '@/hooks/useRefresh';
import { Card, SectionHeader } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import type { LocationPoint } from '@/api/types';
import { pathDistanceKm, calculateBearing } from '@/utils/geo';
import { formatDistance, formatDuration, formatSpeed, formatDateTime } from '@/utils/format';

const WINDOWS = [
  { label: '1h', hours: 1 },
  { label: '6h', hours: 6 },
  { label: '24h', hours: 24 },
  { label: '7d', hours: 24 * 7 },
];

export default function HistoryScreen() {
  const vehicles = useVehicles((s) => s.vehicles);
  const fetchVehicles = useVehicles((s) => s.fetch);
  const { refreshing, refresh } = useRefresh(fetchVehicles);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hours, setHours] = useState(24);
  const [history, setHistory] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Auto-select first vehicle once list loads.
  useEffect(() => {
    if (!selectedId && vehicles.length > 0) {
      setSelectedId(vehicles[0].id);
    }
  }, [vehicles, selectedId]);

  const loadHistory = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getVehicleHistory(selectedId, hours);
      // Backend returns newest first; we want chronological for the polyline.
      const points = [...(res.data || [])].reverse();
      setHistory(points);
    } catch (e: any) {
      setError(e?.message || 'Failed to load history');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId, hours]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const stats = useMemo(() => {
    if (history.length < 2) return null;
    const distanceKm = pathDistanceKm(history.map((p) => ({ lat: p.lat, lng: p.lng })));
    const start = new Date(history[0].recorded_at).getTime();
    const end = new Date(history[history.length - 1].recorded_at).getTime();
    const duration = end - start;
    const maxSpeed = history.reduce((m, p) => Math.max(m, p.speed || 0), 0);
    return { distanceKm, duration, maxSpeed, points: history.length };
  }, [history]);

  const region = useMemo(() => {
    if (history.length === 0) return undefined;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const p of history) {
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
      minLng = Math.min(minLng, p.lng);
      maxLng = Math.max(maxLng, p.lng);
    }
    const padding = 0.005;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) + padding,
      longitudeDelta: (maxLng - minLng) + padding,
    };
  }, [history]);

  return (
    <View style={styles.container}>
      <SectionHeader title="Trip History" subtitle="Replay any vehicle's route" />

      {/* Vehicle picker */}
      <FlatList
        horizontal
        data={vehicles}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
        renderItem={({ item }) => {
          const active = selectedId === item.id;
          return (
            <TouchableOpacity
              onPress={() => setSelectedId(item.id)}
              style={[styles.vehicleChip, active && styles.vehicleChipActive]}
            >
              <Ionicons
                name="car"
                size={13}
                color={active ? colors.background : colors.textSecondary}
              />
              <Text
                style={[
                  styles.vehicleChipLabel,
                  active && styles.vehicleChipLabelActive,
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      {/* Time window */}
      <View style={styles.windowRow}>
        {WINDOWS.map((w) => {
          const active = hours === w.hours;
          return (
            <TouchableOpacity
              key={w.label}
              onPress={() => setHours(w.hours)}
              style={[styles.windowChip, active && styles.windowChipActive]}
            >
              <Text
                style={[
                  styles.windowChipLabel,
                  active && styles.windowChipLabelActive,
                ]}
              >
                {w.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsRow}>
          <StatPill icon="navigate" label="Distance" value={formatDistance(stats.distanceKm)} />
          <StatPill icon="time" label="Duration" value={formatDuration(stats.duration)} />
          <StatPill icon="speedometer" label="Max speed" value={`${formatSpeed(stats.maxSpeed)} km/h`} />
          <StatPill icon="ellipse" label="Points" value={String(stats.points)} />
        </View>
      )}

      {/* Map + list */}
      {!selectedId ? (
        <EmptyState
          icon="car-outline"
          title="No vehicle selected"
          subtitle="Register a vehicle first to view its trip history."
        />
      ) : loading ? (
        <EmptyState icon="hourglass" title="Loading history…" />
      ) : error ? (
        <EmptyState
          icon="cloud-offline"
          title="Could not load history"
          subtitle={error}
          action={<Button label="Retry" onPress={loadHistory} style={{ marginTop: spacing.lg }} />}
        />
      ) : history.length === 0 ? (
        <EmptyState
          icon="map-outline"
          title="No trips in this window"
          subtitle="The vehicle has not broadcast any location data in the selected time range."
        />
      ) : (
        <View style={styles.mapWrap}>
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={region}
            userInterfaceStyle="dark"
            customMapStyle={colors.mapDarkStyle}
            loadingEnabled
          >
            <Polyline
              coordinates={history.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
              strokeColor={colors.primary}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
            {history.length > 0 && (
              <Marker coordinate={{ latitude: history[0].lat, longitude: history[0].lng }}>
                <View style={styles.endMarker}>
                  <Ionicons name="flag" size={14} color={colors.background} />
                </View>
              </Marker>
            )}
            {history.length > 1 && (
              <Marker coordinate={{ latitude: history[history.length - 1].lat, longitude: history[history.length - 1].lng }}>
                <View style={styles.startMarker}>
                  <Ionicons name="locate" size={14} color={colors.background} />
                </View>
              </Marker>
            )}
          </MapView>

          <View style={styles.legend}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>Route</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <Text style={styles.legendText}>Start</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
              <Text style={styles.legendText}>End</Text>
            </View>
          </View>
        </View>
      )}

      {/* Point list */}
      {history.length > 0 && (
        <>
          <SectionHeader
            title="Raw Points"
            subtitle={`${history.length} location pings`}
          />
          <FlatList
            data={history.slice(-30).reverse()}
            keyExtractor={(item, idx) => `${item.recorded_at}-${idx}`}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
            renderItem={({ item, index }) => (
              <View style={styles.pointRow}>
                <View style={styles.pointDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pointTime}>{formatDateTime(item.recorded_at)}</Text>
                  <Text style={styles.pointCoords}>
                    {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                  </Text>
                </View>
                <View style={styles.pointStats}>
                  <Text style={styles.pointSpeed}>{formatSpeed(item.speed)} km/h</Text>
                  <Text style={styles.pointHeading}>
                    {item.heading != null ? `${Math.round(item.heading)}°` : '—'}
                  </Text>
                </View>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statPill}>
      <View style={styles.statPillIcon}>
        <Ionicons name={icon} size={12} color={colors.primary} />
      </View>
      <Text style={styles.statPillLabel}>{label}</Text>
      <Text style={styles.statPillValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    maxWidth: 180,
  },
  vehicleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  vehicleChipLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
  },
  vehicleChipLabelActive: { color: colors.background },

  windowRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  windowChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  windowChipActive: {
    backgroundColor: `${colors.primary}22`,
    borderColor: colors.primary,
  },
  windowChipLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
  },
  windowChipLabelActive: { color: colors.primary },

  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statPill: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  statPillIcon: {
    width: 24, height: 24, borderRadius: 6,
    backgroundColor: `${colors.primary}22`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statPillLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  statPillValue: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
    marginTop: 2,
  },

  mapWrap: {
    height: 280,
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  endMarker: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.warning,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  startMarker: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  legend: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.mapOverlayBg,
    borderWidth: 1,
    borderColor: colors.mapOverlayBorder,
    borderRadius: radius.sm,
    padding: spacing.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  legendText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.text,
  },

  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pointDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.md,
  },
  pointTime: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  pointCoords: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pointStats: {
    alignItems: 'flex-end',
  },
  pointSpeed: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  pointHeading: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
});
