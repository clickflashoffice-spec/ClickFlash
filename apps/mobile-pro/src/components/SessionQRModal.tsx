import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/theme/tokens';

interface SessionQRModalProps {
  sessionId: string;
  visible: boolean;
  onClose: () => void;
}

export function SessionQRModal({ sessionId, visible, onClose }: SessionQRModalProps) {
  const url = `https://gallery.clickflash.app/?token=${encodeURIComponent(sessionId)}`;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityLabel="Close customer session QR"
            accessibilityRole="button"
            activeOpacity={0.7}
            hitSlop={8}
            onPress={onClose}
            style={styles.closeBtn}
          >
            <Text style={styles.closeIcon}>×</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Customer Session QR</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <Text style={styles.instructions}>
            Ask the guest to scan this high-contrast QR code with their phone camera.
          </Text>

          <View
            accessibilityLabel="Customer gallery session QR code"
            accessibilityRole="image"
            style={styles.qrContainer}
          >
            <QRCode backgroundColor="#ffffff" color="#000000" size={240} value={url} />
          </View>

          <Text selectable style={styles.urlText}>
            {url}
          </Text>

          <View style={styles.infoBox}>
            <Text accessibilityElementsHidden style={styles.infoIcon}>
              ⚡
            </Text>
            <Text style={styles.infoText}>
              Photos appear after the local delivery pipeline confirms a verified receipt.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

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
  closeIcon: {
    color: theme.colors.textHeader,
    fontSize: 32,
    lineHeight: 34,
  },
  headerSpacer: {
    width: theme.spacing.minTouch,
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
  infoIcon: {
    color: theme.colors.primary,
    fontSize: 24,
  },
  infoText: {
    color: theme.colors.textHeader,
    flex: 1,
    marginLeft: theme.spacing.md,
    fontSize: 13,
    lineHeight: 18,
  },
});
