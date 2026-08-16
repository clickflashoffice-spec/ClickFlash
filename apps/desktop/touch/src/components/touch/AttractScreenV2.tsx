import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  idleTimeoutSeconds?: number;
  onWake?: () => void;
  onRoomNumberClick?: () => void;
  featuredPhotos?: string[];
}

const DEFAULT_PHOTOS = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1920&q=80',
];

const LANGUAGES = [
  { code: 'EN', flag: '🇬🇧', name: 'English' },
  { code: 'ES', flag: '🇪🇸', name: 'Español' },
  { code: 'FR', flag: '🇫🇷', name: 'Français' },
  { code: 'DE', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'IT', flag: '🇮🇹', name: 'Italiano' },
  { code: 'PT', flag: '🇵🇹', name: 'Português' },
  { code: 'AR', flag: '🇦🇪', name: 'العربية' },
];

export const AttractScreenV2: React.FC<Props> = memo(({
  idleTimeoutSeconds = 60,
  onWake,
  onRoomNumberClick,
  featuredPhotos = DEFAULT_PHOTOS,
}) => {
  const [active, setActive] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentLang, setCurrentLang] = useState(LANGUAGES[0].code);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const resetTimer = () => {
      if (active) {
        setActive(false);
        onWake?.();
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        setActive(true);
      }, idleTimeoutSeconds * 1000);
    };

    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);

    timer = setTimeout(() => {
      setActive(true);
    }, idleTimeoutSeconds * 1000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [idleTimeoutSeconds, active, onWake]);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredPhotos.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [active, featuredPhotos.length]);

  if (!active) return null;

  const handleWake = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setActive(false);
    onWake?.();
  };

  const handleRoomNumber = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setActive(false);
    onRoomNumberClick?.();
  };

  return (
    <div
      onClick={handleWake}
      className="fixed inset-0 z-[100] bg-black overflow-hidden cursor-pointer select-none"
    >
      <AnimatePresence>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: 1, scale: 1.05 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.5 }, scale: { duration: 10, ease: 'linear' } }}
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${featuredPhotos[currentIndex]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </AnimatePresence>

      {/* Gradient & Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/80 flex flex-col items-center justify-between p-8">
        
        {/* Top Bar: Language Selector */}
        <div className="w-full flex justify-end items-center" onClick={(e) => e.stopPropagation()}>
          <div className="flex space-x-3 bg-black/40 backdrop-blur-md rounded-full px-4 py-2 border border-white/10">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setCurrentLang(lang.code)}
                className={`text-2xl transition-transform hover:scale-110 ${currentLang === lang.code ? 'opacity-100 scale-110' : 'opacity-50'}`}
                title={lang.name}
              >
                {lang.flag}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Primary CTA */}
        <div className="flex flex-col items-center justify-center flex-1 space-y-12">
          <motion.div
            animate={{ scale: [1, 1.05, 1], boxShadow: ['0 0 0 0 rgba(255,255,255,0)', '0 0 0 20px rgba(255,255,255,0.1)', '0 0 0 0 rgba(255,255,255,0)'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="px-12 py-8 rounded-3xl bg-white/15 backdrop-blur-xl border border-white/30 shadow-2xl flex flex-col items-center space-y-4 cursor-pointer"
            onClick={handleWake}
          >
            <span className="text-4xl md:text-6xl font-extrabold text-white tracking-tight text-center drop-shadow-lg">
              Tap Anywhere to<br />View Your Photos
            </span>
            <div className="flex items-center space-x-3 mt-4 text-white/90">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <span className="text-2xl font-medium tracking-wide">Interactive Kiosk</span>
            </div>
          </motion.div>

          {/* RFID tap indicator */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center space-y-3"
          >
            <div className="w-20 h-20 rounded-full bg-blue-500/20 border-2 border-blue-400/50 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-75" />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
            <span className="text-blue-300 font-semibold tracking-wide text-lg">Tap RFID Wristband</span>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <div className="w-full flex justify-between items-end">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xl font-bold tracking-widest uppercase text-white/80 drop-shadow-md">
              ClickFlash Photography
            </span>
          </div>

          <button
            onClick={handleRoomNumber}
            aria-label="Have a room number? Tap here to log in"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 transition-all text-white font-medium text-lg flex items-center space-x-2"
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Have a Room Number?</span>
          </button>
        </div>
      </div>
    </div>
  );
});

AttractScreenV2.displayName = 'AttractScreenV2';
