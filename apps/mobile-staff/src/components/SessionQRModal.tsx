import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, SafeAreaView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/tokens';

interface Props {
  sessionId: string;
  visible: boolean;
  onClose: () => void;
}

export const SessionQRModal: React.FC<Props> = ({ sessionId, visible, onClose }) => {
  const url = `https://gallery.clickflash.app/?token=${sessionId}`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={26} color={theme.colors.textHeader} />
          </TouchableOpacity>
          <Text style={styles.title}>Customer Session QR</Text>
          <View style={{ width: 48 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.instructions}>
            Instruct the guest to scan this high-contrast QR with their smartphone camera.
          </Text>

          <View style={styles.qrContainer}>
            <QRCode
              value={url}
              size={240}
              color="#000000"
              backgroundColor="#ffffff"
            />
          </View>

          <Text style={styles.urlText}>{url}</Text>

          <View style={styles.infoBox}>
            <Ionicons name="flash" size={24} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              Zero-latency sync: DSLR shots flow directly into their browser in real time.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    color: theme.colors.textHeader,
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    minWidth: theme.spacing.minTouch,
    minHeight: theme.spacing.minTouch,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.round,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing.xxl,
    paddingTop: theme.spacing.xl,
  },
  instructions: {
    color: theme.colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
    lineHeight: 22,
  },
  qrContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: theme.borderRadius.xl,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: theme.spacing.xl,
  },
  urlText: {
    color: theme.colors.textSubtle,
    fontFamily: 'monospace',
    fontSize: 14,
    marginBottom: theme.spacing.xxl,
  },
  infoBox: {
    backgroundColor: theme.colors.primaryGlow,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  infoText: {
    color: theme.colors.textHeader,
    flex: 1,
    marginLeft: theme.spacing.md,
    fontSize: 13,
    lineHeight: 18,
  }
});
