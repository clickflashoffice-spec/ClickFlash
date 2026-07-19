import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/tokens';

interface Props {
  currentZone: string;
  suggestedZone: string;
  salesRate: string;
}

export const LocationScoutWidget: React.FC<Props> = memo(({ currentZone, suggestedZone, salesRate }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <Ionicons name="compass" size={18} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>AI Scout Insight</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>Active Zone: <Text style={styles.value}>{currentZone}</Text></Text>
        <Text style={styles.label}>🔥 Hot Target: <Text style={styles.highlight}>{suggestedZone}</Text> <Text style={styles.badgeText}>({salesRate} Boost)</Text></Text>
      </View>
    </View>
  );
});
LocationScoutWidget.displayName = 'LocationScoutWidget';

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  title: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  content: {
    paddingLeft: 36,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  value: {
    color: theme.colors.textHeader,
    fontWeight: '700',
  },
  highlight: {
    color: theme.colors.warning,
    fontWeight: '800',
  },
  badgeText: {
    color: theme.colors.textTelemetry,
    fontFamily: 'monospace',
    fontWeight: '700',
  }
});
