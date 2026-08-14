import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';

import {
  masterDeliveryWorker,
  type MasterDeliveryStatus,
} from '../services/MasterDeliveryWorker';
import {
  masterPairingService,
  type MasterPairingCredential,
} from '../services/MasterPairingService';

const colors = {
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  background: '#070a12',
  surface: '#0f172a',
  elevated: '#1e293b',
  tint: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

const MasterConnectionCard: React.FC = memo(() => {
  const [credential, setCredential] = useState<MasterPairingCredential | null>(null);
  const [status, setStatus] = useState<MasterDeliveryStatus>(masterDeliveryWorker.getStatus());
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
    <View className="p-4 rounded-xl border gap-3 bg-slate-900 border-slate-800">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 gap-1">
          <ThemedText className="text-slate-400 font-mono text-[11px] font-extrabold tracking-widest">
            MASTER DELIVERY
          </ThemedText>
          <ThemedText className="text-[17px] font-extrabold">
            {credential ? credential.masterId : 'Pair Android to Master'}
          </ThemedText>
        </View>
        <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusColor }} />
      </View>

      {busy && !credential ? (
        <ActivityIndicator color={colors.tint} />
      ) : credential ? (
        <>
          <ThemedText className="text-[13px] leading-5 font-bold" style={{ color: statusColor }}>
            {status.message}
          </ThemedText>
          {status.totalBytes > 0 && (
            <View className="h-1.5 rounded-full overflow-hidden bg-slate-800">
              <View className="h-1.5 rounded-full" style={{ backgroundColor: statusColor, width: `${progress}%` }} />
            </View>
          )}
          <View className="flex-row gap-2">
            <TouchableOpacity className="flex-1 min-h-[44px] border rounded-lg items-center justify-center border-cyan-500" onPress={retry}>
              <ThemedText className="font-mono text-xs font-extrabold text-cyan-500">
                SYNC NOW
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 min-h-[44px] border rounded-lg items-center justify-center border-red-500" onPress={forget}>
              <ThemedText className="font-mono text-xs font-extrabold text-red-500">
                FORGET
              </ThemedText>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <ThemedText className="text-slate-400 text-[13px] leading-5">
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
            className="border rounded-lg px-3 py-3 font-mono text-xs text-slate-50 border-slate-800 bg-[#070a12]"
          />
          <TouchableOpacity
            className={`min-h-[48px] rounded-lg items-center justify-center bg-cyan-500 ${busy || !token.trim() ? 'opacity-50' : 'opacity-100'}`}
            disabled={busy || !token.trim()}
            onPress={pair}>
            {busy ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <ThemedText className="font-mono text-[13px] font-black tracking-widest text-[#070a12]">
                DISCOVER + PAIR
              </ThemedText>
            )}
          </TouchableOpacity>
        </>
      )}

      {error && (
        <ThemedText className="text-xs leading-4 font-bold text-red-500">
          {error}
        </ThemedText>
      )}
    </View>
  );
});

MasterConnectionCard.displayName = 'MasterConnectionCard';

export default MasterConnectionCard;
