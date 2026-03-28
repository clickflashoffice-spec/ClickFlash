import React, { ReactNode, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';

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

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={modalRef}
        className={`bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl shadow-xl w-full ${sizeClasses[size]} flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <header className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
          <h2 id={titleId} className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 dark:hover:text-white text-3xl leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full w-8 h-8 flex items-center justify-center"
            aria-label="Close modal"
            type="button"
          >
            &times;
          </button>
        </header>
        <main className="p-6 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>,
    document.body
  );
});

Modal.displayName = 'Modal';

export default Modal;