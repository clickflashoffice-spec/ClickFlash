import { Modal } from '@clickflash/ui';
import { logger } from '@clickflash/logger';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { CartItem } from '@clickflash/types';

import { config } from '../../utils/env';
import { getOrCreateCartSessionId } from '../../hooks/useCartSync';
import { moneyTrashService } from '../../services/moneyTrashService';
import { cloudApiService } from '../../services/cloudApiService';

import { useCurrency } from '../CurrencyContext.tsx';
import UpsellEngine from './UpsellEngine.tsx';

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
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [enableFiscalFriction, setEnableFiscalFriction] = useState(false);
    const [fiscalData, setFiscalData] = useState({
        entityName: '',
        taxId: '',
        billingAddress: '',
        certifiedReceipt: true,
    });

    const [discountCode, setDiscountCode] = useState<string>('');
    const [discountPercent, setDiscountPercent] = useState<number>(0);
    const [discountApplied, setDiscountApplied] = useState<boolean>(false);

    useEffect(() => {
        if (isOpen && localStorage.getItem('clickflash_share15_unlocked') === 'true') {
            setDiscountCode('SHARE15');
            setDiscountPercent(15);
            setDiscountApplied(true);
        }
    }, [isOpen]);

    const discountAmount = discountApplied ? (total * discountPercent) / 100 : 0;
    const finalTotal = Math.max(0, total - discountAmount);

    const handleApplyPromoCode = () => {
        if (discountCode.trim().toUpperCase() === 'SHARE15') {
            setDiscountPercent(15);
            setDiscountApplied(true);
        } else {
            alert('Invalid promo code. Share to unlock SHARE15 for 15% OFF!');
        }
    };

    const handleStripeCheckout = async () => {
        if (enableFiscalFriction) {
            logger.info('Checkout initiated with optional fiscal friction', { fiscalData });
        }

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
                    fiscalMetadata: enableFiscalFriction ? fiscalData : undefined,
                    discountCode: discountApplied ? discountCode : undefined,
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

    const handleCashCheckout = async () => {
        setIsLoading(true);
        try {
            await cloudApiService.notifyCashPending(cart.map((item) => ({
                id: item.photoId,
                title: item.name,
                price: item.price,
                quantity: item.quantity,
                type: 'digital'
            })));
            alert('Please hand the cash to the photographer. They will confirm the payment on their app.');
            onClose();
        } catch (error) {
            logger.error('Cash checkout failed', error);
            alert('Could not notify photographer. Please try again.');
        } finally {
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
                            <div key={item.id} className="flex items-center space-x-4 rounded-2xl bg-slate-900/60 p-3 border border-white/5">
                                <img src={item.photo?.url} alt={item.name} className="h-20 w-20 rounded-xl object-cover" />
                                <div className="flex-1">
                                    <p className="font-bold text-white">{item.name}</p>
                                    <p className="text-sm text-slate-400">Photo: {item.photo?.title || item.photoId}</p>
                                </div>
                                {moneyTrashGalleryId ? (
                                    <button
                                        type="button"
                                        onClick={() => onUpdateQuantity(item.id, 0)}
                                        className="rounded-xl min-h-[48px] bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all"
                                    >
                                        Remove
                                    </button>
                                ) : (
                                    <div className="flex items-center space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                            className="h-12 w-12 rounded-xl bg-slate-800 text-slate-200 border border-white/10 hover:bg-slate-700 flex items-center justify-center transition-all"
                                        >
                                            -
                                        </button>
                                        <span className="text-lg font-bold text-white w-6 text-center">{item.quantity}</span>
                                        <button
                                            type="button"
                                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                            className="h-12 w-12 rounded-xl bg-slate-800 text-slate-200 border border-white/10 hover:bg-slate-700 flex items-center justify-center transition-all"
                                        >
                                            +
                                        </button>
                                    </div>
                                )}
                                <p className="w-24 text-right font-black text-cyan-400 tracking-wider">{formatCurrency(item.price * item.quantity)}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Optional Fiscal Friction Toggle */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm font-bold text-white uppercase tracking-wider">
                                Need Certified Fiscal Receipt / Invoice?
                            </span>
                            <p className="text-xs text-slate-400 mt-1">
                                Optional fiscal identification (VAT, CF, SDI, or PEC) for B2B and tax compliance.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setEnableFiscalFriction(!enableFiscalFriction)}
                            className={`relative inline-flex min-h-[48px] items-center w-16 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                enableFiscalFriction ? 'bg-cyan-500' : 'bg-slate-800'
                            }`}
                        >
                            <span
                                className={`inline-block h-10 w-10 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    enableFiscalFriction ? 'translate-x-5' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>

                    {enableFiscalFriction && (
                        <div className="mt-6 space-y-4 border-t border-white/10 pt-5 text-left animate-in fade-in duration-300">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                                    Company / Full Legal Name
                                </label>
                                <input
                                    type="text"
                                    value={fiscalData.entityName}
                                    onChange={(e) => setFiscalData({ ...fiscalData, entityName: e.target.value })}
                                    placeholder="e.g. ClickFlash Attraction S.r.l. or Mario Rossi"
                                    className="mt-2 w-full min-h-[48px] rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                                    Fiscal Code / VAT Number (Partita IVA / Sdi / PEC)
                                </label>
                                <input
                                    type="text"
                                    value={fiscalData.taxId}
                                    onChange={(e) => setFiscalData({ ...fiscalData, taxId: e.target.value })}
                                    placeholder="e.g. IT12345678901 or CF12345ABC"
                                    className="mt-2 w-full min-h-[48px] rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white uppercase focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                                    Billing Address
                                </label>
                                <input
                                    type="text"
                                    value={fiscalData.billingAddress}
                                    onChange={(e) => setFiscalData({ ...fiscalData, billingAddress: e.target.value })}
                                    placeholder="Street, City, Postal Code, Country"
                                    className="mt-2 w-full min-h-[48px] rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-3">
                                <input
                                    type="checkbox"
                                    id="certifiedReceipt"
                                    checked={fiscalData.certifiedReceipt}
                                    onChange={(e) => setFiscalData({ ...fiscalData, certifiedReceipt: e.target.checked })}
                                    className="h-6 w-6 rounded border-white/10 bg-black/40 text-cyan-500 focus:ring-cyan-500"
                                />
                                <label htmlFor="certifiedReceipt" className="text-xs text-slate-300">
                                    Request certified e-invoice generation (automatically sent via ClickFlash Fiscal AI)
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Upsell Engine Banner */}
                <UpsellEngine
                    galleryId={albumId || 'gallery'}
                    onUnlock={(code, percent) => {
                        setDiscountCode(code);
                        setDiscountPercent(percent);
                        setDiscountApplied(true);
                    }}
                />

                {/* Promo Code Input Row */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                            {t('checkout.discountCodeLabel')}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={discountCode}
                                onChange={(e) => setDiscountCode(e.target.value)}
                                placeholder="e.g. SHARE15"
                                disabled={discountApplied}
                                className="w-full min-h-[44px] rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-sm font-bold uppercase text-white tracking-wider focus:border-cyan-500 focus:outline-none disabled:text-emerald-400 transition-all"
                            />
                            {!discountApplied ? (
                                <button
                                    type="button"
                                    onClick={handleApplyPromoCode}
                                    className="rounded-xl px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition-all"
                                >
                                    {t('checkout.applyCode')}
                                </button>
                            ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider">
                                    ✓ {t('checkout.discountApplied')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-6 text-right">
                    {discountApplied && (
                        <div className="mb-2 text-sm text-slate-400">
                            <span className="line-through mr-2">{formatCurrency(total)}</span>
                            <span className="text-emerald-400 font-bold">(-{discountPercent}%)</span>
                        </div>
                    )}
                    <span className="text-xl font-bold uppercase tracking-widest text-slate-400">
                        {discountApplied ? t('checkout.totalAfterDiscount') : 'Total'}:{' '}
                    </span>
                    <span className="text-4xl font-black text-cyan-400">{formatCurrency(finalTotal)}</span>
                    {currency.code !== 'EUR' && (
                        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-500">Card checkout is securely settled in EUR.</p>
                    )}
                </div>

                <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl min-h-[48px] px-6 py-2 font-bold uppercase tracking-widest text-slate-400 bg-slate-800 border border-white/10 hover:bg-slate-700 hover:text-white transition-all flex-1 sm:flex-none"
                    >
                        Continue Shopping
                    </button>
                    {!moneyTrashGalleryId && (
                        <button
                            type="button"
                            onClick={() => void handleCashCheckout()}
                            disabled={cart.length === 0 || isLoading || !albumId}
                            className="rounded-xl min-h-[48px] px-6 py-2 font-bold uppercase tracking-widest text-white shadow-lg bg-violet-600 hover:bg-violet-500 border border-violet-400/50 disabled:bg-slate-800 disabled:border-transparent transition-all flex-1 sm:flex-none"
                        >
                            {isLoading ? 'Processing…' : 'Pay Cash'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => void handleStripeCheckout()}
                        disabled={cart.length === 0 || isLoading || (!albumId && !moneyTrashGalleryId)}
                        className="rounded-xl min-h-[48px] px-6 py-2 font-bold uppercase tracking-widest text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] bg-cyan-600 hover:bg-cyan-500 border border-cyan-400/50 disabled:bg-slate-800 disabled:border-transparent disabled:shadow-none transition-all flex-1 sm:flex-none"
                    >
                        {isLoading ? 'Redirecting…' : 'Pay Securely by Card'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default CheckoutModal;
