import { useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';

/**
 * useKeyboardShortcuts Hook
 * 
 * customized hook for handling keyboard shortcuts with support for 
 * modifiers (Cmd/Ctrl, Shift, Alt).
 * 
 * @param keyCombo - Key combination (e.g., 'k', 'Enter', 'Escape')
 * @param callback - Function to execute when shortcut is pressed
 * @param options - Options like preventDefault
 */
export const useKeyboardShortcuts = (
    keyCombo: string,
    callback: (e: KeyboardEvent) => void,
    options: {
        metaKey?: boolean; // Cmd (Mac) or Ctrl (Win/Linux)
        ctrlKey?: boolean; // Explicit Ctrl
        shiftKey?: boolean;
        altKey?: boolean;
        preventDefault?: boolean;
    } = {}
) => {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // If specific modifiers are required, check them
        if (options.metaKey && !(event.metaKey || event.ctrlKey)) return;
        if (options.ctrlKey && !event.ctrlKey) return;
        if (options.shiftKey && !event.shiftKey) return;
        if (options.altKey && !event.altKey) return;

        // Check key - Defensive check for keyCombo to prevent crash
        if (!keyCombo) {
            logger.warn('[useKeyboardShortcuts] Hook called with undefined/null keyCombo');
            return;
        }

        if (event.key && event.key.toLowerCase() === keyCombo.toLowerCase()) {
            if (options.preventDefault !== false) {
                event.preventDefault();
            }
            callback(event);
        }
    }, [keyCombo, callback, options]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};
