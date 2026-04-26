import React, { useEffect, useState, memo } from 'react';

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
  className = ''
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 transition-all duration-300 ease-out
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${variantStyles[variant]} ${className}
        px-4 py-3 rounded-lg shadow-lg border max-w-sm flex items-start gap-3
      `}
    >
      <span className="flex-1 text-sm">{message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        className="text-white/80 hover:text-white transition-colors"
        aria-label="Close"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
});

Toast.displayName = 'Toast';

export default Toast;
