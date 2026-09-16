// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CheckoutScreen from '../CheckoutScreen';
import React from 'react';

// Mock contexts
vi.mock('../../CurrencyContext', () => ({
  useCurrency: () => ({
    currency: 'USD',
    rate: 1,
    symbol: '$',
    formatCurrency: (price: number) => `$${price.toFixed(2)}`
  })
}));

// Mock services
vi.mock('../../../services/orderService', () => ({
  orderService: {
    createOrder: vi.fn().mockResolvedValue({ id: 'order_123' })
  }
}));

vi.mock('../../../services/OfflineSyncQueue', () => ({
  offlineSyncQueue: {
    enqueueOperation: vi.fn().mockResolvedValue(undefined),
    isOnline: true,
  }
}));

// Mock sub-components
vi.mock('../ThankYouScreen', () => ({
  default: ({ onComplete }: any) => <div data-testid="thank-you-screen"><button onClick={onComplete}>Complete</button></div>
}));

vi.mock('../OnScreenKeyboard', () => ({
  default: ({ onInput }: any) => <div data-testid="keyboard"><button onClick={() => onInput('test@example.com')}>Type Email</button></div>
}));

describe('CheckoutScreen', () => {
  const mockOnBack = vi.fn();
  const mockOnCheckoutSuccess = vi.fn();
  const mockCart = [
    { id: '1', photo: { title: 'Digital Download' }, size: '8x10', price: 10, quantity: 1 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cart summary correctly', () => {
    render(
      <CheckoutScreen 
        cart={mockCart as any}
        total={10} 
        appliedDiscount={0}
        onBack={mockOnBack}
        onCheckoutSuccess={mockOnCheckoutSuccess}
      />
    );
    expect(screen.getByText(/Digital Download/)).toBeDefined();
    expect(screen.getAllByText(/\$10\.00/)[0]).toBeDefined();
  });

  it('calls onBack when back button is clicked', () => {
    render(
      <CheckoutScreen 
        cart={mockCart as any}
        total={10} 
        appliedDiscount={0}
        onBack={mockOnBack}
        onCheckoutSuccess={mockOnCheckoutSuccess}
      />
    );
    
    // Use regex to find Back or Cancel
    const backBtn = screen.getAllByText(/Back|Cancel/i)[0];
    fireEvent.click(backBtn);
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });
});
