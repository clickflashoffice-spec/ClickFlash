import React, { useState, useCallback, memo, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  FlatList, ScrollView, Modal, TextInput, ActivityIndicator, Alert, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme/tokens';
import { logger } from '../../src/utils/logger';
import { insertPosTransaction, insertPendingApproval } from '../../db/database';
import { UnifiedSyncService } from '../../src/services/UnifiedSyncService';
import { DigitalWaiverModal } from '../../src/components/DigitalWaiverModal';

// ─── Currencies & Rates ───────────────────────────────────────────────────────
const CURRENCIES: Record<string, { symbol: string; rate: number; label: string }> = {
  EUR: { symbol: '€', rate: 1.0, label: 'EUR (€)' },
  USD: { symbol: '$', rate: 1.08, label: 'USD ($)' },
  GBP: { symbol: '£', rate: 0.85, label: 'GBP (£)' },
  AED: { symbol: 'AED ', rate: 3.97, label: 'AED' },
  SAR: { symbol: 'SAR ', rate: 4.05, label: 'SAR' },
};
type CurrencyCode = keyof typeof CURRENCIES;

interface Product {
  id: string;
  name: string;
  priceBase: number;
  category: 'Digital' | 'Print' | 'Package';
  badge?: string;
}

const PRODUCTS: Product[] = [
  { id: 'p1', name: 'All-Inclusive Digital Album', priceBase: 85, category: 'Package', badge: 'BEST SELLER' },
  { id: 'p2', name: 'Sunset VIP Couple Session + All Digital', priceBase: 150, category: 'Package', badge: 'PREMIUM' },
  { id: 'p3', name: '5x High-Res Digital Photos', priceBase: 45, category: 'Digital' },
  { id: 'p4', name: 'Single High-Res Digital Photo', priceBase: 15, category: 'Digital' },
  { id: 'p5', name: 'Printed Photo 6x8 + Digital Copy', priceBase: 25, category: 'Print' },
  { id: 'p6', name: 'Resort Memory Frame + 3 Prints', priceBase: 60, category: 'Print' },
];

interface CartItem {
  product: Product;
  quantity: number;
}

type PaymentMethod = 'tap_to_pay' | 'cash' | 'room_charge';

// ─── Subcomponents ────────────────────────────────────────────────────────────

const ProductCard: React.FC<{
  product: Product;
  currency: CurrencyCode;
  onAdd: (p: Product) => void;
}> = memo(({ product, currency, onAdd }) => {
  const { symbol, rate } = CURRENCIES[currency];
  const convertedPrice = Math.round(product.priceBase * rate);

  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => onAdd(product)}
      activeOpacity={0.8}
    >
      {product.badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{product.badge}</Text>
        </View>
      )}
      <Text style={styles.productName}>{product.name}</Text>
      <View style={styles.productFooter}>
        <Text style={styles.productPrice}>{symbol}{convertedPrice}</Text>
        <View style={styles.addBtn}>
          <Ionicons name="add" size={20} color="#ffffff" />
        </View>
      </View>
    </TouchableOpacity>
  );
});
ProductCard.displayName = 'ProductCard';

const CartRow: React.FC<{
  item: CartItem;
  currency: CurrencyCode;
  onAdd: (p: Product) => void;
  onRemove: (id: string) => void;
}> = memo(({ item, currency, onAdd, onRemove }) => {
  const { symbol, rate } = CURRENCIES[currency];
  const itemTotal = Math.round(item.product.priceBase * rate) * item.quantity;

  return (
    <View style={styles.cartRow}>
      <Text style={styles.cartRowName} numberOfLines={1}>{item.product.name}</Text>
      <View style={styles.qtyControls}>
        <TouchableOpacity onPress={() => onRemove(item.product.id)} style={styles.qtyBtn}>
          <Ionicons name="remove" size={16} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity onPress={() => onAdd(item.product)} style={styles.qtyBtn}>
          <Ionicons name="add" size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.cartRowPrice}>{symbol}{itemTotal}</Text>
    </View>
  );
});
CartRow.displayName = 'CartRow';

// ─── POS Main Screen ──────────────────────────────────────────────────────────

export default function PosScreen() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sessionId, setSessionId] = useState('SESS_4821');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Package' | 'Digital' | 'Print'>('All');
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');

  // Modals state
  const [waiverVisible, setWaiverVisible] = useState(false);
  const [waiverSigned, setWaiverSigned] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [signatureData, setSignatureData] = useState(false);

  // Payment execution state
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tap_to_pay');
  const [paymentStatus, setPaymentStatus] = useState<'selecting' | 'processing' | 'nfc_ready' | 'success'>('selecting');
  const [roomNumber, setRoomNumber] = useState('');
  const [guestLastName, setGuestLastName] = useState('');

  const { symbol, rate } = CURRENCIES[currency];

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev =>
      prev
        .map(item => (item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item))
        .filter(item => item.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const totalAmountBase = useMemo(() => cart.reduce((sum, item) => sum + item.product.priceBase * item.quantity, 0), [cart]);
  const totalAmount = Math.round(totalAmountBase * rate);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return PRODUCTS;
    return PRODUCTS.filter(p => p.category === selectedCategory);
  }, [selectedCategory]);

  const startPayment = (method: PaymentMethod) => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add products to the cart before collecting payment.');
      return;
    }
    if (!waiverSigned) {
      Alert.alert('Digital Consent Required', 'Please collect the digital waiver signature before checkout.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Consent Now', onPress: () => setWaiverVisible(true) },
      ]);
      return;
    }

    setPaymentMethod(method);
    setPaymentModalVisible(true);

    if (method === 'tap_to_pay') {
      setPaymentStatus('nfc_ready');
    } else {
      setPaymentStatus('selecting');
    }
  };

  const executeStripeNFC = () => {
    setPaymentStatus('processing');
    setTimeout(() => {
      setPaymentStatus('success');
    }, 2000);
  };

  const executeCashOrRoom = () => {
    if (paymentMethod === 'room_charge' && (!roomNumber || !guestLastName)) {
      Alert.alert('Missing Details', 'Please enter both room number and guest last name.');
      return;
    }
    setPaymentStatus('processing');
    setTimeout(() => {
      setPaymentStatus('success');
    }, 1500);
  };

  const handleFinishTransaction = () => {
    // Record into offline SQLite transaction queue for sync & cash reconciliation
    const txId = `tx_${Date.now()}`;
    const txStatus = paymentMethod === 'cash' ? 'pending' : 'synced';

    try {
      insertPosTransaction({
        id: txId,
        session_id: sessionId,
        amount: totalAmount,
        currency: currency,
        method: paymentMethod,
        details: JSON.stringify({ items: cart, customer: customerName, email: customerEmail }),
        created_at: new Date().toISOString()
      });

      if (paymentMethod === 'cash') {
        insertPendingApproval({
          id: `appr_${Date.now()}`,
          type: 'cash_payment',
          session_id: sessionId,
          amount: totalAmount,
          currency: currency,
          details: JSON.stringify({ customer: customerName || 'Walk-in Guest', itemsCount: cart.length }),
          created_at: new Date().toISOString()
        });
      }

      UnifiedSyncService.syncNow();
    } catch (dbErr) {
      logger.warn('Offline transaction record fallback', { args: [dbErr] });
    }

    setPaymentModalVisible(false);
    setPaymentStatus('selecting');
    clearCart();
    setWaiverSigned(false);
    setCustomerName('');
    setCustomerEmail('');
    setSignatureData(false);

    if (paymentMethod === 'cash') {
      Alert.alert(
        'Cash Logged • Pending Audit',
        `${symbol}${totalAmount} recorded via CASH.\n\nThis transaction is now queued in your Approvals tab for end-of-day cash reconciliation & audit verification.`
      );
    } else {
      Alert.alert(
        'Payment Approved & Synced',
        `${symbol}${totalAmount} collected via ${paymentMethod.replace('_', ' ').toUpperCase()}.\nHigh-res watermark-free photos unlocked instantly for ${sessionId}.`
      );
    }
  };

  const renderProductItem = useCallback(({ item }: { item: Product }) => (
    <ProductCard product={item} currency={currency} onAdd={addToCart} />
  ), [currency, addToCart]);

  const keyExtractor = useCallback((item: Product) => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.canvas} />

      {/* Top Header & Currency Switcher */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>STRIPE POS TERMINAL</Text>
          <Text style={styles.subtitle}>Contactless NFC • Cash • Resort Folio</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.sessionPill}>
            <Ionicons name="camera" size={14} color={theme.colors.primary} />
            <Text style={styles.sessionText}>{sessionId}</Text>
          </View>
        </View>
      </View>

      {/* Currency Pill Bar */}
      <View style={styles.currencyBar}>
        <Text style={styles.currencyLabel}>BILLING CURRENCY:</Text>
        <View style={styles.currencyPills}>
          {(Object.keys(CURRENCIES) as CurrencyCode[]).map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.currencyPill, currency === c && styles.currencyPillActive]}
              onPress={() => setCurrency(c)}
              activeOpacity={0.8}
            >
              <Text style={[styles.currencyText, currency === c && styles.currencyTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.mainLayout}>
        {/* Left/Main Column: Product Catalog */}
        <View style={styles.catalogSection}>
          {/* Category Filter */}
          <View style={styles.categoryRow}>
            {(['All', 'Package', 'Digital', 'Print'] as const).map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.catBtn, selectedCategory === cat && styles.catBtnActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.catBtnText, selectedCategory === cat && styles.catBtnTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Product Grid */}
          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.productGrid}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        </View>

        {/* Bottom Cart & Action Dock */}
        <View style={styles.cartDock}>
          {/* Digital Waiver Status Banner */}
          <TouchableOpacity
            style={[styles.waiverBanner, waiverSigned ? styles.waiverSigned : styles.waiverPending]}
            onPress={() => setWaiverVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={waiverSigned ? 'checkmark-circle' : 'document-text'}
              size={22}
              color={waiverSigned ? theme.colors.success : theme.colors.warning}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.waiverBannerTitle}>
                {waiverSigned ? `Digital Consent Verified (${customerName || 'Guest'})` : 'Digital Waiver & Release Consent'}
              </Text>
              <Text style={styles.waiverBannerSub}>
                {waiverSigned ? 'Ready for high-res watermark-free delivery' : 'Tap to acquire required guest photo release signature'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {/* Cart Items Summary */}
          {cart.length > 0 ? (
            <View style={styles.cartItemsBox}>
              <View style={styles.cartHeader}>
                <Text style={styles.cartHeaderTitle}>ORDER ITEMS ({cart.reduce((a, b) => a + b.quantity, 0)})</Text>
                <TouchableOpacity onPress={clearCart} style={{ padding: 4 }}>
                  <Text style={styles.clearText}>Clear Order</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 110 }} showsVerticalScrollIndicator={false}>
                {cart.map(item => (
                  <CartRow
                    key={item.product.id}
                    item={item}
                    currency={currency}
                    onAdd={addToCart}
                    onRemove={removeFromCart}
                  />
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.emptyCartBox}>
              <Ionicons name="cart-outline" size={24} color={theme.colors.textSubtle} />
              <Text style={styles.emptyCartText}>Select catalog items above to build guest invoice</Text>
            </View>
          )}

          {/* Total & Payment Buttons */}
          <View style={styles.paymentFooter}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL AMOUNT DUE</Text>
              <Text style={styles.totalAmount}>{symbol}{totalAmount}</Text>
            </View>

            <View style={styles.payButtonsRow}>
              <TouchableOpacity
                style={[styles.payActionBtn, styles.tapToPayBtn, cart.length === 0 && styles.disabledBtn]}
                onPress={() => startPayment('tap_to_pay')}
                disabled={cart.length === 0}
                activeOpacity={0.85}
              >
                <Ionicons name="wifi" size={22} color="#ffffff" style={{ transform: [{ rotate: '90deg' }] }} />
                <Text style={styles.payActionText}>NFC Tap</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.payActionBtn, styles.cashBtn, cart.length === 0 && styles.disabledBtn]}
                onPress={() => startPayment('cash')}
                disabled={cart.length === 0}
                activeOpacity={0.85}
              >
                <Ionicons name="cash" size={22} color={theme.colors.success} />
                <Text style={[styles.payActionText, { color: theme.colors.success }]}>Cash</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.payActionBtn, styles.roomBtn, cart.length === 0 && styles.disabledBtn]}
                onPress={() => startPayment('room_charge')}
                disabled={cart.length === 0}
                activeOpacity={0.85}
              >
                <Ionicons name="bed" size={22} color={theme.colors.primary} />
                <Text style={[styles.payActionText, { color: theme.colors.primary }]}>Room</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* ─── Digital Waiver & Signature Modal ─────────────────────────────── */}
      <DigitalWaiverModal
        visible={waiverVisible}
        clientName={customerName || 'Guest'}
        onClose={() => setWaiverVisible(false)}
        onSignSuccess={(sig) => {
          setSignatureData(true);
          setWaiverSigned(true);
        }}
      />

      {/* ─── Payment Checkout Modal ───────────────────────────────────────── */}
      <Modal visible={paymentModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {paymentMethod === 'tap_to_pay' ? 'STRIPE TERMINAL NFC' : paymentMethod === 'cash' ? 'CASH COLLECTION AUDIT' : 'RESORT FOLIO CHARGE'}
              </Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.paymentAmountBox}>
              <Text style={styles.paymentAmountLabel}>TOTAL AMOUNT DUE</Text>
              <Text style={styles.paymentAmountValue}>{symbol}{totalAmount}</Text>
            </View>

            {/* Tap to pay NFC flow */}
            {paymentMethod === 'tap_to_pay' && (
              <View style={styles.flowContainer}>
                {paymentStatus === 'nfc_ready' && (
                  <TouchableOpacity style={styles.nfcBox} onPress={executeStripeNFC} activeOpacity={0.85}>
                    <View style={styles.nfcIconCircle}>
                      <Ionicons name="wifi" size={48} color={theme.colors.primary} style={{ transform: [{ rotate: '90deg' }] }} />
                    </View>
                    <Text style={styles.nfcTitle}>Ready to Tap</Text>
                    <Text style={styles.nfcSub}>Present device rear to guest contactless card or mobile wallet</Text>
                    <View style={styles.simTapPill}>
                      <Text style={styles.simTapText}>[Simulate NFC Card Tap]</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Cash flow */}
            {paymentMethod === 'cash' && paymentStatus === 'selecting' && (
              <View style={styles.flowContainer}>
                <View style={styles.cashNotice}>
                  <Ionicons name="cash" size={32} color={theme.colors.success} />
                  <Text style={styles.cashNoticeText}>
                    Collect exactly {symbol}{totalAmount} in cash from guest. Transaction will be queued in your Approvals tab for end-of-day cash reconciliation.
                  </Text>
                </View>
                <TouchableOpacity style={styles.confirmPayBtn} onPress={executeCashOrRoom} activeOpacity={0.85}>
                  <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                  <Text style={styles.confirmPayText}>Confirm Cash Received ({symbol}{totalAmount})</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Room charge flow */}
            {paymentMethod === 'room_charge' && paymentStatus === 'selecting' && (
              <View style={styles.flowContainer}>
                <Text style={styles.inputLabel}>Resort Room Number</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 412"
                  placeholderTextColor={theme.colors.textSubtle}
                  value={roomNumber}
                  onChangeText={setRoomNumber}
                  keyboardType="number-pad"
                />
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Guest Last Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Hamilton"
                  placeholderTextColor={theme.colors.textSubtle}
                  value={guestLastName}
                  onChangeText={setGuestLastName}
                />
                <TouchableOpacity style={[styles.confirmPayBtn, { marginTop: 20 }]} onPress={executeCashOrRoom} activeOpacity={0.85}>
                  <Ionicons name="key" size={20} color="#ffffff" />
                  <Text style={styles.confirmPayText}>Verify & Charge Resort Folio</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Processing state */}
            {paymentStatus === 'processing' && (
              <View style={styles.processingBox}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.processingTitle}>Authorizing Transaction...</Text>
                <Text style={styles.processingSub}>Securing token & verifying payment gateway</Text>
              </View>
            )}

            {/* Success state */}
            {paymentStatus === 'success' && (
              <View style={styles.processingBox}>
                <View style={styles.successCircle}>
                  <Ionicons name="checkmark" size={48} color="#ffffff" />
                </View>
                <Text style={styles.successTitle}>Payment Confirmed!</Text>
                <Text style={styles.successSub}>{symbol}{totalAmount} collected. Receipt sent to {customerEmail || 'guest'}.</Text>
                <TouchableOpacity style={styles.finishBtn} onPress={handleFinishTransaction} activeOpacity={0.85}>
                  <Text style={styles.finishBtnText}>Done & Return to Catalog</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: theme.spacing.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  title: { fontSize: 20, fontWeight: '900', color: theme.colors.textHeader, letterSpacing: 1 },
  subtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  sessionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.elevated, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  sessionText: { color: theme.colors.primary, fontWeight: '800', fontSize: 12, fontFamily: 'monospace' },

  currencyBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingVertical: 8, backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  currencyLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.textSubtle, letterSpacing: 0.8 },
  currencyPills: { flexDirection: 'row', gap: 6 },
  currencyPill: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.canvas, borderWidth: 1, borderColor: theme.colors.border, minHeight: 32, justifyContent: 'center',
  },
  currencyPillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  currencyText: { fontSize: 12, fontWeight: '800', color: theme.colors.textSubtle, fontFamily: 'monospace' },
  currencyTextActive: { color: '#ffffff' },

  mainLayout: { flex: 1, justifyContent: 'space-between' },
  catalogSection: { flex: 1 },

  categoryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: theme.spacing.lg, paddingVertical: 10 },
  catBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, minHeight: 40, justifyContent: 'center' },
  catBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  catBtnText: { fontSize: 13, fontWeight: '800', color: theme.colors.textSubtle },
  catBtnTextActive: { color: '#ffffff' },

  productGrid: { paddingHorizontal: theme.spacing.lg, paddingBottom: 16 },
  productCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: 16,
    borderWidth: 1.5, borderColor: theme.colors.border, position: 'relative', overflow: 'hidden',
  },
  badge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: theme.colors.accent, paddingHorizontal: 10, paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  badgeText: { fontSize: 9, fontWeight: '900', color: '#ffffff', letterSpacing: 0.8 },
  productName: { fontSize: 16, fontWeight: '800', color: theme.colors.textHeader, paddingRight: 70, marginBottom: 12 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: 20, fontWeight: '900', color: theme.colors.success, fontFamily: 'monospace' },
  addBtn: { width: 40, height: 40, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },

  cartDock: {
    backgroundColor: theme.colors.surface, borderTopWidth: 1.5, borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg, paddingVertical: 12, gap: 10,
  },
  waiverBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    borderRadius: theme.borderRadius.lg, borderWidth: 1.5, minHeight: theme.spacing.minTouch,
  },
  waiverPending: { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: theme.colors.warning },
  waiverSigned: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: theme.colors.success },
  waiverBannerTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.textHeader },
  waiverBannerSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },

  cartItemsBox: { backgroundColor: theme.colors.canvas, borderRadius: theme.borderRadius.lg, padding: 12, borderWidth: 1, borderColor: theme.colors.border },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cartHeaderTitle: { fontSize: 12, fontWeight: '800', color: theme.colors.textMuted, letterSpacing: 0.8 },
  clearText: { fontSize: 12, fontWeight: '800', color: theme.colors.danger },
  cartRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  cartRowName: { flex: 1, fontSize: 13, color: theme.colors.textHeader, fontWeight: '700' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12 },
  qtyBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: theme.colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  qtyText: { color: theme.colors.textHeader, fontWeight: '900', fontSize: 14, fontFamily: 'monospace' },
  cartRowPrice: { fontSize: 14, fontWeight: '800', color: theme.colors.success, width: 75, textAlign: 'right', fontFamily: 'monospace' },

  emptyCartBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, backgroundColor: theme.colors.canvas, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border,
  },
  emptyCartText: { fontSize: 13, color: theme.colors.textSubtle, fontWeight: '700' },

  paymentFooter: { gap: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabel: { fontSize: 13, fontWeight: '800', color: theme.colors.textMuted, letterSpacing: 0.8 },
  totalAmount: { fontSize: 28, fontWeight: '900', color: theme.colors.textHeader, fontFamily: 'monospace' },

  payButtonsRow: { flexDirection: 'row', gap: 10 },
  payActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: theme.spacing.minTouch, borderRadius: theme.borderRadius.md, borderWidth: 1.5,
  },
  tapToPayBtn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  cashBtn: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: theme.colors.success },
  roomBtn: { backgroundColor: 'rgba(37, 99, 235, 0.15)', borderColor: theme.colors.primary },
  payActionText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  disabledBtn: { opacity: 0.4 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: theme.spacing.lg },
  waiverModalCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: theme.spacing.xl, borderWidth: 1.5, borderColor: theme.colors.border, gap: 14 },
  paymentModalCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: theme.spacing.xl, borderWidth: 1.5, borderColor: theme.colors.border, gap: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '900', color: theme.colors.textHeader, letterSpacing: 0.8 },
  waiverLegalText: { fontSize: 13, color: theme.colors.textHeader, lineHeight: 20, backgroundColor: theme.colors.canvas, padding: 14, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  formSection: { gap: 4 },
  inputLabel: { fontSize: 12, fontWeight: '800', color: theme.colors.textMuted, letterSpacing: 0.8 },
  textInput: {
    backgroundColor: theme.colors.canvas, borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14, minHeight: theme.spacing.minTouch, color: theme.colors.textHeader, fontSize: 14, fontWeight: '700',
  },
  signaturePad: {
    height: 120, backgroundColor: theme.colors.canvas, borderWidth: 2, borderColor: theme.colors.border,
    borderStyle: 'dashed', borderRadius: theme.borderRadius.lg, alignItems: 'center', justifyContent: 'center',
  },
  signaturePadSigned: { borderColor: theme.colors.success, borderStyle: 'solid', backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  signPrompt: { fontSize: 12, color: theme.colors.textSubtle, fontWeight: '700', marginTop: 6 },
  signedBadge: { alignItems: 'center' },
  signedText: { fontSize: 14, fontWeight: '800', color: theme.colors.success, marginTop: 4 },
  signedSubtext: { fontSize: 11, color: theme.colors.textSubtle, marginTop: 2 },
  saveWaiverBtn: {
    backgroundColor: theme.colors.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, minHeight: theme.spacing.minTouch, borderRadius: theme.borderRadius.md, marginTop: 6,
  },
  saveWaiverText: { color: '#ffffff', fontWeight: '900', fontSize: 15 },

  paymentAmountBox: { backgroundColor: theme.colors.canvas, padding: 18, borderRadius: theme.borderRadius.lg, alignItems: 'center', borderWidth: 1.5, borderColor: theme.colors.border },
  paymentAmountLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.textMuted, letterSpacing: 1.2 },
  paymentAmountValue: { fontSize: 38, fontWeight: '900', color: theme.colors.success, marginTop: 4, fontFamily: 'monospace' },
  flowContainer: { gap: 14 },
  nfcBox: { backgroundColor: theme.colors.canvas, borderWidth: 1.5, borderColor: theme.colors.primary, borderRadius: theme.borderRadius.xl, padding: 24, alignItems: 'center', gap: 10 },
  nfcIconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(37, 99, 235, 0.2)', alignItems: 'center', justifyContent: 'center' },
  nfcTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.textHeader },
  nfcSub: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 18 },
  simTapPill: { marginTop: 12, backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  simTapText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  cashNotice: { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1.5, borderColor: theme.colors.success, borderRadius: theme.borderRadius.lg, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  cashNoticeText: { flex: 1, fontSize: 13, color: theme.colors.textHeader, lineHeight: 18, fontWeight: '600' },
  confirmPayBtn: { backgroundColor: theme.colors.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: theme.spacing.minTouch, borderRadius: theme.borderRadius.md },
  confirmPayText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
  processingBox: { paddingVertical: 36, alignItems: 'center', gap: 14 },
  processingTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.textHeader, marginTop: 8 },
  processingSub: { fontSize: 13, color: theme.colors.textMuted },
  successCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: theme.colors.success, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 24, fontWeight: '900', color: theme.colors.textHeader },
  successSub: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center' },
  finishBtn: { backgroundColor: theme.colors.primary, width: '100%', minHeight: theme.spacing.minTouch, borderRadius: theme.borderRadius.md, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  finishBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
});
