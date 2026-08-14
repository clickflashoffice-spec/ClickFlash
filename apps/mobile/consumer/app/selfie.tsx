import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import { logger } from '@clickflash/logger';
import { extractActiveFaceDescriptor } from '../lib/faceExtraction';
import {
  FaceSearchClientError,
  searchGalleryWithDescriptor,
} from '../lib/faceSearchClient';
import {
  clearGalleryToken,
  getGalleryToken,
  setFaceSearchMatches,
} from '../lib/gallerySession';

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

    const galleryToken = getGalleryToken();
    if (!galleryToken) {
      Alert.alert(
        'Connect to an event first',
        'Scan the event QR code before searching for your photos.',
        [
          {
            text: 'Scan QR code',
            onPress: () => router.push('/qr-scan'),
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    let capturedPhotoUri: string | null = null;
    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync();
      if (!photo) throw new Error('Failed to take picture');
      capturedPhotoUri = photo.uri;

      const descriptor = await extractActiveFaceDescriptor(photo.uri);
      const result = await searchGalleryWithDescriptor(
        descriptor,
        galleryToken,
      );

      if (result.status === 'unavailable') {
        Alert.alert(
          'Face search unavailable',
          'Face search is temporarily unavailable for this event. No photos were returned.',
        );
        return;
      }

      logger.info('Face search completed', {
        args: [{ matchCount: result.matches.length }],
      });
      setFaceSearchMatches(result.matches);
      router.replace('/(tabs)/gallery');
    } catch (error: unknown) {
      logger.error('Error during selfie search:', { args: [error] });
      if (
        error instanceof FaceSearchClientError &&
        error.code === 'UNAUTHORIZED'
      ) {
        clearGalleryToken();
        Alert.alert(
          'Event session expired',
          'Scan the event QR code again before searching.',
          [
            {
              text: 'Scan QR code',
              onPress: () => router.push('/qr-scan'),
            },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
      } else {
        Alert.alert(
          'Unable to search',
          'No photos were returned. Check the selfie and try again.',
        );
      }
    } finally {
      if (capturedPhotoUri) {
        try {
          await FileSystem.deleteAsync(capturedPhotoUri, { idempotent: true });
        } catch (cleanupError: unknown) {
          logger.warn('Unable to delete the temporary selfie capture.', {
            args: [cleanupError],
          });
        }
      }
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
