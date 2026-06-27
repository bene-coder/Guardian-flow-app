/**
 * Tab layout — role-conditional.
 *
 * Driver sees:  Map · Alerts · Vehicle · Settings
 * Manager sees: Map · Alerts · Vehicles · Geofences · History · Settings
 *
 * Socket + tracking are initialized here (via useAppShell from root layout).
 * Initial data fetch also kicks off here.
 */

import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, typography, spacing } from '@/theme';
import { useAuth } from '@/store/auth';
import { useVehicles } from '@/store/vehicles';
import { useAlerts } from '@/store/alerts';
import { useGeofences } from '@/store/geofences';
import { useLocations } from '@/store/locations';
import { useSettings } from '@/store/settings';
import { useAppShell } from '../_layout';
import { ConnectionPill } from '@/components/ConnectionPill';

export default function TabLayout() {
  useAppShell();
  const insets = useSafeAreaInsets();
  const role = useAuth((s) => s.role);

  const fetchVehicles = useVehicles((s) => s.fetch);
  const fetchAlerts = useAlerts((s) => s.fetch);
  const fetchGeofences = useGeofences((s) => s.fetch);
  const fetchLocations = useLocations((s) => s.fetch);
  const probeBackend = useSettings((s) => s.probeBackend);

  useEffect(() => {
    probeBackend();
    fetchVehicles();
    fetchAlerts();
    fetchGeofences();
    fetchLocations();
  }, [probeBackend, fetchVehicles, fetchAlerts, fetchGeofences, fetchLocations]);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontFamily: typography.fontFamily,
          fontWeight: typography.weight.bold,
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: spacing.xs,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily,
          fontSize: 10,
          fontWeight: typography.weight.semibold,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Live Map',
          headerTitle: () => <BrandHeader />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="warning" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: role === 'driver' ? 'My Vehicle' : 'Vehicles',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="geofence"
        options={{
          title: 'Geofences',
          href: role === 'manager' ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          href: role === 'manager' ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

function BrandHeader() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
      <Text
        style={{
          fontFamily: typography.fontFamily,
          fontWeight: typography.weight.bold,
          fontSize: typography.size.lg,
          color: colors.text,
          letterSpacing: 0.4,
        }}
      >
        GuardianFlow
      </Text>
      <ConnectionPill style={{ marginLeft: spacing.sm }} />
    </View>
  );
}
