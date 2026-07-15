import React, { useState, useEffect, memo } from 'react';

interface Props {
  idleTimeoutSeconds?: number;
  onWake?: () => void;
  featuredPhotos?: string[];
}

const DEFAULT_PHOTOS = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1920&q=80',
];

export const AttractScreensaver: React.FC<Props> = memo(({
  idleTimeoutSeconds = 60,
  onWake,
  featuredPhotos = DEFAULT_PHOTOS,
}) => {
  const [active, setActive] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

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
    }, 5000);
    return () => clearInterval(interval);
  }, [active, featuredPhotos.length]);

  if (!active) return null;

  return (
    <div
      onClick={() => {
        setActive(false);
        onWake?.();
      }}
      className="fixed inset-0 z-50 bg-black overflow-hidden cursor-pointer select-none transition-opacity duration-700 ease-in-out"
    >
      {featuredPhotos.map((photo, index) => (
        <div
          key={photo}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
          } transform duration-10000`}
          style={{
            backgroundImage: `url(${photo})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ))}

      {/* Gradient & Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 flex flex-col items-center justify-between p-12">
        {/* Brand Header */}
        <div className="flex items-center space-x-3 pt-6">
          <div className="w-4 h-4 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-2xl font-bold tracking-widest uppercase text-white/90 drop-shadow-md">
            ClickFlash Photography
          </span>
        </div>

        {/* Call to Action Pulse */}
        <div className="flex flex-col items-center space-y-6 pb-12">
          <div className="px-10 py-6 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl animate-bounce flex flex-col items-center space-y-2">
            <span className="text-3xl md:text-4xl font-extrabold text-white tracking-wide text-center">
              TOUCH ANYWHERE TO START
            </span>
            <div className="flex items-center space-x-2 text-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xl font-bold">Find Photos Instantly with Face Search</span>
            </div>
          </div>
          <p className="text-lg text-white/70 font-medium">
            Browse • Select Packages • Print Instantly
          </p>
        </div>
      </div>
    </div>
  );
});

AttractScreensaver.displayName = 'AttractScreensaver';
