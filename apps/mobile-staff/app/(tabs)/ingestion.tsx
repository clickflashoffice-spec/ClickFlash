import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { CameraIngestionService } from '../../src/services/CameraIngestionService';
import { CameraStatusCard } from '../../src/components/CameraStatusCard';
import { IngestedPhotoGrid } from '../../src/components/IngestedPhotoGrid';
import { Ionicons } from '@expo/vector-icons';

export default function IngestionScreen() {
  const [eventName, setEventName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [status, setStatus] = useState(CameraIngestionService.getStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(CameraIngestionService.getStatus());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStartIngestion = async () => {
    if (!eventName.trim() || !accessCode.trim()) {
      Alert.alert("Missing Info", "Please tag the Room Number / Event Name and Access Code before starting the shoot.");
      return;
    }

    const result = await CameraIngestionService.startIngestion(eventName, accessCode);
    if (!result.success) {
      Alert.alert("Connection Failed", result.error);
    } else if (result.warning) {
      Alert.alert("Notice", result.warning);
    }
  };

  const handleStopIngestion = async () => {
    await CameraIngestionService.stopIngestion();
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Nikon DSLR Tethering</Text>
          <Text style={styles.subtitle}>USB OTG Connection Manager</Text>
        </View>

        <CameraStatusCard 
          isConnected={status.isConnected}
          manufacturer={status.camera.manufacturer}
          model={status.camera.model}
          batteryLevel={status.camera.batteryLevel}
        />

        {!status.isConnected ? (
          <View style={styles.formCard}>
            <Text style={styles.label}>Room Number / Tag</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Room 402 or Main Pool"
              placeholderTextColor="#6b7280"
              value={eventName}
              onChangeText={setEventName}
            />

            <Text style={styles.label}>Access Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Guest Access Code"
              placeholderTextColor="#6b7280"
              value={accessCode}
              onChangeText={setAccessCode}
            />

            <TouchableOpacity style={styles.connectBtn} onPress={handleStartIngestion}>
              <Ionicons name="hardware-chip" size={20} color="#fff" />
              <Text style={styles.btnText}>Start USB Tethering</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.activeCard}>
            <View style={styles.activeHeader}>
              <Text style={styles.activeLabel}>Current Tag: <Text style={styles.activeTag}>{eventName}</Text></Text>
              <TouchableOpacity style={styles.disconnectBtn} onPress={handleStopIngestion}>
                <Text style={styles.disconnectText}>Stop</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>Photos taken on the camera will instantly appear here.</Text>
          </View>
        )}

        <View style={styles.gridSection}>
          <Text style={styles.sectionTitle}>Ingestion Queue</Text>
          <IngestedPhotoGrid />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 48,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f9fafb',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
  },
  formCard: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  label: {
    color: '#d1d5db',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#374151',
    color: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  connectBtn: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  activeCard: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeLabel: {
    color: '#d1d5db',
    fontSize: 16,
  },
  activeTag: {
    color: '#60a5fa',
    fontWeight: 'bold',
  },
  disconnectBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  disconnectText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  helperText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
  },
  gridSection: {
    marginTop: 8,
    flex: 1,
  },
  sectionTitle: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  }
});
