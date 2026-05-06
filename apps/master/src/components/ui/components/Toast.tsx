'use client';

import React, { useEffect, useState, memo } from 'react';
import { clsx } from 'clsx';

type ToastVariant = 'default' | 'success' | 'error' | 'warning';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
  variant?: ToastVariant;
  className?: string;
}

const variantStyles: Record<ToastVariant, string> = {
  default: 'bg-slate-900 dark:bg-slate-800 border-slate-700 dark:border-slate-600 text-white',
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-amber-500 text-white',
};

const Toast: React.FC<ToastProps> = memo(({ 
  message, 
  onClose, 
  duration = 3000,
  variant = 'default',
  className 
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);

    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => {
      clearTimeout(hideTimer);
    };
  }, [message, duration, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={clsx(
        'fixed bottom-8 left-1/2 -translate-x-1/2 py-3 px-6 rounded-lg shadow-2xl transition-all duration-300 z-[60] max-w-md text-sm text-center',
        variantStyles[variant],
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
    >
      {message}
    </div>
  );
});

Toast.displayName = 'Toast';

export default Toast;
