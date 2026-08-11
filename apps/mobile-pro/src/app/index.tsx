import {
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { appState } from '../store';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import MasterConnectionCard from '@/components/MasterConnectionCard';

import { logger } from '@/utils/logger';
import { ShiftService } from '../services/ShiftService';
import { useAutoEditor } from '../hooks/useAutoEditor';
import { useVoiceTagging } from '../hooks/useVoiceTagging';
import { meshSyncService } from '../services/MeshSyncService';
import { cameraTetherService } from '../services/CameraTetherService';
import {
  createCameraCapabilityRegistry,
  summarizeCameraCapabilities,
} from '../services/CameraCapabilityRegistry';

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
  const { network, tether, ledger, shift } = useSnapshot(appState);
  const isClockedIn = shift.isClockedIn;
  const photoCount = ledger.localVerified;
  const storageBlockedCount = ledger.storageBlocked;
  const pairedSetCount = ledger.pairedSets;
  const awaitingCompanionCount = ledger.awaitingCompanion;
  const standaloneCaptureCount = ledger.standaloneCaptures;
  const ambiguousPairCount = ledger.ambiguousPairs;
  const masterPendingCount = ledger.masterPending;
  const readyDeliveryCount = ledger.readyDeliveries;
  const deliveryAttentionCount = ledger.deliveryAttention;
  const lastVerifiedPreview = tether.lastVerifiedPreview;
  const meshStatus = network.relayQueueStatus;
  const tetherStatus = tether.status;
  const tetherError = tether.error;

  const { isEditing, processPhoto, lastEditedPhoto, lastPoseAnalysis } = useAutoEditor();
  const { isListening, lastTranscript, activeVoiceTags, stopVoiceRecordingAndTag } = useVoiceTagging();

  useEffect(() => {
    if (lastVerifiedPreview) {
      processPhoto(
        lastVerifiedPreview.localUri,
        lastVerifiedPreview.filename,
        lastVerifiedPreview.captureObjectId,
        lastVerifiedPreview.sha256,
        activeVoiceTags
      ).catch((error) => {
        appState.tether.error = `Imported ${lastVerifiedPreview.filename}, but automatic editing failed.`;
        logger.error('[StudioScreen] Automatic edit failed for imported camera capture.', error);
      });
    }
  }, [lastVerifiedPreview, activeVoiceTags, processPhoto]);

  useEffect(() => {
    cameraTetherService.start().catch((error) => {
      appState.tether.error = error instanceof Error ? error.message : String(error);
      logger.error('[StudioScreen] Camera tether startup failed.', error);
    });
  }, []);

  const handleClockInOut = async () => {
    const shiftService = ShiftService.getInstance();
    const type = isClockedIn ? 'CLOCK_OUT' : 'CLOCK_IN';
    
    // Hardcoded photographer ID for now
    const event = await shiftService.logShift('photo_123', type);
    
    if (event) {
      appState.shift.isClockedIn = !isClockedIn;
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
      appState.tether.error = message;
      logger.error('[StudioScreen] Camera tether retry failed.', error);
    }
  };

  const isTetherBusy =
    tetherStatus.phase === 'CONNECTING' || tetherStatus.phase === 'BASELINING';
  const isMonitoring = tetherStatus.phase === 'MONITORING';
  const isStorageBlocked = tetherStatus.phase === 'STORAGE_BLOCKED';
  const cameraCapabilities = summarizeCameraCapabilities(
    createCameraCapabilityRegistry(
      tetherStatus.connected
        ? {
            vendorId: tetherStatus.vendorId,
            productId: tetherStatus.productId,
            manufacturerName: tetherStatus.manufacturerName,
            productName: tetherStatus.productName,
          }
        : {}
    )
  );
  const isRecognizedD7000 =
    cameraCapabilities.identity.modelId === 'NIKON_D7000';
  const cameraProfileLabel = !tetherStatus.connected
    ? 'NOT CONNECTED'
    : cameraCapabilities.identity.recognition === 'RECOGNIZED'
      ? `${cameraCapabilities.identity.displayName.toUpperCase()} · UNVERIFIED`
      : 'UNKNOWN CAMERA · UNVERIFIED';
  const remoteControlLabel = cameraCapabilities.allowedRemoteCommands.length > 0
    ? `${cameraCapabilities.allowedRemoteCommands.length} CERTIFIED COMMANDS`
    : 'LOCKED · CERT REQUIRED';
  const tetherLabel = isEditing
    ? 'AI ENHANCING...'
    : tetherStatus.phase === 'MONITORING'
      ? isRecognizedD7000
        ? 'D7000 INGEST ACTIVE'
        : 'WIRED INGEST ACTIVE'
      : tetherStatus.phase === 'STORAGE_BLOCKED'
        ? 'FREE STORAGE + RETRY'
      : tetherStatus.phase === 'WAITING_FOR_CAMERA'
        ? 'CONNECT CAMERA + USB'
        : tetherStatus.phase === 'PERMISSION_REQUIRED'
          ? 'TAP TO GRANT USB'
          : tetherStatus.phase === 'CONNECTING'
            ? 'CAMERA CONNECTING...'
            : tetherStatus.phase === 'BASELINING'
              ? 'INDEXING CAMERA...'
              : tetherStatus.phase === 'UNAVAILABLE'
                ? 'ANDROID BUILD REQUIRED'
                : 'TAP TO RETRY CAMERA';
  const getTetherClasses = () => {
    if (tetherStatus.phase === 'ERROR' || isStorageBlocked) return 'border-danger text-danger shadow-danger';
    if (isEditing) return 'border-warning text-warning shadow-warning';
    if (tetherStatus.storage.level === 'WARNING') return 'border-warning text-warning shadow-warning';
    if (isMonitoring) return 'border-success text-success shadow-success';
    return 'border-tint text-tint shadow-tint';
  };
  const tetherClasses = getTetherClasses();
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
    <ThemedView className="flex-1 flex-row justify-center bg-background">
      <SafeAreaView className="flex-1 px-4 gap-3 pt-4 pb-24 w-full max-w-7xl">
        
        {/* Header / Top Glanceable Zone */}
        <View className="flex-row justify-between items-center py-2">
          <ThemedText className="font-mono text-sm font-bold tracking-widest text-[#94a3b8]">STUDIO COMMAND</ThemedText>
          <View className={`flex-row items-center bg-transparent px-3 py-1.5 rounded-2xl border gap-2 ${isClockedIn ? 'border-success' : 'border-elevated'}`}>
            <View className={`w-2 h-2 rounded-full ${isClockedIn ? 'bg-success' : 'bg-tint'}`} />
            <ThemedText className={`font-mono text-xs font-bold ${isClockedIn ? 'text-success' : 'text-tint'}`}>
              {isClockedIn ? 'ON SHIFT' : 'OFF SHIFT'}
            </ThemedText>
          </View>
        </View>

        {/* Real-time Pose & Blink Detection Alert Banner */}
        {lastPoseAnalysis?.summaryWarning && (
          <View className="p-3 rounded-[10px] border-[1.5px] items-center bg-danger/15 border-danger">
            <ThemedText className="text-[13px] font-bold text-center text-danger">
              {lastPoseAnalysis.summaryWarning}
            </ThemedText>
          </View>
        )}

        {tetherError && (
          <View className="p-3 rounded-[10px] border-[1.5px] items-center bg-danger/15 border-danger">
            <ThemedText className="text-[13px] font-bold text-center text-danger">
              {tetherError}
            </ThemedText>
          </View>
        )}

        <ScrollView contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
          <MasterConnectionCard />

          {/* Hero Section: Live Session Photos */}
          <ThemedView className="items-center justify-center bg-transparent my-2">
            <TouchableOpacity 
               className={`w-[260px] h-[260px] rounded-full border-4 items-center justify-center bg-[#070a12] shadow-2xl elevation-10 ${tetherClasses}`}
               onPress={handleTetherPress}
               disabled={isTetherBusy}
            >
              {isTetherBusy ? (
                <ActivityIndicator size="large" className={tetherClasses} />
              ) : (
                <ThemedText className={`text-[76px] font-black font-mono ${tetherClasses}`}>
                  {photoCount}
                </ThemedText>
              )}
              <ThemedText className="text-[13px] font-bold text-[#94a3b8] tracking-widest mt-2">
                {tetherLabel}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {lastVerifiedPreview && (
            <View className="p-3 rounded-xl border gap-3 bg-surface border-elevated">
              <View className="flex-row justify-between items-center gap-2">
                <View>
                  <ThemedText className="text-[#94a3b8] text-xs font-bold tracking-widest">LATEST VERIFIED SHOT</ThemedText>
                  <ThemedText className="text-[15px] font-bold mt-0.5">
                    {lastVerifiedPreview.filename}
                  </ThemedText>
                </View>
                <ThemedText className="font-mono text-[11px] font-bold text-success">
                  {lastVerifiedPreview.sha256.slice(0, 12)}
                </ThemedText>
              </View>
              <View className="gap-2">
                <View className="gap-1">
                  <Image
                    source={lastVerifiedPreview.localUri}
                    className="w-full aspect-[3/2] rounded-lg bg-[#070a12]"
                    contentFit="contain"
                    transition={100}
                  />
                  <ThemedText className="font-mono text-[11px] font-extrabold tracking-widest text-center text-success">
                    LOCAL VERIFIED ORIGINAL
                  </ThemedText>
                </View>
                {matchingQuickEdit ? (
                  <View className="gap-1">
                    <Image
                      source={matchingQuickEdit.uri}
                      className="w-full aspect-[3/2] rounded-lg bg-[#070a12]"
                      contentFit="contain"
                      transition={100}
                    />
                    <ThemedText className="font-mono text-[11px] font-extrabold tracking-widest text-center text-tint">
                      QUICK EDIT · OUTBOX SAFE
                    </ThemedText>
                  </View>
                ) : (
                  <View className="aspect-[3/2] border border-dashed rounded-lg items-center justify-center gap-2 border-elevated">
                    <ActivityIndicator className="text-warning" />
                    <ThemedText className="font-mono text-[11px] font-extrabold tracking-widest text-center text-warning">
                      QUICK EDIT PROCESSING
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Telemetry Panel / AI Coach & Pose Score */}
          <View className="p-4 rounded-xl border gap-2 bg-surface border-elevated">
              <View className="flex-row justify-between items-center">
                  <ThemedText className="text-[#94a3b8] text-xs font-bold tracking-widest">CAMERA TETHER</ThemedText>
                  <ThemedText className={`font-mono text-sm font-bold ${isMonitoring ? 'text-success' : tetherClasses}`}>
                    {tetherStatus.phase.replace(/_/g, ' ')}
                  </ThemedText>
              </View>
              <View className="flex-row justify-between items-center">
                  <ThemedText className="text-[#94a3b8] text-xs font-bold tracking-widest">CAMERA PROFILE</ThemedText>
                  <ThemedText className={`font-mono text-sm font-bold shrink ml-2 text-right text-[11px] ${tetherStatus.connected ? 'text-warning' : 'text-text'}`}>
                    {cameraProfileLabel}
                  </ThemedText>
              </View>
              <View className="flex-row justify-between items-center">
                  <ThemedText className="text-[#94a3b8] text-xs font-bold tracking-widest">REMOTE CONTROL</ThemedText>
                  <ThemedText className="font-mono text-sm font-bold shrink ml-2 text-right text-[11px] text-warning">
                    {remoteControlLabel}
                  </ThemedText>
              </View>
              <View className="flex-row justify-between items-center">
                  <ThemedText className="text-[#94a3b8] text-xs font-bold tracking-widest">LOCAL LEDGER</ThemedText>
                  <ThemedText className="font-mono text-sm font-bold text-text">
                    {photoCount} VERIFIED FILES
                  </ThemedText>
              </View>
              <View className="flex-row justify-between items-center">
                  <ThemedText className="text-[#94a3b8] text-xs font-bold tracking-widest">PHONE STORAGE</ThemedText>
                  <ThemedText className={`font-mono text-sm font-bold ${
                      tetherStatus.storage.level === 'BLOCKED'
                        ? 'text-danger'
                        : tetherStatus.storage.level === 'WARNING'
                          ? 'text-warning'
                          : 'text-success'
                    }`}>
                    {formatStorageBytes(tetherStatus.storage.availableBytes)} FREE
                  </ThemedText>
              </View>
              <View className="flex-row justify-between items-center">
                  <ThemedText className="text-[#94a3b8] text-xs font-bold tracking-widest">RAW + JPEG</ThemedText>
                  <ThemedText className={`font-mono text-sm font-bold ${
                      ambiguousPairCount > 0
                        ? 'text-danger'
                        : awaitingCompanionCount > 0
                          ? 'text-warning'
                          : 'text-success'
                    }`}>
                    {ambiguousPairCount > 0
                      ? `${ambiguousPairCount} AMBIGUOUS`
                      : `${pairedSetCount} PAIRED · ${awaitingCompanionCount} WAITING`}
                  </ThemedText>
              </View>
              {standaloneCaptureCount > 0 && (
                <View className="flex-row justify-between items-center">
                    <ThemedText className="text-[#94a3b8] text-xs font-bold tracking-widest">STANDALONE FILES</ThemedText>
                    <ThemedText className="font-mono text-sm font-bold text-text">
                      {standaloneCaptureCount}
                    </ThemedText>
                </View>
              )}
              {storageBlockedCount > 0 && (
                <View className="flex-row justify-between items-center">
                    <ThemedText className="text-[#94a3b8] text-xs font-bold tracking-widest">WAITING ON STORAGE</ThemedText>
                    <ThemedText className="font-mono text-sm font-bold text-danger">
                      {storageBlockedCount} CAMERA FILES
                    </ThemedText>
                </View>
              )}
              <View className="flex-row justify-between items-center">
                  <ThemedText className="text-[#94a3b8] text-xs font-bold tracking-widest">MASTER OUTBOX</ThemedText>
                  <ThemedText className={`font-mono text-sm font-bold ${
                      deliveryAttentionCount > 0
                        ? 'text-danger'
                        : masterPendingCount > 0
                          ? 'text-warning'
                          : 'text-success'
                    }`}>
                    {deliveryAttentionCount > 0
                      ? `${deliveryAttentionCount} NEED REVIEW`
                      : `${masterPendingCount} PENDING · ${readyDeliveryCount} READY`}
                  </ThemedText>
              </View>
              <View className="flex-row justify-between items-center">
                  <ThemedText className="text-[#94a3b8] text-xs font-bold tracking-widest">POSE SCORE</ThemedText>
                  <ThemedText className={`font-mono text-sm font-bold ${(lastPoseAnalysis?.poseQualityScore ?? 0.92) > 0.8 ? 'text-success' : 'text-warning'}`}>
                    {lastPoseAnalysis ? `${Math.round(lastPoseAnalysis.poseQualityScore * 100)}% (${lastPoseAnalysis.subjectCount} Subj)` : '92% (READY)'}
                  </ThemedText>
              </View>
              <View className="flex-row justify-between items-center">
                  <ThemedText className="text-[#94a3b8] text-xs font-bold tracking-widest">AUTO-EDIT</ThemedText>
                  <ThemedText className={`font-mono text-sm font-bold ${isEditing ? 'text-warning' : 'text-success'}`}>
                    {isEditing ? 'PROCESSING' : 'READY'}
                  </ThemedText>
              </View>
              <View className="flex-row justify-between items-center">
                  <ThemedText className="text-[#94a3b8] text-xs font-bold tracking-widest">MESH RELAY</ThemedText>
                  <ThemedText className={`font-mono text-sm font-bold ${meshStatus.connectedPeers > 0 ? 'text-tint' : 'text-text'}`}>
                    {meshStatus.discoveredPeers} Peers ({meshStatus.connectedPeers} connected to Master)
                  </ThemedText>
              </View>
              <View className="flex-row justify-between items-center">
                  <ThemedText className="text-[#94a3b8] text-xs font-bold tracking-widest">BATTERY</ThemedText>
                  <ThemedText className="font-mono text-sm font-bold text-text">88%</ThemedText>
              </View>
          </View>

          {/* Voice Tagging Panel */}
          <View className="p-4 rounded-xl border gap-2 bg-surface border-elevated">
              <View className="flex-row justify-between items-center">
                  <ThemedText className="text-[#94a3b8] text-xs font-bold tracking-widest">🎙️ ACTIVE VOICE TAGS</ThemedText>
                  <TouchableOpacity onPress={triggerVoiceTagInput} className="px-2.5 py-1 rounded-lg bg-sky-400/10">
                    <ThemedText className="text-xs font-bold font-mono text-tint">
                      {isListening ? 'LISTENING...' : '+ VOICE TAG'}
                    </ThemedText>
                  </TouchableOpacity>
              </View>
              {lastTranscript && (
                <ThemedText className="text-xs italic text-[#94a3b8]">&ldquo;{lastTranscript}&rdquo;</ThemedText>
              )}
              <View className="flex-row flex-wrap gap-2 mt-1">
                {activeVoiceTags.map((tag, idx) => (
                  <View key={idx} className="px-2.5 py-1 rounded-full border bg-tint/10 border-tint">
                    <ThemedText className="text-xs font-semibold text-tint">{tag}</ThemedText>
                  </View>
                ))}
              </View>
          </View>
        </ScrollView>

        {/* Thumb Reach Zone: Primary Action */}
        <View className="py-2">
          <TouchableOpacity 
            className={`h-[60px] rounded-2xl items-center justify-center elevation-5 ${isClockedIn ? 'bg-danger' : 'bg-success'}`}
            activeOpacity={0.8}
            onPress={handleClockInOut}
          >
            <ThemedText className="text-[#070a12] text-lg font-black tracking-widest">
              {isClockedIn ? 'FACE SCAN: CLOCK OUT' : 'FACE SCAN: CLOCK IN'}
            </ThemedText>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </ThemedView>
  );
}

