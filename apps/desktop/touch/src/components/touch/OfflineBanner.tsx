import React, { useEffect, useState } from 'react';
import { CloudOff } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="absolute top-0 left-0 w-full bg-orange-500/90 backdrop-blur-md text-white py-2 px-4 flex items-center justify-center space-x-2 z-50 animate-slideDown shadow-lg border-b border-white/20">
      <CloudOff size={20} className="animate-pulse" />
      <span className="font-semibold tracking-wide text-sm drop-shadow-md">
        Offline Mode Active — Orders securely saved to local sync queue.
      </span>
    </div>
  );
};
