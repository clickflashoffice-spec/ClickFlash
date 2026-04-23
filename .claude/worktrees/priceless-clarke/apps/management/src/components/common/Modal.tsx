import React, { ReactNode, useEffect, useRef, useId } from 'react';

/**
 * Modal Component Props
 */
interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Modal title */
  title: string;
  /** Modal content */
  children: ReactNode;
  /** Modal size (sm, md, lg, xl) */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Size classes mapping for modal widths
 */
const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-3xl',
};

/**
 * Modal Component
 * 
 * Accessible, feature-rich modal dialog component.
 * 
 * Features:
 * - Focus trapping (Tab/Shift+Tab cycles within modal)
 * - Escape key to close
 * - Body scroll lock when open
 * - Click outside to close (backdrop)
 * - Auto-focus first element on open
 * - ARIA attributes for accessibility
 * - Dark mode support
 * - Responsive sizing
 * - Backdrop blur effect
 * 
 * Accessibility:
 * - ARIA modal and dialog roles
 * - ARIA labelledby for title
 * - Keyboard navigation support
 * - Focus management
 * 
 * Usage:
 * ```tsx
 * <Modal isOpen={isOpen} onClose={handleClose} title="Edit Item" size="lg">
 *   <p>Modal content here</p>
 * </Modal>
 * ```
 * 
 * @param {ModalProps} props - Component props
 */
const Modal: React.FC<ModalProps> = React.memo(({ isOpen, onClose, title, children, size = 'lg' }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Focus trapping and body scroll lock
  useEffect(() => {
    if (isOpen) {
      // Lock body scroll when modal is open
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      if (modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Tab') {
            if (e.shiftKey) { // Shift+Tab
              if (document.activeElement === firstElement) {
                lastElement?.focus();
                e.preventDefault();
              }
            } else { // Tab
              if (document.activeElement === lastElement) {
                firstElement?.focus();
                e.preventDefault();
              }
            }
          } else if (e.key === 'Escape') {
            onClose();
          }
        };

        document.addEventListener('keydown', handleKeyDown);
        // Small delay to ensure modal is fully rendered before focusing
        setTimeout(() => {
          firstElement?.focus();
        }, 0);

        return () => {
          document.removeEventListener('keydown', handleKeyDown);
          document.body.style.overflow = originalOverflow;
        };
      } else {
        return () => {
          document.body.style.overflow = originalOverflow;
        };
      }
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 z-50 flex justify-center items-center p-4 backdrop-blur-md transition-all duration-500"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={modalRef}
        className={`glass-panel bg-white dark:bg-slate-900 text-foreground rounded-[2rem] shadow-2xl w-full ${sizeClasses[size]} flex flex-col max-h-[90vh] border border-white/10 relative overflow-hidden animate-scaleIn`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 opacity-50"></div>

        <header className="px-8 py-6 border-b border-border flex justify-between items-center flex-shrink-0">
          <div>
            <h2 id={titleId} className="text-xl font-black uppercase tracking-widest text-foreground">{title}</h2>
            <div className="h-0.5 w-8 bg-cyan-500 mt-1 rounded-full"></div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-muted-foreground hover:text-foreground hover:bg-slate-200 dark:hover:bg-white/10 transition-all duration-300 ring-1 ring-white/5 active:scale-95"
            aria-label="Close modal"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        <main className="p-8 flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
});

Modal.displayName = 'Modal';

export default Modal;