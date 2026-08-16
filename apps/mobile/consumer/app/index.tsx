import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { BleProximityService } from '../src/services/BleProximityService';

export default function LoginScreen() {
  const [isScanning, setIsScanning] = useState(true);
  const bleService = useMemo(() => new BleProximityService('guest-temp-id'), []);

  useEffect(() => {
    let mounted = true;
    
    const startScan = async () => {
      await bleService.startScanning((photographerId, sessionId) => {
        if (mounted) {
          setIsScanning(false);
          // Auto-link successful, route to gallery
          router.replace('/(tabs)/gallery');
        }
      });
    };
    
    startScan();

    return () => {
      mounted = false;
      bleService.stopScanning();
    };
  }, [bleService]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to ClickFlash</Text>
      <Text style={styles.subtitle}>Find your resort memories instantly.</Text>
      
      {isScanning && (
        <View style={styles.scanningContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.scanningText}>Auto-detecting nearby photographers...</Text>
        </View>
      )}

      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.replace('/selfie')}
      >
        <Text style={styles.buttonText}>Find My Photos (Selfie)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827', // Tailwind gray-900
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af', // Tailwind gray-400
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3b82f6', // Tailwind blue-500
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 999,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  scanningContainer: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 16,
    width: '100%',
  },
  scanningText: {
    color: '#60a5fa',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
