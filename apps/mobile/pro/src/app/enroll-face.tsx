import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { faceBiometricService } from '@/services/FaceBiometricService';
import { syncService } from '@/services/SyncService';
import { logger } from "@/utils/logger";

export default function EnrollFaceScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [photographerId, setPhotographerId] = useState('PHOTO-101');
  const [name, setName] = useState('Alex Miller');
  const [stationId, setStationId] = useState('RESORT-WEST');

  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedVector, setExtractedVector] = useState<number[] | null>(null);
  const [statusText, setStatusText] = useState('READY TO SCAN');

  if (!permission) {
    return <ThemedView className="flex-1 justify-center items-center"><ActivityIndicator className="text-tint" /></ThemedView>;
  }

  if (!permission.granted) {
    return (
      <ThemedView className="flex-1 bg-background">
        <SafeAreaView className="flex-1 px-4 pt-4 w-full max-w-3xl self-center">
          <ThemedText className="font-mono text-base font-black tracking-widest">CAMERA ACCESS REQUIRED</ThemedText>
          <ThemedText className="text-sm my-3 text-secondary">
            Biometric enrollment requires camera permissions to capture face vectors.
          </ThemedText>
          <TouchableOpacity
            className="h-14 rounded-lg items-center justify-center bg-tint"
            onPress={requestPermission}
          >
            <ThemedText className="font-mono text-[15px] font-black text-[#070a12] tracking-wider">GRANT PERMISSIONS</ThemedText>
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
      logger.error('[EnrollFace] Error:', e);
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
    <ThemedView className="flex-1 bg-background">
      <SafeAreaView className="flex-1 px-4 pt-4 w-full max-w-3xl self-center">
        <ScrollView contentContainerClassName="pb-8 gap-4" showsVerticalScrollIndicator={false}>
          
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity onPress={() => router.back()} className="py-1">
              <ThemedText className="font-mono text-sm font-bold text-tint">← BACK</ThemedText>
            </TouchableOpacity>
            <ThemedText className="font-mono text-base font-black tracking-widest">BIOMETRIC ENROLLMENT</ThemedText>
          </View>

          {/* Form Fields */}
          <View className="p-4 rounded-xl border gap-2 bg-surface border-elevated">
            <ThemedText className="font-mono text-xs font-bold tracking-widest text-slate-400">PHOTOGRAPHER ID</ThemedText>
            <TextInput
              className="h-12 border rounded-lg px-3 text-base mb-2 text-text border-elevated bg-background"
              value={photographerId}
              onChangeText={setPhotographerId}
              placeholder="e.g. PHOTO-101"
              placeholderTextColor="#94a3b8"
            />

            <ThemedText className="font-mono text-xs font-bold tracking-widest text-slate-400">FULL NAME</ThemedText>
            <TextInput
              className="h-12 border rounded-lg px-3 text-base mb-2 text-text border-elevated bg-background"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Alex Miller"
              placeholderTextColor="#94a3b8"
            />

            <ThemedText className="font-mono text-xs font-bold tracking-widest text-slate-400">STATION ID / RESORT</ThemedText>
            <TextInput
              className="h-12 border rounded-lg px-3 text-base mb-2 text-text border-elevated bg-background"
              value={stationId}
              onChangeText={setStationId}
              placeholder="e.g. RESORT-WEST"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Camera View */}
          <View className={`h-80 rounded-2xl overflow-hidden border-2 relative ${extractedVector ? 'border-success' : 'border-tint'}`}>
            <CameraView
              ref={cameraRef}
              className="flex-1"
              facing="front"
            />
            <View className="absolute inset-0 items-center justify-center">
              <View className={`w-[200px] h-[240px] border-2 rounded-[120px] border-dashed ${extractedVector ? 'border-success' : 'border-tint'}`} />
            </View>
          </View>

          {/* Status Banner */}
          <View className="p-3 rounded-lg border items-center bg-surface border-elevated">
            <ThemedText className={`font-mono text-[13px] font-bold tracking-wider text-center ${extractedVector ? 'text-success' : 'text-tint'}`}>
              {statusText}
            </ThemedText>
            {isProcessing && <ActivityIndicator size="small" className="mt-2 text-tint" />}
          </View>

          {/* Actions */}
          {!extractedVector ? (
            <TouchableOpacity
              className={`h-14 rounded-lg items-center justify-center bg-tint ${isProcessing ? 'opacity-60' : 'opacity-100'}`}
              onPress={handleCaptureAndExtract}
              disabled={isProcessing}
            >
              <ThemedText className="font-mono text-[15px] font-black text-[#070a12] tracking-wider">CAPTURE & EXTRACT VECTOR</ThemedText>
            </TouchableOpacity>
          ) : (
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 h-14 rounded-lg items-center justify-center bg-elevated"
                onPress={() => { setExtractedVector(null); setStatusText('READY TO SCAN'); }}
                disabled={isProcessing}
              >
                <ThemedText className="font-mono text-[15px] font-black tracking-wider text-text">RETAKE</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 h-14 rounded-lg items-center justify-center bg-success"
                onPress={handleSaveEnrollment}
                disabled={isProcessing}
              >
                <ThemedText className="font-mono text-[15px] font-black text-[#070a12] tracking-wider">SAVE ENROLLMENT</ThemedText>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
