import { useCallback, useEffect, useRef } from 'react';

interface FocusManagerOptions {
  trapFocus?: boolean;
  initialFocus?: string;
  returnFocus?: boolean;
}


/**
 * Hook for managing focus within a component
 * Useful for modals, dialogs, and complex UI components
 * 
 * @example
 * const { registerFocusable, focusNext, focusPrevious, focusFirst } = useFocusManager({
 *   trapFocus: true,
 *   returnFocus: true
 * });
 */
export function useFocusManager(options: FocusManagerOptions = {}) {
  const { trapFocus = false, initialFocus, returnFocus = false } = options;
  
  const focusableElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  // Register a focusable element
  const registerFocusable = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      focusableElementsRef.current.set(id, element);
    } else {
      focusableElementsRef.current.delete(id);
    }
  }, []);

  // Get all focusable elements in order
  const getFocusableElements = useCallback((): HTMLElement[] => {
    const elements = Array.from(focusableElementsRef.current.values());
    return elements.filter(el => {
      const tabIndex = el.getAttribute('tabindex');
      return tabIndex !== '-1' && !el.hasAttribute('disabled') && !el.hasAttribute('aria-hidden');
    });
  }, []);

  // Focus first element
  const focusFirst = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[0].focus();
      return true;
    }
    return false;
  }, [getFocusableElements]);

  // Focus last element
  const focusLast = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[elements.length - 1].focus();
      return true;
    }
    return false;
  }, [getFocusableElements]);

  // Focus next element
  const focusNext = useCallback(() => {
    const elements = getFocusableElements();
    const activeIndex = elements.findIndex(el => el === document.activeElement);
    
    if (activeIndex >= 0 && activeIndex < elements.length - 1) {
      elements[activeIndex + 1].focus();
      return true;
    } else if (trapFocus && elements.length > 0) {
      // Wrap to first
      elements[0].focus();
      return true;
    }
    return false;
  }, [getFocusableElements, trapFocus]);

  // Focus previous element
  const focusPrevious = useCallback(() => {
    const elements = getFocusableElements();
    const activeIndex = elements.findIndex(el => el === document.activeElement);
    
    if (activeIndex > 0) {
      elements[activeIndex - 1].focus();
      return true;
    } else if (trapFocus && elements.length > 0) {
      // Wrap to last
      elements[elements.length - 1].focus();
      return true;
    }
    return false;
  }, [getFocusableElements, trapFocus]);

  // Focus element by ID
  const focusById = useCallback((id: string) => {
    const element = focusableElementsRef.current.get(id);
    if (element) {
      element.focus();
      return true;
    }
    return false;
  }, []);

  // Set container ref
  const setContainerRef = useCallback((element: HTMLElement | null) => {
    containerRef.current = element;
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if we're inside the container
      if (!containerRef.current?.contains(document.activeElement)) {
        return;
      }

      switch (e.key) {
        case 'Tab':
          if (trapFocus) {
            e.preventDefault();
            if (e.shiftKey) {
              focusPrevious();
            } else {
              focusNext();
            }
          }
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          focusNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          focusPrevious();
          break;
        case 'Home':
          e.preventDefault();
          focusFirst();
          break;
        case 'End':
          e.preventDefault();
          focusLast();
          break;
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [trapFocus, focusNext, focusPrevious, focusFirst, focusLast]);

  // Store previously focused element on mount
  useEffect(() => {
    if (returnFocus) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;
    }

    // Focus initial element
    if (initialFocus) {
      const element = focusableElementsRef.current.get(initialFocus);
      if (element) {
        element.focus();
      }
    } else {
      focusFirst();
    }

    // Return focus on unmount
    return () => {
      if (returnFocus && previouslyFocusedElementRef.current) {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [initialFocus, returnFocus, focusFirst]);

  return {
    registerFocusable,
    setContainerRef,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    focusById,
    getFocusableElements,
  };
}

/**
 * Hook for managing focus trap in modals/dialogs
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isActive) {
      // Store current focus
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus first focusable element in container
      const container = containerRef.current;
      if (container) {
        const focusableElements = container.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          (focusableElements[0] as HTMLElement).focus();
        }
      }

      // Handle tab key to trap focus
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        const container = containerRef.current;
        if (!container) return;

        const focusableElements = Array.from(
          container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ) as HTMLElement[];

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        // Restore previous focus
        previousFocusRef.current?.focus();
      };
    }
  }, [isActive]);

  return containerRef;
}

export default useFocusManager;
