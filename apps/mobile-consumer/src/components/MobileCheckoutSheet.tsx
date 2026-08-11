import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';

interface CartItem {
  id: string;
  title: string;
  price: number;
  type: 'digital' | 'print' | 'pass';
}

interface MobileCheckoutSheetProps {
  visible: boolean;
  onClose: () => void;
  items: CartItem[];
  totalAmount: number;
  onSuccess: (orderId: string) => void;
}

export function MobileCheckoutSheet({
  visible,
  onClose,
  items,
  totalAmount,
  onSuccess,
}: MobileCheckoutSheetProps) {
  const [selectedMethod, setSelectedMethod] = useState<'apple_pay' | 'card' | 'room'>('apple_pay');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const fakeOrderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      onSuccess(fakeOrderId);
      onClose();
    }, 1800);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheetContainer}>
          {/* Grab handle */}
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <Text style={styles.title}>Checkout</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeTextBtn}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Order Items */}
          <View style={styles.orderSummaryCard}>
            <Text style={styles.summaryTitle}>ORDER SUMMARY ({items.length} items)</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.itemPrice}>€{item.price.toFixed(2)}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>€{totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          {/* Payment Method Selector */}
          <Text style={styles.sectionHeader}>PAYMENT METHOD</Text>
          <View style={styles.methodsContainer}>
            <TouchableOpacity
              style={[
                styles.methodCard,
                selectedMethod === 'apple_pay' && styles.methodCardActive,
              ]}
              onPress={() => setSelectedMethod('apple_pay')}
            >
              <Text style={styles.methodIcon}></Text>
              <Text style={styles.methodName}>Apple Pay / Google Pay</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodCard,
                selectedMethod === 'card' && styles.methodCardActive,
              ]}
              onPress={() => setSelectedMethod('card')}
            >
              <Text style={styles.methodIcon}>💳</Text>
              <Text style={styles.methodName}>Credit / Debit Card</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodCard,
                selectedMethod === 'room' && styles.methodCardActive,
              ]}
              onPress={() => setSelectedMethod('room')}
            >
              <Text style={styles.methodIcon}>🏨</Text>
              <Text style={styles.methodName}>Charge to Hotel Room</Text>
            </TouchableOpacity>
          </View>

          {/* Pay Button */}
          <TouchableOpacity
            style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
            disabled={isProcessing}
            onPress={handlePay}
          >
            {isProcessing ? (
              <View style={styles.processingRow}>
                <ActivityIndicator color="#000000" size="small" />
                <Text style={styles.payButtonText}> Processing Payment...</Text>
              </View>
            ) : (
              <Text style={styles.payButtonText}>
                {selectedMethod === 'apple_pay' ? ' Pay ' : 'Pay '}€{totalAmount.toFixed(2)}
              </Text>
            )}
          </TouchableOpacity>
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
    paddingBottom: 30,
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
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeTextBtn: {
    padding: 6,
  },
  closeText: {
    color: '#a1a1aa',
    fontSize: 15,
    fontWeight: '600',
  },
  orderSummaryCard: {
    backgroundColor: '#09090b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717a',
    letterSpacing: 1,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemName: {
    fontSize: 14,
    color: '#e4e4e7',
    flex: 1,
    marginRight: 10,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  divider: {
    height: 1,
    backgroundColor: '#27272a',
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10b981',
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717a',
    letterSpacing: 1,
    marginBottom: 10,
  },
  methodsContainer: {
    gap: 8,
    marginBottom: 20,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  methodCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b',
  },
  methodIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  methodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  payButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
