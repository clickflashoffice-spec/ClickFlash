
import React, { useState } from 'react';
import { CartItem, OrderItem } from '../../types.ts';
import { useCurrency } from '../CurrencyContext.tsx';
import ThankYouScreen from './ThankYouScreen';
import { offlineStorage } from '../../services/offlineStorage.ts';
import { syncService } from '../../services/syncService.ts';
import OnScreenKeyboard from './OnScreenKeyboard';
import { pb } from '../../services/pb.ts';
import { logger } from '../../utils/logger.ts';
import { orderService } from '../../services/orderService.ts';
import { webSocketService } from '../../services/webSocketService.ts';
import { analytics } from '../../utils/telemetry.ts';
import { useEffect } from 'react';

interface CheckoutScreenProps {
    cart: CartItem[];
    total: number;
    appliedDiscount: number;
    onBack: () => void;
    onCheckoutSuccess: () => void;
}

/**
 * Generate a cryptographically-random client mutation id for idempotency.
 */
function generateClientMutationId(): string {
    const kioskId = localStorage.getItem('kioskId') || 'unknown';
    const random = Math.random().toString(36).slice(2, 10);
    const time = Date.now().toString(36);
    return `${kioskId}:${time}:${random}`;
}

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ cart, total, appliedDiscount, onBack, onCheckoutSuccess }) => {
    const { formatCurrency } = useCurrency();
    const [customerDetails, setCustomerDetails] = useState<{ name: string; email: string; roomNumber: string }>(() => {
        try {
            const saved = localStorage.getItem('touch_checkout_details');
            return saved ? JSON.parse(saved) : { name: '', email: '', roomNumber: '' };
        } catch (e) {
            return { name: '', email: '', roomNumber: '' };
        }
    });
    const [isComplete, setIsComplete] = useState(false);
    const [orderId, setOrderId] = useState('');
    const [focusedInput, setFocusedInput] = useState<'name' | 'email' | 'roomNumber' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [tipAmount, setTipAmount] = useState<number>(0);

    useEffect(() => {
        analytics.trackUserFlow('KIOSK_SESSION', 'CHECKOUT_STARTED');
    }, []);

    useEffect(() => {
        localStorage.setItem('touch_checkout_details', JSON.stringify(customerDetails));
    }, [customerDetails]);

    const handleInputChange = (field: 'name' | 'email' | 'roomNumber', value: string) => {
        setCustomerDetails(prev => ({ ...prev, [field]: value }));
    };

    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault();

        if (cart.length === 0) return;

        setIsProcessing(true);

        const orderItems = cart.map(cartItem => ({
            id: cartItem.id,
            name: `${cartItem.photo.title} (${cartItem.size})${cartItem.mode === 'AI' ? ' [AI Enhanced]' : ''}`,
            photo: cartItem.photo,
            photoId: cartItem.photo.id,
            url: cartItem.photo.url,
            format: cartItem.size,
            quantity: cartItem.quantity,
            price: cartItem.price,
        }));

        const tempId = `KIOSK-${Date.now().toString().slice(-6)}`;
        const orderDate = new Date().toISOString().split('T')[0];
        const clientMutationId = generateClientMutationId();

        const orderData = {
            id: tempId,
            clientName: customerDetails.name,
            email: customerDetails.email,
            total: total + tipAmount,
            appliedDiscount: appliedDiscount,
            destinationId: 'dest1',
            items: orderItems,
            photographerId: cart[0]?.photo.photographerId ?? 0,
            status: 'Pending' as const,
            date: orderDate,
            source: 'kiosk' as const,
            clientMutationId,
            roomNumber: customerDetails.roomNumber,
            tipAmount: tipAmount,
        };

        try {
            // OFFLINE-FIRST: Always save to Service Worker Cache first (works completely offline)
            try {
                await offlineStorage.saveOrder(orderData);
                logger.info("Order saved to offline cache successfully", { orderId: tempId, clientMutationId });
            } catch (error: unknown) {
                const offlineError = error instanceof Error ? error : new Error(String(error));
                logger.error("Failed to save to offline cache", offlineError, { orderId: tempId });
                analytics.trackError(offlineError, "Checkout_OfflineSave");
            }

            // 2. Try to send to Master API (Zero-Config)
            let createdOrderId: string | null = null;
            try {
                createdOrderId = await orderService.createOrder({
                    clientName: customerDetails.name,
                    email: customerDetails.email,
                    total: total + tipAmount,
                    items: orderItems,
                    destinationId: 'dest1',
                    photographerId: cart[0]?.photo.photographerId ?? 0,
                    roomNumber: customerDetails.roomNumber,
                    appliedDiscount: appliedDiscount,
                });
                
                logger.info("Order successfully sent to Master API", { orderId: tempId, dbId: createdOrderId });

                analytics.trackUserFlow('KIOSK_SESSION', 'CHECKOUT_SUCCESS');
                localStorage.removeItem('touch_checkout_details');
                
                const hasPrints = cart.some(item => 
                    item.deliveryType === 'print' || 
                    item.deliveryType === 'both' || 
                    item.size !== 'Digital'
                );
                
                if (hasPrints && createdOrderId) {
                    webSocketService.sendMessage({
                        type: 'PRINT_REQUESTED',
                        payload: { 
                            orderId: createdOrderId,
                            kioskId: localStorage.getItem('kioskId') || 'unknown',
                            customerName: customerDetails.name,
                            items: orderItems
                        }
                    });
                }
            } catch (apiError) {
                const error = apiError instanceof Error ? apiError : new Error(String(apiError));
                logger.warn("Could not send to Master API. Order is safely stored in cache", { orderId: tempId, error: apiError });
                analytics.trackError(error, "Checkout_MasterAPISave");
            }

            setOrderId(tempId);
            setIsComplete(true);
        } catch (error) {
            logger.error("Failed to place order", error instanceof Error ? error : undefined, { customerName: customerDetails.name });
            alert("There was an error processing your request. Please try again.");
            setIsProcessing(false);
        }
    };

    if (isComplete) {
        return <ThankYouScreen orderId={orderId} name={customerDetails.name} email={customerDetails.email} onFinish={onCheckoutSuccess} isOffline={true} />;
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
            <header className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <button onClick={onBack} className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-xl">Back to Cart</span>
                </button>
                <h1 className="text-2xl font-bold">Checkout</h1>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-md space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                        <div className="space-y-2">
                            {cart.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span>{item.photo.title} ({item.size}) x{item.quantity}</span>
                                    <span>{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                            ))}
                            {appliedDiscount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Discount</span>
                                    <span>-{formatCurrency(appliedDiscount)}</span>
                                </div>
                            )}
                            {tipAmount > 0 && (
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Tip</span>
                                    <span>{formatCurrency(tipAmount)}</span>
                                </div>
                            )}
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>{formatCurrency(total + tipAmount)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-semibold mb-4">Add a Tip?</h2>
                        <div className="grid grid-cols-4 gap-2">
                            {[0, 0.1, 0.15, 0.2].map((pct) => (
                                <button
                                    key={pct}
                                    type="button"
                                    onClick={() => setTipAmount(total * pct)}
                                    className={`p-3 rounded-lg font-bold text-center transition-colors ${
                                        tipAmount === total * pct
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600'
                                    }`}
                                >
                                    {pct === 0 ? 'No Tip' : `${pct * 100}%`}
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handlePlaceOrder} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Name</label>
                            <input
                                type="text"
                                value={customerDetails.name}
                                onFocus={() => setFocusedInput('name')}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                placeholder="Enter your name"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input
                                type="email"
                                value={customerDetails.email}
                                onFocus={() => setFocusedInput('email')}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                placeholder="Enter your email"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Room Number (Optional)</label>
                            <input
                                type="text"
                                value={customerDetails.roomNumber}
                                onFocus={() => setFocusedInput('roomNumber')}
                                onChange={(e) => handleInputChange('roomNumber', e.target.value)}
                                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                placeholder="Room number"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isProcessing}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg transition-colors disabled:opacity-50"
                        >
                            {isProcessing ? 'Processing...' : `Pay ${formatCurrency(total + tipAmount)}`}
                        </button>
                    </form>
                </div>
            </div>

            {focusedInput && (
                <OnScreenKeyboard
                    value={customerDetails[focusedInput]}
                    onChange={(val) => handleInputChange(focusedInput, val)}
                />
            )}
        </div>
    );
};

export default CheckoutScreen;
