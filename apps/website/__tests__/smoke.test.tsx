import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Simple smoke test to verify Vitest/React 19 integration
describe('Website Smoke Test', () => {
    it('should verify that true is true', () => {
        expect(true).toBe(true);
    });

    it('renders a basic component', () => {
        render(<div data-testid="test">Hello ClickFlash</div>);
        expect(screen.getByTestId('test')).toBeDefined();
        expect(screen.getByText('Hello ClickFlash')).toBeDefined();
    });
});
