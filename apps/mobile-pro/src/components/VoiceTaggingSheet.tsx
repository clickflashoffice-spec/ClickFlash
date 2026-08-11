import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  Animated,
} from 'react-native';

interface VoiceTaggingSheetProps {
  visible: boolean;
  onClose: () => void;
  onTagApplied: (tagData: { roomNumber?: string; category: string; note?: string }) => void;
}

const QUICK_TAGS = ['Villa 104', 'Villa 202', 'Sunset Couple', 'Beach Family', 'VIP Wedding', 'Pier Jump'];

export function VoiceTaggingSheet({
  visible,
  onClose,
  onTagApplied,
}: VoiceTaggingSheetProps) {
  const [isListening, setIsListening] = useState(true);
  const [recognizedTranscript, setRecognizedTranscript] = useState('Listening... Speak room # or shoot type');
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const recognitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopVoiceSimulation = useCallback(() => {
    pulseLoop.current?.stop();
    pulseLoop.current = null;
    if (recognitionTimer.current) clearTimeout(recognitionTimer.current);
    recognitionTimer.current = null;
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const beginVoiceSimulation = useCallback(() => {
    stopVoiceSimulation();
    setIsListening(true);
    setRecognizedTranscript('Listening... Speak room # or shoot type');

    pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
    pulseLoop.current.start();

    recognitionTimer.current = setTimeout(() => {
      setIsListening(false);
      setRecognizedTranscript('Villa 104 — Sunset Couple Shoot');
      pulseLoop.current?.stop();
      pulseLoop.current = null;
    }, 1800);
  }, [pulseAnim, stopVoiceSimulation]);

  useEffect(() => {
    if (!visible) stopVoiceSimulation();
    return stopVoiceSimulation;
  }, [stopVoiceSimulation, visible]);

  const handleClose = () => {
    stopVoiceSimulation();
    onClose();
  };

  const handleApply = (tag: string) => {
    onTagApplied({
      roomNumber: tag.includes('Villa') ? tag.split(' ')[1] : undefined,
      category: tag,
    });
    handleClose();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleClose}
      onShow={beginVoiceSimulation}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheetContainer}>
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <Text style={styles.title}>🎙️ Voice Tagging</Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Voice Wave / Mic Area */}
          <View style={styles.micArea}>
            <Animated.View
              style={[
                styles.micPulseCircle,
                { transform: [{ scale: pulseAnim }] },
                !isListening && styles.micPulseCircleDone,
              ]}
            >
              <Text style={styles.micIcon}>🎤</Text>
            </Animated.View>
            <Text style={styles.statusText}>
              {isListening ? 'LISTENING (7 LANGUAGES AUTO-DETECT)...' : 'MATCH CONFIRMED'}
            </Text>
            <Text style={styles.transcriptText}>“{recognizedTranscript}”</Text>
          </View>

          {/* Confirm Tag Button */}
          {!isListening && (
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => handleApply(recognizedTranscript)}
            >
              <Text style={styles.confirmBtnText}>✓ Apply Tag to Current Session</Text>
            </TouchableOpacity>
          )}

          {/* Quick Preset Tag Chips */}
          <Text style={styles.chipsHeader}>OR TAP QUICK PRESET</Text>
          <View style={styles.chipsGrid}>
            {QUICK_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.chip}
                onPress={() => handleApply(tag)}
              >
                <Text style={styles.chipText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#52525b',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: '#a1a1aa',
    fontSize: 15,
    fontWeight: '600',
  },
  micArea: {
    alignItems: 'center',
    backgroundColor: '#09090b',
    borderRadius: 20,
    padding: 24,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  micPulseCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  micPulseCircleDone: {
    backgroundColor: '#059669',
  },
  micIcon: {
    fontSize: 32,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#06b6d4',
    letterSpacing: 1,
    marginBottom: 6,
  },
  transcriptText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  confirmBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  chipsHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717a',
    letterSpacing: 1,
    marginBottom: 10,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  chipText: {
    color: '#e4e4e7',
    fontSize: 13,
    fontWeight: '600',
  },
});
