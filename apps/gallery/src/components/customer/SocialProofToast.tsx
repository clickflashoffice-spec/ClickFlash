import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Bell } from 'lucide-react';

interface SocialProofToastProps {
  messages?: string[];
  intervalMs?: number;
  urgencyMode?: boolean;
}

const DEFAULT_MESSAGES = [
  "🎉 Someone from Villa 204 just unlocked 8 photos!",
  "📸 A guest just ordered a premium print.",
  "✨ 3 people are currently viewing this gallery.",
  "🔥 12 photos were favorited in the last hour.",
  "🏆 Just sold: Premium digital download bundle!"
];

export const SocialProofToast: React.FC<SocialProofToastProps> = ({
  messages = DEFAULT_MESSAGES,
  intervalMs = 20000,
  urgencyMode = true
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (isDismissed) return;
    
    // Initial delay before first toast
    const initialDelay = setTimeout(() => {
      setIsVisible(true);
    }, 5000);
    
    return () => clearTimeout(initialDelay);
  }, [isDismissed]);

  useEffect(() => {
    if (isDismissed || !isVisible) return;
    
    const interval = setInterval(() => {
      setIsVisible(false);
      
      setTimeout(() => {
        if (!isDismissed) {
          setCurrentIndex((prev) => (prev + 1) % messages.length);
          setIsVisible(true);
        }
      }, 1000); // 1s pause before next message
      
    }, intervalMs);
    
    return () => clearInterval(interval);
  }, [isDismissed, isVisible, messages.length, intervalMs]);

  if (isDismissed) return null;

  const isUrgency = urgencyMode && currentIndex % 3 === 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: -20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed bottom-6 left-6 z-50 max-w-sm w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200/50 dark:border-slate-800/50 p-4 pr-10 flex items-start gap-3 pointer-events-auto"
        >
          {isUrgency && (
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 rounded-l-xl" />
          )}
          
          <div className="flex-shrink-0 mt-0.5">
            {isUrgency ? (
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {isUrgency ? "High demand" : "Recent Activity"}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
              {isUrgency 
                ? "14 guests are viewing photos from this event right now!" 
                : messages[currentIndex]}
            </p>
          </div>
          
          <button 
            onClick={() => setIsDismissed(true)}
            className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SocialProofToast;
