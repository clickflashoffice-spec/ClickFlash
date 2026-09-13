import { useEffect } from 'react';

interface ToastProps {
  message: string;
  variant?: 'success' | 'error' | 'default';
  onClose: () => void;
  duration?: number;
}

function Toast({ message, variant = 'default', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bg =
    variant === 'success'
      ? 'bg-emerald-600 text-white'
      : variant === 'error'
      ? 'bg-red-600 text-white'
      : 'bg-slate-800 text-white border border-slate-700';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 py-2.5 px-5 rounded-xl shadow-2xl z-50 text-sm font-medium transition-all ${bg}`}
    >
      {message}
    </div>
  );
}

export default Toast;
