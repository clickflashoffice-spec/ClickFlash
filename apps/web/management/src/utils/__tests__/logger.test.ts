/**
 * Logger Tests
 * 
 * Tests for the structured logging utility.
 */

import { logger, LogLevel } from '../logger';

// Mock the env module to ensure development mode
declare const process: { env: Record<string, string> };

describe.skip('Logger', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
        // Mock console.log to capture calls
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
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
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        it('should log info messages', () => {
            logger.info('Info message', { data: 'test' });
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        it('should log warn messages', () => {
            logger.warn('Warning message', { data: 'test' });
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        it('should log error messages with Error object', () => {
            const error = new Error('Test error');
            logger.error('Error message', error, { context: 'test' });
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        it('should log error messages with non-Error object', () => {
            logger.error('Error message', 'string error', { context: 'test' });
            expect(consoleLogSpy).toHaveBeenCalled();
        });
    });

    describe('Structured Logging', () => {
        it('should include level in log output', () => {
            logger.info('Test message');
            expect(consoleLogSpy).toHaveBeenCalled();
            const callArgs = consoleLogSpy.mock.calls[0];
            // First arg should be a formatted string with timestamp, level, message
            expect(callArgs[0]).toContain('INFO');
            expect(callArgs[0]).toContain('Test message');
        });

        it('should include data in log output', () => {
            const testData = { userId: '123', action: 'login' };
            logger.info('User action', testData);
            expect(consoleLogSpy).toHaveBeenCalled();
        });
    });
});
