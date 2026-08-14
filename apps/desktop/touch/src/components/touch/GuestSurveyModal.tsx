import React, { memo, useState, useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onComplete: () => void;
}

export const GuestSurveyModal: React.FC<Props> = memo(({
  isOpen,
  onComplete
}) => {
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [easeOfUse, setEaseOfUse] = useState<number | null>(null);
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  const emojis = ['😡', '😕', '😐', '🙂', '😍'];

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isFinished) {
      timeout = setTimeout(() => {
        onComplete();
      }, 5000);
    }
    return () => clearTimeout(timeout);
  }, [isFinished, onComplete]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSatisfaction(null);
      setEaseOfUse(null);
      setNpsScore(null);
      setIsFinished(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFinish = () => {
    // Here you would typically submit the survey data to the backend
    // const surveyData = { satisfaction, easeOfUse, npsScore };
    setIsFinished(true);
  };

  const isComplete = satisfaction !== null && easeOfUse !== null && npsScore !== null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
      <div className="relative w-full max-w-2xl rounded-3xl bg-neutral-900 border border-neutral-800 p-10 shadow-2xl">
        
        {!isFinished ? (
          <>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white">Thank You!</h2>
              <p className="text-neutral-400 mt-3 text-lg">
                Please take a moment to share your experience.
              </p>
            </div>

            <div className="space-y-10">
              {/* Question 1 */}
              <div>
                <p className="text-lg font-medium text-white text-center mb-4">
                  1. How satisfied were you with your photo session?
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

              {/* Question 2 */}
              <div className="pt-6 border-t border-neutral-800">
                <p className="text-lg font-medium text-white text-center mb-4">
                  2. How easy was it to use this kiosk?
                </p>
                <div className="flex justify-center gap-2 md:gap-4">
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

              {/* Question 3 */}
              <div className="pt-6 border-t border-neutral-800">
                <p className="text-lg font-medium text-white text-center mb-4">
                  3. Would you recommend ClickFlash to other guests?
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

            <div className="mt-12 flex justify-between gap-4">
              <button
                onClick={onComplete}
                className="py-4 px-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition-colors border border-neutral-700"
              >
                Skip
              </button>
              <button
                onClick={handleFinish}
                disabled={!isComplete}
                className="flex-1 py-4 px-8 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-700 disabled:text-neutral-500 text-neutral-950 font-bold transition-colors shadow-lg text-lg"
              >
                Submit Feedback
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-16 flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">You're All Set!</h2>
            <p className="text-neutral-400 text-xl mb-8">
              Thank you for your feedback.
            </p>
            <p className="text-sm text-neutral-500">
              Returning to welcome screen...
            </p>
            <button
              onClick={onComplete}
              className="mt-8 px-6 py-3 rounded-full border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              Finish Now
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
});

GuestSurveyModal.displayName = 'GuestSurveyModal';
