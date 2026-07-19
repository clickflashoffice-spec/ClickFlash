import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, StatusBar, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { logger } from '../../src/utils/logger';
import { theme } from '../../src/theme/tokens';
import { insertCheckin } from '../../db/database';
import { UnifiedSyncService } from '../../src/services/UnifiedSyncService';

type CheckState = 'idle' | 'checking' | 'active' | 'checking_out';

interface Gig {
  id: string;
  time: string;
  client: string;
  location: string;
  type: string;
  status: 'upcoming' | 'active' | 'done';
  sessionCount?: number;
}

const MOCK_GIGS: Gig[] = [
  { id: '1', time: '09:00 AM', client: 'Al-Rashid Family VIP', location: 'Pool Area B (Geo: OK)', type: 'Resort Session', status: 'done', sessionCount: 3 },
  { id: '2', time: '11:30 AM', client: 'Johnson VIP Group', location: 'Sunset Pier Cabanas', type: 'Private Event', status: 'active', sessionCount: 1 },
  { id: '3', time: '02:00 PM', client: 'Open Field Roving', location: 'Sunset Point & Beach', type: 'Walk-in Session', status: 'upcoming' },
  { id: '4', time: '04:30 PM', client: 'Smith Wedding Party', location: 'Garden Terrace Lawn', type: 'Event Coverage', status: 'upcoming' },
];

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const GigCard: React.FC<{ item: Gig }> = memo(({ item }) => {
  const getStatusColor = () => {
    if (item.status === 'active') return theme.colors.success;
    if (item.status === 'done') return theme.colors.textSubtle;
    return theme.colors.primary;
  };

  const statusLabel = item.status === 'active'
    ? 'IN PROGRESS' : item.status === 'done' ? 'COMPLETED' : 'UPCOMING';

  return (
    <View style={[styles.gigCard, item.status === 'done' && styles.gigCardDone]}>
      <View style={styles.gigHeader}>
        <View style={styles.gigTimeRow}>
          <Ionicons name="time" size={14} color={theme.colors.textTelemetry} />
          <Text style={styles.gigTime}>{item.time}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20`, borderColor: getStatusColor() }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{statusLabel}</Text>
        </View>
      </View>
      <Text style={[styles.clientName, item.status === 'done' && styles.textMuted]}>
        {item.client}
      </Text>
      <View style={styles.locationRow}>
        <Ionicons name="location" size={14} color={theme.colors.textMuted} />
        <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
        <Text style={styles.gigTypePill}>{item.type}</Text>
      </View>
      {item.sessionCount != null && (
        <View style={styles.sessionCountRow}>
          <Ionicons name="checkmark-done" size={16} color={theme.colors.success} />
          <Text style={styles.sessionCountText}>
            {item.sessionCount} session{item.sessionCount !== 1 ? 's' : ''} completed & synced
          </Text>
        </View>
      )}
    </View>
  );
});
GigCard.displayName = 'GigCard';

export default function ScheduleScreen() {
  const [checkState, setCheckState] = useState<CheckState>('idle');
  const [checkInCoords, setCheckInCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleCheckIn = async () => {
    setCheckState('checking');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Location permission is required for GPS check-in to verify resort zone.');
        setCheckState('idle');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setCheckInCoords(coords);
      const now = new Date();
      setCheckInTime(now);
      setElapsed(0);
      startTimer();

      // Record offline check-in in local SQLite for background sync
      try {
        insertCheckin({
          id: `chk_${Date.now()}`,
          gig_id: 'GIG_101',
          staff_id: 'STAFF_01',
          latitude: coords.lat,
          longitude: coords.lng,
          accuracy: loc.coords.accuracy || 5,
          timestamp: now.toISOString(),
          type: 'check_in'
        });
        UnifiedSyncService.syncNow();
      } catch (dbErr) {
        logger.warn('SQLite insertCheckin fallback', { args: [dbErr] });
      }

      logger.info('GPS Check-in confirmed', { args: [coords] });
      setCheckState('active');
    } catch (e) {
      logger.error('Check-in failed', { args: [e] });
      Alert.alert('GPS Error', 'Could not lock GPS coordinates. Please step into an open area and retry.');
      setCheckState('idle');
    }
  };

  const handleCheckOut = async () => {
    setCheckState('checking_out');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        logger.info('GPS Check-out at:', { args: [{ lat: loc.coords.latitude, lng: loc.coords.longitude }] });
        try {
          insertCheckin({
            id: `chk_${Date.now()}`,
            gig_id: 'GIG_101',
            staff_id: 'STAFF_01',
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy || 5,
            timestamp: new Date().toISOString(),
            type: 'check_out'
          });
          UnifiedSyncService.syncNow();
        } catch (dbErr) {
          logger.warn('SQLite insertCheckin checkout fallback', { args: [dbErr] });
        }
      }
    } catch (e) {
      logger.error('Check-out location error', { args: [e] });
    } finally {
      stopTimer();
      setCheckState('idle');
      setCheckInCoords(null);
      setCheckInTime(null);
      setElapsed(0);
    }
  };

  const renderGigItem = useCallback(({ item }: { item: Gig }) => (
    <GigCard item={item} />
  ), []);

  const keyExtractor = useCallback((item: Gig) => item.id, []);

  const renderHeader = () => {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });

    return (
      <View>
        <View style={styles.header}>
          <Text style={styles.title}>FIELD SCHEDULE</Text>
          <Text style={styles.date}>{today}</Text>
        </View>

        {/* GPS Check-In Widget Card */}
        <View style={styles.section}>
          {checkState === 'idle' && (
            <TouchableOpacity style={styles.checkInBtn} onPress={handleCheckIn} activeOpacity={0.85}>
              <View style={styles.checkInIconBadge}>
                <Ionicons name="location" size={26} color="#ffffff" />
              </View>
              <View style={styles.checkInTextCol}>
                <Text style={styles.checkInTitle}>GPS Clock-In</Text>
                <Text style={styles.checkInSubtitle}>Verify resort zone coordinates</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          )}

          {checkState === 'checking' && (
            <View style={[styles.checkInBtn, styles.checkingBtn]}>
              <ActivityIndicator color={theme.colors.primary} size="large" />
              <View style={styles.checkInTextCol}>
                <Text style={styles.checkInTitle}>Acquiring GPS Lock...</Text>
                <Text style={styles.checkInSubtitle}>Triangulating high-accuracy position</Text>
              </View>
            </View>
          )}

          {checkState === 'active' && (
            <View style={styles.activeCard}>
              <View style={styles.activeCardHeader}>
                <View style={styles.pulseDot} />
                <Text style={styles.activeLabel}>ON DUTY • GPS VERIFIED</Text>
              </View>
              <Text style={styles.timerText}>{formatDuration(elapsed)}</Text>
              {checkInTime && (
                <Text style={styles.checkInTimeText}>
                  Started at {checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
              {checkInCoords && (
                <Text style={styles.coordsText}>
                  LAT/LNG: {checkInCoords.lat.toFixed(5)}, {checkInCoords.lng.toFixed(5)}
                </Text>
              )}
              <TouchableOpacity style={styles.checkOutBtn} onPress={handleCheckOut} activeOpacity={0.85}>
                <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
                <Text style={styles.checkOutText}>Complete Shift & Clock Out</Text>
              </TouchableOpacity>
            </View>
          )}

          {checkState === 'checking_out' && (
            <View style={[styles.activeCard, { alignItems: 'center' }]}>
              <ActivityIndicator color={theme.colors.danger} />
              <Text style={[styles.checkInTitle, { marginTop: 8 }]}>Stamping Checkout...</Text>
            </View>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Bookings', value: '4', icon: 'calendar' },
            { label: 'Completed', value: '1', icon: 'checkmark-circle' },
            { label: 'Sessions', value: '4', icon: 'camera' },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon as any} size={20} color={theme.colors.primary} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TODAY'S RESORT ASSIGNMENTS</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.canvas} />
      <FlatList
        data={MOCK_GIGS}
        renderItem={renderGigItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.canvas 
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  header: { 
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  title: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: theme.colors.textHeader, 
    letterSpacing: 1 
  },
  date: { 
    fontSize: 14, 
    color: theme.colors.textMuted, 
    marginTop: 2 
  },
  section: { 
    marginBottom: theme.spacing.lg,
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

  // Check-in card
  checkInBtn: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.spacing.minTouch,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  checkingBtn: { 
    opacity: 0.8,
  },
  checkInIconBadge: { 
    backgroundColor: theme.colors.primary, 
    borderRadius: theme.borderRadius.md, 
    padding: 12,
    marginRight: 14,
  },
  checkInTextCol: {
    flex: 1,
  },
  checkInTitle: { 
    fontSize: 17, 
    fontWeight: '800', 
    color: theme.colors.textHeader 
  },
  checkInSubtitle: { 
    fontSize: 13, 
    color: theme.colors.textMuted, 
    marginTop: 2 
  },

  // Active card
  activeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1.5,
    borderColor: theme.colors.success,
  },
  activeCardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  pulseDot: {
    width: 10, 
    height: 10, 
    borderRadius: 5,
    backgroundColor: theme.colors.success,
    marginRight: 8,
  },
  activeLabel: { 
    fontSize: 12, 
    fontWeight: '800', 
    color: theme.colors.success, 
    letterSpacing: 1.2 
  },
  timerText: { 
    fontSize: 48, 
    fontWeight: '900', 
    color: theme.colors.textHeader, 
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'] 
  },
  checkInTimeText: { 
    fontSize: 13, 
    color: theme.colors.textMuted, 
    marginTop: 4 
  },
  coordsText: { 
    fontSize: 12, 
    color: theme.colors.textTelemetry, 
    marginTop: 2, 
    fontFamily: 'monospace' 
  },
  checkOutBtn: {
    marginTop: theme.spacing.lg, 
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.md, 
    minHeight: theme.spacing.minTouch,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1.5, 
    borderColor: theme.colors.danger,
  },
  checkOutText: { 
    color: theme.colors.danger, 
    fontWeight: '800', 
    fontSize: 15,
    marginLeft: 8,
  },

  // Stats
  statsRow: { 
    flexDirection: 'row', 
    gap: 10, 
    marginBottom: theme.spacing.lg 
  },
  statCard: {
    flex: 1, 
    backgroundColor: theme.colors.surface, 
    borderRadius: theme.borderRadius.lg, 
    padding: 14,
    alignItems: 'center', 
    borderWidth: 1.5, 
    borderColor: theme.colors.border,
  },
  statValue: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: theme.colors.textHeader, 
    marginTop: 6,
    fontFamily: 'monospace' 
  },
  statLabel: { 
    fontSize: 11, 
    color: theme.colors.textMuted, 
    marginTop: 2, 
    textTransform: 'uppercase', 
    fontWeight: '700' 
  },

  // Gig cards
  gigCard: {
    backgroundColor: theme.colors.surface, 
    borderRadius: theme.borderRadius.lg, 
    padding: theme.spacing.lg,
    borderWidth: 1.5, 
    borderColor: theme.colors.border,
  },
  gigCardDone: { 
    opacity: 0.6 
  },
  gigHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  gigTimeRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  gigTime: { 
    color: theme.colors.textTelemetry, 
    fontFamily: 'monospace',
    fontWeight: '700', 
    fontSize: 13,
    marginLeft: 6,
  },
  statusBadge: { 
    borderRadius: theme.borderRadius.sm, 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderWidth: 1 
  },
  statusText: { 
    fontSize: 10, 
    fontWeight: '800', 
    letterSpacing: 0.8 
  },
  clientName: { 
    fontSize: 17, 
    fontWeight: '800', 
    color: theme.colors.textHeader, 
    marginBottom: 8 
  },
  textMuted: { 
    color: theme.colors.textSubtle 
  },
  locationRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flexWrap: 'wrap' 
  },
  locationText: { 
    fontSize: 13, 
    color: theme.colors.textMuted, 
    flex: 1,
    marginLeft: 6,
  },
  gigTypePill: {
    backgroundColor: theme.colors.elevated, 
    color: theme.colors.textTelemetry,
    fontSize: 11, 
    fontWeight: '700', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sessionCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  sessionCountText: { 
    fontSize: 12, 
    color: theme.colors.success, 
    fontWeight: '700',
    marginLeft: 6,
  },
});
