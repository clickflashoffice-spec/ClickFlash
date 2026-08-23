import React, { useEffect, useState } from 'react';
import { useNavigate } from '../router';
import { motion } from 'framer-motion';
import { CheckCircle, Download, Share2, Home, Star, Gift, ThumbsUp } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useCartStore } from '../stores/cartStore';

export const ConfirmationPage = () => {
  const navigate = useNavigate();
  const clearCart = useCartStore(state => state.clearCart);
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [interceptionData, setInterceptionData] = useState<{
    routingResult?: string;
    compensationOffered?: string;
  } | null>(null);

  useEffect(() => {
    // Clear cart on mount of confirmation page
    clearCart();
  }, [clearCart]);

  const handleRate = async (score: number) => {
    setRating(score);
    try {
      const res = await fetch('http://localhost:8090/api/concession/reviews/intercept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: 'self-service-pwa',
          guestName: 'Online Resort Guest',
          ratingScore: score,
          feedbackText: `Self-Service PWA Purchase Rating: ${score} Stars`
        })
      });
      const data = await res.json();
      setInterceptionData(data);
    } catch {
      if (score <= 3) {
        setInterceptionData({
          routingResult: 'INTERNAL_RESOLUTION_INTERCEPTED',
          compensationOffered: 'Free 4K Digital Upgrade Voucher'
        });
      } else {
        setInterceptionData({ routingResult: 'GOOGLE_TRIPADVISOR_REDIRECT' });
      }
    }
    setFeedbackSent(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-4 text-slate-100"
    >
      <div className="glass-card w-full max-w-lg p-8 text-center rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <CheckCircle size={44} className="text-emerald-400" />
        </motion.div>

        <h1 className="text-2xl font-bold text-white mb-1">Order Confirmed!</h1>
        <p className="text-slate-400 mb-6 text-xs">
          Thank you for your purchase. We've sent a receipt to your email and WhatsApp.
        </p>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 mb-6">
          <p className="text-[11px] text-slate-400 mb-0.5">Order Number</p>
          <p className="text-lg font-mono text-cyan-400 tracking-wider">#CF-{Math.floor(100000 + Math.random() * 900000)}</p>
        </div>

        {/* Post-Purchase Rating & Interceptor */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          {!feedbackSent ? (
            <div>
              <p className="text-xs font-semibold text-slate-300 mb-2">How was your photo experience today?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleRate(s)}
                    className="text-2xl text-slate-600 hover:text-amber-400 hover:scale-125 transition-all p-1"
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs space-y-2">
              {interceptionData?.routingResult === 'INTERNAL_RESOLUTION_INTERCEPTED' ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 space-y-1">
                  <div className="flex items-center justify-center gap-1.5 font-bold">
                    <Gift size={14} /> Feedback Received
                  </div>
                  <p className="text-[11px] text-slate-300">
                    We're committed to perfection. Manager voucher unlocked: <strong>{interceptionData.compensationOffered}</strong>
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 space-y-1">
                  <div className="flex items-center justify-center gap-1.5 font-bold">
                    <ThumbsUp size={14} /> Thank You for 5 Stars!
                  </div>
                  <p className="text-[11px] text-slate-300">
                    We're thrilled you had a magical time! Share your review on TripAdvisor & Google.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button fullWidth className="gap-2 text-sm py-2.5 font-bold">
            <Download size={16} />
            Download Digital Photos (.ZIP)
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="gap-2 text-xs py-2">
              <Share2 size={14} />
              Share Link
            </Button>
            <Button variant="secondary" onClick={() => navigate('/gallery')} className="gap-2 text-xs py-2">
              <Home size={14} />
              Back to Album
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
