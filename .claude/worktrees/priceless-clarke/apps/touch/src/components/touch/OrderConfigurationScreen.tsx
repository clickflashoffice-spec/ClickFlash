import React, { useState, useMemo } from 'react';
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

const OrderConfigurationScreen: React.FC<OrderConfigurationScreenProps> = ({ cart, onUpdateCart, onBack, onCheckoutSuccess }) => {
    const { formatCurrency } = useCurrency();
    const [discountCode, setDiscountCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(0);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
    const total = subtotal - appliedDiscount;
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleApplyDiscount = () => {
        if (discountCode.toUpperCase() === 'SAVE10') {
            setAppliedDiscount(subtotal * 0.1);
        } else {
            alert('Invalid discount code.');
        }
        setKeyboardVisible(false);
    };

    const handleUpdateQuantity = (item: CartItem, change: number) => {
        const newQuantity = item.quantity + change;
        onUpdateCart({ ...item, quantity: newQuantity });
    };

    const handleUpdateDeliveryType = (item: CartItem, newType: 'digital' | 'print' | 'both') => {
        // When changing delivery type, we might want to update the ID as well if it's used for uniqueness
        // But the onUpdateCart in App.tsx usually handles replacement based on item.id
        // Since deliveryType is part of the ID in PhotoPreviewScreen, we should preserve that logic if needed
        // However, here we are editing an EXISTING cart item.
        onUpdateCart({ ...item, deliveryType: newType });
    };

    const handleClearCart = () => {
        if (window.confirm("Are you sure you want to remove all items from your cart?")) {
            cart.forEach(item => onUpdateCart({ ...item, quantity: 0 }));
        }
    };

    const handleAddPhotobook = () => {
        alert("Photobook builder launched! (Feature Coming Soon)");
        // Logic to add photobook product to cart would go here
    };

    if (isCheckingOut) {
        return <CheckoutScreen
            cart={cart}
            total={total}
            appliedDiscount={appliedDiscount}
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
                    {itemCount >= 5 && (
                        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg flex justify-between items-center shadow-sm">
                            <div>
                                <h3 className="font-bold text-lg text-yellow-800 dark:text-yellow-200">Create a Premium Photobook?</h3>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300">You have enough photos to create a beautiful memory book.</p>
                            </div>
                            <button
                                onClick={handleAddPhotobook}
                                className="min-w-[44px] min-h-[44px] bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded shadow transition-colors touch-manipulation focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                                aria-label="Preview photobook"
                            >
                                Preview Book
                            </button>
                        </div>
                    )}

                    {cart.length > 0 ? cart.map(item => (
                        <CartItemCard
                            key={item.id}
                            item={item}
                            onUpdateQuantity={handleUpdateQuantity}
                            onUpdateDeliveryType={handleUpdateDeliveryType}
                            onRemove={() => onUpdateCart({ ...item, quantity: 0 })}
                            formatCurrency={formatCurrency}
                        />
                    )) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-xl text-center text-slate-500">Your cart is empty. Go back to the gallery to add photos.</p>
                        </div>
                    )}
                </div>
                <aside className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg flex flex-col">
                    <h2 className="text-2xl font-bold mb-4">Order Summary</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between text-lg"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                        <div className="flex justify-between text-lg text-green-500 dark:text-green-400"><span>Discount</span><span>-{formatCurrency(appliedDiscount)}</span></div>
                        <div className="flex justify-between text-2xl font-bold mt-4 pt-4 border-t border-slate-200 dark:border-slate-700"><span>Total</span><span>{formatCurrency(total)}</span></div>
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
                    <div className="mt-6 flex space-x-2">
                        <input type="text" value={discountCode} readOnly onFocus={() => setKeyboardVisible(true)} placeholder="Discount Code" className="flex-1 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-lg p-3" />
                        <button
                            onClick={handleApplyDiscount}
                            className="min-w-[44px] min-h-[44px] bg-slate-500 text-white font-semibold py-3 px-6 rounded-lg touch-manipulation focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                            aria-label="Apply discount code"
                        >
                            Apply
                        </button>
                    </div>
                    <div className="mt-4 flex-grow">{keyboardVisible && <OnScreenKeyboard value={discountCode} onChange={setDiscountCode} />}</div>
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
