import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { insertScan } from '../db/database';
import { UnifiedSyncService } from '../src/services/UnifiedSyncService';
import { logger } from "../src/utils/logger";

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [scannedCount, setScannedCount] = useState(0);
  const [flashScreen, setFlashScreen] = useState(false);

  const isScanning = useRef(false);

  // Trigger immediate sync on mount
  useEffect(() => {
    UnifiedSyncService.syncNow();
  }, []);

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.textCenter}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startSession = () => {
    setSessionId(`sess_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
    setSessionActive(true);
    setScannedCount(0);
  };

  const endSession = () => {
    setSessionActive(false);
    setSessionId('');
  };

  const handleBarCodeScanned = useCallback(async ({ data }: { data: string }) => {
    if (!sessionActive || isScanning.current) return;
    
    // Prevent double scans within 1.5 seconds
    isScanning.current = true;
    
    try {
      // 1. Vibrate (Strong haptic for sunlight)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // 2. Flash Screen Green
      setFlashScreen(true);
      setTimeout(() => setFlashScreen(false), 200);

      // 3. Save to SQLite offline queue
      const scanId = `scan_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      insertScan(scanId, sessionId, data);

      // 4. Update UI Counter
      setScannedCount(prev => prev + 1);

    } catch (e) {
      logger.error("Scan error:", { args: [e] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setTimeout(() => {
        isScanning.current = false;
      }, 1500);
    }
  }, [sessionActive, sessionId]);

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "pdf417", "code39", "code128"],
        }}
        onBarcodeScanned={handleBarCodeScanned}
      >
        <View style={[styles.overlay, flashScreen && styles.flashOverlay]}>
          {!sessionActive ? (
            <View style={styles.centered}>
              <Text style={styles.overlayText}>Ready to Scan</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={startSession}>
                <Text style={styles.btnText}>New Family/Session</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.sessionContainer}>
              <View style={styles.header}>
                <Text style={styles.sessionText}>Active Session</Text>
                <Text style={styles.countText}>{scannedCount} Scanned</Text>
              </View>
              <View style={styles.footer}>
                <Text style={styles.hintText}>Point at wristband to scan...</Text>
                <TouchableOpacity style={styles.dangerBtn} onPress={endSession}>
                  <Text style={styles.btnText}>End Session</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flashOverlay: {
    backgroundColor: 'rgba(74, 222, 128, 0.4)', // Tailwind green-400
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sessionContainer: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 32,
  },
  header: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  footer: {
    alignItems: 'center',
  },
  textCenter: { textAlign: 'center', color: 'white', marginBottom: 16 },
  overlayText: { fontSize: 24, color: 'white', fontWeight: 'bold', marginBottom: 24 },
  sessionText: { fontSize: 18, color: '#9ca3af', fontWeight: '600' },
  countText: { fontSize: 48, color: '#4ade80', fontWeight: 'bold' },
  hintText: { color: 'white', fontSize: 16, marginBottom: 24, textShadowColor: 'black', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
  primaryBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
  },
  dangerBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
  },
  btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
