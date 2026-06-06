/**
 * Modal Component Tests
 * 
 * Tests for the Modal component including:
 * - Rendering when open/closed
 * - Close functionality
 * - Keyboard navigation (Escape key)
 * - Focus management
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Modal from '../../common/Modal';

describe('Modal Component', () => {
    const mockOnClose = jest.fn();

    beforeEach(() => {
        mockOnClose.mockClear();
    });

    it('should not render when isOpen is false', () => {
        render(
            <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
                <div>Modal Content</div>
            </Modal>
        );
        
        expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
        render(
            <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
                <div>Modal Content</div>
            </Modal>
        );
        
        expect(screen.getByText('Test Modal')).toBeInTheDocument();
        expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
        render(
            <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
                <div>Modal Content</div>
            </Modal>
        );
        
        const closeButton = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeButton);
        
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key is pressed', () => {
        render(
            <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
                <div>Modal Content</div>
            </Modal>
        );
        
        fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
        
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', () => {
        render(
            <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
                <div>Modal Content</div>
            </Modal>
        );
        
        const backdrop = screen.getByRole('dialog');
        if (backdrop) {
            fireEvent.click(backdrop);
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        }
    });

    it('should have proper ARIA attributes', () => {
        render(
            <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
                <div>Modal Content</div>
            </Modal>
        );
        
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-labelledby');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should render with different sizes', () => {
        const { rerender } = render(
            <Modal isOpen={true} onClose={mockOnClose} title="Test Modal" size="sm">
                <div>Small Modal</div>
            </Modal>
        );
        
        expect(screen.getByText('Small Modal')).toBeInTheDocument();
        
        rerender(
            <Modal isOpen={true} onClose={mockOnClose} title="Test Modal" size="xl">
                <div>Extra Large Modal</div>
            </Modal>
        );
        
        expect(screen.getByText('Extra Large Modal')).toBeInTheDocument();
    });
});

