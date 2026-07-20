import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme/tokens';
import { logger } from '../../src/utils/logger';

// Mock DB call for face match
const MOCK_FACE_SEARCH = async (photoUri: string) => {
  return new Promise<any[]>((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 'SESS_4821', matchScore: 98.2, time: '14:22 PM', ride: 'Thunder Mountain', thumbnail: 'https://images.unsplash.com/photo-1542459039-768f764a7c06?auto=format&fit=crop&q=80&w=200' },
        { id: 'SESS_4821', matchScore: 91.5, time: '12:05 PM', ride: 'Space Drop', thumbnail: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?auto=format&fit=crop&q=80&w=200' },
        { id: 'SESS_4110', matchScore: 74.1, time: '09:15 AM', ride: 'Log Flume', thumbnail: 'https://images.unsplash.com/photo-1550504107-7bc9447ea8d9?auto=format&fit=crop&q=80&w=200' },
      ]);
    }, 1500);
  });
};

export default function SearchScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const cameraRef = useRef<any>(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need your permission to show the camera for Face Match search.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        setCapturedPhoto(photo.uri);
        setCameraActive(false);
        setIsSearching(true);

        const matches = await MOCK_FACE_SEARCH(photo.uri);
        setResults(matches);
      } catch (e) {
        logger.error('Face capture failed', { error: e as any });
        Alert.alert('Error', 'Failed to capture photo for face match.');
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setResults([]);
    setCameraActive(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="search" size={24} color={theme.colors.primary} />
        <Text style={styles.title}>"LOST & FOUND" FACE MATCH</Text>
        <Text style={styles.subtitle}>Snap a face to find unassigned group photos</Text>
      </View>

      <View style={styles.mainContent}>
        {!cameraActive && !capturedPhoto ? (
          <View style={styles.placeholderContainer}>
            <Ionicons name="camera-outline" size={64} color={theme.colors.border} />
            <Text style={styles.placeholderText}>Use AI Face Match to locate missing ride photos for guests who lost their RFID wristbands or didn't tap.</Text>
            <TouchableOpacity style={styles.startBtn} onPress={() => setCameraActive(true)}>
              <Ionicons name="scan" size={20} color="#fff" />
              <Text style={styles.startBtnText}>Start Face Scan</Text>
            </TouchableOpacity>
          </View>
        ) : cameraActive ? (
          <View style={styles.cameraContainer}>
            <CameraView style={styles.camera} ref={cameraRef} facing="back">
              <View style={styles.overlay}>
                <View style={styles.targetBox} />
                <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
                  <View style={styles.captureBtnInner} />
                </TouchableOpacity>
              </View>
            </CameraView>
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            <View style={styles.capturePreviewRow}>
              <Image source={{ uri: capturedPhoto! }} style={styles.previewImage} />
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle}>Reference Face Captured</Text>
                <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
                  <Text style={styles.retakeBtnText}>Retake Photo</Text>
                </TouchableOpacity>
              </View>
            </View>

            {isSearching ? (
              <View style={styles.searchingContainer}>
                <View style={styles.spinnerWrapper}>
                  {/* Fake radar sweep animation style */}
                  <View style={styles.radarCircle} />
                  <Ionicons name="scan" size={32} color={theme.colors.primary} />
                </View>
                <Text style={styles.searchingText}>Searching Vector DB for facial matches...</Text>
              </View>
            ) : (
              <View style={styles.matchesSection}>
                <Text style={styles.matchesHeader}>FOUND {results.length} POSSIBLE MATCHES</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {results.map((r, i) => (
                    <View key={i} style={styles.matchCard}>
                      <Image source={{ uri: r.thumbnail }} style={styles.matchThumb} />
                      <View style={styles.matchInfo}>
                        <Text style={styles.matchSession}>Session: {r.id}</Text>
                        <Text style={styles.matchDetails}>{r.ride} • {r.time}</Text>
                        <View style={styles.matchScoreBadge}>
                          <Ionicons name={r.matchScore > 90 ? "checkmark-circle" : "alert-circle"} size={14} color="#fff" />
                          <Text style={styles.matchScoreText}>{r.matchScore}% Match</Text>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.mergeBtn} onPress={() => Alert.alert('Session Merged', 'Added these photos to the guest\'s current folio.')}>
                        <Ionicons name="link" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View style={{ height: 40 }} />
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  header: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: { fontSize: 18, fontWeight: '900', color: theme.colors.textHeader, marginTop: 8 },
  subtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  permissionText: { textAlign: 'center', color: theme.colors.textMuted, marginBottom: 20 },
  permissionBtn: { backgroundColor: theme.colors.primary, padding: 12, borderRadius: 8 },
  permissionBtnText: { color: '#fff', fontWeight: 'bold' },

  mainContent: { flex: 1 },
  
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderText: {
    textAlign: 'center',
    color: theme.colors.textSubtle,
    marginTop: 20,
    marginBottom: 40,
    lineHeight: 22,
  },
  startBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.round,
    gap: 8,
  },
  startBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetBox: {
    width: 250,
    height: 350,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 20,
    marginBottom: 60,
  },
  captureBtn: {
    position: 'absolute',
    bottom: 40,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },

  resultsContainer: { flex: 1, padding: theme.spacing.lg },
  capturePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
  },
  previewInfo: { flex: 1, marginLeft: 16 },
  previewTitle: { color: theme.colors.textHeader, fontWeight: '800', fontSize: 14, marginBottom: 8 },
  retakeBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.canvas,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  retakeBtnText: { color: theme.colors.textHeader, fontSize: 12, fontWeight: '600' },

  searchingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  spinnerWrapper: {
    width: 100, height: 100,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  radarCircle: {
    position: 'absolute',
    width: '100%', height: '100%',
    borderRadius: 50,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    opacity: 0.3,
  },
  searchingText: { color: theme.colors.textSubtle, fontSize: 14, fontWeight: '600' },

  matchesSection: { flex: 1 },
  matchesHeader: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  matchCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  matchThumb: {
    width: 70, height: 70,
    borderRadius: theme.borderRadius.sm,
  },
  matchInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  matchSession: { color: theme.colors.textHeader, fontWeight: '800', fontSize: 15 },
  matchDetails: { color: theme.colors.textSubtle, fontSize: 12, marginTop: 4 },
  matchScoreBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.success,
    alignSelf: 'flex-start',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, gap: 4, marginTop: 8,
  },
  matchScoreText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  mergeBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
});
