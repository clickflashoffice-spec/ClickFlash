import React, { memo, useState, useEffect } from 'react';
import { Gift, Star, ThumbsUp, QrCode } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onComplete: () => void;
  guestName?: string;
  galleryId?: string;
}

export const GuestSurveyModal: React.FC<Props> = memo(({
  isOpen,
  onComplete,
  guestName = 'Resort Guest',
  galleryId = 'gal_kiosk_current'
}) => {
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [easeOfUse, setEaseOfUse] = useState<number | null>(null);
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isFinished, setIsFinished] = useState(false);
  const [interceptionResult, setInterceptionResult] = useState<{
    routingResult?: string;
    compensationOffered?: string;
  } | null>(null);

  const emojis = ['😡', '😕', '😐', '🙂', '😍'];

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isFinished) {
      timeout = setTimeout(() => {
        onComplete();
      }, 7000);
    }
    return () => clearTimeout(timeout);
  }, [isFinished, onComplete]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSatisfaction(null);
      setEaseOfUse(null);
      setNpsScore(null);
      setFeedbackText('');
      setIsFinished(false);
      setInterceptionResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFinish = async () => {
    const starRating = (satisfaction ?? 2) + 1; // Convert 0-4 to 1-5 stars

    try {
      const res = await fetch('http://localhost:8090/api/concession/reviews/intercept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: 'venue-touch-kiosk',
          guestName,
          ratingScore: starRating,
          feedbackText: feedbackText || `NPS: ${npsScore}, Ease: ${easeOfUse}`,
          galleryId
        })
      });
      const data = await res.json();
      setInterceptionResult(data);
    } catch {
      // Fallback local logic if offline
      if (starRating <= 3) {
        setInterceptionResult({
          routingResult: 'INTERNAL_RESOLUTION_INTERCEPTED',
          compensationOffered: 'Complimentary High-Res Digital Upgrade Voucher'
        });
      } else {
        setInterceptionResult({
          routingResult: 'GOOGLE_TRIPADVISOR_REDIRECT'
        });
      }
    }

    setIsFinished(true);
  };

  const isComplete = satisfaction !== null && easeOfUse !== null && npsScore !== null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
      <div className="relative w-full max-w-2xl rounded-3xl bg-neutral-900 border border-neutral-800 p-10 shadow-2xl">
        
        {!isFinished ? (
          <>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white">How Was Your Experience?</h2>
              <p className="text-neutral-400 mt-2 text-base">
                Your direct feedback helps us continuously improve our resort photography.
              </p>
            </div>

            <div className="space-y-8">
              {/* Question 1: Experience */}
              <div>
                <p className="text-base font-semibold text-white text-center mb-3">
                  1. How happy are you with your resort photos?
                </p>
                <div className="flex justify-center gap-4 md:gap-8">
                  {emojis.map((emoji, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSatisfaction(idx)}
                      className={`text-5xl md:text-6xl transition-transform hover:scale-110 ${satisfaction === idx ? 'scale-110 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'opacity-60 grayscale hover:grayscale-0'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2: Kiosk Ease */}
              <div className="pt-6 border-t border-neutral-800">
                <p className="text-base font-semibold text-white text-center mb-3">
                  2. How fast and easy was the touch kiosk to use?
                </p>
                <div className="flex justify-center gap-3 md:gap-5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setEaseOfUse(star)}
                      className={`text-4xl md:text-5xl transition-colors ${
                        (easeOfUse !== null && star <= easeOfUse) ? 'text-amber-400' : 'text-neutral-700 hover:text-neutral-500'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 3: NPS */}
              <div className="pt-6 border-t border-neutral-800">
                <p className="text-base font-semibold text-white text-center mb-3">
                  3. Would you recommend ClickFlash to friends and family?
                </p>
                <div className="flex justify-between items-center bg-neutral-950 p-2 rounded-xl border border-neutral-800">
                  <span className="text-xs text-neutral-500 uppercase tracking-wider px-2 hidden md:block">Not Likely</span>
                  <div className="flex-1 flex justify-center gap-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <button
                        key={score}
                        onClick={() => setNpsScore(score)}
                        className={`w-8 h-10 md:w-10 md:h-12 rounded flex items-center justify-center font-bold transition-colors ${
                          npsScore === score 
                            ? 'bg-amber-500 text-neutral-900 shadow-lg' 
                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-neutral-500 uppercase tracking-wider px-2 hidden md:block">Very Likely</span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between gap-4">
              <button
                onClick={onComplete}
                className="py-3 px-6 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold transition-colors border border-neutral-700 text-sm"
              >
                Skip
              </button>
              <button
                onClick={handleFinish}
                disabled={!isComplete}
                className="flex-1 py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-700 disabled:text-neutral-500 text-neutral-950 font-bold transition-colors shadow-lg text-base"
              >
                Submit Feedback
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 flex flex-col items-center justify-center space-y-4">
            {interceptionResult?.routingResult === 'INTERNAL_RESOLUTION_INTERCEPTED' ? (
              // Negative / neutral feedback intercepted with a gift voucher
              <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl max-w-md w-full space-y-3">
                <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto">
                  <Gift className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-white">We Value Your Experience!</h2>
                <p className="text-neutral-300 text-sm">
                  We are sorry things were not 100% perfect. Our resort management team has been notified.
                </p>
                <div className="p-3 bg-neutral-950 rounded-xl border border-amber-500/40 text-amber-300 text-xs font-semibold">
                  🎁 Gift Voucher Added: {interceptionResult.compensationOffered || 'Complimentary High-Res Digital Upgrade'}
                </div>
              </div>
            ) : (
              // Positive 5-star feedback directed to public reviews
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl max-w-md w-full space-y-3">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <ThumbsUp className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-white">Thank You So Much!</h2>
                <p className="text-neutral-300 text-sm">
                  We are thrilled you had a magical experience! Scan below to leave a 5-star review on TripAdvisor / Google:
                </p>
                <div className="w-28 h-28 bg-white p-2 rounded-xl flex items-center justify-center mx-auto shadow-lg">
                  <QrCode className="w-24 h-24 text-neutral-950" />
                </div>
              </div>
            )}

            <button
              onClick={onComplete}
              className="mt-4 px-6 py-2.5 rounded-full border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors text-sm"
            >
              Done / Return to Start
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
});

GuestSurveyModal.displayName = 'GuestSurveyModal';
