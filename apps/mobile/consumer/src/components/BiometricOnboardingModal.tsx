import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { biometricSelfieService } from '../services/BiometricSelfieService';

interface BiometricOnboardingModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (userId: string) => void;
  userId: string;
}

export const BiometricOnboardingModal: React.FC<BiometricOnboardingModalProps> = ({
  visible,
  onClose,
  onSuccess,
  userId,
}) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'prompt' | 'scanning' | 'complete'>('prompt');

  const handleCaptureSelfie = async () => {
    try {
      setLoading(true);
      setStep('scanning');

      // Simulate capturing selfie and calculating 512-D ArcFace vector embedding
      await new Promise((r) => setTimeout(r, 1800));
      await biometricSelfieService.registerGuestSelfie(userId, 'mock-base64-selfie-data');

      setStep('complete');
      setTimeout(() => {
        setLoading(false);
        onSuccess(userId);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Selfie linking failed', err);
      setLoading(false);
      setStep('prompt');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Biometric Photo Pass</Text>
          <Text style={styles.subtitle}>
            Take a 1-second selfie to unlock automatic AI biometric face matching across the resort.
          </Text>

          <View style={styles.cameraBox}>
            {step === 'scanning' ? (
              <View style={styles.scanningContainer}>
                <ActivityIndicator size="large" color="#06b6d4" />
                <Text style={styles.scanningText}>Generating 512-D Face Vector...</Text>
              </View>
            ) : step === 'complete' ? (
              <View style={styles.scanningContainer}>
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.successText}>Selfie Linked Perfectly!</Text>
              </View>
            ) : (
              <View style={styles.faceSilhouette}>
                <Text style={styles.silhouetteText}>👤</Text>
                <Text style={styles.guideText}>Position face inside the circle</Text>
              </View>
            )}
          </View>

          {step === 'prompt' && (
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleCaptureSelfie}
                disabled={loading}
              >
                <Text style={styles.primaryText}>Capture Selfie</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  cameraBox: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: '#06b6d4',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    marginBottom: 24,
    overflow: 'hidden',
  },
  faceSilhouette: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  silhouetteText: {
    fontSize: 72,
    marginBottom: 8,
  },
  guideText: {
    fontSize: 11,
    color: '#64748b',
  },
  scanningContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningText: {
    marginTop: 12,
    fontSize: 12,
    color: '#06b6d4',
    fontWeight: '600',
  },
  successIcon: {
    fontSize: 48,
    color: '#10b981',
    fontWeight: 'bold',
  },
  successText: {
    marginTop: 8,
    fontSize: 14,
    color: '#10b981',
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  cancelText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 14,
  },
  primaryButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
