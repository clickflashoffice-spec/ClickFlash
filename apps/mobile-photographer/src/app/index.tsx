import { StyleSheet, TouchableOpacity, View, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, Colors, Typography } from '@/constants/theme';
import { useColorScheme, ActivityIndicator } from 'react-native';
import { ShiftService } from '../services/ShiftService';
import { useAutoEditor } from '../hooks/useAutoEditor';
import { useVoiceTagging } from '../hooks/useVoiceTagging';
import { meshSyncService } from '../services/MeshSyncService';
import * as FileSystem from 'expo-file-system/legacy';

export default function StudioScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'light' ? 'light' : 'dark'];
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [photoCount, setPhotoCount] = useState(142);
  const { isEditing, lastEditedPhoto, lastPoseAnalysis, processPhoto } = useAutoEditor();
  const { isListening, activeVoiceTags, lastTranscript, stopVoiceRecordingAndTag, addTagManually } = useVoiceTagging();
  const [meshStatus, setMeshStatus] = useState(meshSyncService.getRelayQueueStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setMeshStatus(meshSyncService.getRelayQueueStatus());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleClockInOut = async () => {
    const shiftService = ShiftService.getInstance();
    const type = isClockedIn ? 'CLOCK_OUT' : 'CLOCK_IN';
    
    // Hardcoded photographer ID for now
    const event = await shiftService.logShift('photo_123', type);
    
    if (event) {
      setIsClockedIn(!isClockedIn);
      Alert.alert('Success', `Successfully clocked ${isClockedIn ? 'out' : 'in'}.`);
    } else {
      Alert.alert('Verification Failed', 'Biometric verification failed or was cancelled.');
    }
  };

  const simulateDslrCapture = async () => {
    try {
      // 1. Simulate pulling a 12MP raw photo from DSLR over FTP
      const dummyUri = 'https://picsum.photos/4000/3000';
      const localUri = FileSystem.cacheDirectory + `dslr_${Date.now()}.jpg`;
      
      await FileSystem.downloadAsync(dummyUri, localUri);
      
      // 2. Trigger Auto Editor with real-time pose/blink checks + active voice tags
      await processPhoto(localUri, `DSC_${photoCount + 1}.JPG`, activeVoiceTags);
      setPhotoCount(prev => prev + 1);
    } catch (err) {
      Alert.alert('Error', 'Failed to simulate DSLR capture');
      console.error(err);
    }
  };

  const triggerVoiceTagInput = async () => {
    const extracted = await stopVoiceRecordingAndTag();
    Alert.alert('🎙️ Voice Tag Updated', `Extracted Tags: ${extracted.join(', ')}`);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header / Top Glanceable Zone */}
        <View style={styles.header}>
          <ThemedText style={styles.headerText}>STUDIO COMMAND</ThemedText>
          <View style={[styles.statusBadge, { borderColor: isClockedIn ? colors.success : colors.elevated }]}>
            <View style={[styles.dot, { backgroundColor: isClockedIn ? colors.success : colors.tint }]} />
            <ThemedText style={[styles.statusText, { color: isClockedIn ? colors.success : colors.tint }]}>
              {isClockedIn ? 'ON SHIFT' : 'OFF SHIFT'}
            </ThemedText>
          </View>
        </View>

        {/* Real-time Pose & Blink Detection Alert Banner */}
        {lastPoseAnalysis?.summaryWarning && (
          <View style={[styles.warningBanner, { backgroundColor: colors.danger + '22', borderColor: colors.danger }]}>
            <ThemedText style={[styles.warningBannerText, { color: colors.danger }]}>
              {lastPoseAnalysis.summaryWarning}
            </ThemedText>
          </View>
        )}

        <ScrollView contentContainerStyle={{ gap: Spacing.three }} showsVerticalScrollIndicator={false}>
          {/* Hero Section: Live Session Photos */}
          <ThemedView style={[styles.heroSection, { backgroundColor: 'transparent', marginVertical: Spacing.two }]}>
            <TouchableOpacity 
               style={[styles.tetherRing, { borderColor: isEditing ? colors.warning : colors.tint, shadowColor: colors.tint }]}
               onPress={simulateDslrCapture}
               disabled={isEditing}
            >
              {isEditing ? (
                <ActivityIndicator size="large" color={colors.warning} />
              ) : (
                <ThemedText style={[styles.counterText, { color: colors.tint }]}>
                  {photoCount}
                </ThemedText>
              )}
              <ThemedText style={styles.counterLabel}>
                {isEditing ? 'AI ENHANCING...' : 'TAP FOR DSLR SHOT'}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {/* Telemetry Panel / AI Coach & Pose Score */}
          <View style={[styles.telemetryCard, { backgroundColor: colors.surface, borderColor: colors.elevated }]}>
              <View style={styles.telemetryRow}>
                  <ThemedText style={styles.telemetryLabel}>POSE SCORE</ThemedText>
                  <ThemedText style={[styles.telemetryValue, { color: (lastPoseAnalysis?.poseQualityScore ?? 0.92) > 0.8 ? colors.success : colors.warning }]}>
                    {lastPoseAnalysis ? `${Math.round(lastPoseAnalysis.poseQualityScore * 100)}% (${lastPoseAnalysis.subjectCount} Subj)` : '92% (READY)'}
                  </ThemedText>
              </View>
              <View style={styles.telemetryRow}>
                  <ThemedText style={styles.telemetryLabel}>AUTO-EDIT</ThemedText>
                  <ThemedText style={[styles.telemetryValue, { color: isEditing ? colors.warning : colors.success }]}>
                    {isEditing ? 'PROCESSING' : 'READY'}
                  </ThemedText>
              </View>
              <View style={styles.telemetryRow}>
                  <ThemedText style={styles.telemetryLabel}>MESH RELAY</ThemedText>
                  <ThemedText style={[styles.telemetryValue, { color: meshStatus.connectedPeers > 0 ? colors.tint : colors.text }]}>
                    {meshStatus.discoveredPeers} Peers ({meshStatus.connectedPeers} connected to Master)
                  </ThemedText>
              </View>
              <View style={styles.telemetryRow}>
                  <ThemedText style={styles.telemetryLabel}>BATTERY</ThemedText>
                  <ThemedText style={[styles.telemetryValue, { color: colors.text }]}>88%</ThemedText>
              </View>
          </View>

          {/* Voice Tagging Panel */}
          <View style={[styles.telemetryCard, { backgroundColor: colors.surface, borderColor: colors.elevated }]}>
              <View style={styles.telemetryRow}>
                  <ThemedText style={styles.telemetryLabel}>🎙️ ACTIVE VOICE TAGS</ThemedText>
                  <TouchableOpacity onPress={triggerVoiceTagInput} style={styles.voiceBtn}>
                    <ThemedText style={[styles.voiceBtnText, { color: colors.tint }]}>
                      {isListening ? 'LISTENING...' : '+ VOICE TAG'}
                    </ThemedText>
                  </TouchableOpacity>
              </View>
              {lastTranscript && (
                <ThemedText style={styles.transcriptText}>"{lastTranscript}"</ThemedText>
              )}
              <View style={styles.tagContainer}>
                {activeVoiceTags.map((tag, idx) => (
                  <View key={idx} style={[styles.tagPill, { backgroundColor: colors.tint + '22', borderColor: colors.tint }]}>
                    <ThemedText style={[styles.tagText, { color: colors.tint }]}>{tag}</ThemedText>
                  </View>
                ))}
              </View>
          </View>
        </ScrollView>

        {/* Thumb Reach Zone: Primary Action */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: isClockedIn ? colors.danger : colors.success }]}
            activeOpacity={0.8}
            onPress={handleClockInOut}
          >
            <ThemedText style={styles.primaryButtonText}>
              {isClockedIn ? 'FACE SCAN: CLOCK OUT' : 'FACE SCAN: CLOCK IN'}
            </ThemedText>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    paddingTop: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  headerText: {
    fontFamily: Typography.fontMono,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#94a3b8',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: Typography.fontMono,
    fontSize: 12,
    fontWeight: 'bold',
  },
  warningBanner: {
    padding: Spacing.three,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  warningBannerText: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tetherRing: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#070a12',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  counterText: {
    fontSize: 76,
    fontWeight: '900',
    fontFamily: Typography.fontMono,
    includeFontPadding: false,
  },
  counterLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 2,
    marginTop: 8,
  },
  telemetryCard: {
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.two,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  telemetryLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  telemetryValue: {
    fontFamily: Typography.fontMono,
    fontSize: 14,
    fontWeight: 'bold',
  },
  voiceBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  voiceBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Typography.fontMono,
  },
  transcriptText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#94a3b8',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionContainer: {
    paddingVertical: Spacing.two,
  },
  primaryButton: {
    height: 60, // >= 48dp Fitts' Law
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  primaryButtonText: {
    color: '#070a12',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

