
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

interface CheckoutScreenProps {
    cart: CartItem[];
    total: number;
    appliedDiscount: number;
    onBack: () => void;
    onCheckoutSuccess: () => void;
}

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ cart, total, appliedDiscount, onBack, onCheckoutSuccess }) => {
    const { formatCurrency } = useCurrency();
    const [customerDetails, setCustomerDetails] = useState({ name: '', email: '', roomNumber: '' });
    const [isComplete, setIsComplete] = useState(false);
    const [orderId, setOrderId] = useState('');
    const [focusedInput, setFocusedInput] = useState<'name' | 'email' | 'roomNumber' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleInputChange = (field: 'name' | 'email' | 'roomNumber', value: string) => {
        setCustomerDetails(prev => ({ ...prev, [field]: value }));
    };

    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault();

        if (cart.length === 0) return;

        setIsProcessing(true);

        // Transform CartItems to OrderItems for the backend
        // CRITICAL: Must include photoId for export service to work
        const orderItems = cart.map(cartItem => ({
            id: cartItem.id,
            name: `${cartItem.photo.title} (${cartItem.size})${cartItem.mode === 'AI' ? ' [AI Enhanced]' : ''}`,
            photo: cartItem.photo,
            photoId: cartItem.photo.id, // REQUIRED for export-to-master
            url: cartItem.photo.url,
            format: cartItem.size,
            quantity: cartItem.quantity,
            price: cartItem.price,
        }));

        // Generate a temporary ID for local tracking
        const tempId = `KIOSK-${Date.now().toString().slice(-6)}`;
        const orderDate = new Date().toISOString().split('T')[0];

        const orderData = {
            id: tempId,
            clientName: customerDetails.name,
            email: customerDetails.email,
            total: total,
            appliedDiscount: appliedDiscount,
            destinationId: 'dest1',
            items: orderItems,
            photographerId: cart[0]?.photo.photographerId ?? 0,
            status: 'Pending' as const,
            date: orderDate,
            source: 'kiosk' as const // Orders from Touch Kiosk tablets
        };

        try {
            // OFFLINE-FIRST: Always save to Service Worker Cache first (works completely offline)
            // This ensures orders are never lost even if PocketBase is unavailable
            try {
                await offlineStorage.saveOrder(orderData);
                logger.info("Order saved to offline cache successfully", { orderId: tempId });
            } catch (error: unknown) {
                const offlineError = error instanceof Error ? error : new Error(String(error));
                logger.error("Failed to save to offline cache", offlineError, { orderId: tempId });
                // Even if offline cache fails, we should still try PocketBase
            }

            // 2. Try to save to Local Database Engine (PocketBase) if available
            // This is optional - order is already safely stored offline
            let createdOrderId: string | null = null;
            try {

                const createdOrder = await pb.collection('orders').create({
                    clientName: customerDetails.name,
                    email: customerDetails.email,
                    total: total,
                    status: 'Pending',
                    items: orderItems, // Send as array, not JSON string
                    date: orderDate, // Required field
                    destinationId: 'dest1',
                    photographerId: cart[0]?.photo.photographerId ?? 0,
                    roomNumber: customerDetails.roomNumber,
                    appliedDiscount: appliedDiscount
                });
                createdOrderId = createdOrder.id;
                logger.info("Order also saved to local DB successfully", { orderId: tempId, dbId: createdOrderId });

                // Trigger immediate sync to push order to Master
                syncService.sync().catch(err => logger.warn("Failed to trigger immediate sync", { error: err }));
            } catch (dbError) {
                // PocketBase unavailable - that's OK, order is already in offline cache
                logger.warn("Could not save to local DB (offline mode). Order is safely stored in cache", { orderId: tempId, error: dbError });
            }

            // 3. Export order to Master's orders folder (if database save succeeded)
            if (createdOrderId) {
                try {
                    const exportResponse = await fetch(`${pb.baseUrl}/api/orders/${createdOrderId}/export-to-master`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    if (exportResponse.ok) {
                        const exportResult = await exportResponse.json();
                        logger.info("Order exported to Master successfully", {
                            orderId: createdOrderId,
                            folderName: exportResult.folderName,
                            photosCopied: exportResult.photosCopied
                        });
                    } else {
                        logger.warn("Failed to export order to Master", {
                            orderId: createdOrderId,
                            status: exportResponse.status
                        });
                    }
                } catch (exportError) {
                    logger.warn("Could not export order to Master", {
                        orderId: createdOrderId,
                        error: exportError instanceof Error ? exportError.message : String(exportError)
                    });
                    // Don't fail the checkout if export fails - order is still saved
                }
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
                <h1 className="text-3xl font-bold">Checkout</h1>
                <div className="w-48"></div>
            </header>
            <main className="flex-1 p-8 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
                <div className="flex flex-col">
                    <form onSubmit={handlePlaceOrder} className="space-y-6">
                        <h2 className="text-2xl font-bold">Your Information</h2>
                        <label htmlFor="name" className="sr-only">Full Name</label>
                        <input id="name" type="text" name="name" value={customerDetails.name} onFocus={() => setFocusedInput('name')} placeholder="Full Name" required readOnly autoComplete="name" className="w-full text-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg p-3" />
                        <label htmlFor="email" className="sr-only">Email Address</label>
                        <input id="email" type="email" name="email" value={customerDetails.email} onFocus={() => setFocusedInput('email')} placeholder="Email Address" required readOnly autoComplete="email" className="w-full text-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg p-3" />
                        <label htmlFor="roomNumber" className="sr-only">Room Number</label>
                        <input id="roomNumber" type="text" name="roomNumber" value={customerDetails.roomNumber} onFocus={() => setFocusedInput('roomNumber')} placeholder="Room Number (for billing)" readOnly autoComplete="off" className="w-full text-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg p-3" />
                        <p className="text-sm text-slate-500">Payment will be charged to your room. Please confirm your details are correct.</p>
                        <button type="submit" disabled={isProcessing} className="w-full mt-8 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-12 rounded-lg text-2xl disabled:bg-slate-500 disabled:cursor-wait">
                            {isProcessing ? 'Processing...' : 'Place Order'}
                        </button>
                    </form>
                    {focusedInput && (
                        <div className="mt-auto pt-4">
                            <OnScreenKeyboard
                                value={customerDetails[focusedInput]}
                                onChange={(val) => handleInputChange(focusedInput, val)}
                            />
                        </div>
                    )}
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg">
                    <h2 className="text-2xl font-bold mb-4">Order Summary</h2>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {cart.map(item => (
                            <div key={item.id} className="flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{item.quantity}x {item.photo.title}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.size}{item.mode === 'AI' ? ' (AI Enhanced)' : ''}</p>
                                </div>
                                <p className="font-mono">{formatCurrency(item.price * item.quantity)}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline text-2xl">
                        <span className="font-semibold">Total</span>
                        <span className="font-bold">{formatCurrency(total)}</span>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CheckoutScreen;
