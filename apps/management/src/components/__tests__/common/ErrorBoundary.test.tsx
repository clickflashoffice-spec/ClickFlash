/**
 * ErrorBoundary Component Tests
 * 
 * Tests for the ErrorBoundary component including:
 * - Error catching
 * - Fallback UI rendering
 * - Error reporting
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../../common/ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
        throw new Error('Test error');
    }
    return <div>No error</div>;
};

describe('ErrorBoundary Component', () => {
    beforeEach(() => {
        // Suppress console.error for error boundary tests
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should render children when there is no error', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={false} />
            </ErrorBoundary>
        );
        
        expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should render fallback UI when there is an error', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );
        
        expect(screen.getByText(/system encountered an error/i)).toBeInTheDocument();
    });

    it('should display error message in fallback UI', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );
        
        expect(screen.getByText(/test error/i)).toBeInTheDocument();
    });

    it('should have restart button in fallback UI', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );
        
        const restartButton = screen.getByRole('button', { name: /restart system/i });
        expect(restartButton).toBeInTheDocument();
    });
});

