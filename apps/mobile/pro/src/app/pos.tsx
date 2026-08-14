import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { useStripeTerminal } from '@stripe/stripe-terminal-react-native'; // Uncomment when fully integrated

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const PACKAGES = [
  { id: 'pkg_10', name: '10 Photos', price: 150, color: '#06b6d4' },
  { id: 'pkg_all', name: 'All Inclusive', price: 299, color: '#10b981' },
  { id: 'pkg_drone', name: 'Drone Add-on', price: 99, color: '#f59e0b' },
  { id: 'pkg_print', name: 'Canvas Print', price: 120, color: '#8b5cf6' },
];

export default function PosScreen() {
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
    <ThemedView className="flex-1 flex-row justify-center bg-background">
      <SafeAreaView className="flex-1 px-4 pt-4 pb-20 max-w-[1024px] w-full">
        
        {/* Header */}
        <View className="flex-row justify-between items-center mb-4">
          <ThemedText className="font-mono text-sm font-bold tracking-widest text-[#94a3b8]">TERMINAL POS</ThemedText>
          <TouchableOpacity onPress={clearCart}>
            <ThemedText className="font-mono text-sm font-bold tracking-widest text-danger">CLEAR</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Total Display */}
        <View className="flex-row items-start justify-center py-6 mb-4">
          <ThemedText className="font-mono text-3xl font-black text-[#94a3b8] mt-2 mr-1">$</ThemedText>
          <ThemedText className="font-mono text-7xl font-black tracking-tighter text-[#f8fafc]">{cartTotal.toFixed(2)}</ThemedText>
        </View>

        {/* Package Grid */}
        <ScrollView className="flex-1" contentContainerClassName="flex-row flex-wrap justify-between gap-4">
          {PACKAGES.map((pkg) => (
            <TouchableOpacity 
              key={pkg.id}
              className="w-[47%] aspect-square rounded-2xl border-2 p-4 justify-between bg-surface"
              style={{ borderColor: pkg.color }}
              onPress={() => addToCart(pkg)}
              activeOpacity={0.7}
            >
              <ThemedText className="text-xl font-bold">{pkg.name}</ThemedText>
              <ThemedText className="font-mono text-2xl font-black" style={{ color: pkg.color }}>${pkg.price}</ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Action Button */}
        <View className="mt-4">
          <TouchableOpacity 
            className={`h-[72px] rounded-2xl items-center justify-center ${cartTotal > 0 ? 'bg-tint' : 'bg-elevated'}`}
            disabled={cartTotal === 0 || isCollecting}
            onPress={handleTapToPay}
            activeOpacity={0.8}
          >
            {isCollecting ? (
              <ThemedText className="font-mono text-xl font-black tracking-widest">PRESENT CARD...</ThemedText>
            ) : (
              <ThemedText className={`font-mono text-xl font-black tracking-widest ${cartTotal > 0 ? 'text-[#070a12]' : 'text-secondary'}`}>
                {cartTotal > 0 ? `CHARGE $${cartTotal}` : 'SELECT PACKAGE'}
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </ThemedView>
  );
}
