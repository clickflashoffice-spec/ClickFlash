import React, { useState, Suspense } from 'react';
import { Product, Photo, OrderItem } from '../../types';
import Modal from '../common/Modal.tsx';
import { useCurrency } from '../CurrencyContext.tsx';
import { apiService } from '../../services/apiService.ts';

const PaymentForm = React.lazy(() => import('./PaymentForm.tsx'));

interface ShopCartItem {
    id: string;
    product: Product;
    photo?: Photo;
    quantity: number;
}

interface CheckoutModalProps {
    isOpen: boolean;
    cart: ShopCartItem[];
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

    const handleCheckout = async () => {
        setIsLoading(true);

        const orderItems: OrderItem[] = cart.map(item => ({
            id: item.id,
            name: `${item.product.name} (Photo: ${item.photo?.title || 'N/A'})`,
            format: item.product.category,
            quantity: item.quantity,
            price: item.product.price,
            photo: item.photo,
        }));

        try {
            const newOrder = await apiService.createOrder({
                clientName,
                email,
                total,
                photographerId,
                destinationId,
                items: orderItems,
                appliedDiscount: 0,
            });
            onCheckoutSuccess(newOrder.id);
        } catch (error) {
            console.error("Failed to create order:", error);
            alert("There was an error placing your order. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const [showPayment, setShowPayment] = useState(false);

    const handleCheckoutSuccessLocal = () => {
        onCheckoutSuccess(`STRIPE-${Date.now()}`); // In real flow, get ID from PaymentIntent
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={showPayment ? "Secure Payment" : "Your Shopping Cart"} size="lg">
            {!showPayment ? (
                <>
                    {cart.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-slate-400">Your shopping cart is empty.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {cart.map(item => (
                                <div key={item.id} className="flex items-center space-x-4 p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                                    <img src={item.photo?.url} alt={item.product.name} className="w-20 h-20 object-cover rounded-md" />
                                    <div className="flex-1">
                                        <p className="font-bold">{item.product.name}</p>
                                        <p className="text-sm text-slate-400">With photo: "{item.photo?.title}"</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700">-</button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700">+</button>
                                    </div>
                                    <p className="font-semibold w-24 text-right">{formatCurrency(item.product.price * item.quantity)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="text-right mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400 text-xl">Total: </span>
                        <span className="text-3xl font-bold">{formatCurrency(total)}</span>
                    </div>
                </>
            ) : (
                <div className="mt-4">
                    <Suspense fallback={<div className="text-center p-4">Loading secure payment...</div>}>
                        <PaymentForm
                            amount={total}
                            orderId={`TEMP-${Date.now()}`} // Ideally create order first, then pay
                            email={email}
                            currency={currency.code.toLowerCase()}
                            onSuccess={handleCheckoutSuccessLocal}
                            onCancel={() => setShowPayment(false)}
                        />
                    </Suspense>
                </div>
            )}

            {!showPayment && (
                <div className="pt-6 flex justify-end space-x-3 border-t border-slate-200 dark:border-slate-700 mt-6">
                    <button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white font-semibold py-2 px-4 rounded-lg">Continue Shopping</button>
                    {/* Legacy Button */}
                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || isLoading}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg disabled:bg-slate-500"
                    >
                        {isLoading ? 'Processing...' : 'Pay Later (Room Charge)'}
                    </button>
                    {/* Stripe Button */}
                    <button
                        onClick={() => setShowPayment(true)}
                        disabled={cart.length === 0 || isLoading}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg disabled:bg-slate-500 shadow-lg"
                    >
                        Pay Now (Card)
                    </button>
                </div>
            )}
        </Modal>
    );
};

export default CheckoutModal;
