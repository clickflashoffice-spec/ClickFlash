import React, { useState, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, StatusBar, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme/tokens';
import { logger } from '../../src/utils/logger';

interface KioskTerminal {
  id: string;
  name: string;
  zone: string;
  ip: string;
  status: 'online' | 'warning' | 'offline';
  paperLevel: number;
  inkLevel: number;
  activeGuest?: string;
  lastHeartbeat: string;
}

const INITIAL_KIOSKS: KioskTerminal[] = [
  {
    id: 'kiosk_101',
    name: 'TOUCH KIOSK #01 (LOBBY)',
    zone: 'Main Resort Reception',
    ip: '192.168.1.104:8091',
    status: 'online',
    paperLevel: 84,
    inkLevel: 92,
    activeGuest: 'Al-Rashid Family (Gallery Browsing)',
    lastHeartbeat: '12s ago'
  },
  {
    id: 'kiosk_102',
    name: 'TOUCH KIOSK #02 (PIER)',
    zone: 'Sunset Pool & Beach Pier',
    ip: '192.168.1.105:8091',
    status: 'online',
    paperLevel: 32,
    inkLevel: 68,
    activeGuest: 'Idle • Attractor Loop',
    lastHeartbeat: '4s ago'
  },
  {
    id: 'kiosk_103',
    name: 'TOUCH KIOSK #03 (GARDEN)',
    zone: 'Wedding Garden Pavilion',
    ip: '192.168.1.106:8091',
    status: 'warning',
    paperLevel: 8,
    inkLevel: 45,
    activeGuest: 'Idle • Paper Roll Low',
    lastHeartbeat: '18s ago'
  },
];

const KioskCard: React.FC<{
  item: KioskTerminal;
  onAction: (id: string, action: 'push' | 'reboot' | 'test_print') => void;
}> = memo(({ item, onAction }) => {
  const getStatusColor = () => {
    if (item.status === 'online') return theme.colors.success;
    if (item.status === 'warning') return theme.colors.warning;
    return theme.colors.danger;
  };

  const statusColor = getStatusColor();

  return (
    <View style={[styles.card, item.status === 'warning' && styles.cardWarning]}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
          <View>
            <Text style={styles.kioskName}>{item.name}</Text>
            <Text style={styles.kioskZone}>{item.zone} • {item.ip}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Telemetry Bar */}
      <View style={styles.telemetryBox}>
        <View style={styles.telemetryRow}>
          <Ionicons name="person" size={14} color={theme.colors.primary} />
          <Text style={styles.telemetryText}>Current State: <Text style={styles.telemetryStrong}>{item.activeGuest}</Text></Text>
        </View>

        <View style={styles.suppliesRow}>
          <View style={styles.supplyItem}>
            <Ionicons name="document-text" size={14} color={item.paperLevel < 15 ? theme.colors.danger : theme.colors.textTelemetry} />
            <Text style={styles.supplyLabel}>Paper Roll:</Text>
            <Text style={[styles.supplyValue, item.paperLevel < 15 && { color: theme.colors.danger }]}>
              {item.paperLevel}%
            </Text>
          </View>

          <View style={styles.supplyItem}>
            <Ionicons name="color-fill" size={14} color={theme.colors.textTelemetry} />
            <Text style={styles.supplyLabel}>Printer Ink:</Text>
            <Text style={styles.supplyValue}>{item.inkLevel}%</Text>
          </View>

          <View style={styles.supplyItem}>
            <Ionicons name="pulse" size={14} color={theme.colors.success} />
            <Text style={styles.supplyLabel}>Ping:</Text>
            <Text style={styles.supplyValue}>{item.lastHeartbeat}</Text>
          </View>
        </View>
      </View>

      {/* Remote Command Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.pushBtn]}
          onPress={() => onAction(item.id, 'push')}
          activeOpacity={0.85}
        >
          <Ionicons name="send" size={16} color="#ffffff" />
          <Text style={styles.actionBtnText}>Push Session</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.printBtn]}
          onPress={() => onAction(item.id, 'test_print')}
          activeOpacity={0.85}
        >
          <Ionicons name="print" size={16} color={theme.colors.primary} />
          <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>Test Print</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.rebootBtn]}
          onPress={() => onAction(item.id, 'reboot')}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh-circle" size={18} color={theme.colors.warning} />
          <Text style={[styles.actionBtnText, { color: theme.colors.warning }]}>Reboot</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});
KioskCard.displayName = 'KioskCard';

export default function KiosksScreen() {
  const [kiosks, setKiosks] = useState<KioskTerminal[]>(INITIAL_KIOSKS);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleRemoteAction = useCallback((id: string, action: 'push' | 'reboot' | 'test_print') => {
    setLoadingAction(id);
    logger.info('Remote kiosk command dispatched', { args: [{ kioskId: id, action }] });

    setTimeout(() => {
      setLoadingAction(null);
      if (action === 'push') {
        Alert.alert('Session Pushed', `Current active gallery (SESS_4821) successfully sent to ${id}. Guest can begin touch selection.`);
      } else if (action === 'test_print') {
        Alert.alert('Test Print Dispatched', `Hardware diagnostic strip printed on ${id}. Check paper tray output.`);
      } else if (action === 'reboot') {
        Alert.alert('Terminal Rebooting', `Soft restart initiated for ${id}. Attractor screen will reload in 15 seconds.`);
      }
    }, 1200);
  }, []);

  const renderItem = useCallback(({ item }: { item: KioskTerminal }) => (
    <View>
      <KioskCard item={item} onAction={handleRemoteAction} />
      {loadingAction === item.id && (
        <View style={styles.overlayLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Executing Remote Command...</Text>
        </View>
      )}
    </View>
  ), [handleRemoteAction, loadingAction]);

  const keyExtractor = useCallback((item: KioskTerminal) => item.id, []);

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>RESORT TOUCH KIOSKS</Text>
        <Text style={styles.subtitle}>LAN Heartbeat • Hardware Supplies • Remote Gallery Dispatch</Text>
      </View>

      {/* Global Status Banner */}
      <View style={styles.statusBanner}>
        <Ionicons name="desktop" size={24} color={theme.colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>3 Terminals Active on Resort LAN</Text>
          <Text style={styles.bannerSub}>Master Server connected via Port 8090/8091 • Hardware telemetry nominal</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>KIOSK HARDWARE & PRINTER TELEMETRY</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.canvas} />
      <FlatList
        data={kiosks}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  header: {
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  title: { fontSize: 24, fontWeight: '900', color: theme.colors.textHeader, letterSpacing: 1 },
  subtitle: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.colors.surface, padding: 16, borderRadius: theme.borderRadius.xl,
    borderWidth: 1.5, borderColor: theme.colors.success, marginBottom: theme.spacing.xl,
  },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.textHeader },
  bannerSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },

  sectionHeader: { marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },

  card: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg, borderWidth: 1.5, borderColor: theme.colors.border,
  },
  cardWarning: { borderColor: theme.colors.warning },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIndicator: { width: 12, height: 12, borderRadius: 6 },
  kioskName: { fontSize: 15, fontWeight: '900', color: theme.colors.textHeader, letterSpacing: 0.5 },
  kioskZone: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.borderRadius.sm, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },

  telemetryBox: {
    backgroundColor: theme.colors.canvas, borderRadius: theme.borderRadius.lg, padding: 12,
    borderWidth: 1, borderColor: theme.colors.border, marginBottom: 16, gap: 10,
  },
  telemetryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  telemetryText: { fontSize: 13, color: theme.colors.textMuted },
  telemetryStrong: { color: theme.colors.textHeader, fontWeight: '800' },

  suppliesRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  supplyItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  supplyLabel: { fontSize: 12, color: theme.colors.textSubtle, fontWeight: '700' },
  supplyValue: { fontSize: 13, color: theme.colors.textHeader, fontWeight: '900', fontFamily: 'monospace' },

  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    minHeight: theme.spacing.minTouch, borderRadius: theme.borderRadius.md, borderWidth: 1.5,
  },
  pushBtn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  printBtn: { backgroundColor: 'rgba(37, 99, 235, 0.15)', borderColor: theme.colors.primary },
  rebootBtn: { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: theme.colors.warning },
  actionBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },

  overlayLoading: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(11, 17, 31, 0.85)',
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  loadingText: { color: theme.colors.primary, fontWeight: '800', fontSize: 14, fontFamily: 'monospace' },
});
