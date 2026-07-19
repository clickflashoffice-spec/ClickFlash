import React, { useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, MaxContentWidth, Typography } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { faceBiometricService } from '@/services/FaceBiometricService';
import { syncService } from '@/services/SyncService';

export default function EnrollFaceScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'light' ? 'light' : 'dark'];
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [photographerId, setPhotographerId] = useState('PHOTO-101');
  const [name, setName] = useState('Alex Miller');
  const [stationId, setStationId] = useState('RESORT-WEST');

  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedVector, setExtractedVector] = useState<number[] | null>(null);
  const [statusText, setStatusText] = useState('READY TO SCAN');

  if (!permission) {
    return <ThemedView style={styles.container}><ActivityIndicator color={colors.tint} /></ThemedView>;
  }

  if (!permission.granted) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText style={styles.title}>CAMERA ACCESS REQUIRED</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            Biometric enrollment requires camera permissions to capture face vectors.
          </ThemedText>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.tint }]}
            onPress={requestPermission}
          >
            <ThemedText style={styles.actionButtonText}>GRANT PERMISSIONS</ThemedText>
          </TouchableOpacity>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const handleCaptureAndExtract = async () => {
    if (!cameraRef.current) return;
    try {
      setIsProcessing(true);
      setStatusText('CAPTURING PHOTO...');
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });

      if (!photo?.uri) {
        throw new Error('Failed to capture photo uri');
      }

      setStatusText('INITIALIZING TENSORFLOW...');
      setStatusText('EXTRACTING 128D FACE EMBEDDING...');
      
      const result = await faceBiometricService.extractFaceVector(photo.uri);
      if (!result) {
        Alert.alert('Extraction Failed', 'Could not detect a clear face. Please ensure good lighting and face the camera directly.');
        setStatusText('EXTRACTION FAILED');
        setIsProcessing(false);
        return;
      }

      setExtractedVector(result.vector);
      setStatusText(`VECTOR READY (${result.vector.length} DIMENSIONS) - CONFIDENCE: ${(result.confidence * 100).toFixed(1)}%`);
      setIsProcessing(false);
    } catch (e: any) {
      console.error('[EnrollFace] Error:', e);
      Alert.alert('Error', e.message || 'Face extraction error.');
      setStatusText('ERROR IN PROCESSING');
      setIsProcessing(false);
    }
  };

  const handleSaveEnrollment = async () => {
    if (!extractedVector || !photographerId.trim() || !name.trim()) {
      Alert.alert('Incomplete Data', 'Please fill Photographer ID and Name, and extract a face vector first.');
      return;
    }

    try {
      setIsProcessing(true);
      setStatusText('SYNCING WITH CLOUD / MASTER PC...');
      const success = await syncService.enrollPhotographerFace(
        photographerId.trim(),
        name.trim(),
        stationId.trim() || null,
        extractedVector
      );

      setIsProcessing(false);
      if (success) {
        Alert.alert('Success', `Enrolled biometric profile for ${name.trim()} successfully!`, [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Sync Warning', 'Enrolled locally but could not reach Cloud or Master PC. Will retry during background sync.');
        router.back();
      }
    } catch (e: any) {
      setIsProcessing(false);
      Alert.alert('Save Error', e.message || 'Could not save enrollment.');
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ThemedText style={[styles.backButtonText, { color: colors.tint }]}>← BACK</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.title}>BIOMETRIC ENROLLMENT</ThemedText>
          </View>

          {/* Form Fields */}
          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.elevated }]}>
            <ThemedText style={styles.label}>PHOTOGRAPHER ID</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.elevated, backgroundColor: colors.background }]}
              value={photographerId}
              onChangeText={setPhotographerId}
              placeholder="e.g. PHOTO-101"
              placeholderTextColor={colors.textSecondary}
            />

            <ThemedText style={styles.label}>FULL NAME</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.elevated, backgroundColor: colors.background }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Alex Miller"
              placeholderTextColor={colors.textSecondary}
            />

            <ThemedText style={styles.label}>STATION ID / RESORT</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.elevated, backgroundColor: colors.background }]}
              value={stationId}
              onChangeText={setStationId}
              placeholder="e.g. RESORT-WEST"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Camera View */}
          <View style={[styles.cameraContainer, { borderColor: extractedVector ? colors.success : colors.tint }]}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="front"
            />
            <View style={styles.overlay}>
              <View style={[styles.faceBox, { borderColor: extractedVector ? colors.success : colors.tint }]} />
            </View>
          </View>

          {/* Status Banner */}
          <View style={[styles.statusBox, { backgroundColor: colors.surface, borderColor: colors.elevated }]}>
            <ThemedText style={[styles.statusText, { color: extractedVector ? colors.success : colors.tint }]}>
              {statusText}
            </ThemedText>
            {isProcessing && <ActivityIndicator size="small" color={colors.tint} style={{ marginTop: 8 }} />}
          </View>

          {/* Actions */}
          {!extractedVector ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.tint, opacity: isProcessing ? 0.6 : 1 }]}
              onPress={handleCaptureAndExtract}
              disabled={isProcessing}
            >
              <ThemedText style={styles.actionButtonText}>CAPTURE & EXTRACT VECTOR</ThemedText>
            </TouchableOpacity>
          ) : (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.halfButton, { backgroundColor: colors.elevated }]}
                onPress={() => { setExtractedVector(null); setStatusText('READY TO SCAN'); }}
                disabled={isProcessing}
              >
                <ThemedText style={[styles.actionButtonText, { color: colors.text }]}>RETAKE</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.halfButton, { backgroundColor: colors.success }]}
                onPress={handleSaveEnrollment}
                disabled={isProcessing}
              >
                <ThemedText style={[styles.actionButtonText, { color: '#070a12' }]}>SAVE ENROLLMENT</ThemedText>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  scrollContent: {
    paddingBottom: Spacing.eight,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  backButton: {
    paddingVertical: Spacing.one,
  },
  backButtonText: {
    fontFamily: Typography.fontMono,
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    fontFamily: Typography.fontMono,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    marginVertical: Spacing.three,
  },
  formCard: {
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.two,
  },
  label: {
    fontFamily: Typography.fontMono,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    color: '#94a3b8',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    marginBottom: Spacing.two,
  },
  cameraContainer: {
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...(StyleSheet.absoluteFill as any),
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceBox: {
    width: 200,
    height: 240,
    borderWidth: 2,
    borderRadius: 120,
    borderStyle: 'dashed',
  },
  statusBox: {
    padding: Spacing.three,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusText: {
    fontFamily: Typography.fontMono,
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  actionButton: {
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontFamily: Typography.fontMono,
    fontSize: 15,
    fontWeight: '900',
    color: '#070a12',
    letterSpacing: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  halfButton: {
    flex: 1,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
