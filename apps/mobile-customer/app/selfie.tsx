import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { extractFaceVector, searchGalleryWithVector } from '../lib/faceExtraction';
import { logger } from "@clickflash/logger";

export default function SelfieScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePictureAndSearch = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      if (!photo) throw new Error('Failed to take picture');

      // 1. Extract vector on device
      const vector = await extractFaceVector(photo.uri);

      // 2. Search Cloudflare Vectorize (mocking desk_id for now)
      const deskId = 'test-desk-123';
      const results = await searchGalleryWithVector(vector, deskId);
      
      // In a real app we would pass these results to the gallery page via state/store
      // For now we just route back or to gallery
      logger.info('Found photos:', { args: [results.length] });
      router.replace('/(tabs)/gallery');
    } catch (error) {
      logger.error('Error during selfie search:', { args: [error] });
      alert('Failed to find photos. Try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="front" ref={cameraRef}>
        <View style={styles.overlay}>
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.processingText}>Finding your photos...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.instructions}>Align your face in the center</Text>
              <TouchableOpacity style={styles.captureButton} onPress={takePictureAndSearch}>
                <View style={styles.captureInner} />
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
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    fontSize: 16,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
  },
  instructions: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: '100%',
  },
  processingText: {
    color: 'white',
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
  }
});
