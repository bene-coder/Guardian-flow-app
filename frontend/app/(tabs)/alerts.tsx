/**
 * Alerts feed — chronological list of all alerts (panic, geofence, dead-man).
 *
 * Filter chips let the user narrow by type. Manager-mode alerts have
 * Acknowledge / Resolve buttons that PATCH the alert status. Driver-mode
 * alerts are read-only (the driver can see alerts about their own vehicle).
 *
 * Every alert that has a `blockchain_tx` signature renders a
 * "Blockchain Verified" badge that deep-links to Solana explorer (devnet).
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

import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/store/auth';
import { useAlerts } from '@/store/alerts';
import { useRefresh } from '@/hooks/useRefresh';
import { AlertCard } from '@/components/AlertCard';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/Card';
import type { AlertType } from '@/api/types';

type Filter = 'all' | AlertType;

const FILTERS: Array<{ key: Filter; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'all', label: 'All', icon: 'list' },
  { key: 'PANIC', label: 'Panic', icon: 'warning' },
  { key: 'GEOFENCE_VIOLATION', label: 'Geofence', icon: 'location-outline' },
  { key: 'DEAD_MAN_SWITCH', label: 'Dead-Man', icon: 'skull-outline' },
];

export default function AlertsScreen() {
  const role = useAuth((s) => s.role);
  const alerts = useAlerts((s) => s.alerts);
  const fetch = useAlerts((s) => s.fetch);
  const setStatus = useAlerts((s) => s.setStatus);
  const [filter, setFilter] = useState<Filter>('all');
  const { refreshing, refresh } = useRefresh(fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const filtered = useMemo(() => {
    const list = filter === 'all' ? alerts : alerts.filter((a) => a.type === filter);
    // Sort: active first, then by created_at desc.
    return [...list].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      const ta = new Date(a.created_at || a.timestamp || 0).getTime();
      const tb = new Date(b.created_at || b.timestamp || 0).getTime();
      return tb - ta;
    });
  }, [alerts, filter]);

  const activeCount = useMemo(() => alerts.filter((a) => a.status === 'active').length, [alerts]);

  const onAcknowledge = useCallback(
    async (id: string) => {
      try {
        await setStatus(id, 'acknowledged');
      } catch (e: any) {
        console.warn('acknowledge failed', e?.message);
      }
    },
    [setStatus],
  );
  const onResolve = useCallback(
    async (id: string) => {
      try {
        await setStatus(id, 'resolved');
      } catch (e: any) {
        console.warn('resolve failed', e?.message);
      }
    },
    [setStatus],
  );

  return (
    <View style={styles.container}>
      {/* Filter chips */}
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          const count = f.key === 'all' ? alerts.length : alerts.filter((a) => a.type === f.key).length;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, isActive && styles.chipActive]}
              activeOpacity={0.85}
            >
              <Ionicons
                name={f.icon}
                size={13}
                color={isActive ? colors.background : colors.textSecondary}
              />
              <Text
                style={[
                  styles.chipLabel,
                  isActive && styles.chipLabelActive,
                ]}
              >
                {f.label}
              </Text>
              <View style={[styles.chipCount, isActive && styles.chipCountActive]}>
                <Text style={[styles.chipCountText, isActive && styles.chipCountTextActive]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeCount > 0 && (
        <View style={styles.banner}>
          <Ionicons name="warning" size={16} color={colors.danger} />
          <Text style={styles.bannerText}>
            {activeCount} active alert{activeCount === 1 ? '' : 's'} need{activeCount === 1 ? 's' : ''} attention
          </Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlertCard
            alert={item}
            onAcknowledge={role === 'manager' ? onAcknowledge : undefined}
            onResolve={role === 'manager' ? onResolve : undefined}
          />
        )}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
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
            icon="checkmark-done"
            title="No alerts"
            subtitle={
              filter === 'all'
                ? 'When panic, geofence, or dead-man alerts fire, they will appear here.'
                : `No ${filter.toLowerCase().replace('_', ' ')} alerts in the feed.`
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: colors.background,
  },
  chipCount: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCountActive: {
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  chipCountText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weight.bold,
    color: colors.textSecondary,
  },
  chipCountTextActive: {
    color: colors.background,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.danger}14`,
    borderWidth: 1,
    borderColor: `${colors.danger}44`,
    borderRadius: radius.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  bannerText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.danger,
  },
});
