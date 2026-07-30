import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { logger } from '@/utils/logger';

import {
  masterDeliveryWorker,
  type MasterDeliveryStatus,
} from '../services/MasterDeliveryWorker';
import {
  masterPairingService,
  type MasterPairingCredential,
} from '../services/MasterPairingService';

const MasterConnectionCard: React.FC = memo(() => {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'light' ? 'light' : 'dark'];
  const [credential, setCredential] =
    useState<MasterPairingCredential | null>(null);
  const [status, setStatus] = useState<MasterDeliveryStatus>(
    masterDeliveryWorker.getStatus()
  );
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const subscription = masterDeliveryWorker.addStatusListener((next) => {
      if (active) setStatus(next);
    });
    void masterPairingService
      .getCredential()
      .then((stored) => {
        if (!active) return;
        setCredential(stored);
        if (stored) void masterDeliveryWorker.drain();
      })
      .catch((loadError) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Secure pairing storage could not be opened.'
        );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const pair = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const paired = await masterPairingService.pairWithToken(token);
      setCredential(paired);
      setToken('');
      await masterDeliveryWorker.drain();
    } catch (pairingError) {
      const message =
        pairingError instanceof Error
          ? pairingError.message
          : 'Master pairing failed.';
      logger.error('[MasterConnectionCard] Pairing failed.', pairingError);
      setError(message);
    } finally {
      setBusy(false);
    }
  }, [token]);

  const forget = useCallback(() => {
    Alert.alert(
      'Forget Master pairing?',
      'Automatic delivery will stop. An administrator should also revoke this device in Master.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forget',
          style: 'destructive',
          onPress: () => {
            void masterPairingService
              .forgetCredential()
              .then(() => {
                setCredential(null);
                masterDeliveryWorker.pairingForgotten();
              })
              .catch((forgetError) => {
                setError(
                  forgetError instanceof Error
                    ? forgetError.message
                    : 'Pairing could not be removed.'
                );
              });
          },
        },
      ]
    );
  }, []);

  const retry = useCallback(() => {
    setError(null);
    void masterDeliveryWorker.drain();
  }, []);

  const statusColor =
    status.phase === 'ERROR'
      ? colors.danger
      : status.phase === 'RETRY_WAIT'
        ? colors.warning
        : credential
          ? colors.success
          : colors.tint;
  const progress =
    status.totalBytes > 0
      ? Math.min(100, Math.round((status.bytesSent / status.totalBytes) * 100))
      : 0;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.elevated },
      ]}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <ThemedText style={styles.eyebrow}>MASTER DELIVERY</ThemedText>
          <ThemedText style={styles.title}>
            {credential ? credential.masterId : 'Pair Android to Master'}
          </ThemedText>
        </View>
        <View style={[styles.dot, { backgroundColor: statusColor }]} />
      </View>

      {busy && !credential ? (
        <ActivityIndicator color={colors.tint} />
      ) : credential ? (
        <>
          <ThemedText style={[styles.message, { color: statusColor }]}>
            {status.message}
          </ThemedText>
          {status.totalBytes > 0 && (
            <View
              style={[styles.progressTrack, { backgroundColor: colors.elevated }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: statusColor, width: `${progress}%` },
                ]}
              />
            </View>
          )}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.tint }]}
              onPress={retry}>
              <ThemedText style={[styles.buttonText, { color: colors.tint }]}>
                SYNC NOW
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.danger }]}
              onPress={forget}>
              <ThemedText style={[styles.buttonText, { color: colors.danger }]}>
                FORGET
              </ThemedText>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <ThemedText style={styles.help}>
            Generate a one-use code in Master → Kiosk Connections, then paste it
            here. Discovery and delivery stay on the local network.
          </ThemedText>
          <TextInput
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            placeholder="CF1.…"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.elevated,
                backgroundColor: colors.background,
              },
            ]}
          />
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: colors.tint,
                opacity: busy || !token.trim() ? 0.5 : 1,
              },
            ]}
            disabled={busy || !token.trim()}
            onPress={pair}>
            {busy ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <ThemedText
                style={[styles.primaryButtonText, { color: colors.background }]}>
                DISCOVER + PAIR
              </ThemedText>
            )}
          </TouchableOpacity>
        </>
      )}

      {error && (
        <ThemedText style={[styles.error, { color: colors.danger }]}>
          {error}
        </ThemedText>
      )}
    </View>
  );
});

MasterConnectionCard.displayName = 'MasterConnectionCard';

export default MasterConnectionCard;

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  eyebrow: {
    color: '#94a3b8',
    fontFamily: Typography.fontMono,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  help: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 19,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontFamily: Typography.fontMono,
    fontSize: 12,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: Typography.fontMono,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: Typography.fontMono,
    fontSize: 12,
    fontWeight: '800',
  },
  error: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
});
