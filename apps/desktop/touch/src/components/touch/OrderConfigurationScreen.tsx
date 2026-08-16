import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CartItem } from '../../types.ts';
import { useCurrency } from '../CurrencyContext.tsx';
import CheckoutScreen from './CheckoutScreen';
import OnScreenKeyboard from './OnScreenKeyboard';

/**
 * Cart Item Card Component
 * Memoized for performance optimization
 */
const CartItemCard: React.FC<{
    item: CartItem;
    onUpdateQuantity: (item: CartItem, change: number) => void;
    onUpdateDeliveryType: (item: CartItem, type: 'digital' | 'print' | 'both') => void;
    onRemove: () => void;
    formatCurrency: (amount: number) => string;
}> = React.memo(({ item, onUpdateQuantity, onUpdateDeliveryType, onRemove, formatCurrency }) => (
    <div className="flex items-center space-x-4 bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
        <img src={item.photo.url} alt={item.photo.title} className="w-24 h-24 object-cover rounded-md" loading="lazy" />
        <div className="flex-1">
            <div className="flex items-center gap-1.5 mt-2">
                {[
                    { id: 'print', label: 'Print', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' },
                    { id: 'digital', label: 'Digital', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
                    { id: 'both', label: 'Both', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' }
                ].map((type) => (
                    <button
                        key={type.id}
                        onClick={() => onUpdateDeliveryType(item, type.id as 'digital' | 'print' | 'both')}
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md transition-all border-2 ${item.deliveryType === type.id
                            ? `${type.color.replace('/10', '/20')} border-blue-500 dark:border-blue-400 scale-105`
                            : 'bg-slate-50/50 dark:bg-slate-900/50 border-transparent opacity-60 hover:opacity-100'
                            }`}
                    >
                        {type.label}
                    </button>
                ))}
            </div>
            {item.mode === 'AI' && <span className="inline-block mt-2 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">AI ENHANCED</span>}
        </div>
        <div className="flex items-center space-x-2">
            <button
                onClick={() => onUpdateQuantity(item, -1)}
                className="min-w-[44px] min-h-[44px] w-12 h-12 text-2xl bg-slate-200 dark:bg-slate-700 rounded-lg touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Decrease quantity"
            >
                -
            </button>
            <span className="text-xl font-bold w-12 text-center">{item.quantity}</span>
            <button
                onClick={() => onUpdateQuantity(item, 1)}
                className="min-w-[44px] min-h-[44px] w-12 h-12 text-2xl bg-slate-200 dark:bg-slate-700 rounded-lg touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Increase quantity"
            >
                +
            </button>
        </div>
        <p className="w-32 text-right text-lg font-semibold">{formatCurrency(item.price * item.quantity)}</p>
        <button
            onClick={onRemove}
            className="min-w-[44px] min-h-[44px] text-red-500/70 hover:text-red-500 p-2 touch-manipulation focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            title="Remove item"
            aria-label="Remove item from cart"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        </button>
    </div>
), (prevProps, nextProps) => {
    // Custom comparison for better performance
    return prevProps.item.id === nextProps.item.id &&
        prevProps.item.quantity === nextProps.item.quantity &&
        prevProps.item.price === nextProps.item.price &&
        prevProps.item.deliveryType === nextProps.item.deliveryType;
});

CartItemCard.displayName = 'CartItemCard';

interface OrderConfigurationScreenProps {
    cart: CartItem[];
    onUpdateCart: (item: CartItem) => void;
    onBack: () => void;
    onCheckoutSuccess: () => void;
}

import { usePricingStore } from '../../store/PricingStore';

const OrderConfigurationScreen: React.FC<OrderConfigurationScreenProps> = ({ cart, onUpdateCart, onBack, onCheckoutSuccess }) => {
    const { formatCurrency } = useCurrency();
    const { discountCode, setDiscountCode, calculateTotals } = usePricingStore();
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [localCodeInput, setLocalCodeInput] = useState('');

    // Calculate dynamic totals
    const { subtotal, discount, total, appliedRule } = calculateTotals(cart);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleApplyDiscount = () => {
        setDiscountCode(localCodeInput);
        setKeyboardVisible(false);
    };

    const handleUpdateQuantity = (item: CartItem, change: number) => {
        const newQuantity = Math.max(0, item.quantity + change);
        onUpdateCart({ ...item, quantity: newQuantity });
    };

    const handleUpdateDeliveryType = (item: CartItem, newType: 'digital' | 'print' | 'both') => {
        onUpdateCart({ ...item, deliveryType: newType });
    };

    const handleClearCart = () => {
        if (window.confirm("Are you sure you want to remove all items from your cart?")) {
            cart.forEach(item => onUpdateCart({ ...item, quantity: 0 }));
        }
    };

    const handleAddPhotobook = () => {
        alert("Photobook builder launched! (Feature Coming Soon)");
    };

    if (isCheckingOut) {
        return <CheckoutScreen
            cart={cart}
            total={total}
            appliedDiscount={discount}
            onBack={() => setIsCheckingOut(false)}
            onCheckoutSuccess={onCheckoutSuccess}
        />
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
            <header className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <button onClick={onBack} className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-xl">Back to Photos</span>
                </button>
                <h1 className="text-3xl font-bold">Your Cart</h1>
                <div className="w-48"></div>
            </header>

            <main className="flex-1 p-8 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto w-full">
                <div className="lg:col-span-2 space-y-4">
                    {/* Upsell Banner */}
                    <AnimatePresence>
                        {itemCount >= 5 && (
                            <motion.div 
                                initial={{ opacity: 0, y: -20, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -20, height: 0 }}
                                className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg flex justify-between items-center shadow-sm overflow-hidden"
                            >
                                <div>
                                    <h3 className="font-bold text-lg text-yellow-800 dark:text-yellow-200">Create a Premium Photobook?</h3>
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300">You have enough photos to create a beautiful memory book.</p>
                                </div>
                                <button
                                    onClick={handleAddPhotobook}
                                    className="min-w-[44px] min-h-[44px] bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded shadow transition-colors touch-manipulation focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 whitespace-nowrap"
                                    aria-label="Preview photobook"
                                >
                                    Preview Book
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence mode="popLayout">
                        {cart.length > 0 ? cart.map(item => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                            >
                                <CartItemCard
                                    item={item}
                                    onUpdateQuantity={handleUpdateQuantity}
                                    onUpdateDeliveryType={handleUpdateDeliveryType}
                                    onRemove={() => onUpdateCart({ ...item, quantity: 0 })}
                                    formatCurrency={formatCurrency}
                                />
                            </motion.div>
                        )) : (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center justify-center h-full py-12"
                                role="status"
                                aria-live="polite"
                            >
                                <p className="text-xl text-center text-slate-500">Your cart is empty. Go back to the gallery to add photos.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <aside className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg flex flex-col relative overflow-hidden">
                    {/* Background decoration for active rule */}
                    <AnimatePresence>
                        {appliedRule && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="absolute -top-10 -right-10 w-40 h-40 bg-green-500/10 dark:bg-green-400/10 rounded-full blur-2xl pointer-events-none"
                            />
                        )}
                    </AnimatePresence>

                    <h2 className="text-2xl font-bold mb-4 relative z-10">Order Summary</h2>
                    <div className="space-y-2 relative z-10">
                        <div className="flex justify-between text-lg">
                            <span>Subtotal</span>
                            <motion.span
                                key={`subtotal-${subtotal}`}
                                initial={{ y: -10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            >
                                {formatCurrency(subtotal)}
                            </motion.span>
                        </div>
                        
                        <AnimatePresence mode="wait">
                            {discount > 0 && (
                                <motion.div
                                    key="discount-row"
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    className="flex justify-between text-lg text-green-600 dark:text-green-400 font-medium"
                                >
                                    <div className="flex flex-col">
                                        <span>Discount</span>
                                        {appliedRule && <span className="text-xs text-green-500">{appliedRule.description}</span>}
                                    </div>
                                    <motion.span
                                        key={`discount-${discount}`}
                                        initial={{ scale: 0.8 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                                    >
                                        -{formatCurrency(discount)}
                                    </motion.span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        <div className="flex justify-between text-2xl font-black mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <span>Total</span>
                            <motion.span
                                key={`total-${total}`}
                                initial={{ scale: 1.2, color: '#10b981' }}
                                animate={{ scale: 1, color: 'inherit' }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            >
                                {formatCurrency(total)}
                            </motion.span>
                        </div>
                    </div>
                    {cart.length > 0 && (
                        <div className="text-center mt-4">
                            <button
                                onClick={handleClearCart}
                                className="min-w-[44px] min-h-[44px] text-sm text-red-500 hover:underline touch-manipulation focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                aria-label="Clear all items from cart"
                            >
                                Clear Cart
                            </button>
                        </div>
                    )}
                    <div className="mt-6 flex space-x-2 relative z-10">
                        <input 
                            type="text" 
                            value={localCodeInput} 
                            readOnly 
                            onFocus={() => setKeyboardVisible(true)} 
                            placeholder="Promo Code" 
                            className="flex-1 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-lg p-3 uppercase font-bold" 
                        />
                        <button
                            onClick={handleApplyDiscount}
                            className="min-w-[44px] min-h-[44px] bg-slate-500 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg touch-manipulation focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors"
                            aria-label="Apply discount code"
                        >
                            Apply
                        </button>
                    </div>
                    <div className="mt-4 flex-grow relative z-10">
                        {keyboardVisible && (
                            <OnScreenKeyboard 
                                value={localCodeInput} 
                                onChange={setLocalCodeInput} 
                                onClose={() => setKeyboardVisible(false)} 
                            />
                        )}
                    </div>
                    <button
                        onClick={() => setIsCheckingOut(true)}
                        disabled={cart.length === 0}
                        className="min-h-[44px] w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-12 rounded-lg text-2xl disabled:bg-slate-500 touch-manipulation focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                        aria-label="Proceed to checkout"
                    >
                        Proceed to Checkout
                    </button>
                </aside>
            </main>
        </div>
    );
};

export default OrderConfigurationScreen;
