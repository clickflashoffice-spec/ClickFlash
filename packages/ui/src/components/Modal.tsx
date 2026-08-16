'use client';
import { ReactNode, useEffect, useRef, useId, memo, createContext, useContext, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { internal } from '@clickflash/errors';

interface ModalContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  titleId: string;
  size: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant: 'default' | 'glass';
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) {
    throw internal('Modal components must be used within a Modal.Root');
  }
  return context;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-3xl',
  full: 'max-w-[95vw] h-[90vh]',
};

const variantStyles = {
  default: 'bg-card text-card-foreground shadow-2xl border border-border/60',
  glass: 'glass-panel'
};

interface ModalRootProps {
  children: ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'default' | 'glass';
}

const ModalRoot = ({
  children,
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onOpenChange,
  size = 'md',
  variant = 'default',
}: ModalRootProps) => {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(defaultOpen);
  
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : uncontrolledIsOpen;
  
  const titleId = useId();

  const open = useCallback(() => {
    if (!isControlled) setUncontrolledIsOpen(true);
    onOpenChange?.(true);
  }, [isControlled, onOpenChange]);

  const close = useCallback(() => {
    if (!isControlled) setUncontrolledIsOpen(false);
    onOpenChange?.(false);
  }, [isControlled, onOpenChange]);

  const value = useMemo(() => ({
    isOpen, open, close, titleId, size, variant
  }), [isOpen, open, close, titleId, size, variant]);

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};

const ModalTrigger = ({ children, asChild }: { children: ReactNode; asChild?: boolean }) => {
  const { open } = useModalContext();
  
  // In a real app we'd use Slot for asChild, but here we just wrap if not asChild
  if (asChild) {
    return <span onClick={open}>{children}</span>;
  }
  return <div onClick={open} className="inline-block">{children}</div>;
};

const ModalContent = ({ children, className }: { children: ReactNode; className?: string }) => {
  const { isOpen, close, titleId, size, variant } = useModalContext();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') close();
        if (e.key === 'Tab' && modalRef.current) {
          const focusable = modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0] as HTMLElement;
          const last = focusable[focusable.length - 1] as HTMLElement;

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
  }, [isOpen, close]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-all duration-300" 
        onClick={close}
        aria-hidden="true"
      />

      <div
        ref={modalRef}
        className={twMerge(
          clsx(
            'relative w-full rounded-3xl flex flex-col overflow-hidden transition-all duration-500 scale-100 max-h-[85vh]',
            sizeClasses[size],
            variantStyles[variant]
          ),
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

const ModalHeader = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <header className={twMerge("px-8 py-6 border-b border-border/40 flex justify-between items-center bg-muted/30 backdrop-blur-sm", className)}>
      {children}
    </header>
  );
};

const ModalTitle = ({ children, className }: { children: ReactNode; className?: string }) => {
  const { titleId } = useModalContext();
  return (
    <h2 id={titleId} className={twMerge("text-xl font-bold tracking-tight text-foreground", className)}>
      {children}
    </h2>
  );
};

const ModalCloseButton = ({ onClose }: { onClose?: () => void }) => {
  const { close } = useModalContext();
  const handleClose = onClose || close;
  return (
    <button
      onClick={handleClose}
      className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-danger/10 hover:text-danger transition-all duration-300 focus:ring-4 focus:ring-danger/20"
      aria-label="Close modal"
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
};

const ModalBody = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <main className={twMerge("p-8 flex-1 overflow-y-auto custom-scrollbar", className)}>
      {children}
    </main>
  );
};

const ModalFooter = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <footer className={twMerge("px-8 py-6 border-t border-border/40 bg-muted/30 backdrop-blur-sm flex justify-end gap-4", className)}>
      {children}
    </footer>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'default' | 'glass';
}

const LegacyModal = memo(({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  variant = 'default'
}: ModalProps) => {
  return (
    <ModalRoot 
      isOpen={isOpen} 
      onOpenChange={(open) => { if (!open) onClose(); }} 
      size={size} 
      variant={variant}
    >
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <ModalCloseButton onClose={onClose} />
        </ModalHeader>
        <ModalBody>
          {children}
        </ModalBody>
      </ModalContent>
    </ModalRoot>
  );
});

LegacyModal.displayName = 'Modal';

export const ModalComponent = Object.assign(LegacyModal, {
  Root: ModalRoot,
  Trigger: ModalTrigger,
  Content: ModalContent,
  Header: ModalHeader,
  Title: ModalTitle,
  Body: ModalBody,
  Footer: ModalFooter,
  Close: ModalCloseButton,
});

export { ModalComponent as Modal };
export default ModalComponent;

