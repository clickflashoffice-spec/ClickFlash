import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { UnifiedCameraService, TetherMode } from '../../src/services/UnifiedCameraService';
import { CameraStatusCard } from '../../src/components/CameraStatusCard';
import { LocationScoutWidget } from '../../src/components/LocationScoutWidget';
import { IngestedPhotoGrid } from '../../src/components/IngestedPhotoGrid';
import { ScannerFAB } from '../../src/components/ScannerFAB';
import { TeacherAlertToast } from '../../src/components/TeacherAlertToast';
import { SessionQRModal } from '../../src/components/SessionQRModal';
import { CashConfirmationModal } from '../../src/components/CashConfirmationModal';
import { theme } from '../../src/theme/tokens';

export default function StudioScreen() {
  const [tetherMode, setTetherMode] = useState<TetherMode>('none');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [cashModalVisible, setCashModalVisible] = useState(false);
  const [sessionId, setSessionId] = useState('SESS_8841');
  const [pendingOrderId, setPendingOrderId] = useState('ord_mock_123');
  const [sessionPhotoCount, setSessionPhotoCount] = useState<number>(24);

  useEffect(() => {
    UnifiedCameraService.startLocationTracking();
    
    // Poll active status
    const statusInterval = setInterval(() => {
      const st = UnifiedCameraService.getStatus();
      setTetherMode(st.mode);
    }, 2000);

    // Mock live demo triggers after initial mount
    const timer = setTimeout(() => {
      setAlertMessage('AI Telemetry: Shutter speed too slow for moving water subjects (1/60s). Recommended: 1/500s+');
      setAlertVisible(true);
      
      setTimeout(() => setCashModalVisible(true), 12000);
    }, 6000);

    return () => {
      clearTimeout(timer);
      clearInterval(statusInterval);
    };
  }, []);

  const handleToggleTether = async () => {
    if (tetherMode !== 'none') {
      await UnifiedCameraService.stopIngestion();
      setTetherMode('none');
    } else {
      const success = await UnifiedCameraService.connectUsb();
      if (success) setTetherMode('usb');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.canvas} />
      
      <TeacherAlertToast 
        message={alertMessage} 
        isVisible={alertVisible} 
        onHide={() => setAlertVisible(false)} 
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Tactical Telemetry Bar */}
        <View style={styles.topBar}>
          <View style={styles.brandContainer}>
            <Text style={styles.brandTitle}>CLICKFLASH</Text>
            <View style={styles.pillActive}>
              <View style={styles.pulseDot} />
              <Text style={styles.pillText}>FIELD OP • ANDROID</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.scanBtn}
            onPress={() => router.push('/scanner')}
            activeOpacity={0.7}
          >
            <Ionicons name="qr-code-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.scanBtnText}>SCAN QR</Text>
          </TouchableOpacity>
        </View>

        {/* Camera Tethering Status Card */}
        <TouchableOpacity onPress={handleToggleTether} activeOpacity={0.8}>
          <CameraStatusCard 
            isConnected={tetherMode !== 'none'} 
            mode={tetherMode}
            manufacturer="Nikon" 
            model="Z8 Tactical" 
            batteryLevel={88} 
          />
        </TouchableOpacity>

        {/* Hero Active Session Command Box */}
        <View style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <View>
              <Text style={styles.sessionLabel}>ACTIVE GUEST SESSION</Text>
              <Text style={styles.sessionId}>{sessionId}</Text>
            </View>
            <View style={styles.counterBadge}>
              <Ionicons name="camera" size={16} color={theme.colors.textTelemetry} />
              <Text style={styles.counterText}>{sessionPhotoCount} SHOTS</Text>
            </View>
          </View>

          {/* Primary Action (Thumb Zone >= 48dp) */}
          <TouchableOpacity 
            style={styles.qrPrimaryBtn}
            onPress={() => setQrModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code" size={24} color="#ffffff" />
            <Text style={styles.qrPrimaryText}>GENERATE GUEST QR LINK</Text>
            <Ionicons name="chevron-forward" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* AI Location Scout Widget */}
        <LocationScoutWidget 
          currentZone="Resort Pool (Zone B)" 
          suggestedZone="Sunset Pier (Zone A)" 
          salesRate="+28%" 
        />

        {/* Ingested Photo Grid */}
        <View style={styles.gridSection}>
          <View style={styles.gridHeader}>
            <Text style={styles.gridTitle}>REAL-TIME INGESTION QUEUE</Text>
            <Text style={styles.gridSubtitle}>PTP RAW/JPEG auto-sync</Text>
          </View>
          <View style={styles.gridWrapper}>
            <IngestedPhotoGrid />
          </View>
        </View>
      </ScrollView>

      <ScannerFAB onPress={() => router.push('/scanner')} />

      <SessionQRModal 
        sessionId={sessionId}
        visible={qrModalVisible}
        onClose={() => setQrModalVisible(false)}
      />

      <CashConfirmationModal 
        sessionId={sessionId}
        amount={120.00}
        visible={cashModalVisible}
        onConfirm={async () => {
          setCashModalVisible(false);
          await UnifiedCameraService.approveCash(pendingOrderId);
          setAlertMessage('Cash payment confirmed ($120.00)! High-res digital album unlocked.');
          setAlertVisible(true);
        }}
        onCancel={() => setCashModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 100, // Cushion for FAB and navigation bar
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    color: theme.colors.textHeader,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginRight: 10,
  },
  pillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.elevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success,
    marginRight: 6,
  },
  pillText: {
    color: theme.colors.textTelemetry,
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '800',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    paddingHorizontal: 12,
    minHeight: theme.spacing.minTouch,
    borderRadius: theme.borderRadius.md,
  },
  scanBtnText: {
    color: theme.colors.primary,
    fontWeight: '800',
    fontSize: 12,
    marginLeft: 6,
  },
  sessionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  sessionLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sessionId: {
    color: theme.colors.textHeader,
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.elevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  counterText: {
    color: theme.colors.textTelemetry,
    fontFamily: 'monospace',
    fontWeight: '800',
    fontSize: 13,
    marginLeft: 6,
  },
  qrPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primary,
    minHeight: 56, // >= 48dp thumb requirement
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  qrPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  gridSection: {
    marginTop: theme.spacing.lg,
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: theme.spacing.sm,
  },
  gridTitle: {
    color: theme.colors.textHeader,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  gridSubtitle: {
    color: theme.colors.textTelemetry,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  gridWrapper: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    minHeight: 220,
  }
});
