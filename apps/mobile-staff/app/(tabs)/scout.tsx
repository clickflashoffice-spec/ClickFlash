import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, StatusBar, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme/tokens';
import { logger } from '../../src/utils/logger';

import * as Location from 'expo-location';

// Currency rates relative to EUR baseline
const CURRENCIES: Record<string, { symbol: string; rate: number; label: string }> = {
  EUR: { symbol: '€', rate: 1.0, label: 'EUR (€)' },
  USD: { symbol: '$', rate: 1.08, label: 'USD ($)' },
  GBP: { symbol: '£', rate: 0.85, label: 'GBP (£)' },
  AED: { symbol: 'AED ', rate: 3.97, label: 'AED' },
  SAR: { symbol: 'SAR ', rate: 4.05, label: 'SAR' },
};

type CurrencyCode = keyof typeof CURRENCIES;

const EARNINGS_WEEK_BASE = [
  { day: 'Mon', amount: 320 },
  { day: 'Tue', amount: 510 },
  { day: 'Wed', amount: 280 },
  { day: 'Thu', amount: 690 },
  { day: 'Fri', amount: 840 },
  { day: 'Sat', amount: 960 },
  { day: 'Sun', amount: 0, isToday: true },
];

interface SaleItem {
  id: string;
  client: string;
  product: string;
  amountBase: number;
  currencyOriginal: CurrencyCode;
  method: 'card' | 'cash' | 'room_charge';
  time: string;
}

const RECENT_SALES: SaleItem[] = [
  { id: 's1', client: 'Al-Rashid Family VIP', product: 'Digital All-Inclusive Album', amountBase: 85, currencyOriginal: 'EUR', method: 'card', time: '11:42 AM' },
  { id: 's2', client: 'Walk-in Resort Tourist', product: 'Digital Single x3 Pack', amountBase: 45, currencyOriginal: 'EUR', method: 'cash', time: '10:18 AM' },
  { id: 's3', client: 'Johnson VIP Group', product: 'Print 4x6 x5 Package', amountBase: 50, currencyOriginal: 'USD', method: 'card', time: '09:55 AM' },
  { id: 's4', client: 'Smith Wedding Party', product: 'Sunset Couple Session Album', amountBase: 120, currencyOriginal: 'AED', method: 'room_charge', time: '09:20 AM' },
];

const WeeklyChart: React.FC<{ currency: CurrencyCode }> = memo(({ currency }) => {
  const rate = CURRENCIES[currency].rate;
  const maxAmount = Math.max(...EARNINGS_WEEK_BASE.map(d => d.amount * rate));

  return (
    <View style={chart.container}>
      <View style={chart.bars}>
        {EARNINGS_WEEK_BASE.map(d => {
          const val = Math.round(d.amount * rate);
          const heightPct = maxAmount > 0 ? (val / maxAmount) : 0;
          return (
            <View key={d.day} style={chart.barCol}>
              <Text style={chart.amountLabel} numberOfLines={1}>
                {val > 0 ? `${val}` : ''}
              </Text>
              <View style={chart.barTrack}>
                <View style={[
                  chart.barFill,
                  { height: `${Math.max(heightPct * 100, val > 0 ? 6 : 0)}%` },
                  d.isToday && chart.barToday,
                ]} />
              </View>
              <Text style={[chart.dayLabel, d.isToday && chart.dayLabelToday]}>
                {d.day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});
WeeklyChart.displayName = 'WeeklyChart';

const SaleRow: React.FC<{ item: SaleItem; currency: CurrencyCode }> = memo(({ item, currency }) => {
  const rate = CURRENCIES[currency].rate;
  const convertedAmount = Math.round(item.amountBase * rate);
  const { symbol } = CURRENCIES[currency];

  const getMethodIcon = () => {
    if (item.method === 'cash') return 'cash-outline';
    if (item.method === 'room_charge') return 'business-outline';
    return 'card-outline';
  };

  const getMethodColor = () => {
    if (item.method === 'cash') return theme.colors.success;
    if (item.method === 'room_charge') return theme.colors.accent;
    return theme.colors.primary;
  };

  return (
    <View style={styles.saleRow}>
      <View style={[styles.saleMethodIcon, { backgroundColor: `${getMethodColor()}20` }]}>
        <Ionicons name={getMethodIcon() as any} size={18} color={getMethodColor()} />
      </View>
      <View style={styles.saleInfo}>
        <Text style={styles.saleClient}>{item.client}</Text>
        <Text style={styles.saleProduct}>{item.product} • {item.time}</Text>
      </View>
      <View style={styles.saleAmountCol}>
        <Text style={styles.saleAmount}>{symbol}{convertedAmount}</Text>
        <Text style={styles.saleMethodTag}>{item.method.replace('_', ' ').toUpperCase()}</Text>
      </View>
    </View>
  );
});
SaleRow.displayName = 'SaleRow';

const MetricCard: React.FC<{ label: string; value: string; icon: string; color: string; note: string }> = memo(({ label, value, icon, color, note }) => (
  <View style={styles.metricCard}>
    <View style={[styles.metricIcon, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon as any} size={22} color={color} />
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricNote, { color }]}>{note}</Text>
  </View>
));
MetricCard.displayName = 'MetricCard';

export default function ScoutScreen() {
  const [activeTab, setActiveTab] = useState<'earnings' | 'performance'>('earnings');
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const rate = CURRENCIES[currency].rate;
  const symbol = CURRENCIES[currency].symbol;

  const totalTodayBase = useMemo(() => RECENT_SALES.reduce((s, t) => s + t.amountBase, 0), []);
  const cashTotalBase = useMemo(() => RECENT_SALES.filter(t => t.method === 'cash').reduce((s, t) => s + t.amountBase, 0), []);
  const cardTotalBase = useMemo(() => RECENT_SALES.filter(t => t.method !== 'cash').reduce((s, t) => s + t.amountBase, 0), []);
  const weekTotalBase = useMemo(() => EARNINGS_WEEK_BASE.reduce((s, d) => s + d.amount, 0), []);

  const totalToday = Math.round(totalTodayBase * rate);
  const cashTotal = Math.round(cashTotalBase * rate);
  const cardTotal = Math.round(cardTotalBase * rate);
  const weekTotal = Math.round(weekTotalBase * rate);

  const handleCheckInOut = async () => {
    setIsCheckingIn(true);
    try {
      if (!isCheckedIn) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Location permission is required for AI Scout check-in.');
          setIsCheckingIn(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        logger.info('GPS Check-in', { args: [{ lat: location.coords.latitude, lng: location.coords.longitude }] });
        // Simulated: Send telemetry payload to Cloudflare backend for heatmap ingestion
        setIsCheckedIn(true);
      } else {
        logger.info('GPS Check-out', {});
        setIsCheckedIn(false);
      }
    } catch (err) {
      logger.error('Check-in failed', { error: err as any });
      Alert.alert('Error', 'Failed to acquire GPS location.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const renderSaleItem = useCallback(({ item }: { item: SaleItem }) => (
    <SaleRow item={item} currency={currency} />

  ), [currency]);

  const keyExtractor = useCallback((item: SaleItem) => item.id, []);

  const renderHeader = () => (
    <View>
      {/* Top Header & Currency Switcher */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>MY SCOUT & EARNINGS</Text>
          <Text style={styles.subtitle}>Telemetry • Revenue • Gemini Performance</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.checkInBtn, isCheckedIn && styles.checkOutBtn]}
          onPress={handleCheckInOut}
          disabled={isCheckingIn}
        >
          {isCheckingIn ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name={isCheckedIn ? "location" : "location-outline"} size={16} color="#ffffff" />
              <Text style={styles.checkInText}>{isCheckedIn ? "CHECK OUT" : "CHECK IN"}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Currency Selector Bar */}
      <View style={styles.currencyBar}>
        <Text style={styles.currencyLabel}>DISPLAY CURRENCY:</Text>
        <View style={styles.currencyPills}>
          {(Object.keys(CURRENCIES) as CurrencyCode[]).map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.currencyPill, currency === c && styles.currencyPillActive]}
              onPress={() => {
                setCurrency(c);
                logger.info('Switched display currency', { args: [c] });
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.currencyText, currency === c && styles.currencyTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Today Hero Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>TODAY'S ESTIMATED REVENUE ({currency})</Text>
        <Text style={styles.heroAmount}>{symbol}{totalToday.toLocaleString()}</Text>
        <View style={styles.heroSplit}>
          <View style={styles.heroSplitItem}>
            <Ionicons name="card" size={16} color={theme.colors.primary} />
            <Text style={styles.heroSplitLabel}>Card / Room</Text>
            <Text style={styles.heroSplitAmount}>{symbol}{cardTotal.toLocaleString()}</Text>
          </View>
          <View style={styles.heroSplitDivider} />
          <View style={styles.heroSplitItem}>
            <Ionicons name="cash" size={16} color={theme.colors.success} />
            <Text style={styles.heroSplitLabel}>Cash</Text>
            <Text style={styles.heroSplitAmount}>{symbol}{cashTotal.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'earnings' && styles.tabActive]}
          onPress={() => setActiveTab('earnings')}
        >
          <Ionicons name="stats-chart" size={16} color={activeTab === 'earnings' ? '#ffffff' : theme.colors.textSubtle} />
          <Text style={[styles.tabText, activeTab === 'earnings' && styles.tabTextActive]}>
            Revenue Breakdown
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'performance' && styles.tabActive]}
          onPress={() => setActiveTab('performance')}
        >
          <Ionicons name="sparkles" size={16} color={activeTab === 'performance' ? '#ffffff' : theme.colors.textSubtle} />
          <Text style={[styles.tabText, activeTab === 'performance' && styles.tabTextActive]}>
            Gemini Coach & Stats
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'earnings' ? (
        <View>
          {/* Weekly Chart Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>WEEKLY VELOCITY ({currency})</Text>
              <Text style={styles.cardMeta}>{symbol}{weekTotal.toLocaleString()} total</Text>
            </View>
            <WeeklyChart currency={currency} />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>TODAY'S VERIFIED SALES FEED</Text>
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          {/* Performance metrics */}
          <View style={styles.metricsGrid}>
            <MetricCard label="Conversion Rate" value="64%" icon="trending-up" color={theme.colors.success} note="+8% vs last week" />
            <MetricCard label="Avg Order Value" value={`${symbol}${Math.round(66 * rate)}`} icon="pricetag" color={theme.colors.primary} note={`Target: ${symbol}${Math.round(60 * rate)}`} />
            <MetricCard label="Photos Taken" value="134" icon="camera" color={theme.colors.accent} note="Today across 4 sets" />
            <MetricCard label="Photos Sold" value="86" icon="checkmark-circle" color={theme.colors.warning} note="64% sell-through" />
          </View>

          {/* AI Coach Card */}
          <View style={styles.aiCoachCard}>
            <View style={styles.aiCoachHeader}>
              <Ionicons name="sparkles" size={20} color={theme.colors.accent} />
              <Text style={styles.aiCoachTitle}>GEMINI FIELD COACH</Text>
              <Text style={styles.aiCoachBadge}>AI TELEMETRY</Text>
            </View>
            <Text style={styles.aiCoachMessage}>
              Outstanding momentum! Your 64% conversion is running +16% higher than the resort field average of 48%.
              {'\n\n'}
              💡 Tactical Insight: Golden hour lighting (16:30–18:00 at Sunset Pier) shows an 82% instant buy-rate for digital packages. Prioritize roving there in 45 minutes.
            </Text>
            <View style={styles.aiCoachTarget}>
              <Text style={styles.aiCoachTargetLabel}>Daily Revenue Target Progress</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '78%' }]} />
              </View>
              <Text style={styles.progressText}>
                {symbol}{totalToday} / {symbol}{Math.round(350 * rate)} target (78%)
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.canvas} />
      {activeTab === 'earnings' ? (
        <FlatList
          data={RECENT_SALES}
          renderItem={renderSaleItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 1 }} />}
        />
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  checkOutBtn: {
    backgroundColor: theme.colors.warning,
  },
  checkInText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: theme.colors.textHeader, 
    letterSpacing: 1 
  },
  subtitle: { 
    fontSize: 13, 
    color: theme.colors.textMuted, 
    marginTop: 2 
  },

  // Currency Selector Bar
  currencyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  currencyLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textSubtle,
    letterSpacing: 0.8,
  },
  currencyPills: {
    flexDirection: 'row',
    gap: 6,
  },
  currencyPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.canvas,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  currencyPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  currencyText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textSubtle,
    fontFamily: 'monospace',
  },
  currencyTextActive: {
    color: '#ffffff',
  },

  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl, 
    padding: theme.spacing.xl, 
    borderWidth: 1.5, 
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.lg,
  },
  heroLabel: { 
    fontSize: 11, 
    fontWeight: '800', 
    color: theme.colors.primary, 
    letterSpacing: 1.5, 
    textTransform: 'uppercase' 
  },
  heroAmount: { 
    fontSize: 44, 
    fontWeight: '900', 
    color: theme.colors.textHeader, 
    fontFamily: 'monospace',
    letterSpacing: -1, 
    marginTop: 4 
  },
  heroSplit: { 
    flexDirection: 'row', 
    marginTop: 16, 
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  heroSplitItem: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  heroSplitDivider: { 
    width: 1, 
    height: 32, 
    backgroundColor: theme.colors.border, 
    marginHorizontal: 12 
  },
  heroSplitLabel: { 
    fontSize: 13, 
    color: theme.colors.textMuted 
  },
  heroSplitAmount: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: theme.colors.textHeader, 
    fontFamily: 'monospace',
    marginLeft: 'auto' 
  },

  tabRow: {
    flexDirection: 'row', 
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface, 
    borderRadius: theme.borderRadius.lg, 
    padding: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tab: { 
    flex: 1, 
    paddingVertical: 12, 
    borderRadius: theme.borderRadius.md, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    minHeight: theme.spacing.minTouch,
  },
  tabActive: { 
    backgroundColor: theme.colors.primary 
  },
  tabText: { 
    fontSize: 13, 
    fontWeight: '800', 
    color: theme.colors.textSubtle 
  },
  tabTextActive: { 
    color: '#ffffff' 
  },

  card: { 
    marginBottom: theme.spacing.lg, 
    backgroundColor: theme.colors.surface, 
    borderRadius: theme.borderRadius.xl, 
    padding: theme.spacing.lg, 
    borderWidth: 1.5, 
    borderColor: theme.colors.border 
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  cardTitle: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: theme.colors.textHeader,
    letterSpacing: 0.8,
  },
  cardMeta: { 
    fontSize: 13, 
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: 'monospace',
  },

  section: { 
    marginBottom: theme.spacing.lg 
  },
  sectionHeader: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: { 
    fontSize: 13, 
    fontWeight: '800', 
    color: theme.colors.textMuted, 
    textTransform: 'uppercase', 
    letterSpacing: 1 
  },

  saleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 14, 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: theme.colors.border,
    minHeight: theme.spacing.minTouch,
  },
  saleMethodIcon: { 
    width: 42, 
    height: 42, 
    borderRadius: theme.borderRadius.md, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  saleInfo: { 
    flex: 1 
  },
  saleClient: { 
    fontSize: 15, 
    fontWeight: '800', 
    color: theme.colors.textHeader 
  },
  saleProduct: { 
    fontSize: 12, 
    color: theme.colors.textMuted, 
    marginTop: 2 
  },
  saleAmountCol: {
    alignItems: 'flex-end',
  },
  saleAmount: { 
    fontSize: 16, 
    fontWeight: '900', 
    color: theme.colors.textHeader,
    fontFamily: 'monospace',
  },
  saleMethodTag: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textTelemetry,
    marginTop: 2,
  },

  metricsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 12, 
    marginBottom: theme.spacing.lg 
  },
  metricCard: {
    width: '48%', 
    backgroundColor: theme.colors.surface, 
    borderRadius: theme.borderRadius.lg, 
    padding: 16,
    borderWidth: 1.5, 
    borderColor: theme.colors.border,
  },
  metricIcon: { 
    width: 42, 
    height: 42, 
    borderRadius: theme.borderRadius.md, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 12 
  },
  metricValue: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: theme.colors.textHeader,
    fontFamily: 'monospace' 
  },
  metricLabel: { 
    fontSize: 12, 
    color: theme.colors.textMuted, 
    marginTop: 4,
    fontWeight: '700',
  },
  metricNote: { 
    fontSize: 11, 
    fontWeight: '800', 
    marginTop: 6 
  },

  aiCoachCard: {
    backgroundColor: theme.colors.surface, 
    borderRadius: theme.borderRadius.xl, 
    padding: theme.spacing.xl,
    borderWidth: 1.5, 
    borderColor: theme.colors.accent,
  },
  aiCoachHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 14 
  },
  aiCoachTitle: { 
    fontSize: 15, 
    fontWeight: '900', 
    color: theme.colors.accent,
    letterSpacing: 1,
  },
  aiCoachBadge: {
    marginLeft: 'auto', 
    backgroundColor: `${theme.colors.accent}25`, 
    color: theme.colors.accent,
    fontSize: 10, 
    fontWeight: '800', 
    paddingHorizontal: 8, 
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm, 
    letterSpacing: 0.8,
  },
  aiCoachMessage: { 
    fontSize: 14, 
    color: theme.colors.textHeader, 
    lineHeight: 22,
    fontWeight: '500',
  },
  aiCoachTarget: { 
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  aiCoachTargetLabel: { 
    fontSize: 12, 
    color: theme.colors.textMuted, 
    marginBottom: 8,
    fontWeight: '700',
  },
  progressBar: { 
    height: 10, 
    backgroundColor: theme.colors.canvas, 
    borderRadius: 5, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  progressFill: { 
    height: '100%', 
    backgroundColor: theme.colors.accent, 
    borderRadius: 5 
  },
  progressText: { 
    fontSize: 12, 
    color: theme.colors.accent, 
    marginTop: 6, 
    fontWeight: '800',
    fontFamily: 'monospace',
  },
});

const chart = StyleSheet.create({
  container: { height: 130 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: '100%', gap: 8 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  amountLabel: { fontSize: 10, color: theme.colors.textTelemetry, marginBottom: 6, fontFamily: 'monospace', fontWeight: '700' },
  barTrack: { width: '100%', height: '80%', justifyContent: 'flex-end' },
  barFill: { width: '100%', backgroundColor: theme.colors.primary, borderRadius: 4, minHeight: 4 },
  barToday: { backgroundColor: theme.colors.textSubtle, opacity: 0.5 },
  dayLabel: { fontSize: 11, color: theme.colors.textSubtle, marginTop: 8, fontWeight: '800' },
  dayLabelToday: { color: theme.colors.primary },
});
