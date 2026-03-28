/**
 * Keyboard Blocker Tests
 * 
 * Unit tests for keyboard blocking functionality in Kiosk mode
 */

import { KeyboardBlocker } from '../keyboardBlocker';
import { logger } from '../logger';

// Mock logger
jest.mock('../logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('KeyboardBlocker', () => {
    let keyboardBlocker: KeyboardBlocker;

    beforeEach(() => {
        jest.clearAllMocks();
        keyboardBlocker = new KeyboardBlocker();
    });

    describe('Blocking Rules', () => {
        it('should block Alt+Tab when kiosk mode is enabled', () => {
            keyboardBlocker.setKioskMode(true);
            const event = new KeyboardEvent('keydown', {
                key: 'Tab',
                altKey: true,
                bubbles: true
            });
            jest.spyOn(event, 'preventDefault');
            jest.spyOn(event, 'stopPropagation');

            const result = keyboardBlocker.handleKeyDown(event);

            expect(result).toBe(false);
            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.stopPropagation).toHaveBeenCalled();
        });

        it('should block Ctrl+Alt+Delete', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'Delete',
                ctrlKey: true,
                altKey: true,
                bubbles: true
            });
            jest.spyOn(event, 'preventDefault');

            const result = keyboardBlocker.handleKeyDown(event);

            expect(result).toBe(false);
            expect(event.preventDefault).toHaveBeenCalled();
        });

        it('should block Windows key (Meta)', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'Meta',
                metaKey: true,
                bubbles: true
            });
            jest.spyOn(event, 'preventDefault');

            const result = keyboardBlocker.handleKeyDown(event);

            expect(result).toBe(false);
            expect(event.preventDefault).toHaveBeenCalled();
        });

        it('should block Escape when in kiosk mode', () => {
            keyboardBlocker.setKioskMode(true);
            
            const event = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true
            });
            jest.spyOn(event, 'preventDefault');

            const result = keyboardBlocker.handleKeyDown(event);

            expect(result).toBe(false);
            expect(event.preventDefault).toHaveBeenCalled();
        });

        it('should block F12 (Developer Tools)', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'F12',
                bubbles: true
            });
            jest.spyOn(event, 'preventDefault');

            const result = keyboardBlocker.handleKeyDown(event);

            expect(result).toBe(false);
            expect(event.preventDefault).toHaveBeenCalled();
        });

        it('should block Ctrl+Shift+I (Developer Tools)', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'i',
                ctrlKey: true,
                shiftKey: true,
                bubbles: true
            });
            jest.spyOn(event, 'preventDefault');

            const result = keyboardBlocker.handleKeyDown(event);

            expect(result).toBe(false);
            expect(event.preventDefault).toHaveBeenCalled();
        });

        it('should block Ctrl+N (New Window)', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'n',
                ctrlKey: true,
                bubbles: true
            });
            jest.spyOn(event, 'preventDefault');

            const result = keyboardBlocker.handleKeyDown(event);

            expect(result).toBe(false);
        });

        it('should block Ctrl+T (New Tab)', () => {
            const event = new KeyboardEvent('keydown', {
                key: 't',
                ctrlKey: true,
                bubbles: true
            });
            jest.spyOn(event, 'preventDefault');

            const result = keyboardBlocker.handleKeyDown(event);

            expect(result).toBe(false);
        });

        it('should block Ctrl+W (Close Tab)', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'w',
                ctrlKey: true,
                bubbles: true
            });
            jest.spyOn(event, 'preventDefault');

            const result = keyboardBlocker.handleKeyDown(event);

            expect(result).toBe(false);
        });
    });

    describe('Allowed Keys', () => {
        it('should allow Ctrl+P (Print)', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'p',
                ctrlKey: true,
                bubbles: true
            });
            jest.spyOn(event, 'preventDefault');

            const result = keyboardBlocker.handleKeyDown(event);

            expect(result).toBe(true);
            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it('should allow number keys', () => {
            const event = new KeyboardEvent('keydown', {
                key: '5',
                bubbles: true
            });
            jest.spyOn(event, 'preventDefault');

            const result = keyboardBlocker.handleKeyDown(event);

            expect(result).toBe(true);
            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it('should allow letter keys', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'a',
                bubbles: true
            });
            jest.spyOn(event, 'preventDefault');

            const result = keyboardBlocker.handleKeyDown(event);

            expect(result).toBe(true);
            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it('should allow Enter key', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'Enter',
                bubbles: true
            });
            jest.spyOn(event, 'preventDefault');

            const result = keyboardBlocker.handleKeyDown(event);

            expect(result).toBe(true);
        });

        it('should allow Arrow keys for navigation', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'ArrowRight',
                bubbles: true
            });
            jest.spyOn(event, 'preventDefault');

            const result = keyboardBlocker.handleKeyDown(event);

            expect(result).toBe(true);
        });
    });

    describe('Kiosk Mode Toggle', () => {
        it('should not block keys when kiosk mode is off', () => {
            keyboardBlocker.setKioskMode(false);
            
            const event = new KeyboardEvent('keydown', {
                key: 'Tab',
                altKey: true,
                bubbles: true
            });
            jest.spyOn(event, 'preventDefault');

            const result = keyboardBlocker.handleKeyDown(event);

            expect(result).toBe(true);
            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it('should start blocking when kiosk mode is enabled', () => {
            keyboardBlocker.setKioskMode(false);
            keyboardBlocker.setKioskMode(true);
            
            const event = new KeyboardEvent('keydown', {
                key: 'Tab',
                altKey: true,
                bubbles: true
            });
            jest.spyOn(event, 'preventDefault');

            const result = keyboardBlocker.handleKeyDown(event);

            expect(result).toBe(false);
            expect(event.preventDefault).toHaveBeenCalled();
        });

        it('should log when kiosk mode changes', () => {
            keyboardBlocker.setKioskMode(true);
            
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Kiosk mode enabled')
            );
        });
    });

    describe('Event Listener Management', () => {
        it('should attach event listener when initialized', () => {
            const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
            
            keyboardBlocker.initialize();
            
            expect(addEventListenerSpy).toHaveBeenCalledWith(
                'keydown',
                expect.any(Function),
                true
            );
        });

        it('should remove event listener when destroyed', () => {
            const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
            
            keyboardBlocker.initialize();
            keyboardBlocker.destroy();
            
            expect(removeEventListenerSpy).toHaveBeenCalledWith(
                'keydown',
                expect.any(Function),
                true
            );
        });
    });

    describe('Logging', () => {
        it('should log blocked key combinations', () => {
            keyboardBlocker.setKioskMode(true);
            const event = new KeyboardEvent('keydown', {
                key: 'Tab',
                altKey: true,
                bubbles: true
            });

            keyboardBlocker.handleKeyDown(event);

            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Blocked keyboard shortcut'),
                expect.any(Object)
            );
        });

        it('should include key details in log', () => {
            const event = new KeyboardEvent('keydown', {
                key: 'Delete',
                ctrlKey: true,
                altKey: true,
                bubbles: true
            });

            keyboardBlocker.handleKeyDown(event);

            expect(logger.warn).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    key: 'Delete',
                    ctrlKey: true,
                    altKey: true
                })
            );
        });
    });

    describe('Edge Cases', () => {
        it('should handle null events gracefully', () => {
            const result = keyboardBlocker.handleKeyDown(null as any);
            
            expect(result).toBe(true);
        });

        it('should handle events without key property', () => {
            const event = new KeyboardEvent('keydown', {
                bubbles: true
            });
            Object.defineProperty(event, 'key', { value: undefined });

            const result = keyboardBlocker.handleKeyDown(event);
            
            expect(result).toBe(true);
        });

        it('should block multiple modifier combinations in kiosk mode', () => {
            keyboardBlocker.setKioskMode(true);
            const event = new KeyboardEvent('keydown', {
                key: 'e',
                ctrlKey: true,
                shiftKey: true,
                altKey: true,
                bubbles: true
            });
            jest.spyOn(event, 'preventDefault');

            const result = keyboardBlocker.handleKeyDown(event);

            expect(result).toBe(false);
        });
    });
});
