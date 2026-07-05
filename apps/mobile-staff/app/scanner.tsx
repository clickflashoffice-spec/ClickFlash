import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { UploadQueueService } from '../src/services/UploadQueueService';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedId, setScannedId] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  const handleBarCodeScanned = ({ type, data }: { type: string, data: string }) => {
    if (!scannedId) {
      setScannedId(data);
      alert(`Guest Wristband Scanned: ${data}`);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current && scannedId) {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo) {
        UploadQueueService.enqueue({
          uri: photo.uri,
          guestId: scannedId,
          timestamp: new Date().toISOString()
        });
        alert('Photo added to upload queue!');
      }
    } else {
        alert('Please scan a guest wristband first!');
    }
  };

  return (
    <View style={styles.container}>
      {scannedId ? (
        <CameraView style={styles.camera} ref={cameraRef} facing="back">
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={takePicture}>
              <Text style={styles.text}> Snap Guest Photo </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetButton} onPress={() => setScannedId(null)}>
              <Text style={styles.text}> Scan Next Guest </Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      ) : (
         <CameraView 
            style={styles.camera} 
            facing="back"
            barcodeScannerSettings={{
                barcodeTypes: ["qr", "pdf417"],
            }}
            onBarcodeScanned={handleBarCodeScanned}
         >
           <View style={styles.overlay}>
              <Text style={styles.overlayText}>Scan Guest QR Wristband</Text>
           </View>
         </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
  },
  resetButton: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  }
});
