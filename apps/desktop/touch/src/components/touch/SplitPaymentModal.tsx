import React, { memo, useState, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe (use a test publishable key)
const stripePromise = loadStripe('pk_test_TYooMQauvdEDq54NiTphI7jx');

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderTotal: number;
  onPaymentComplete: () => void;
}

type PaymentMethod = 'CARD' | 'CASH';

interface SplitPayment {
  id: string;
  method: PaymentMethod;
  amount: number;
  status: 'PENDING' | 'COMPLETED';
}

export const SplitPaymentModal: React.FC<Props> = memo(({
  isOpen,
  onClose,
  orderTotal,
  onPaymentComplete
}) => {
  const [splits, setSplits] = useState<SplitPayment[]>([]);
  const [currentAmountInput, setCurrentAmountInput] = useState<string>('');

  const totalPaid = useMemo(() => {
    return splits
      .filter((s) => s.status === 'COMPLETED')
      .reduce((sum, split) => sum + split.amount, 0);
  }, [splits]);

  const remainingBalance = Math.max(0, orderTotal - totalPaid);
  const isFullyPaid = remainingBalance === 0 && splits.length > 0;

  if (!isOpen) return null;

  const handleAddSplit = async (method: PaymentMethod) => {
    const amount = parseFloat(currentAmountInput);
    if (isNaN(amount) || amount <= 0 || amount > remainingBalance) return;
    if (splits.length >= 4) return; // Max 4 splits

    if (method === 'CARD') {
      try {
        const res = await fetch('http://localhost:8787/api/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amount * 100, currency: 'eur' })
        });
        
        if (!res.ok) throw new Error('Payment Intent failed');
        // We simulate card entry success for kiosk demo if Elements are not fully hooked to a form submit
        // Real implementation would use stripe.confirmCardPayment here.
      } catch (err) {
        console.error(err);
        return;
      }
    }

    setSplits((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        method,
        amount,
        status: 'COMPLETED',
      }
    ]);
    setCurrentAmountInput('');

    if (remainingBalance - amount <= 0) {
      setTimeout(() => {
        onPaymentComplete();
      }, 1500);
    }
  };

  const handleRemoveSplit = (id: string) => {
    setSplits((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
      <div className="relative w-full max-w-2xl rounded-3xl bg-neutral-900 border border-neutral-800 p-8 shadow-2xl flex flex-col md:flex-row gap-8">
        
        {/* Left Side: Summary & Remaining */}
        <div className="flex-1 flex flex-col">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">Split Payment</h2>
            <p className="text-neutral-400 mt-1 text-sm">
              Split total across 2-4 payment methods
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-800/60 border border-neutral-700/50 mb-6 text-center">
            <span className="text-sm text-neutral-400 uppercase tracking-wider block mb-2">
              Remaining Balance
            </span>
            <span className={`text-4xl font-bold ${remainingBalance === 0 ? 'text-green-400' : 'text-white'}`}>
              €{remainingBalance.toFixed(2)}
            </span>
            <div className="text-neutral-500 text-sm mt-2">
              Total Order: €{orderTotal.toFixed(2)}
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-sm text-neutral-400 uppercase tracking-wider mb-4">
              Payment Steps ({splits.length}/4)
            </h3>
            <div className="space-y-3">
              {splits.map((split, index) => (
                <div key={split.id} className="flex items-center justify-between p-4 rounded-xl bg-neutral-800 border border-neutral-700">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-white font-medium">{split.method === 'CARD' ? 'Credit Card' : 'Cash'}</div>
                      <div className="text-xs text-green-400">Completed</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-white">€{split.amount.toFixed(2)}</span>
                    <button 
                      onClick={() => handleRemoveSplit(split.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Undo
                    </button>
                  </div>
                </div>
              ))}
              {splits.length === 0 && (
                <div className="text-center p-6 text-neutral-500 text-sm border border-dashed border-neutral-700 rounded-xl">
                  No payments added yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Input & Actions */}
        <div className="flex-1 flex flex-col justify-center border-t md:border-t-0 md:border-l border-neutral-800 pt-6 md:pt-0 md:pl-8">
          {!isFullyPaid ? (
            <>
              <div className="mb-6">
                <label className="block text-sm text-neutral-400 mb-2">Amount to pay now</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-neutral-500">€</span>
                  <input
                    type="number"
                    value={currentAmountInput}
                    onChange={(e) => setCurrentAmountInput(e.target.value)}
                    placeholder={remainingBalance.toFixed(2)}
                    max={remainingBalance}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-4 pl-12 pr-4 text-2xl text-white outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  {[10, 20, 50, remainingBalance].map((preset) => {
                    if (preset > remainingBalance && preset !== remainingBalance) return null;
                    return (
                      <button
                        key={preset}
                        onClick={() => setCurrentAmountInput(preset.toFixed(2))}
                        className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-300 transition-colors border border-neutral-700"
                      >
                        {preset === remainingBalance ? 'Max' : `€${preset}`}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mb-8">
                {/* Embedded Stripe Card Element for UI integration (DSK-GAP-005) */}
                <label className="block text-sm text-neutral-400 mb-2">Card Details (Stripe)</label>
                <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-4 mb-4">
                  <Elements stripe={stripePromise}>
                    <StripeCardInput />
                  </Elements>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <button
                  onClick={() => handleAddSplit('CARD')}
                  disabled={!currentAmountInput || parseFloat(currentAmountInput) <= 0 || splits.length >= 4}
                  className="py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-colors"
                >
                  Pay Card
                </button>
                <button
                  onClick={() => handleAddSplit('CASH')}
                  disabled={!currentAmountInput || parseFloat(currentAmountInput) <= 0 || splits.length >= 4}
                  className="py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-colors"
                >
                  Pay Cash
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center mb-8">
              <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Payment Complete</h3>
              <p className="text-neutral-400 mt-2">Processing your order...</p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition-colors border border-neutral-700 mt-auto"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
});

SplitPaymentModal.displayName = 'SplitPaymentModal';

// Helper component to render Stripe Card Element with custom styling
const StripeCardInput = () => {
  return (
    <CardElement 
      options={{
        style: {
          base: {
            fontSize: '16px',
            color: '#ffffff',
            '::placeholder': {
              color: '#a3a3a3',
            },
            iconColor: '#f59e0b',
          },
          invalid: {
            color: '#ef4444',
            iconColor: '#ef4444',
          },
        },
      }}
    />
  );
};
