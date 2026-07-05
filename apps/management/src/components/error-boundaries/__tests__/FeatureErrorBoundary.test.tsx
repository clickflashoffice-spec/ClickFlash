/**
 * Feature Error Boundary Tests
 * 
 * Tests for the feature error boundary component.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
    FeatureErrorBoundary,
    AlbumErrorBoundary,
    OrderErrorBoundary,
    DashboardErrorBoundary,
} from '../FeatureErrorBoundary';

// Component that throws an error
const ThrowError: React.FC<{ message?: string }> = ({ message = 'Test error' }) => {
    throw new Error(message);
};

describe('FeatureErrorBoundary', () => {
    // Suppress console.error for expected errors
    const originalConsoleError = console.error;
    beforeAll(() => {
        console.error = jest.fn();
    });

    afterAll(() => {
        console.error = originalConsoleError;
    });

    it('should render children when no error', () => {
        render(
            <FeatureErrorBoundary feature="Test">
                <div data-testid="child">Child content</div>
            </FeatureErrorBoundary>
        );

        expect(screen.getByTestId('child')).toBeInTheDocument();
        expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('should render error UI when error occurs', () => {
        render(
            <FeatureErrorBoundary feature="Test Feature">
                <ThrowError />
            </FeatureErrorBoundary>
        );

        expect(screen.getByText('Test Feature Error')).toBeInTheDocument();
        expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    });

    it('should show correct severity styles for critical errors', () => {
        render(
            <FeatureErrorBoundary feature="Critical Feature" severity="critical">
                <ThrowError message="Critical error" />
            </FeatureErrorBoundary>
        );

        const errorContainer = screen.getByText('Critical Feature Error').closest('div')?.parentElement;
        expect(errorContainer).toHaveClass('border-red-500');
    });

    it('should show correct severity styles for high errors', () => {
        render(
            <FeatureErrorBoundary feature="High Feature" severity="high">
                <ThrowError message="High error" />
            </FeatureErrorBoundary>
        );

        const errorContainer = screen.getByText('High Feature Error').closest('div')?.parentElement;
        expect(errorContainer).toHaveClass('border-orange-500');
    });

    it('should render try again and reload buttons', () => {
        render(
            <FeatureErrorBoundary feature="Test">
                <ThrowError />
            </FeatureErrorBoundary>
        );

        expect(screen.getByText('Try Again')).toBeInTheDocument();
        expect(screen.getByText('Reload App')).toBeInTheDocument();
    });

    it('should call onReset when Try Again is clicked', () => {
        const onReset = jest.fn();
        render(
            <FeatureErrorBoundary feature="Test" onReset={onReset}>
                <ThrowError />
            </FeatureErrorBoundary>
        );

        fireEvent.click(screen.getByText('Try Again'));
        expect(onReset).toHaveBeenCalled();
    });
});

describe('Pre-configured Error Boundaries', () => {
    const originalConsoleError = console.error;
    beforeAll(() => {
        console.error = jest.fn();
    });

    afterAll(() => {
        console.error = originalConsoleError;
    });

    it('AlbumErrorBoundary should render with correct feature name', () => {
        render(
            <AlbumErrorBoundary>
                <ThrowError />
            </AlbumErrorBoundary>
        );

        expect(screen.getByText('Album Management Error')).toBeInTheDocument();
    });

    it('OrderErrorBoundary should render with correct feature name', () => {
        render(
            <OrderErrorBoundary>
                <ThrowError />
            </OrderErrorBoundary>
        );

        expect(screen.getByText('Order Management Error')).toBeInTheDocument();
    });

    it('DashboardErrorBoundary should render with correct feature name', () => {
        render(
            <DashboardErrorBoundary>
                <ThrowError />
            </DashboardErrorBoundary>
        );

        expect(screen.getByText('Dashboard Error')).toBeInTheDocument();
    });
});
