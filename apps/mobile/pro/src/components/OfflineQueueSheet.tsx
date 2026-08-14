import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  ActivityIndicator,
} from 'react-native';

interface OfflineQueueSheetProps {
  visible: boolean;
  onClose: () => void;
  pendingPhotosCount?: number;
  syncedPhotosCount?: number;
  networkStatus?: 'wifi' | 'cellular' | 'offline';
  onForceSync?: () => void;
}

export function OfflineQueueSheet({
  visible,
  onClose,
  pendingPhotosCount = 8,
  syncedPhotosCount = 142,
  networkStatus = 'cellular',
  onForceSync,
}: OfflineQueueSheetProps) {
  const [allowCellular, setAllowCellular] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncNow = () => {
    setIsSyncing(true);
    onForceSync?.();
    setTimeout(() => {
      setIsSyncing(false);
      alert('All pending photos successfully synced to Master Server!');
    }, 1500);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheetContainer}>
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <Text style={styles.title}>📦 Offline Sync Queue</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Sync Status Box */}
          <View style={styles.statusBox}>
            <View style={styles.statusRow}>
              <View>
                <Text style={styles.queueCountText}>{pendingPhotosCount} Photos Queued</Text>
                <Text style={styles.queueSubText}>{syncedPhotosCount} uploaded today</Text>
              </View>
              <View style={styles.networkBadge}>
                <Text style={styles.networkBadgeText}>
                  {networkStatus === 'wifi' ? '📶 Resort WiFi' : '📡 5G Cellular'}
                </Text>
              </View>
            </View>
          </View>

          {/* Cellular Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Upload Over Cellular (5G/LTE)</Text>
              <Text style={styles.settingDesc}>Sync immediately when away from resort WiFi</Text>
            </View>
            <Switch
              value={allowCellular}
              onValueChange={setAllowCellular}
              trackColor={{ false: '#3f3f46', true: '#10b981' }}
            />
          </View>

          {/* Force Sync Button */}
          <TouchableOpacity
            style={[styles.syncBtn, isSyncing && styles.syncBtnDisabled]}
            disabled={isSyncing}
            onPress={handleSyncNow}
          >
            {isSyncing ? (
              <View style={styles.syncingRow}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.syncBtnText}> Uploading Chunked Files...</Text>
              </View>
            ) : (
              <Text style={styles.syncBtnText}>⚡ Force Push Sync to Master OS</Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#52525b',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: '#a1a1aa',
    fontSize: 15,
    fontWeight: '600',
  },
  statusBox: {
    backgroundColor: '#09090b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  queueCountText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  queueSubText: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
    fontWeight: '600',
  },
  networkBadge: {
    backgroundColor: '#27272a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  networkBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e4e4e7',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#09090b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 20,
  },
  settingText: {
    flex: 1,
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  settingDesc: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
  },
  syncBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  syncBtnDisabled: {
    opacity: 0.6,
  },
  syncBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  syncingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
