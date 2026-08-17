import { logger } from '@clickflash/logger';
import type { CartItem } from '@clickflash/types';
import { Modal } from '@clickflash/ui';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import {
  loadStripe,
  type Appearance,
} from '@stripe/stripe-js';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrency } from '@/components/CurrencyContext.tsx';
import UpsellEngine from '@/components/customer/UpsellEngine.tsx';
import { getOrCreateCartSessionId } from '@/hooks/useCartSync';
import { cloudApiService } from '@/services/cloudApiService';
import { moneyTrashService } from '@/services/moneyTrashService';
import { config } from '@/utils/env';

interface CheckoutModalProps {
  isOpen: boolean;
  cart: CartItem[];
  total: number;
  onClose: () => void;
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onPaymentComplete?: (paymentIntentId: string) => void;
  albumId: string;
  moneyTrashGalleryId?: string;
  moneyTrashPurchaseToken?: string;
}

interface PaymentIntentPayload {
  clientSecret: string;
  paymentIntentId: string;
}

interface EmbeddedPaymentFormProps {
  amountLabel: string;
  onBack: () => void;
  onComplete: (paymentIntentId: string) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parsePaymentIntentPayload = (value: unknown): PaymentIntentPayload | null => {
  if (!isRecord(value)) return null;
  const clientSecret = value.clientSecret;
  const paymentIntentId = value.paymentIntentId;
  if (typeof clientSecret !== 'string' || !clientSecret.startsWith('pi_')) return null;
  if (typeof paymentIntentId !== 'string' || !paymentIntentId.startsWith('pi_')) return null;
  return { clientSecret, paymentIntentId };
};

const getErrorMessage = (value: unknown, fallback: string): string => {
  if (!isRecord(value)) return fallback;
  return typeof value.error === 'string' ? value.error : fallback;
};

export const stripeNightAppearance: Appearance = {
  theme: 'night',
  variables: {
    colorPrimary: '#22d3ee',
    colorBackground: '#07111f',
    colorText: '#f8fafc',
    colorDanger: '#fb7185',
    colorTextSecondary: '#94a3b8',
    borderRadius: '14px',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    spacingUnit: '5px',
  },
  rules: {
    '.Input': {
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 16px 50px rgba(2, 8, 23, 0.35)',
    },
    '.Input:focus': {
      border: '1px solid #22d3ee',
      boxShadow: '0 0 0 3px rgba(34, 211, 238, 0.16)',
    },
    '.Label': {
      color: '#cbd5e1',
      fontWeight: '700',
      letterSpacing: '0.04em',
    },
  },
};

const stripePromise = config.stripeKey ? loadStripe(config.stripeKey) : null;

const EmbeddedPaymentForm: React.FC<EmbeddedPaymentFormProps> = ({
  amountLabel,
  onBack,
  onComplete,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements || isSubmitting) return;

    setIsSubmitting(true);
    setPaymentError(null);
    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.set('checkout', 'success');

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl.toString() },
        redirect: 'if_required',
      });

      if (result.error) {
        setPaymentError(result.error.message || 'Payment could not be confirmed.');
        return;
      }

      if (result.paymentIntent) {
        onComplete(result.paymentIntent.id);
        return;
      }

      setPaymentError('Payment confirmation did not return a result. Please try again.');
    } catch (error) {
      logger.error('Stripe Elements confirmation failed', error);
      setPaymentError('Payment could not be confirmed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 sm:p-6">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      {paymentError && (
        <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {paymentError}
        </p>
      )}
      <div className="sticky bottom-0 z-20 -mx-1 flex gap-3 border-t border-white/10 bg-slate-950/95 px-1 py-4 backdrop-blur-xl">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="min-h-[48px] flex-1 rounded-xl border border-white/10 bg-slate-800 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || isSubmitting}
          className="min-h-[48px] flex-[2] rounded-xl border border-cyan-300/50 bg-cyan-500 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.3)] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {isSubmitting ? 'Confirming…' : `Pay ${amountLabel}`}
        </button>
      </div>
    </form>
  );
};

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  cart,
  total,
  onClose,
  onUpdateQuantity,
  onPaymentComplete,
  albumId,
  moneyTrashGalleryId,
  moneyTrashPurchaseToken,
}) => {
  const { formatCurrency, currency } = useCurrency();
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [enableFiscalFriction, setEnableFiscalFriction] = useState(false);
  const [fiscalData, setFiscalData] = useState({
    entityName: '',
    taxId: '',
    billingAddress: '',
    certifiedReceipt: true,
  });
  const [discountCode, setDiscountCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountApplied, setDiscountApplied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setClientSecret(null);
    setCheckoutError(null);
    setIsLoading(false);
    if (localStorage.getItem('clickflash_share15_unlocked') === 'true') {
      setDiscountCode('SHARE15');
      setDiscountPercent(15);
      setDiscountApplied(true);
    }
  }, [isOpen]);

  const discountAmount = discountApplied ? (total * discountPercent) / 100 : 0;
  const finalTotal = Math.max(0, total - discountAmount);
  const elementsOptions = useMemo(() => clientSecret ? ({
    clientSecret,
    appearance: stripeNightAppearance,
  }) : null, [clientSecret]);

  const handleApplyPromoCode = () => {
    if (discountCode.trim().toUpperCase() === 'SHARE15') {
      setDiscountCode('SHARE15');
      setDiscountPercent(15);
      setDiscountApplied(true);
      return;
    }
    setCheckoutError('Invalid promo code. Share to unlock SHARE15 for 15% off.');
  };

  const createPaymentIntent = async () => {
    if (!stripePromise) {
      setCheckoutError('Card payments are not configured for this gallery.');
      return;
    }

    const token = localStorage.getItem('gallery_token');
    if (!token) {
      setCheckoutError('Your secure session has expired. Please sign in again.');
      return;
    }

    setIsLoading(true);
    setCheckoutError(null);
    const cartSessionId = getOrCreateCartSessionId();

    try {
      const response = await fetch(`${config.apiUrl}/api/payments/create-intent`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `gallery-elements-${cartSessionId}`,
        },
        body: JSON.stringify({
          orderId: albumId,
          amount: Math.round(finalTotal * 100),
          currency: 'eur',
          metadata: {
            cartSessionId,
            itemCount: String(cart.length),
            fiscalReceipt: String(enableFiscalFriction),
          },
          fiscalMetadata: enableFiscalFriction ? fiscalData : undefined,
          discountCode: discountApplied ? discountCode : undefined,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const parsed = parsePaymentIntentPayload(payload);
      if (!response.ok || !parsed) {
        throw new Error(getErrorMessage(payload, `Checkout failed (${response.status})`));
      }
      setClientSecret(parsed.clientSecret);
      setStep(2);
    } catch (error) {
      logger.error('Stripe Elements initialization failed', error);
      setCheckoutError(error instanceof Error ? error.message : 'Payment could not be initialized.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHostedMoneyTrashCheckout = async () => {
    if (!moneyTrashGalleryId || !moneyTrashPurchaseToken) return;
    setIsLoading(true);
    setCheckoutError(null);
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
      setCheckoutError('Payment could not be initialized. Please refresh and try again.');
      setIsLoading(false);
    }
  };

  const handleCashCheckout = async () => {
    setIsLoading(true);
    setCheckoutError(null);
    try {
      await cloudApiService.notifyCashPending(cart.map((item) => ({
        id: item.photoId,
        title: item.name,
        price: item.price,
        quantity: item.quantity,
        type: 'digital',
      })));
      window.alert('Please hand the cash to the photographer. They will confirm the payment on their app.');
      onClose();
    } catch (error) {
      logger.error('Cash checkout failed', error);
      setCheckoutError('Could not notify the photographer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const completePayment = (paymentIntentId: string) => {
    if (onPaymentComplete) onPaymentComplete(paymentIntentId);
    else onClose();
  };

  const goToPayment = () => {
    if (moneyTrashGalleryId) {
      setStep(2);
      return;
    }
    void createPaymentIntent();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Secure Checkout" size="lg">
      <div className="space-y-5">
        <ol className="flex items-center gap-3" aria-label="Checkout progress">
          {[1, 2].map((number) => (
            <li key={number} className="flex flex-1 items-center gap-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-black ${step >= number ? 'border-cyan-300 bg-cyan-500 text-slate-950' : 'border-white/10 bg-slate-900 text-slate-500'}`}>
                {number}
              </span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${step >= number ? 'text-white' : 'text-slate-500'}`}>
                {number === 1 ? 'Review' : 'Payment'}
              </span>
              {number === 1 && <span className="h-px flex-1 bg-white/10" />}
            </li>
          ))}
        </ol>

        {checkoutError && (
          <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {checkoutError}
          </p>
        )}

        {step === 1 ? (
          <>
            {cart.length === 0 ? (
              <div className="py-10 text-center text-slate-400">Your shopping cart is empty.</div>
            ) : (
              <div className="max-h-[34vh] space-y-3 overflow-y-auto pr-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-900/60 p-3 relative overflow-hidden group">
                    <img src={item.photo?.url || '/assets/placeholder-cart.png'} alt={item.name} className="h-16 w-16 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                          (item as any).type === 'physical' ? 'bg-amber-500/20 text-amber-300' :
                          (item as any).type === 'reel' ? 'bg-purple-500/20 text-purple-300' :
                          (item as any).type === '3d-figure' ? 'bg-pink-500/20 text-pink-300' :
                          (item as any).type === 'magic-shot' ? 'bg-blue-500/20 text-blue-300' :
                          (item as any).type === 'pass' ? 'bg-emerald-500/20 text-emerald-300' :
                          'bg-cyan-500/20 text-cyan-300'
                        }`}>
                          {(item as any).type || item.format || 'Digital'}
                        </span>
                      </div>
                      <p className="truncate font-bold text-white text-sm">{item.name}</p>
                      <p className="text-xs text-slate-400">{formatCurrency(item.price)} each</p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-950/50 rounded-xl border border-white/5 p-1">
                      <button type="button" aria-label={`Decrease ${item.name} quantity`} onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors">−</button>
                      <span className="w-4 text-center font-bold text-white text-xs">{item.quantity}</span>
                      <button type="button" aria-label={`Increase ${item.name} quantity`} onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors">+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-white">Certified receipt or invoice</p>
                  <p className="mt-1 text-xs text-slate-400">Optional fiscal details for business and tax compliance.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enableFiscalFriction}
                  aria-label="Include fiscal invoice details"
                  onClick={() => setEnableFiscalFriction((value) => !value)}
                  className={`relative h-12 w-16 shrink-0 rounded-full ${enableFiscalFriction ? 'bg-cyan-500' : 'bg-slate-700'}`}
                >
                  <span className={`absolute top-1 h-10 w-10 rounded-full bg-white transition-transform ${enableFiscalFriction ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
              {enableFiscalFriction && (
                <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
                  <input aria-label="Company or legal name" value={fiscalData.entityName} onChange={(event) => setFiscalData({ ...fiscalData, entityName: event.target.value })} placeholder="Company / legal name" className="min-h-[48px] rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-white" />
                  <input aria-label="Fiscal code or VAT number" value={fiscalData.taxId} onChange={(event) => setFiscalData({ ...fiscalData, taxId: event.target.value })} placeholder="Fiscal code / VAT" className="min-h-[48px] rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-white" />
                  <input aria-label="Billing address" value={fiscalData.billingAddress} onChange={(event) => setFiscalData({ ...fiscalData, billingAddress: event.target.value })} placeholder="Billing address" className="min-h-[48px] rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-white sm:col-span-2" />
                </div>
              )}
            </div>

            <UpsellEngine galleryId={albumId || 'gallery'} onUnlock={(code, percent) => {
              setDiscountCode(code);
              setDiscountPercent(percent);
              setDiscountApplied(true);
            }} />

            <div className="flex gap-2 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <input value={discountCode} onChange={(event) => setDiscountCode(event.target.value)} placeholder={t('checkout.discountCodeLabel')} disabled={discountApplied} className="min-h-[48px] min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-4 text-sm font-bold uppercase text-white" />
              <button type="button" onClick={handleApplyPromoCode} disabled={discountApplied} className="min-h-[48px] rounded-xl bg-cyan-600 px-4 text-xs font-black uppercase tracking-wider text-white disabled:bg-emerald-700">
                {discountApplied ? t('checkout.discountApplied') : t('checkout.applyCode')}
              </button>
            </div>

            <div className="text-right">
              {discountApplied && <p className="text-sm text-emerald-400"><span className="mr-2 text-slate-500 line-through">{formatCurrency(total)}</span>−{discountPercent}%</p>}
              <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Total <span className="ml-2 text-3xl font-black text-cyan-400">{formatCurrency(finalTotal)}</span></p>
              {currency.code !== 'EUR' && <p className="mt-1 text-xs text-slate-500">Card checkout is securely settled in EUR.</p>}
            </div>

            <div className="sticky bottom-0 z-20 -mx-1 flex flex-wrap gap-3 border-t border-white/10 bg-slate-950/95 px-1 py-4 backdrop-blur-xl">
              <button type="button" onClick={onClose} className="min-h-[48px] flex-1 rounded-xl border border-white/10 bg-slate-800 px-5 text-xs font-black uppercase tracking-widest text-slate-300">Continue shopping</button>
              {!moneyTrashGalleryId && <button type="button" onClick={() => void handleCashCheckout()} disabled={cart.length === 0 || isLoading || !albumId} className="min-h-[48px] flex-1 rounded-xl border border-violet-400/40 bg-violet-600 px-5 text-xs font-black uppercase tracking-widest text-white disabled:bg-slate-700">Pay cash</button>}
              <button type="button" onClick={goToPayment} disabled={cart.length === 0 || finalTotal <= 0 || isLoading || (!albumId && !moneyTrashGalleryId)} className="min-h-[48px] flex-[2] rounded-xl border border-cyan-300/50 bg-cyan-500 px-5 text-xs font-black uppercase tracking-widest text-slate-950 disabled:bg-slate-700 disabled:text-slate-400">
                {isLoading ? 'Preparing…' : 'Continue to secure payment'}
              </button>
            </div>
          </>
        ) : moneyTrashGalleryId ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-6 text-center">
              <p className="text-sm font-black uppercase tracking-widest text-white">Secure hosted payment</p>
              <p className="mt-2 text-sm text-slate-400">This archived gallery completes payment in ClickFlash's Stripe-hosted checkout.</p>
            </div>
            <div className="sticky bottom-0 flex gap-3 border-t border-white/10 bg-slate-950/95 py-4 backdrop-blur-xl">
              <button type="button" onClick={() => setStep(1)} disabled={isLoading} className="min-h-[48px] flex-1 rounded-xl border border-white/10 bg-slate-800 px-5 text-xs font-black uppercase tracking-widest text-slate-300">Back</button>
              <button type="button" onClick={() => void handleHostedMoneyTrashCheckout()} disabled={isLoading} className="min-h-[48px] flex-[2] rounded-xl bg-cyan-500 px-5 text-xs font-black uppercase tracking-widest text-slate-950 disabled:bg-slate-700">
                {isLoading ? 'Redirecting…' : `Pay ${formatCurrency(finalTotal)}`}
              </button>
            </div>
          </div>
        ) : elementsOptions && stripePromise ? (
          <Elements stripe={stripePromise} options={elementsOptions}>
            <EmbeddedPaymentForm amountLabel={formatCurrency(finalTotal)} onBack={() => setStep(1)} onComplete={completePayment} />
          </Elements>
        ) : (
          <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-200">Payment details are unavailable. Return to review and try again.</p>
        )}
      </div>
    </Modal>
  );
};

export default CheckoutModal;
