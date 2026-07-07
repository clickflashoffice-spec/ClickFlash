import React, { useState } from 'react';
import { CreditCard, Banknote, X, AlertCircle } from 'lucide-react';

interface PaymentMethodPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (method: 'Cash' | 'Card') => void;
  orderId?: string;
}

export const PaymentMethodPromptModal: React.FC<PaymentMethodPromptModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orderId
}) => {
  const [method, setMethod] = useState<'Cash' | 'Card' | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            Validate Order {orderId ? `#${orderId.slice(0,6)}` : ''}
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-3 mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium">
              Please select a payment method before marking this order as completed.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setMethod('Cash')}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                method === 'Cash' 
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' 
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Banknote size={28} className="mb-2" />
              <span className="font-semibold">Cash</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod('Card')}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                method === 'Card' 
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' 
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <CreditCard size={28} className="mb-2" />
              <span className="font-semibold">Card</span>
            </button>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => method && onConfirm(method)}
              disabled={!method}
              className={`px-5 py-2 font-bold text-white rounded-lg transition-all shadow-sm ${
                method 
                  ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/25 hover:shadow-md' 
                  : 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed opacity-70'
              }`}
            >
              Validate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
