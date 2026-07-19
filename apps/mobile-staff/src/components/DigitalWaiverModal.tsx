import React, { useRef, memo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/tokens';
import { logger } from '../utils/logger';

interface Props {
  visible: boolean;
  clientName: string;
  onClose: () => void;
  onSignSuccess: (signatureBase64: string) => void;
}

export const DigitalWaiverModal: React.FC<Props> = memo(({
  visible,
  clientName,
  onClose,
  onSignSuccess,
}) => {
  const ref = useRef<SignatureViewRef>(null);

  const handleOK = (signature: string) => {
    logger.info('Digital Waiver Signed successfully', { args: [clientName] });
    onSignSuccess(signature);
    onClose();
  };

  const handleClear = () => {
    ref.current?.clearSignature();
  };

  const handleConfirm = () => {
    ref.current?.readSignature();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={theme.colors.textSubtle} />
          </TouchableOpacity>
          <Text style={styles.title}>LEGAL LIABILITY WAIVER & RELEASE</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>Client: {clientName || 'Valued Guest'}</Text>
          <Text style={styles.termsText}>
            I hereby grant ClickFlash and its affiliates the absolute right and permission to take, use, reuse, publish, and republish photographic portraits or pictures of me or in which I may be included, in whole or in part, in digital or print format, for commercial, marketing, and gallery purposes. I release ClickFlash from any claims and demands arising out of the use of these photographs.
          </Text>

          <Text style={styles.signatureLabel}>PLEASE SIGN INSIDE THE BOX BELOW:</Text>
          
          <View style={styles.signatureContainer}>
            <SignatureScreen
              ref={ref}
              onOK={handleOK}
              webStyle={`
                .m-signature-pad { box-shadow: none; border: none; }
                .m-signature-pad--body { border: 1px solid ${theme.colors.border}; background-color: #ffffff; }
                .m-signature-pad--footer { display: none; margin: 0px; }
              `}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Ionicons name="refresh" size={18} color={theme.colors.textHeader} />
              <Text style={styles.clearText}>CLEAR</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={styles.confirmText}>ACCEPT & SUBMIT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
});

DigitalWaiverModal.displayName = 'DigitalWaiverModal';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: '900', color: theme.colors.textHeader, letterSpacing: 1 },
  content: { flex: 1, padding: theme.spacing.lg },
  subtitle: { fontSize: 18, fontWeight: '800', color: theme.colors.primary, marginBottom: theme.spacing.md },
  termsText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  signatureLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textSubtle,
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.5,
  },
  signatureContainer: {
    flex: 1,
    minHeight: 250,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  clearBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clearText: {
    color: theme.colors.textHeader,
    fontSize: 14,
    fontWeight: '800',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.success,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  confirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
