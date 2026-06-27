/**
 * Live Map screen — full-screen map with vehicle markers + geofence circles.
 *
 * Driver mode:  shows just my vehicle + my own GPS reading.
 * Manager mode: shows all vehicles + all geofences.
 *
 * A Panic FAB floats over the map in driver mode. Tapping it opens the
 * full-screen panic modal.
 *
 * If no Google Maps API key is configured, react-native-maps falls back to
 * the platform default tiles (Apple Maps on iOS, Google Maps on Android) —
 * still fully functional, just no custom dark style.
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle, Callout, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

import { colors, typography, spacing, radius, shadows, vehicleStatusColor } from '@/theme';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { useVehicles } from '@/store/vehicles';
import { useLocations } from '@/store/locations';
import { useGeofences } from '@/store/geofences';
import { DEFAULT_MAP_CENTER, isValidCoords } from '@/utils/geo';
import { formatSpeed, formatCoords, timeAgo } from '@/utils/format';
import { PanicFAB } from '@/components/PanicFAB';
import { ConnectionPill } from '@/components/ConnectionPill';
import { StatusBadge } from '@/components/StatusBadge';
import { useRouter } from 'expo-router';

export default function LiveMapScreen() {
  const role = useAuth((s) => s.role);
  const myVehicleId = useSettings((s) => s.myVehicleId);
  const vehicles = useVehicles((s) => s.vehicles);
  const latest = useLocations((s) => s.latest);
  const myPosition = useLocations((s) => s.myPosition);
  const geofences = useGeofences((s) => s.geofences);
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  // The list of vehicles to render. Driver only sees their own; manager sees all.
  const visibleVehicles = useMemo(() => {
    if (role === 'driver') {
      return vehicles.filter((v) => v.id === myVehicleId);
    }
    return vehicles;
  }, [role, vehicles, myVehicleId]);

  // Center the map.
  const initialRegion: Region = useMemo(() => {
    if (role === 'driver' && myPosition) {
      return {
        latitude: myPosition.lat,
        longitude: myPosition.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    if (visibleVehicles.length > 0) {
      const first = latest[visibleVehicles[0].id];
      if (first && isValidCoords(first.lat, first.lng)) {
        return {
          latitude: first.lat,
          longitude: first.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
      }
    }
    return DEFAULT_MAP_CENTER;
  }, [role, myPosition, visibleVehicles, latest]);

  const recenter = () => {
    if (role === 'driver' && myPosition) {
      mapRef.current?.animateToRegion({
        latitude: myPosition.lat,
        longitude: myPosition.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 400);
    } else if (visibleVehicles.length === 1) {
      const loc = latest[visibleVehicles[0].id];
      if (loc) {
        mapRef.current?.animateToRegion({
          latitude: loc.lat,
          longitude: loc.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 400);
      }
    } else {
      mapRef.current?.animateToRegion(DEFAULT_MAP_CENTER, 400);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={role === 'driver'}
        userInterfaceStyle="dark"
        customMapStyle={colors.mapDarkStyle}
        showsTraffic={false}
        loadingEnabled
      >
        {/* Geofences — only meaningful for manager view, but render in both. */}
        {geofences.map((g) => (
          <Circle
            key={g.id}
            center={{ latitude: g.center_lat, longitude: g.center_lng }}
            radius={g.radius * 1000}
            strokeColor={colors.warning}
            fillColor={`${colors.warning}22`}
            strokeWidth={1.5}
          />
        ))}

        {/* Vehicle markers */}
        {visibleVehicles.map((v) => {
          const loc = latest[v.id];
          if (!loc || !isValidCoords(loc.lat, loc.lng)) return null;
          const color = vehicleStatusColor[v.status] || colors.primary;
          const isEmergency = v.status === 'emergency';
          return (
            <Marker
              key={v.id}
              coordinate={{ latitude: loc.lat, longitude: loc.lng }}
              flat
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View
                style={[
                  styles.marker,
                  {
                    backgroundColor: `${color}22`,
                    borderColor: color,
                    transform: [{ rotate: `${loc.heading || 0}deg` }],
                  },
                  isEmergency && styles.markerEmergency,
                ]}
              >
                <Ionicons name="navigate" size={18} color={color} />
              </View>
              <Callout
                tooltip
                onPress={() => role === 'manager' && router.push(`/vehicle/${v.id}`)}
              >
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{v.name}</Text>
                  <Text style={styles.calloutSub}>{v.id}</Text>
                  <View style={styles.calloutRow}>
                    <StatusBadge variant="vehicle" status={v.status} size="sm" />
                    <Text style={styles.calloutSpeed}>
                      {formatSpeed(loc.speed)} km/h
                    </Text>
                  </View>
                  <Text style={styles.calloutCoords}>
                    {formatCoords(loc.lat, loc.lng)}
                  </Text>
                  {loc.recorded_at && (
                    <Text style={styles.calloutTime}>{timeAgo(loc.recorded_at)}</Text>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Top overlay: connection pill + vehicle count */}
      <View style={styles.topOverlay} pointerEvents="box-none">
        <ConnectionPill />
        {role === 'manager' && (
          <View style={styles.countPill}>
            <Text style={styles.countText}>{visibleVehicles.length} vehicles</Text>
          </View>
        )}
      </View>

      {/* Recenter button */}
      <TouchableOpacity style={styles.recenterBtn} onPress={recenter} activeOpacity={0.85}>
        <Ionicons name="locate" size={20} color={colors.primary} />
      </TouchableOpacity>

      {/* Driver panic FAB */}
      {role === 'driver' && <PanicFAB />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerEmergency: {
    ...shadows.dangerGlow,
  },
  callout: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minWidth: 180,
    ...shadows.md,
  },
  calloutTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  calloutSub: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  calloutSpeed: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  calloutCoords: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  calloutTime: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  topOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countPill: {
    backgroundColor: colors.mapOverlayBg,
    borderWidth: 1,
    borderColor: colors.mapOverlayBorder,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  countText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: spacing.xxl + 60,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mapOverlayBg,
    borderWidth: 1,
    borderColor: colors.mapOverlayBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
});
