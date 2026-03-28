/**
 * Spinner Component Tests
 * 
 * Tests for the Spinner component including:
 * - Rendering
 * - Size variants
 * - Accessibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Spinner from '../../common/Spinner';

describe('Spinner Component', () => {
    it('should render spinner', () => {
        render(<Spinner />);
        const spinner = screen.getByRole('status', { hidden: true });
        expect(spinner).toBeInTheDocument();
    });

    it('should have aria-label for accessibility', () => {
        render(<Spinner />);
        const spinner = screen.getByRole('status', { hidden: true });
        expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should have correct structure', () => {
        const { container } = render(<Spinner />);
        const spinner = container.querySelector('[role="status"]');
        expect(spinner).toBeInTheDocument();
        expect(spinner?.querySelector('.animate-spin')).toBeInTheDocument();
    });
});

