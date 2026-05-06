/**
 * Keyboard Blocker Utility
 * 
 * Blocks system keyboard shortcuts in Kiosk mode to prevent
 * unauthorized access to the underlying system.
 */

import { logger } from './logger';

export class KeyboardBlocker {
    private isKioskMode: boolean = false;
    private boundHandler: (event: KeyboardEvent) => void;

    constructor() {
        this.boundHandler = this.handleKeyDown.bind(this);
    }

    /**
     * Initialize the keyboard blocker and attach event listeners
     */
    initialize(): void {
        document.addEventListener('keydown', this.boundHandler, true);
        logger.info('Keyboard blocker initialized');
    }

    /**
     * Clean up event listeners
     */
    destroy(): void {
        document.removeEventListener('keydown', this.boundHandler, true);
        logger.info('Keyboard blocker destroyed');
    }

    /**
     * Enable or disable kiosk mode blocking
     */
    setKioskMode(enabled: boolean): void {
        this.isKioskMode = enabled;
        logger.info(`Kiosk mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Check if kiosk mode is active
     */
    isBlocking(): boolean {
        return this.isKioskMode;
    }

    /**
     * Handle keydown events and block restricted shortcuts
     * @returns true if key should be allowed, false if blocked
     */
    handleKeyDown(event: KeyboardEvent): boolean {
        if (!event) {
            return true;
        }

        const { key, ctrlKey, altKey, shiftKey, metaKey } = event;

        // Always block certain system shortcuts regardless of kiosk mode
        const alwaysBlocked = this.isAlwaysBlocked(key, ctrlKey, altKey, shiftKey, metaKey);
        if (alwaysBlocked) {
            this.blockEvent(event, key, ctrlKey, altKey, shiftKey, metaKey);
            return false;
        }

        // Block additional keys only in kiosk mode
        if (this.isKioskMode) {
            const kioskBlocked = this.isKioskBlocked(key, ctrlKey, altKey, shiftKey, metaKey);
            if (kioskBlocked) {
                this.blockEvent(event, key, ctrlKey, altKey, shiftKey, metaKey);
                return false;
            }
        }

        return true;
    }

    /**
     * Check if key combination should always be blocked
     */
    private isAlwaysBlocked(
        key: string,
        ctrlKey: boolean,
        altKey: boolean,
        shiftKey: boolean,
        metaKey: boolean
    ): boolean {
        // Ctrl+Alt+Delete - System menu (always blocked)
        if (key === 'Delete' && ctrlKey && altKey) {
            return true;
        }

        // Windows/Meta key (always blocked)
        if (key === 'Meta' || metaKey) {
            return true;
        }

        // F12 - Developer tools (always blocked)
        if (key === 'F12') {
            return true;
        }

        // Ctrl+Shift+I - Developer tools (always blocked)
        if ((key === 'i' || key === 'I') && ctrlKey && shiftKey) {
            return true;
        }

        // Ctrl+Shift+J - Developer tools (console) (always blocked)
        if ((key === 'j' || key === 'J') && ctrlKey && shiftKey) {
            return true;
        }

        // Ctrl+Shift+C - Developer tools (inspect) (always blocked)
        if ((key === 'c' || key === 'C') && ctrlKey && shiftKey) {
            return true;
        }

        // Ctrl+N - New window (always blocked)
        if ((key === 'n' || key === 'N') && ctrlKey && !shiftKey) {
            return true;
        }

        // Ctrl+T - New tab (always blocked)
        if ((key === 't' || key === 'T') && ctrlKey && !shiftKey) {
            return true;
        }

        // Ctrl+W - Close tab/window (always blocked)
        if ((key === 'w' || key === 'W') && ctrlKey && !shiftKey) {
            return true;
        }

        // Ctrl+R / F5 - Reload (always blocked)
        if (((key === 'r' || key === 'R') && ctrlKey) || key === 'F5') {
            return true;
        }

        return false;
    }

    /**
     * Check if key combination should be blocked in kiosk mode only
     */
    private isKioskBlocked(
        key: string,
        ctrlKey: boolean,
        altKey: boolean,
        shiftKey: boolean,
        _metaKey: boolean
    ): boolean {
        // Alt+Tab - Task switching (only in kiosk mode)
        if (key === 'Tab' && altKey) {
            return true;
        }

        // Escape key in kiosk mode
        if (key === 'Escape') {
            return true;
        }

        // Alt+F4 - Close window
        if (key === 'F4' && altKey) {
            return true;
        }

        // Ctrl+Shift+Esc - Task manager
        if (key === 'Escape' && ctrlKey && shiftKey) {
            return true;
        }

        // Block any triple-modifier combination
        if (ctrlKey && altKey && shiftKey) {
            return true;
        }

        return false;
    }

    /**
     * Block the event by preventing default and stopping propagation
     */
    private blockEvent(
        event: KeyboardEvent,
        key: string,
        ctrlKey: boolean,
        altKey: boolean,
        shiftKey: boolean,
        metaKey: boolean
    ): void {
        event.preventDefault();
        event.stopPropagation();

        logger.warn('Blocked keyboard shortcut', {
            key,
            ctrlKey,
            altKey,
            shiftKey,
            metaKey,
            kioskMode: this.isKioskMode
        });
    }

    /**
     * Get list of blocked keys (for testing)
     */
    get blockedKeys(): string[] {
        return [
            'F12',
            'Tab+Alt',
            'Delete+Ctrl+Alt',
            'Meta',
            'Escape',
            'N+Ctrl',
            'T+Ctrl',
            'W+Ctrl'
        ];
    }

    /**
     * Check if admin override combo was triggered
     */
    checkAdminOverride(combo: string): boolean {
        // Admin override: Ctrl+Shift+F10
        return combo === 'Ctrl+Shift+F10';
    }
}

// Export singleton instance for convenience
export const keyboardBlocker = new KeyboardBlocker();
