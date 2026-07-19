import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme/tokens';

interface Props {
  sessionId: string;
  amount: number;
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CashConfirmationModal: React.FC<Props> = ({ sessionId, amount, visible, onConfirm, onCancel }) => {
  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm();
  };

  const handleCancel = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onCancel();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="cash" size={44} color={theme.colors.success} />
          </View>
          
          <Text style={styles.title}>Cash Payment Alert</Text>
          <Text style={styles.subtitle}>Session: {sessionId}</Text>
          
          <Text style={styles.amount}>${amount.toFixed(2)}</Text>
          
          <Text style={styles.instruction}>
            Guest has requested a cash checkout. Verify physical bill collection before confirming below.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.cancelBtn]} onPress={handleCancel} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Reject / Flag</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.button, styles.confirmBtn]} onPress={handleConfirm} activeOpacity={0.7}>
              <Text style={styles.confirmBtnText}>Confirm Cash</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 10, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xxl,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.colors.successGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  title: {
    color: theme.colors.textHeader,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: theme.colors.textSubtle,
    fontFamily: 'monospace',
    fontSize: 14,
    marginBottom: theme.spacing.lg,
  },
  amount: {
    color: theme.colors.success,
    fontSize: 44,
    fontWeight: '900',
    marginBottom: theme.spacing.lg,
  },
  instruction: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: theme.spacing.xxl,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  button: {
    flex: 1,
    minHeight: theme.spacing.minTouch,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.danger,
  },
  confirmBtn: {
    backgroundColor: theme.colors.success,
  },
  cancelBtnText: {
    color: theme.colors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  }
});
