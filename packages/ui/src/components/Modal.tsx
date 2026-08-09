'use client';
import { ReactNode, useEffect, useRef, useId, memo } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'default' | 'glass';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-3xl',
  full: 'max-w-[95vw] h-[90vh]',
};

export const Modal = memo(({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  variant = 'default'
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'Tab' && modalRef.current) {
          const focusable = modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            last.focus();
            e.preventDefault();
          } else if (!e.shiftKey && document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    default: 'bg-card text-card-foreground shadow-2xl border border-border/60',
    glass: 'glass-panel' // Defined in index.css/tokens.css
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-all duration-300" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        className={twMerge(
          clsx(
            'relative w-full rounded-3xl flex flex-col overflow-hidden transition-all duration-500 scale-100 max-h-[85vh]',
            sizeClasses[size],
            variantStyles[variant]
          )
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-8 py-6 border-b border-border/40 flex justify-between items-center bg-muted/30 backdrop-blur-sm">
          <h2 id={titleId} className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-danger/10 hover:text-danger transition-all duration-300 focus:ring-4 focus:ring-danger/20"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <main className="p-8 flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>
    </div>,
    document.body
  );
});

Modal.displayName = 'Modal';

export default Modal;

