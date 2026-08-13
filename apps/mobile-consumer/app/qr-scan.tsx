import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { logger } from '@clickflash/logger';
import { setGalleryToken } from '../lib/gallerySession';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export default function QRScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const scannedRef = useRef(false);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to use the camera to scan the kiosk QR code</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scannedRef.current || isProcessing) return;
    scannedRef.current = true;
    setIsProcessing(true);

    try {
      logger.info('Kiosk QR code scanned; validating token.');
      // Extract token from URL or raw string
      let token = data;
      if (data.includes('token=')) {
        const match = data.match(/token=([^&]+)/);
        if (match && match[1]) token = match[1];
      }

      // Validate token with cloud backend
      const response = await fetch(`https://hub.clickflash.app/api/qr/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        throw new Error(`Validation failed with status ${response.status}`);
      }

      const result: unknown = await response.json();
      if (
        isRecord(result) &&
        result.success === true &&
        typeof result.token === 'string'
      ) {
        setGalleryToken(result.token);
        const eventName =
          isRecord(result.event) && typeof result.event.name === 'string'
            ? result.event.name
            : 'Event';
        logger.info('QR Code validated successfully for event:', {
          args: [eventName],
        });
        router.replace('/(tabs)/gallery');
      } else {
        const message =
          isRecord(result) && typeof result.error === 'string'
            ? result.error
            : 'Invalid QR code';
        throw new Error(message);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('QR Validation Error:', { args: [message] });
      Alert.alert('Invalid or Expired QR Code', 'Could not connect to the kiosk session. Please try scanning again.', [
        { text: 'Try Again', onPress: () => { scannedRef.current = false; setIsProcessing(false); } },
        { text: 'Cancel', onPress: () => router.replace('/') }
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      >
        <View style={styles.overlay}>
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.processingText}>Connecting to Kiosk Session...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.instructions}>Point camera at the Kiosk QR Code</Text>
              <View style={styles.scannerFrame} />
              <TouchableOpacity style={styles.cancelButton} onPress={() => router.replace('/')}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    fontSize: 16,
    color: '#fff',
    paddingHorizontal: 20,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  instructions: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    overflow: 'hidden',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#f59e0b',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 999,
  },
  cancelText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 15,
    borderRadius: 8,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    width: '100%',
  },
  processingText: {
    color: 'white',
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
  }
});
