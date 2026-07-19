import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, StatusBar, Alert, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme/tokens';
import { logger } from '../../src/utils/logger';
import { getPendingApprovals, updateApprovalStatus, PendingApprovalItem } from '../../db/database';
import { UnifiedSyncService } from '../../src/services/UnifiedSyncService';

// Fallback items if SQLite queue is completely empty so field managers can test right away
const INITIAL_MODERATION_ITEMS: PendingApprovalItem[] = [
  {
    id: 'mod_101',
    type: 'photo_moderation',
    session_id: 'SESS_4821',
    details: JSON.stringify({
      reason: 'AI Flag: Slight Underexposure / Guest Blink in burst #3',
      photoId: 'IMG_8421.RAW',
      client: 'Al-Rashid Family VIP'
    }),
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: 'pending'
  },
  {
    id: 'mod_102',
    type: 'photo_moderation',
    session_id: 'SESS_4821',
    details: JSON.stringify({
      reason: 'Guest Requested Private Masking before cloud sync',
      photoId: 'IMG_8424.RAW',
      client: 'Al-Rashid Family VIP'
    }),
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    status: 'pending'
  },
];

const INITIAL_CASH_ITEMS: PendingApprovalItem[] = [
  {
    id: 'cash_201',
    type: 'cash_payment',
    session_id: 'SESS_4819',
    amount: 145,
    currency: 'EUR',
    details: JSON.stringify({
      customer: 'Walk-in Resort Tourist',
      itemsCount: 3,
      notes: 'Exact cash collected at Sunset Pool Pier'
    }),
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: 'pending'
  },
  {
    id: 'cash_202',
    type: 'cash_payment',
    session_id: 'SESS_4820',
    amount: 60,
    currency: 'EUR',
    details: JSON.stringify({
      customer: 'Johnson VIP Group',
      itemsCount: 1,
      notes: 'Cash collected by Staff #01'
    }),
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    status: 'pending'
  },
];

const ApprovalCard: React.FC<{
  item: PendingApprovalItem;
  onApprove: (id: string, type: 'cash_payment' | 'photo_moderation') => void;
  onReject: (id: string, type: 'cash_payment' | 'photo_moderation') => void;
}> = memo(({ item, onApprove, onReject }) => {
  const isCash = item.type === 'cash_payment';
  let parsedDetails: any = {};
  try {
    parsedDetails = JSON.parse(item.details || '{}');
  } catch (e) {
    parsedDetails = { notes: item.details };
  }

  const timeAgo = Math.max(1, Math.round((Date.now() - new Date(item.created_at).getTime()) / 60000));

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.typeRow}>
          <View style={[styles.iconBadge, { backgroundColor: isCash ? `${theme.colors.success}20` : `${theme.colors.warning}20` }]}>
            <Ionicons
              name={isCash ? 'cash' : 'alert-circle'}
              size={18}
              color={isCash ? theme.colors.success : theme.colors.warning}
            />
          </View>
          <View>
            <Text style={styles.cardTitle}>
              {isCash ? 'CASH AUDIT & RECONCILIATION' : 'AI PHOTO QUALITY MODERATION'}
            </Text>
            <Text style={styles.cardSubTitle}>
              Session #{item.session_id} • {timeAgo}m ago
            </Text>
          </View>
        </View>
        {isCash && item.amount != null && (
          <Text style={styles.amountBadge}>
            {item.currency || 'EUR'} {item.amount}
          </Text>
        )}
      </View>

      <View style={styles.cardBody}>
        {isCash ? (
          <View style={styles.detailsCol}>
            <Text style={styles.detailText}>Guest: <Text style={styles.detailStrong}>{parsedDetails.customer || 'Walk-in Guest'}</Text></Text>
            <Text style={styles.detailText}>Items: <Text style={styles.detailStrong}>{parsedDetails.itemsCount || 1} package(s)</Text></Text>
            {parsedDetails.notes && <Text style={styles.detailNotes}>"{parsedDetails.notes}"</Text>}
          </View>
        ) : (
          <View style={styles.detailsCol}>
            <Text style={styles.detailText}>File: <Text style={styles.detailStrong}>{parsedDetails.photoId || 'Raw Image'}</Text></Text>
            <Text style={styles.detailText}>Client: <Text style={styles.detailStrong}>{parsedDetails.client || 'Resort Guest'}</Text></Text>
            <View style={styles.flagBox}>
              <Ionicons name="alert-circle" size={16} color={theme.colors.warning} />
              <Text style={styles.flagText}>{parsedDetails.reason || 'Manual review required'}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={() => onReject(item.id, item.type)}
          activeOpacity={0.85}
        >
          <Ionicons name="close-circle-outline" size={18} color={theme.colors.danger} />
          <Text style={styles.rejectBtnText}>{isCash ? 'Flag Discrepancy' : 'Quarantine / Delete'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.approveBtn]}
          onPress={() => onApprove(item.id, item.type)}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
          <Text style={styles.approveBtnText}>{isCash ? 'Verify Cash Sign-off' : 'Approve for Cloud'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});
ApprovalCard.displayName = 'ApprovalCard';

export default function ApprovalsScreen() {
  const [activeTab, setActiveTab] = useState<'all' | 'cash' | 'moderation'>('all');
  const [items, setItems] = useState<PendingApprovalItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadQueue = useCallback(() => {
    try {
      const dbItems = getPendingApprovals();
      if (dbItems && dbItems.length > 0) {
        setItems(dbItems);
      } else {
        // Use baseline seed items if SQLite is empty
        setItems([...INITIAL_MODERATION_ITEMS, ...INITIAL_CASH_ITEMS]);
      }
    } catch (e) {
      logger.warn('Error fetching SQLite approvals, loading baseline seed', { args: [e] });
      setItems([...INITIAL_MODERATION_ITEMS, ...INITIAL_CASH_ITEMS]);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadQueue();
    UnifiedSyncService.syncNow();
    setTimeout(() => setRefreshing(false), 800);
  }, [loadQueue]);

  const handleApprove = useCallback((id: string, type: 'cash_payment' | 'photo_moderation') => {
    try {
      updateApprovalStatus(id, 'approved');
      UnifiedSyncService.syncNow();
    } catch (e) {
      logger.warn('SQLite update status fallback', { args: [e] });
    }

    setItems(prev => prev.filter(i => i.id !== id));
    if (type === 'cash_payment') {
      logger.info('Cash transaction verified & signed off', { args: [id] });
    } else {
      logger.info('Photo approved and queued for R2 cloud ingestion', { args: [id] });
    }
  }, []);

  const handleReject = useCallback((id: string, type: 'cash_payment' | 'photo_moderation') => {
    try {
      updateApprovalStatus(id, 'rejected');
      UnifiedSyncService.syncNow();
    } catch (e) {
      logger.warn('SQLite update status fallback', { args: [e] });
    }

    setItems(prev => prev.filter(i => i.id !== id));
    if (type === 'cash_payment') {
      Alert.alert('Cash Discrepancy Flagged', 'This cash transaction has been flagged for accounting review.');
    } else {
      Alert.alert('Photo Quarantined', 'The selected photo has been quarantined and will not sync to client galleries.');
    }
  }, []);

  const filteredItems = items.filter(item => {
    if (activeTab === 'cash') return item.type === 'cash_payment';
    if (activeTab === 'moderation') return item.type === 'photo_moderation';
    return true;
  });

  const cashCount = items.filter(i => i.type === 'cash_payment').length;
  const modCount = items.filter(i => i.type === 'photo_moderation').length;

  const renderItem = useCallback(({ item }: { item: PendingApprovalItem }) => (
    <ApprovalCard item={item} onApprove={handleApprove} onReject={handleReject} />
  ), [handleApprove, handleReject]);

  const keyExtractor = useCallback((item: PendingApprovalItem) => item.id, []);

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>EXECUTIVE APPROVALS</Text>
        <Text style={styles.subtitle}>Audit Sign-offs • AI Photo Moderation • Field Security</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All Queue ({items.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'cash' && styles.tabBtnActive]}
          onPress={() => setActiveTab('cash')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'cash' && styles.tabTextActive]}>
            Cash Audit ({cashCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'moderation' && styles.tabBtnActive]}
          onPress={() => setActiveTab('moderation')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'moderation' && styles.tabTextActive]}>
            Moderation ({modCount})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>PENDING SIGN-OFF ITEMS ({filteredItems.length})</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.canvas} />
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-done-circle" size={56} color={theme.colors.success} />
            <Text style={styles.emptyTitle}>All Audits Resolved</Text>
            <Text style={styles.emptySub}>No pending cash verifications or photo quality flags in your active queue.</Text>
          </View>
        }
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

  tabRow: {
    flexDirection: 'row', gap: 8, marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface, padding: 6, borderRadius: theme.borderRadius.lg,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: theme.borderRadius.md,
    alignItems: 'center', justifyContent: 'center', minHeight: 40,
  },
  tabBtnActive: { backgroundColor: theme.colors.primary },
  tabText: { fontSize: 12, fontWeight: '800', color: theme.colors.textSubtle, fontFamily: 'monospace' },
  tabTextActive: { color: '#ffffff' },

  sectionHeader: { marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },

  card: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg, borderWidth: 1.5, borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBadge: { width: 40, height: 40, borderRadius: theme.borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 13, fontWeight: '900', color: theme.colors.textHeader, letterSpacing: 0.5 },
  cardSubTitle: { fontSize: 12, color: theme.colors.textTelemetry, marginTop: 2, fontFamily: 'monospace' },
  amountBadge: { fontSize: 18, fontWeight: '900', color: theme.colors.success, fontFamily: 'monospace' },

  cardBody: { marginBottom: 16 },
  detailsCol: { gap: 6 },
  detailText: { fontSize: 14, color: theme.colors.textMuted },
  detailStrong: { color: theme.colors.textHeader, fontWeight: '800' },
  detailNotes: { fontSize: 13, color: theme.colors.textTelemetry, fontStyle: 'italic', marginTop: 4 },
  flagBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)', padding: 10, borderRadius: theme.borderRadius.md,
    borderWidth: 1, borderColor: theme.colors.warning,
  },
  flagText: { fontSize: 12, fontWeight: '700', color: theme.colors.warning, flex: 1 },

  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    minHeight: theme.spacing.minTouch, borderRadius: theme.borderRadius.md, borderWidth: 1.5,
  },
  rejectBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: theme.colors.danger },
  rejectBtnText: { color: theme.colors.danger, fontWeight: '800', fontSize: 13 },
  approveBtn: { backgroundColor: theme.colors.success, borderColor: theme.colors.success },
  approveBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },

  emptyBox: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 60,
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl,
    borderWidth: 1, borderColor: theme.colors.border, marginTop: 10,
  },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.textHeader, marginTop: 14 },
  emptySub: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', marginTop: 6, paddingHorizontal: 30, lineHeight: 20 },
});
