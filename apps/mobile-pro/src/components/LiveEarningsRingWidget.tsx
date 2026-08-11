import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface LiveEarningsRingWidgetProps {
  currentEarnings: number;
  targetEarnings: number;
  photosSold: number;
  conversionRate: number; // e.g. 68%
}

export function LiveEarningsRingWidget({
  currentEarnings = 245.0,
  targetEarnings = 300.0,
  photosSold = 42,
  conversionRate = 72,
}: LiveEarningsRingWidgetProps) {
  const percentComplete = Math.min(100, Math.round((currentEarnings / targetEarnings) * 100));

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>LIVE SHIFT COMMISSION</Text>
        <Text style={styles.percentText}>{percentComplete}% of Goal</Text>
      </View>

      <View style={styles.metricsRow}>
        {/* Main Earnings */}
        <View style={styles.earningsBlock}>
          <Text style={styles.currencySymbol}>€</Text>
          <Text style={styles.earningsValue}>{currentEarnings.toFixed(0)}</Text>
          <Text style={styles.targetLabel}>/ €{targetEarnings.toFixed(0)} goal</Text>
        </View>

        {/* Supporting stats */}
        <View style={styles.statsColumn}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>SOLD PHOTOS</Text>
            <Text style={styles.statValue}>📸 {photosSold}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>CONVERSION</Text>
            <Text style={styles.statValue}>⚡ {conversionRate}%</Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${percentComplete}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    color: '#a1a1aa',
    letterSpacing: 1,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10b981',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  earningsBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10b981',
    marginRight: 2,
  },
  earningsValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
  },
  targetLabel: {
    fontSize: 13,
    color: '#71717a',
    fontWeight: '600',
    marginLeft: 6,
  },
  statsColumn: {
    flexDirection: 'row',
    gap: 14,
  },
  statItem: {
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#71717a',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#27272a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
});
