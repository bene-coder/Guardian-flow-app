/**
 * BlockchainBadge — small inline badge shown next to alerts that have been
 * hashed and written to Solana. Tapping opens the explorer URL.
 *
 * The backend stores the tx signature in `alert.blockchain_tx` (or camelCase
 * `blockchainTx`). For devnet the URL is:
 *   https://explorer.solana.com/tx/<signature>?cluster=devnet
 *
 * The `dataHash` (sha256 of the alert payload) is also rendered when present
 * in alert.metadata, so the user can verify the on-chain memo matches.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typography, spacing } from '@/theme';
import { truncateHash } from '@/utils/format';

type Props = {
  txSignature?: string | null;
  dataHash?: string | null;
  style?: ViewStyle;
};

export function BlockchainBadge({ txSignature, dataHash, style }: Props) {
  if (!txSignature) return null;

  const explorerUrl = txSignature.startsWith('http')
    ? txSignature
    : `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`;

  const open = () => Linking.openURL(explorerUrl).catch(() => {});

  return (
    <TouchableOpacity
      onPress={open}
      activeOpacity={0.7}
      style={[styles.wrap, style]}
      accessibilityLabel="View blockchain transaction"
    >
      <View style={styles.iconWrap}>
        <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.label}>BLOCKCHAIN VERIFIED</Text>
        {dataHash ? (
          <Text style={styles.hash} numberOfLines={1}>
            {truncateHash(dataHash, 10, 6)}
          </Text>
        ) : (
          <Text style={styles.hash} numberOfLines={1}>
            {truncateHash(txSignature, 10, 6)}
          </Text>
        )}
      </View>
      <Ionicons name="open-outline" size={11} color={colors.textMuted} style={styles.link} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}14`,
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
  },
  iconWrap: {
    marginRight: spacing.xs,
  },
  textWrap: {
    flexShrink: 1,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: typography.weight.bold,
    color: colors.primary,
    letterSpacing: 0.8,
  },
  hash: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  link: {
    marginLeft: spacing.xs,
  },
});
