import React, { useState, Suspense } from 'react';
import { Product, Photo, OrderItem, Order } from '../../types';
import { cloudApiService } from '../../services/cloudApiService';
import Modal from '../common/Modal.tsx';
import { useCurrency } from '../CurrencyContext.tsx';
import type { CartItem } from '@clickflash/types';

// Local payment form removed in favor of Stripe Checkout redirect

interface CheckoutModalProps {
    isOpen: boolean;
    cart: CartItem[];
    total: number;
    onClose: () => void;
    onUpdateQuantity: (itemId: string, newQuantity: number) => void;
    clientName: string;
    email: string;
    photographerId: number;
    destinationId: string;
    onCheckoutSuccess: (orderId: string) => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, cart, total, onClose, onUpdateQuantity, clientName, email, photographerId, destinationId, onCheckoutSuccess }) => {
    const { formatCurrency, currency } = useCurrency();
    const [isLoading, setIsLoading] = useState(false);
    const [tipAmount, setTipAmount] = useState<number>(0);
    const [customTip, setCustomTip] = useState<string>('');
    const [isCustomTip, setIsCustomTip] = useState(false);

    const handleCheckout = async () => {
        setIsLoading(true);

        const orderItems: OrderItem[] = cart.map(item => ({
            id: item.id,
            name: `${item.name} (Photo: ${item.photo?.title || 'N/A'})`,
            format: item.format || 'Digital',
            quantity: item.quantity,
            price: item.price,
            photo: item.photo as Photo,
        }));

        try {
            const newOrder = await cloudApiService.createOrder({
                clientName,
                email,
                total: total + tipAmount,
                photographerId,
                destinationId,
                items: orderItems,
                appliedDiscount: 0,
                // Add tip if supported by DB schema, but the prompt mentioned tip columns are added
                tipAmount,
            } as unknown as Partial<Order>);
            onCheckoutSuccess(newOrder.id);
        } catch (error) {
            console.error("Failed to create order:", error);
            alert("There was an error placing your order. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStripeCheckout = async () => {
        setIsLoading(true);
        try {
            const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8090";
            const response = await fetch(`${baseUrl}/api/gallery/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart,
                    successUrl: window.location.origin + window.location.pathname + '?checkout=success',
                    cancelUrl: window.location.origin + window.location.pathname + '?checkout=cancel',
                    clientName,
                    email,
                    photographerId,
                    destinationId,
                    total: total + tipAmount,
                })
            });

            if (!response.ok) throw new Error("Failed to create checkout session");
            const data = await response.json();
            
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No URL returned from checkout session");
            }
        } catch (error) {
            console.error("Stripe Checkout Error:", error);
            alert("Payment failed to initialize. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Your Shopping Cart" size="lg">
            <>
                    {cart.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-slate-400">Your shopping cart is empty.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {cart.map(item => (
                                <div key={item.id} className="flex items-center space-x-4 p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                                    <img src={item.photo?.url} alt={item.name} className="w-20 h-20 object-cover rounded-md" />
                                    <div className="flex-1">
                                        <p className="font-bold">{item.name}</p>
                                        <p className="text-sm text-slate-400">With photo: "{item.photo?.title}"</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700">-</button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700">+</button>
                                    </div>
                                    <p className="font-semibold w-24 text-right">{formatCurrency(item.price * item.quantity)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                        <h3 className="font-semibold mb-3">Add a Tip for the Photographer?</h3>
                        <div className="flex flex-wrap gap-2">
                            {[0, 0.1, 0.15, 0.2].map((pct) => (
                                <button
                                    key={pct}
                                    onClick={() => {
                                        setTipAmount(total * pct);
                                        setIsCustomTip(false);
                                    }}
                                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                                        tipAmount === total * pct && !isCustomTip
                                            ? 'bg-cyan-500 text-white'
                                            : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    {pct === 0 ? 'No Tip' : `${pct * 100}% (${formatCurrency(total * pct)})`}
                                </button>
                            ))}
                            <button
                                onClick={() => setIsCustomTip(true)}
                                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                                    isCustomTip
                                        ? 'bg-cyan-500 text-white'
                                        : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                                }`}
                            >
                                Custom
                            </button>
                        </div>
                        {isCustomTip && (
                            <div className="mt-3 flex items-center space-x-2">
                                <span className="text-slate-500">{currency.symbol}</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={customTip}
                                    onChange={(e) => {
                                        setCustomTip(e.target.value);
                                        setTipAmount(Number(e.target.value) || 0);
                                    }}
                                    className="w-24 p-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded"
                                    placeholder="Amount"
                                />
                            </div>
                        )}
                    </div>
                    <div className="text-right mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="text-slate-500 dark:text-slate-400 mb-1">Subtotal: {formatCurrency(total)}</div>
                        {tipAmount > 0 && <div className="text-slate-500 dark:text-slate-400 mb-1">Tip: {formatCurrency(tipAmount)}</div>}
                        <div className="flex justify-end items-baseline space-x-2">
                            <span className="text-slate-500 dark:text-slate-400 text-xl">Total: </span>
                            <span className="text-3xl font-bold">{formatCurrency(total + tipAmount)}</span>
                        </div>
                    </div>
                </>
            
            <div className="pt-6 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700 mt-6">
                    <button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg">Continue Shopping</button>
                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || isLoading}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg disabled:bg-slate-500"
                    >
                        {isLoading ? 'Processing...' : 'Pay Later (Room Charge)'}
                    </button>
                    <button
                        onClick={handleStripeCheckout}
                        disabled={cart.length === 0 || isLoading}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg disabled:bg-slate-500 shadow-lg"
                    >
                        {isLoading ? 'Processing...' : 'Pay Now (Card)'}
                    </button>
                </div>
        </Modal>
    );
};

export default CheckoutModal;
