/**
 * Panic screen — full-screen modal that triggers a panic alert.
 *
 * Hold-to-confirm pattern:
 *   - Press and hold the red button for 3 seconds to fire.
 *   - Progress ring fills as you hold.
 *   - Release early to cancel.
 *
 * On fire:
 *   1. Reads current device GPS (one-shot).
 *   2. POST /api/alerts/panic with { vehicleId, lat, lng, driverId }.
 *   3. Backend saves the alert, logs to Solana, and broadcasts via socket.
 *   4. UI shows a confirmation screen with the alert ID + blockchain tx.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, typography, spacing, radius, shadows } from '@/theme';
import { useSettings } from '@/store/settings';
import { useAlerts } from '@/store/alerts';
import { triggerPanic } from '@/api/alerts';
import { getCurrentPositionOnce, haptic } from '@/location/tracker';
import { Button } from '@/components/Button';
import { BlockchainBadge } from '@/components/BlockchainBadge';
import { formatCoords, formatDateTime } from '@/utils/format';

const HOLD_MS = 3000;
const SCREEN = Dimensions.get('window');
const BUTTON_SIZE = 240;

type Phase = 'idle' | 'holding' | 'fired' | 'error';

export default function PanicScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { myVehicleId, driverId } = useSettings();
  const ingestAlert = useAlerts((s) => s.ingest);

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [alertId, setAlertId] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const holdStart = useRef<number | null>(null);
  const rafRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      if (rafRef.current) clearInterval(rafRef.current);
    };
  }, []);

  const startHold = async () => {
    if (phase === 'fired' || phase === 'holding') return;
    setPhase('holding');
    setProgress(0);
    setErrorMsg(null);
    await haptic('medium');
    holdStart.current = Date.now();

    // Drive the progress ring.
    rafRef.current = setInterval(() => {
      if (!holdStart.current) return;
      const elapsed = Date.now() - holdStart.current;
      const p = Math.min(1, elapsed / HOLD_MS);
      setProgress(p);
      ringAnim.setValue(p);
      if (p >= 1) {
        if (rafRef.current) clearInterval(rafRef.current);
        holdStart.current = null;
        fire();
      }
    }, 16);
  };

  const cancelHold = () => {
    if (phase !== 'holding') return;
    if (rafRef.current) clearInterval(rafRef.current);
    holdStart.current = null;
    setPhase('idle');
    setProgress(0);
    ringAnim.setValue(0);
    haptic('light');
  };

  const fire = async () => {
    setPhase('fired');
    await haptic('heavy');
    setTimeout(() => haptic('warning'), 200);

    // Grab a fresh GPS reading.
    const pos = await getCurrentPositionOnce();
    if (!pos) {
      setErrorMsg('Could not get current GPS location. Please enable location permissions and try again.');
      setPhase('error');
      return;
    }

    try {
      const res = await triggerPanic({
        vehicleId: myVehicleId,
        lat: pos.lat,
        lng: pos.lng,
        driverId,
      });
      setAlertId(res.alertId);
      // Ingest a local alert so the Alerts tab updates immediately.
      ingestAlert({
        id: res.alertId,
        type: 'PANIC',
        vehicleId: myVehicleId,
        driverId,
        lat: pos.lat,
        lng: pos.lng,
        status: 'active',
        metadata: { source: 'driver_app', urgency: 'critical' },
        timestamp: Date.now(),
      });
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to send panic alert. Please try again or call emergency services directly.');
      setPhase('error');
    }
  };

  const close = () => {
    if (rafRef.current) clearInterval(rafRef.current);
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={close} hitSlop={12}>
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PANIC ALERT</Text>
        <View style={{ width: 26 }} />
      </View>

      {phase === 'idle' || phase === 'holding' ? (
        <View style={styles.body}>
          <Text style={styles.title}>
            {phase === 'holding' ? 'Keep holding…' : 'Hold to trigger panic'}
          </Text>
          <Text style={styles.subtitle}>
            Press and hold for {(HOLD_MS / 1000).toFixed(0)} seconds. Your
            location will be broadcast to dispatch and logged to the Solana
            blockchain for audit.
          </Text>

          {/* Hold button */}
          <View style={styles.holdWrap}>
            {/* Pulsing danger glow */}
            <View style={[styles.glow, { opacity: phase === 'holding' ? 0.6 : 0.3 }]} />
            {/* Progress ring (rendered as a circular border with conic-ish illusion via Animated.View) */}
            <View style={styles.ringTrack} />
            <Animated.View
              style={[
                styles.ringFill,
                {
                  transform: [{ rotate: '-90deg' }],
                },
              ]}
            />
            <View
              style={[
                styles.ringProgressBar,
                {
                  width: BUTTON_SIZE,
                  height: BUTTON_SIZE,
                  borderRadius: BUTTON_SIZE / 2,
                  borderColor: phase === 'holding' ? colors.danger : colors.dangerDim,
                  borderTopColor: phase === 'holding' ? colors.danger : 'transparent',
                  borderRightColor: phase === 'holding' ? colors.danger : 'transparent',
                  transform: [{ rotate: `${progress * 360}deg` }],
                },
              ]}
            />
            <TouchableOpacity
              onPressIn={startHold}
              onPressOut={cancelHold}
              activeOpacity={1}
              delayPressIn={0}
              style={[
                styles.holdBtn,
                phase === 'holding' && styles.holdBtnActive,
              ]}
            >
              <Ionicons
                name="warning"
                size={56}
                color={phase === 'holding' ? '#fff' : colors.danger}
              />
              <Text style={styles.holdLabel}>
                {phase === 'holding' ? `${Math.ceil((HOLD_MS - progress * HOLD_MS) / 1000)}` : 'HOLD'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.cancelHint}>Release to cancel</Text>
        </View>
      ) : phase === 'fired' ? (
        <View style={styles.body}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={48} color={colors.success} />
          </View>
          <Text style={styles.title}>Panic alert sent</Text>
          <Text style={styles.subtitle}>
            Your location has been broadcast to dispatch. Stay safe — help is on the way.
          </Text>

          {alertId && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Alert ID</Text>
              <Text style={styles.detailValue}>{alertId}</Text>
            </View>
          )}

          {txSignature ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Blockchain</Text>
              <BlockchainBadge txSignature={txSignature} />
            </View>
          ) : (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Blockchain</Text>
              <Text style={styles.detailPending}>Writing to Solana…</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>{formatDateTime(Date.now())}</Text>
          </View>

          <View style={styles.btnRow}>
            <Button label="Done" onPress={close} variant="secondary" style={{ flex: 1 }} />
            <Button
              label="Call 112"
              onPress={() => Linking.openURL('tel:112')}
              variant="danger"
              style={{ flex: 1, marginLeft: spacing.sm }}
            />
          </View>
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.errorIcon}>
            <Ionicons name="warning" size={48} color={colors.danger} />
          </View>
          <Text style={styles.title}>Could not send alert</Text>
          <Text style={styles.subtitle}>{errorMsg}</Text>
          <Button
            label="Try again"
            onPress={() => setPhase('idle')}
            variant="primary"
            size="lg"
            style={{ marginTop: spacing.xl, minWidth: 200 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.danger,
    letterSpacing: 2,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: typography.lineHeight.relaxed * typography.size.md,
    maxWidth: 320,
  },
  holdWrap: {
    width: BUTTON_SIZE + 80,
    height: BUTTON_SIZE + 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xxxl,
  },
  glow: {
    position: 'absolute',
    width: BUTTON_SIZE + 60,
    height: BUTTON_SIZE + 60,
    borderRadius: (BUTTON_SIZE + 60) / 2,
    backgroundColor: colors.danger,
    ...shadows.dangerGlow,
  },
  ringTrack: {
    position: 'absolute',
    width: BUTTON_SIZE + 20,
    height: BUTTON_SIZE + 20,
    borderRadius: (BUTTON_SIZE + 20) / 2,
    borderWidth: 4,
    borderColor: colors.dangerDim,
  },
  ringFill: {
    position: 'absolute',
  },
  ringProgressBar: {
    position: 'absolute',
    borderWidth: 4,
  },
  holdBtn: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: `${colors.danger}22`,
    borderWidth: 2,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdBtnActive: {
    backgroundColor: colors.danger,
    transform: [{ scale: 0.96 }],
  },
  holdLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.heavy,
    color: '#fff',
    marginTop: spacing.sm,
    letterSpacing: 1,
  },
  cancelHint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },

  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.success}22`,
    borderWidth: 2,
    borderColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  errorIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.danger}22`,
    borderWidth: 2,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailValue: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.size.sm,
    color: colors.text,
    maxWidth: 220,
  },
  detailPending: {
    fontFamily: typography.fontFamily,
    fontSize: typography.size.xs,
    color: colors.warning,
    fontStyle: 'italic',
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    width: '100%',
    maxWidth: 360,
  },
});
