import React, { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 3000 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);

    let closeTimer: NodeJS.Timeout;
    const hideTimer = setTimeout(() => {
      setVisible(false);
      // Allow time for fade-out animation before calling onClose
      closeTimer = setTimeout(onClose, 300);
    }, duration);

    return () => {
      clearTimeout(hideTimer);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [message, duration, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`fixed bottom-28 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white py-3 px-6 rounded-lg shadow-2xl transition-all duration-300 z-[60] max-w-md text-sm text-center
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
    >
      {message}
    </div>
  );
};

export default Toast;
