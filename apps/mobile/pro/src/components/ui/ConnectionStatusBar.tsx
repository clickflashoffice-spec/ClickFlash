import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { useClickFlashAPI } from '../../hooks/useClickFlashAPI';
import { ConnectionTier } from '../../services/NetworkRoutingService';

export const ConnectionStatusBar: React.FC = () => {
  const { 
    tier, 
    masterIp, 
    masterLatencyMs, 
    cloudLatencyMs, 
    meshPeersCount, 
    pendingOfflineCount, 
    checkHealth, 
    flushQueue 
  } = useClickFlashAPI();

  const [modalVisible, setModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);

  const handleManualCheck = async () => {
    setIsRefreshing(true);
    await checkHealth();
    setIsRefreshing(false);
  };

  const handleManualFlush = async () => {
    setIsFlushing(true);
    await flushQueue();
    setIsFlushing(false);
  };

  const getTierDisplay = (tier: ConnectionTier) => {
    switch (tier) {
      case 'ONLINE_HYBRID':
        return {
          label: `HYBRID LAN+CLOUD (${masterLatencyMs || cloudLatencyMs}ms)`,
          color: '#10b981', // Emerald green
          bg: '#064e3b',
          icon: '⚡'
        };
      case 'ONLINE_MASTER_ONLY':
        return {
          label: `MASTER LAN ONLY (${masterLatencyMs}ms)`,
          color: '#3b82f6', // Blue
          bg: '#1e3a8a',
          icon: '🖥️'
        };
      case 'ONLINE_CLOUD_ONLY':
        return {
          label: `CLOUD EDGE ONLY (${cloudLatencyMs}ms)`,
          color: '#8b5cf6', // Purple
          bg: '#4c1d95',
          icon: '☁️'
        };
      case 'OFFLINE_MESH':
        return {
          label: `MESH RELAY (${meshPeersCount} PEERS)`,
          color: '#f59e0b', // Amber
          bg: '#78350f',
          icon: '📡'
        };
      case 'OFFLINE':
      default:
        return {
          label: pendingOfflineCount > 0 ? `OFFLINE (${pendingOfflineCount} QUEUED)` : 'OFFLINE - LOCAL ONLY',
          color: '#ef4444', // Red
          bg: '#7f1d1d',
          icon: '🔴'
        };
    }
  };

  const display = getTierDisplay(tier);

  return (
    <>
      <TouchableOpacity 
        style={[styles.barContainer, { backgroundColor: display.bg }]} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.contentRow}>
          <Text style={styles.iconText}>{display.icon}</Text>
          <Text style={[styles.statusText, { color: display.color }]}>
            {display.label}
          </Text>
          {pendingOfflineCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingOfflineCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>TACTICAL MESH & ROUTING DIAGNOSTICS</Text>
            <Text style={styles.modalSubtitle}>Current Tier: {tier}</Text>

            <ScrollView style={styles.detailsScroll}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Master PC LAN IP:</Text>
                <Text style={styles.detailValue}>{masterIp || 'Not Discovered'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Master LAN Latency:</Text>
                <Text style={styles.detailValue}>{masterLatencyMs ? `${masterLatencyMs} ms` : 'Unreachable'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Cloud Edge Latency:</Text>
                <Text style={styles.detailValue}>{cloudLatencyMs ? `${cloudLatencyMs} ms` : 'Unreachable'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Discovered P2P Mesh Peers:</Text>
                <Text style={styles.detailValue}>{meshPeersCount} active nodes</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Offline Disk Queue:</Text>
                <Text style={[styles.detailValue, pendingOfflineCount > 0 && styles.warningValue]}>
                  {pendingOfflineCount} pending transactions
                </Text>
              </View>
            </ScrollView>

            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={handleManualCheck}
                disabled={isRefreshing}
              >
                {isRefreshing ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>PING ROUTE</Text>}
              </TouchableOpacity>

              {pendingOfflineCount > 0 && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.flushButton]} 
                  onPress={handleManualFlush}
                  disabled={isFlushing}
                >
                  {isFlushing ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>FLUSH QUEUE</Text>}
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[styles.actionButton, styles.closeButton]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  barContainer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center'
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  iconText: {
    fontSize: 12
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1
  },
  badge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 4
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 8,
    padding: 20,
    width: '100%',
    maxWidth: 400
  },
  modalTitle: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
    textAlign: 'center'
  },
  modalSubtitle: {
    color: '#a1a1aa',
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center'
  },
  detailsScroll: {
    maxHeight: 220,
    marginBottom: 16
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a'
  },
  detailLabel: {
    color: '#d4d4d8',
    fontSize: 13
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  warningValue: {
    color: '#ef4444'
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center'
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3f3f46',
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center'
  },
  flushButton: {
    backgroundColor: '#059669'
  },
  closeButton: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#52525b'
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1
  }
});
