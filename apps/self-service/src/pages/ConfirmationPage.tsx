import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Download, Share2, Home } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useCartStore } from '../stores/cartStore';

export const ConfirmationPage = () => {
  const navigate = useNavigate();
  const clearCart = useCartStore(state => state.clearCart);

  useEffect(() => {
    // Clear cart on mount of confirmation page
    clearCart();
  }, [clearCart]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-4"
    >
      <div className="glass-card w-full max-w-lg p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-24 h-24 bg-brand-accent/20 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle size={48} className="text-brand-accent" />
        </motion.div>

        <h1 className="text-3xl font-bold text-white mb-2">Order Confirmed!</h1>
        <p className="text-slate-400 mb-8">
          Thank you for your purchase. We've sent a receipt to your email.
        </p>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-8">
          <p className="text-sm text-slate-400 mb-1">Order Number</p>
          <p className="text-xl font-mono text-white tracking-wider">#CF-{Math.floor(Math.random() * 1000000)}</p>
        </div>

        <div className="space-y-4">
          <Button fullWidth className="gap-2 text-lg py-3">
            <Download size={20} />
            Download Digital Photos
          </Button>
          
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="gap-2">
              <Share2 size={18} />
              Share
            </Button>
            <Button variant="secondary" onClick={() => navigate('/gallery')} className="gap-2">
              <Home size={18} />
              Gallery
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
