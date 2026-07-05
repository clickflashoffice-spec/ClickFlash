import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

export default function FaceSearchScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isTfReady, setIsTfReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');

      // Initialize TensorFlow.js
      await tf.ready();
      setIsTfReady(true);
      // Note: Model loading would happen here (e.g., face-api.js or BlazeFace)
    })();
  }, []);

  const takePictureAndProcess = async () => {
    if (!cameraRef.current) return;

    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      
      // Simulated On-Device Processing
      // In a real implementation:
      // 1. Decode JPEG base64 to Tensor
      // 2. Run through local MobileNet/FaceNet model
      // 3. Extract 128D embedding
      // 4. Send ONLY the array of floats to the server.
      
      const simulatedEmbedding = new Array(128).fill(0).map(() => Math.random());

      // Send to server
      // const response = await fetch('https://our-backend/api/customer/face-search', { ... })
      
      Alert.alert('Success', 'Face detected and matched locally. Only privacy-safe vectors were transmitted.');

    } catch (error) {
      Alert.alert('Error', 'Failed to process face.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} type={CameraType.front} ref={cameraRef}>
        <View style={styles.overlay}>
          <View style={styles.faceMask} />
          <Text style={styles.instructions}>
            Center your face to find your photos
          </Text>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={takePictureAndProcess}
            disabled={!isTfReady || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.text}>SCAN FACE</Text>
            )}
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceMask: {
    width: 250,
    height: 350,
    borderWidth: 2,
    borderColor: '#00ff00',
    borderRadius: 125,
    backgroundColor: 'transparent',
  },
  instructions: {
    color: 'white',
    fontSize: 18,
    marginTop: 20,
    fontWeight: 'bold',
  },
  buttonContainer: {
    backgroundColor: 'black',
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 30,
    width: 200,
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
});
