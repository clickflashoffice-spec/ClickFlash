import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeStorage } from '../safeStorage';
import { logger } from '../logger';
import { db } from '../../services/db';

vi.mock('../logger', () => ({
    logger: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn()
    }
}));

vi.mock('../../services/db', () => ({
    db: {
        files: {
            put: vi.fn()
        }
    }
}));

describe('safeStorage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock localStorage
        const storageMock = (() => {
            let store: Record<string, string> = {};
            return {
                getItem: vi.fn((key: string) => store[key] || null),
                setItem: vi.fn((key: string, value: string) => {
                    if (key === 'throw') {
                        throw new Error('Storage error');
                    }
                    if (key === 'quota') {
                        const err = new Error('Quota exceeded');
                        err.name = 'QuotaExceededError';
                        throw err;
                    }
                    store[key] = value.toString();
                }),
                removeItem: vi.fn((key: string) => {
                    delete store[key];
                }),
                clear: vi.fn(() => {
                    store = {};
                })
            };
        })();

        Object.defineProperty(window, 'localStorage', {
            value: storageMock,
            writable: true
        });
    });

    it('gets item successfully', () => {
        window.localStorage.getItem = vi.fn().mockReturnValue('test-value');
        expect(safeStorage.getItem('test-key')).toBe('test-value');
        expect(window.localStorage.getItem).toHaveBeenCalledWith('test-key');
    });

    it('handles getItem error', () => {
        window.localStorage.getItem = vi.fn().mockImplementation(() => { throw new Error('error'); });
        expect(safeStorage.getItem('test-key')).toBeNull();
        expect(logger.warn).toHaveBeenCalled();
    });

    it('sets item successfully', async () => {
        await safeStorage.setItem('key1', 'val1');
        expect(window.localStorage.setItem).toHaveBeenCalledWith('key1', 'val1');
    });

    it('handles general setItem error', async () => {
        await safeStorage.setItem('throw', 'val');
        expect(logger.warn).toHaveBeenCalled();
    });

    it('handles QuotaExceededError and falls back to IndexedDB', async () => {
        await safeStorage.setItem('quota', 'val');
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Quota Exceeded'));
        expect(db.files.put).toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('IndexedDB'));
    });

    it('removes item successfully', () => {
        safeStorage.removeItem('key1');
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('key1');
    });

    it('clears storage successfully', () => {
        safeStorage.clear();
        expect(window.localStorage.clear).toHaveBeenCalled();
    });
});
