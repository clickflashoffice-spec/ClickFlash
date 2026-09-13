import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FaceSearchModal from '../FaceSearchModal';
import React from 'react';

// Mock UI components
vi.mock('@clickflash/ui', () => ({
  Modal: ({ children, isOpen, onClose, title }: any) => isOpen ? (
    <div data-testid="modal">
      <h2>{title}</h2>
      <button onClick={onClose} data-testid="modal-close">Close</button>
      {children}
    </div>
  ) : null,
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('FaceSearchModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when closed', () => {
    render(<FaceSearchModal isOpen={false} onClose={mockOnClose} onSearch={mockOnSearch} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('renders consent screen when first opened', () => {
    render(<FaceSearchModal isOpen={true} onClose={mockOnClose} onSearch={mockOnSearch} />);
    expect(screen.getByTestId('modal')).toBeDefined();
    // Consent screen buttons
    expect(screen.getByText(/I Agree/i)).toBeDefined();
    expect(screen.getByText(/Cancel/i)).toBeDefined();
  });

  it('calls onClose when cancel is clicked on consent screen', () => {
    render(<FaceSearchModal isOpen={true} onClose={mockOnClose} onSearch={mockOnSearch} />);
    fireEvent.click(screen.getByText(/Cancel/i));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('proceeds to camera or mock when consent is agreed', () => {
    render(<FaceSearchModal isOpen={true} onClose={mockOnClose} onSearch={mockOnSearch} />);
    fireEvent.click(screen.getByText(/I Agree/i));
    expect(screen.getByTestId('modal')).toBeDefined();
  });
});
