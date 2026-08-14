import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';

interface OrderRecord {
  id: string;
  date: string;
  itemCount: number;
  total: number;
  status: 'delivered' | 'processing';
  itemsSummary: string;
  downloadUrl: string;
}

const MOCK_ORDERS: OrderRecord[] = [
  {
    id: 'ORD-984210',
    date: 'August 10, 2026',
    itemCount: 14,
    total: 45.0,
    status: 'delivered',
    itemsSummary: 'Full High-Res Digital Album + 2x Framed Prints',
    downloadUrl: 'https://clickflash-storage.internal/downloads/ORD-984210.zip',
  },
  {
    id: 'ORD-771923',
    date: 'August 08, 2026',
    itemCount: 3,
    total: 20.0,
    status: 'delivered',
    itemsSummary: '3x Sunset Golden Hour Downloads',
    downloadUrl: 'https://clickflash-storage.internal/downloads/ORD-771923.zip',
  },
];

export default function OrdersScreen() {
  const [hasVipPass] = useState(true);

  const handleAddToAppleWallet = () => {
    Alert.alert('Apple Wallet', 'Your ClickFlash VIP Resort Photo Pass has been added to Apple Wallet!');
  };

  const handleDownloadAll = (orderId: string) => {
    Alert.alert('Download Started', `Downloading full-resolution ZIP archive for ${orderId}...`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Screen Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Passes & Orders</Text>
          <Text style={styles.headerSubtitle}>Access your digital purchases, passes, and receipts</Text>
        </View>

        {/* VIP Photo Pass Digital Card */}
        {hasVipPass && (
          <View style={styles.vipPassCard}>
            <View style={styles.vipPassHeader}>
              <View>
                <Text style={styles.vipBadge}>RESORT PHOTO PASS</Text>
                <Text style={styles.vipTitle}>VIP Unlimited Access</Text>
              </View>
              <Text style={styles.vipIcon}>✨</Text>
            </View>

            <View style={styles.vipDetails}>
              <View>
                <Text style={styles.vipMetaLabel}>GUEST</Text>
                <Text style={styles.vipMetaValue}>Villa 204 • Family</Text>
              </View>
              <View>
                <Text style={styles.vipMetaLabel}>VALID UNTIL</Text>
                <Text style={styles.vipMetaValue}>Aug 17, 2026</Text>
              </View>
            </View>

            <View style={styles.passActions}>
              <TouchableOpacity style={styles.appleWalletBtn} onPress={handleAddToAppleWallet}>
                <Text style={styles.appleWalletText}> Add to Apple Wallet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.kioskCodeBtn}
                onPress={() => Alert.alert('Kiosk Scan Code', 'Your Kiosk Access PIN is: 8492')}
              >
                <Text style={styles.kioskCodeText}>Kiosk PIN: 8492</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Order History */}
        <Text style={styles.sectionHeader}>PAST PURCHASES</Text>

        {MOCK_ORDERS.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderTopRow}>
              <View>
                <Text style={styles.orderIdText}>{order.id}</Text>
                <Text style={styles.orderDateText}>{order.date}</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>✓ DELIVERED</Text>
              </View>
            </View>

            <Text style={styles.orderSummary}>{order.itemsSummary}</Text>

            <View style={styles.orderFooter}>
              <Text style={styles.orderTotal}>€{order.total.toFixed(2)}</Text>
              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={() => handleDownloadAll(order.id)}
              >
                <Text style={styles.downloadBtnText}>⬇ Download All (ZIP)</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    marginTop: 4,
  },
  vipPassCard: {
    backgroundColor: '#1e1b4b',
    borderWidth: 1,
    borderColor: '#4338ca',
    borderRadius: 24,
    padding: 20,
    marginBottom: 28,
    shadowColor: '#4338ca',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  vipPassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vipBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#a5b4fc',
    letterSpacing: 1,
  },
  vipTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  vipIcon: {
    fontSize: 28,
  },
  vipDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  vipMetaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#818cf8',
    letterSpacing: 0.5,
  },
  vipMetaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  passActions: {
    flexDirection: 'row',
    gap: 10,
  },
  appleWalletBtn: {
    flex: 1,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  appleWalletText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  kioskCodeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  kioskCodeText: {
    color: '#e0e7ff',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#71717a',
    letterSpacing: 1,
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: '#18181b',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderIdText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  orderDateText: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
  },
  orderSummary: {
    fontSize: 13,
    color: '#a1a1aa',
    marginTop: 10,
    marginBottom: 14,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  downloadBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  downloadBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
});
