import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/tokens';
import { TetherMode } from '../services/UnifiedCameraService';

interface Props {
  isConnected: boolean;
  mode?: TetherMode;
  manufacturer: string;
  model: string;
  batteryLevel?: number;
}

export const CameraStatusCard: React.FC<Props> = ({ isConnected, mode = 'none', manufacturer, model, batteryLevel }) => {
  const getStatusColor = () => {
    if (!isConnected || mode === 'none') return theme.colors.danger;
    if (mode === 'wifi') return theme.colors.warning;
    return theme.colors.success;
  };

  const getStatusLabel = () => {
    if (!isConnected || mode === 'none') return 'Disconnected';
    if (mode === 'usb') return 'USB PTP Tethered';
    if (mode === 'wifi') return 'Wi-Fi PTP Tethered';
    return 'Active';
  };

  return (
    <View style={[styles.container, { borderColor: getStatusColor() }]}>
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: `${getStatusColor()}20` }]}>
          <Ionicons name={isConnected ? "camera" : "camera-outline"} size={22} color={getStatusColor()} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{getStatusLabel()}</Text>
          <Text style={styles.subtitle}>{isConnected ? `${manufacturer} ${model}` : 'No hardware detected'}</Text>
        </View>
        {isConnected && batteryLevel !== undefined && (
          <View style={styles.batteryContainer}>
            <Ionicons 
              name={batteryLevel > 20 ? "battery-full" : "battery-dead"} 
              size={20} 
              color={batteryLevel > 20 ? theme.colors.success : theme.colors.danger} 
            />
            <Text style={styles.batteryText}>{batteryLevel}%</Text>
          </View>
        )}
      </View>
      
      {!isConnected && (
        <View style={styles.footer}>
          <Text style={styles.text}>Connect DSLR/Mirrorless via USB OTG cable or Wi-Fi PTP for instant zero-latency ingest.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginVertical: theme.spacing.sm,
    borderWidth: 1.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: theme.colors.textHeader,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.elevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.round,
  },
  batteryText: {
    color: theme.colors.textTelemetry,
    fontFamily: 'monospace',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },
  footer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  text: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  }
});
