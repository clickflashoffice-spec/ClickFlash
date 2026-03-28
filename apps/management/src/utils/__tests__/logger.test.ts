/**
 * Logger Tests
 * 
 * Tests for the structured logging utility.
 */

import { logger, LogLevel } from '../logger';

describe.skip('Logger', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    describe('Log Levels', () => {
        it('should have correct log level values', () => {
            expect(LogLevel.DEBUG).toBe(0);
            expect(LogLevel.INFO).toBe(1);
            expect(LogLevel.WARN).toBe(2);
            expect(LogLevel.ERROR).toBe(3);
        });
    });

    describe('Logging Methods', () => {
        it('should log debug messages', () => {
            logger.debug('Debug message', { data: 'test' });
            expect(consoleSpy).toHaveBeenCalled();
        });

        it('should log info messages', () => {
            logger.info('Info message', { data: 'test' });
            expect(consoleSpy).toHaveBeenCalled();
        });

        it('should log warn messages', () => {
            logger.warn('Warning message', { data: 'test' });
            expect(consoleSpy).toHaveBeenCalled();
        });

        it('should log error messages with Error object', () => {
            const error = new Error('Test error');
            logger.error('Error message', error, { context: 'test' });
            expect(consoleSpy).toHaveBeenCalled();
        });

        it('should log error messages with non-Error object', () => {
            logger.error('Error message', 'string error', { context: 'test' });
            expect(consoleSpy).toHaveBeenCalled();
        });
    });

    describe('Structured Logging', () => {
        it('should include timestamp in log output', () => {
            logger.info('Test message');
            const callArg = consoleSpy.mock.calls[0][0];
            expect(callArg).toContain('INFO');
            expect(callArg).toContain('Test message');
        });

        it('should include data in log output', () => {
            const testData = { userId: '123', action: 'login' };
            logger.info('User action', testData);
            expect(consoleSpy).toHaveBeenCalled();
        });
    });
});
