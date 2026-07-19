import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { useStripeTerminal } from '@stripe/stripe-terminal-react-native'; // Uncomment when fully integrated

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, MaxContentWidth, BottomTabInset, Typography } from '@/constants/theme';
import { useColorScheme } from 'react-native';

const PACKAGES = [
  { id: 'pkg_10', name: '10 Photos', price: 150, color: '#06b6d4' },
  { id: 'pkg_all', name: 'All Inclusive', price: 299, color: '#10b981' },
  { id: 'pkg_drone', name: 'Drone Add-on', price: 99, color: '#f59e0b' },
  { id: 'pkg_print', name: 'Canvas Print', price: 120, color: '#8b5cf6' },
];

export default function PosScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'light' ? 'light' : 'dark'];

  const [cart, setCart] = useState<{ id: string, name: string, price: number, qty: number }[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);

  // const { collectPaymentMethod, confirmPaymentIntent } = useStripeTerminal();

  const addToCart = (pkg: typeof PACKAGES[0]) => {
    setCart((prev) => {
      const existing = prev.find(p => p.id === pkg.id);
      if (existing) {
        return prev.map(p => p.id === pkg.id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { ...pkg, qty: 1 }];
    });
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleTapToPay = async () => {
    if (cartTotal === 0) return;
    
    setIsCollecting(true);
    
    // Simulating Stripe Terminal Flow
    setTimeout(() => {
      Alert.alert(
        "Payment Successful", 
        `Successfully collected $${cartTotal}.00 via Tap-to-Pay.`,
        [{ text: "OK", onPress: () => {
          setIsCollecting(false);
          clearCart();
        }}]
      );
    }, 2500);

    /* Real implementation logic:
    try {
      const { paymentIntent, error } = await collectPaymentMethod({ paymentIntentId: 'pi_...' });
      if (error) { Alert.alert("Error", error.message); return; }
      const { error: confirmError } = await confirmPaymentIntent(paymentIntent);
      if (confirmError) { Alert.alert("Error", confirmError.message); }
      else { Alert.alert("Success", "Payment confirmed!"); }
    } catch (e) {
      console.error(e);
    } finally { setIsCollecting(false); }
    */
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.headerText}>TERMINAL POS</ThemedText>
          <TouchableOpacity onPress={clearCart}>
            <ThemedText style={[styles.clearText, { color: colors.danger }]}>CLEAR</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Total Display */}
        <View style={styles.totalDisplay}>
          <ThemedText style={styles.currencySymbol}>$</ThemedText>
          <ThemedText style={styles.totalAmount}>{cartTotal.toFixed(2)}</ThemedText>
        </View>

        {/* Package Grid */}
        <ScrollView style={styles.packageScroll} contentContainerStyle={styles.packageGrid}>
          {PACKAGES.map((pkg) => (
            <TouchableOpacity 
              key={pkg.id}
              style={[styles.packageButton, { backgroundColor: colors.surface, borderColor: pkg.color }]}
              onPress={() => addToCart(pkg)}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.packageName}>{pkg.name}</ThemedText>
              <ThemedText style={[styles.packagePrice, { color: pkg.color }]}>${pkg.price}</ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={[
              styles.tapButton, 
              { backgroundColor: cartTotal > 0 ? colors.tint : colors.elevated }
            ]}
            disabled={cartTotal === 0 || isCollecting}
            onPress={handleTapToPay}
            activeOpacity={0.8}
          >
            {isCollecting ? (
              <ThemedText style={styles.tapButtonText}>PRESENT CARD...</ThemedText>
            ) : (
              <ThemedText style={[
                styles.tapButtonText, 
                { color: cartTotal > 0 ? '#070a12' : colors.textSecondary }
              ]}>
                {cartTotal > 0 ? `CHARGE $${cartTotal}` : 'SELECT PACKAGE'}
              </ThemedText>
            )}
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
    paddingBottom: BottomTabInset,
    paddingTop: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  headerText: {
    fontFamily: Typography.fontMono,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#94a3b8',
  },
  clearText: {
    fontFamily: Typography.fontMono,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  totalDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    marginBottom: Spacing.four,
  },
  currencySymbol: {
    fontFamily: Typography.fontMono,
    fontSize: 32,
    fontWeight: '900',
    color: '#94a3b8',
    marginTop: 8,
    marginRight: 4,
  },
  totalAmount: {
    fontFamily: Typography.fontMono,
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -2,
    color: '#f8fafc',
  },
  packageScroll: {
    flex: 1,
  },
  packageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.four,
  },
  packageButton: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    padding: Spacing.four,
    justifyContent: 'space-between',
  },
  packageName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  packagePrice: {
    fontFamily: Typography.fontMono,
    fontSize: 24,
    fontWeight: '900',
  },
  actionContainer: {
    marginTop: Spacing.four,
  },
  tapButton: {
    height: 72, // Massive Fitts' Law Target
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapButtonText: {
    fontFamily: Typography.fontMono,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
