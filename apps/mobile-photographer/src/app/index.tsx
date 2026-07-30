import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import MasterConnectionCard from '@/components/MasterConnectionCard';
import { BottomTabInset, MaxContentWidth, Spacing, Colors, Typography } from '@/constants/theme';
import { ShiftService } from '../services/ShiftService';
import { useAutoEditor } from '../hooks/useAutoEditor';
import { useVoiceTagging } from '../hooks/useVoiceTagging';
import { meshSyncService } from '../services/MeshSyncService';
import { cameraTetherService } from '../services/CameraTetherService';
import { logger } from "@/utils/logger";

function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 GiB';
  return `${(bytes / (1024 ** 3)).toFixed(1)} GiB`;
}

interface VerifiedCapturePreview {
  captureObjectId: string;
  filename: string;
  localUri: string;
  sha256: string;
}

export default function StudioScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'light' ? 'light' : 'dark'];
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [storageBlockedCount, setStorageBlockedCount] = useState(0);
  const [pairedSetCount, setPairedSetCount] = useState(0);
  const [awaitingCompanionCount, setAwaitingCompanionCount] = useState(0);
  const [standaloneCaptureCount, setStandaloneCaptureCount] = useState(0);
  const [ambiguousPairCount, setAmbiguousPairCount] = useState(0);
  const [masterPendingCount, setMasterPendingCount] = useState(0);
  const [readyDeliveryCount, setReadyDeliveryCount] = useState(0);
  const [deliveryAttentionCount, setDeliveryAttentionCount] = useState(0);
  const [lastVerifiedPreview, setLastVerifiedPreview] =
    useState<VerifiedCapturePreview | null>(null);
  const { isEditing, lastEditedPhoto, lastPoseAnalysis, processPhoto } = useAutoEditor();
  const { isListening, activeVoiceTags, lastTranscript, stopVoiceRecordingAndTag } = useVoiceTagging();
  const [meshStatus, setMeshStatus] = useState(meshSyncService.getRelayQueueStatus());
  const [tetherStatus, setTetherStatus] = useState(cameraTetherService.getStatus());
  const [tetherError, setTetherError] = useState<string | null>(
    cameraTetherService.getStatus().lastErrorMessage
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setMeshStatus(meshSyncService.getRelayQueueStatus());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const importSubscription = cameraTetherService.addImportListener((
      capture,
      captureObjectId
    ) => {
      if (capture.mediaType !== 'jpeg') {
        logger.info('[StudioScreen] Nikon RAW capture retained for Master processing.', {
          filename: capture.filename,
          sha256: capture.sha256,
        });
        return;
      }

      setLastVerifiedPreview({
        captureObjectId,
        filename: capture.filename,
        localUri: capture.localUri,
        sha256: capture.sha256,
      });
      void processPhoto(
        capture.localUri,
        capture.filename,
        captureObjectId,
        capture.sha256,
        activeVoiceTags
      ).catch((error) => {
          setTetherError(`Imported ${capture.filename}, but automatic editing failed.`);
          logger.error('[StudioScreen] Automatic edit failed for imported camera capture.', error);
        });
    });

    return () => importSubscription.remove();
  }, [activeVoiceTags, processPhoto]);

  useEffect(() => {
    let active = true;
    const statusSubscription = cameraTetherService.addStatusListener((status) => {
      if (!active) return;
      setTetherStatus(status);
      if (
        status.phase !== 'ERROR' &&
        status.phase !== 'PERMISSION_REQUIRED' &&
        status.phase !== 'STORAGE_BLOCKED'
      ) {
        setTetherError(null);
      } else if (status.lastErrorMessage) {
        setTetherError(status.lastErrorMessage);
      }
    });
    const errorSubscription = cameraTetherService.addErrorListener((error) => {
      if (active) setTetherError(error.message);
    });
    const ledgerSubscription = cameraTetherService.addLedgerListener((counts) => {
      if (!active) return;
      setPhotoCount(counts.localVerified);
      setStorageBlockedCount(counts.storageBlocked);
      setPairedSetCount(counts.pairedSets);
      setAwaitingCompanionCount(counts.awaitingCompanion);
      setStandaloneCaptureCount(counts.standaloneCaptures);
      setAmbiguousPairCount(counts.ambiguousPairs);
      setMasterPendingCount(counts.masterPending);
      setReadyDeliveryCount(counts.readyDeliveries);
      setDeliveryAttentionCount(counts.deliveryAttention);
    });

    void cameraTetherService.start()
      .then(() => cameraTetherService.getLedgerCounts())
      .then((counts) => {
        if (active) {
          setPhotoCount(counts.localVerified);
          setStorageBlockedCount(counts.storageBlocked);
          setPairedSetCount(counts.pairedSets);
          setAwaitingCompanionCount(counts.awaitingCompanion);
          setStandaloneCaptureCount(counts.standaloneCaptures);
          setAmbiguousPairCount(counts.ambiguousPairs);
          setMasterPendingCount(counts.masterPending);
          setReadyDeliveryCount(counts.readyDeliveries);
          setDeliveryAttentionCount(counts.deliveryAttention);
        }
      })
      .catch((error) => {
        if (!active) return;
        setTetherError(error instanceof Error ? error.message : String(error));
        logger.error('[StudioScreen] Camera tether startup failed.', error);
      });

    return () => {
      active = false;
      statusSubscription.remove();
      errorSubscription.remove();
      ledgerSubscription.remove();
    };
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

  const handleTetherPress = async () => {
    try {
      await cameraTetherService.retryConnection();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Camera connection failed.';
      setTetherError(message);
      logger.error('[StudioScreen] Camera tether retry failed.', error);
    }
  };

  const isTetherBusy =
    tetherStatus.phase === 'CONNECTING' || tetherStatus.phase === 'BASELINING';
  const isMonitoring = tetherStatus.phase === 'MONITORING';
  const isStorageBlocked = tetherStatus.phase === 'STORAGE_BLOCKED';
  const tetherLabel = isEditing
    ? 'AI ENHANCING...'
    : tetherStatus.phase === 'MONITORING'
      ? 'D7000 AUTO CAPTURE'
      : tetherStatus.phase === 'STORAGE_BLOCKED'
        ? 'FREE STORAGE + RETRY'
      : tetherStatus.phase === 'WAITING_FOR_CAMERA'
        ? 'CONNECT D7000 + USB'
        : tetherStatus.phase === 'PERMISSION_REQUIRED'
          ? 'TAP TO GRANT USB'
          : tetherStatus.phase === 'CONNECTING'
            ? 'CAMERA CONNECTING...'
            : tetherStatus.phase === 'BASELINING'
              ? 'INDEXING CAMERA...'
              : tetherStatus.phase === 'UNAVAILABLE'
                ? 'ANDROID BUILD REQUIRED'
                : 'TAP TO RETRY CAMERA';
  const tetherColor = tetherStatus.phase === 'ERROR' || isStorageBlocked
    ? colors.danger
    : isEditing
      ? colors.warning
      : tetherStatus.storage.level === 'WARNING'
        ? colors.warning
      : isMonitoring
        ? colors.success
        : colors.tint;
  const matchingQuickEdit =
    lastVerifiedPreview &&
    lastEditedPhoto?.sourceCaptureId === lastVerifiedPreview.captureObjectId
      ? lastEditedPhoto
      : null;

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

        {tetherError && (
          <View style={[styles.warningBanner, { backgroundColor: colors.danger + '22', borderColor: colors.danger }]}>
            <ThemedText style={[styles.warningBannerText, { color: colors.danger }]}>
              {tetherError}
            </ThemedText>
          </View>
        )}

        <ScrollView contentContainerStyle={{ gap: Spacing.three }} showsVerticalScrollIndicator={false}>
          <MasterConnectionCard />

          {/* Hero Section: Live Session Photos */}
          <ThemedView style={[styles.heroSection, { backgroundColor: 'transparent', marginVertical: Spacing.two }]}>
            <TouchableOpacity 
               style={[styles.tetherRing, { borderColor: tetherColor, shadowColor: tetherColor }]}
               onPress={handleTetherPress}
               disabled={isTetherBusy}
            >
              {isTetherBusy ? (
                <ActivityIndicator size="large" color={tetherColor} />
              ) : (
                <ThemedText style={[styles.counterText, { color: tetherColor }]}>
                  {photoCount}
                </ThemedText>
              )}
              <ThemedText style={styles.counterLabel}>
                {tetherLabel}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {lastVerifiedPreview && (
            <View
              style={[
                styles.previewCard,
                { backgroundColor: colors.surface, borderColor: colors.elevated },
              ]}>
              <View style={styles.previewHeader}>
                <View>
                  <ThemedText style={styles.telemetryLabel}>LATEST VERIFIED SHOT</ThemedText>
                  <ThemedText style={styles.previewFilename}>
                    {lastVerifiedPreview.filename}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.previewHash, { color: colors.success }]}>
                  {lastVerifiedPreview.sha256.slice(0, 12)}
                </ThemedText>
              </View>
              <View style={styles.previewGrid}>
                <View style={styles.previewPane}>
                  <Image
                    source={lastVerifiedPreview.localUri}
                    style={styles.capturePreview}
                    contentFit="contain"
                    transition={100}
                  />
                  <ThemedText style={[styles.previewLabel, { color: colors.success }]}>
                    LOCAL VERIFIED ORIGINAL
                  </ThemedText>
                </View>
                {matchingQuickEdit ? (
                  <View style={styles.previewPane}>
                    <Image
                      source={matchingQuickEdit.uri}
                      style={styles.capturePreview}
                      contentFit="contain"
                      transition={100}
                    />
                    <ThemedText style={[styles.previewLabel, { color: colors.tint }]}>
                      QUICK EDIT · OUTBOX SAFE
                    </ThemedText>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.previewPending,
                      { borderColor: colors.elevated },
                    ]}>
                    <ActivityIndicator color={colors.warning} />
                    <ThemedText style={[styles.previewLabel, { color: colors.warning }]}>
                      QUICK EDIT PROCESSING
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Telemetry Panel / AI Coach & Pose Score */}
          <View style={[styles.telemetryCard, { backgroundColor: colors.surface, borderColor: colors.elevated }]}>
              <View style={styles.telemetryRow}>
                  <ThemedText style={styles.telemetryLabel}>CAMERA TETHER</ThemedText>
                  <ThemedText style={[styles.telemetryValue, { color: isMonitoring ? colors.success : tetherColor }]}>
                    {tetherStatus.phase.replace(/_/g, ' ')}
                  </ThemedText>
              </View>
              <View style={styles.telemetryRow}>
                  <ThemedText style={styles.telemetryLabel}>LOCAL LEDGER</ThemedText>
                  <ThemedText style={[styles.telemetryValue, { color: colors.text }]}>
                    {photoCount} VERIFIED FILES
                  </ThemedText>
              </View>
              <View style={styles.telemetryRow}>
                  <ThemedText style={styles.telemetryLabel}>PHONE STORAGE</ThemedText>
                  <ThemedText style={[
                    styles.telemetryValue,
                    {
                      color: tetherStatus.storage.level === 'BLOCKED'
                        ? colors.danger
                        : tetherStatus.storage.level === 'WARNING'
                          ? colors.warning
                          : colors.success,
                    },
                  ]}>
                    {formatStorageBytes(tetherStatus.storage.availableBytes)} FREE
                  </ThemedText>
              </View>
              <View style={styles.telemetryRow}>
                  <ThemedText style={styles.telemetryLabel}>RAW + JPEG</ThemedText>
                  <ThemedText style={[
                    styles.telemetryValue,
                    {
                      color: ambiguousPairCount > 0
                        ? colors.danger
                        : awaitingCompanionCount > 0
                          ? colors.warning
                          : colors.success,
                    },
                  ]}>
                    {ambiguousPairCount > 0
                      ? `${ambiguousPairCount} AMBIGUOUS`
                      : `${pairedSetCount} PAIRED · ${awaitingCompanionCount} WAITING`}
                  </ThemedText>
              </View>
              {standaloneCaptureCount > 0 && (
                <View style={styles.telemetryRow}>
                    <ThemedText style={styles.telemetryLabel}>STANDALONE FILES</ThemedText>
                    <ThemedText style={[styles.telemetryValue, { color: colors.text }]}>
                      {standaloneCaptureCount}
                    </ThemedText>
                </View>
              )}
              {storageBlockedCount > 0 && (
                <View style={styles.telemetryRow}>
                    <ThemedText style={styles.telemetryLabel}>WAITING ON STORAGE</ThemedText>
                    <ThemedText style={[styles.telemetryValue, { color: colors.danger }]}>
                      {storageBlockedCount} CAMERA FILES
                    </ThemedText>
                </View>
              )}
              <View style={styles.telemetryRow}>
                  <ThemedText style={styles.telemetryLabel}>MASTER OUTBOX</ThemedText>
                  <ThemedText style={[
                    styles.telemetryValue,
                    {
                      color: deliveryAttentionCount > 0
                        ? colors.danger
                        : masterPendingCount > 0
                          ? colors.warning
                          : colors.success,
                    },
                  ]}>
                    {deliveryAttentionCount > 0
                      ? `${deliveryAttentionCount} NEED REVIEW`
                      : `${masterPendingCount} PENDING · ${readyDeliveryCount} READY`}
                  </ThemedText>
              </View>
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
                <ThemedText style={styles.transcriptText}>&ldquo;{lastTranscript}&rdquo;</ThemedText>
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
  previewCard: {
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.three,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  previewFilename: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  previewHash: {
    fontFamily: Typography.fontMono,
    fontSize: 11,
    fontWeight: '700',
  },
  previewGrid: {
    gap: Spacing.two,
  },
  previewPane: {
    gap: Spacing.one,
  },
  capturePreview: {
    width: '100%',
    aspectRatio: 3 / 2,
    borderRadius: 8,
    backgroundColor: '#070a12',
  },
  previewPending: {
    aspectRatio: 3 / 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  previewLabel: {
    fontFamily: Typography.fontMono,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
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
