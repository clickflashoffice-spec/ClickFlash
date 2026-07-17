import { logger } from '@clickflash/logger';
import React, { useState } from 'react';
import type { CartItem } from '@clickflash/types';

import { config } from '../../utils/env';
import { getOrCreateCartSessionId } from '../../hooks/useCartSync';
import { moneyTrashService } from '../../services/moneyTrashService';
import Modal from '../common/Modal.tsx';
import { useCurrency } from '../CurrencyContext.tsx';

interface CheckoutModalProps {
    isOpen: boolean;
    cart: CartItem[];
    total: number;
    onClose: () => void;
    onUpdateQuantity: (itemId: string, newQuantity: number) => void;
    albumId: string;
    moneyTrashGalleryId?: string;
    moneyTrashPurchaseToken?: string;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
    isOpen,
    cart,
    total,
    onClose,
    onUpdateQuantity,
    albumId,
    moneyTrashGalleryId,
    moneyTrashPurchaseToken,
}) => {
    const { formatCurrency, currency } = useCurrency();
    const [isLoading, setIsLoading] = useState(false);

    const handleStripeCheckout = async () => {
        if (moneyTrashGalleryId && moneyTrashPurchaseToken) {
            setIsLoading(true);
            try {
                const checkout = await moneyTrashService.createCheckout(
                    moneyTrashPurchaseToken,
                    moneyTrashGalleryId,
                    cart.map((item) => item.photoId),
                );
                window.location.assign(checkout.url);
            } catch (error) {
                logger.error('MoneyTrash Stripe checkout failed', error);
                moneyTrashService.clearCheckoutSession();
                alert('Payment could not be initialized. Please refresh the gallery and try again.');
                setIsLoading(false);
            }
            return;
        }

        const token = localStorage.getItem('gallery_token');
        if (!token) {
            alert('Your secure session has expired. Please sign in again.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${config.apiUrl}/api/checkout`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: cart.map((item) => ({
                        productId: item.productId,
                        photoId: item.photoId,
                        quantity: item.quantity,
                    })),
                    cartSessionId: getOrCreateCartSessionId(),
                }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.url) {
                throw new Error(data.error || `Checkout failed (${response.status})`);
            }

            window.location.assign(data.url);
        } catch (error) {
            logger.error('Stripe checkout failed', error);
            alert('Payment could not be initialized. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Your Shopping Cart" size="lg">
            <div className="space-y-6">
                {cart.length === 0 ? (
                    <div className="py-10 text-center">
                        <p className="text-slate-400">Your shopping cart is empty.</p>
                    </div>
                ) : (
                    <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
                        {cart.map((item) => (
                            <div key={item.id} className="flex items-center space-x-4 rounded-lg bg-slate-100 p-2 dark:bg-slate-700/50">
                                <img src={item.photo?.url} alt={item.name} className="h-20 w-20 rounded-md object-cover" />
                                <div className="flex-1">
                                    <p className="font-bold">{item.name}</p>
                                    <p className="text-sm text-slate-400">Photo: {item.photo?.title || item.photoId}</p>
                                </div>
                                {moneyTrashGalleryId ? (
                                    <button
                                        type="button"
                                        onClick={() => onUpdateQuantity(item.id, 0)}
                                        className="rounded bg-slate-200 px-3 py-2 text-xs font-semibold dark:bg-slate-700"
                                    >
                                        Remove
                                    </button>
                                ) : (
                                    <div className="flex items-center space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                            className="h-8 w-8 rounded bg-slate-200 dark:bg-slate-700"
                                        >
                                            -
                                        </button>
                                        <span>{item.quantity}</span>
                                        <button
                                            type="button"
                                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                            className="h-8 w-8 rounded bg-slate-200 dark:bg-slate-700"
                                        >
                                            +
                                        </button>
                                    </div>
                                )}
                                <p className="w-24 text-right font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="border-t border-slate-200 pt-4 text-right dark:border-slate-700">
                    <span className="text-xl text-slate-500 dark:text-slate-400">Total: </span>
                    <span className="text-3xl font-bold">{formatCurrency(total)}</span>
                    {currency.code !== 'EUR' && (
                        <p className="mt-1 text-xs text-slate-500">Card checkout is securely settled in EUR.</p>
                    )}
                </div>

                <div className="flex justify-end space-x-3 border-t border-slate-200 pt-6 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-slate-200 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-300 dark:bg-slate-600 dark:text-white dark:hover:bg-slate-500"
                    >
                        Continue Shopping
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleStripeCheckout()}
                        disabled={cart.length === 0 || isLoading || (!albumId && !moneyTrashGalleryId)}
                        className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white shadow-lg hover:bg-green-700 disabled:bg-slate-500"
                    >
                        {isLoading ? 'Redirecting…' : 'Pay Securely by Card'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default CheckoutModal;
