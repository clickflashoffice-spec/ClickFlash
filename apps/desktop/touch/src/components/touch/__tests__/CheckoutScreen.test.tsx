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
    formatPrice: (price: number) => `$${price.toFixed(2)}`
  })
}));

// Mock services
vi.mock('../../../services/orderService', () => ({
  orderService: {
    createOrder: vi.fn().mockResolvedValue({ id: 'order_123' })
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
    { id: '1', name: 'Digital Download', price: 10, quantity: 1 }
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
    expect(screen.getByText('Digital Download')).toBeDefined();
    expect(screen.getByText('$10.00')).toBeDefined();
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
    const backBtn = screen.getByText(/Back|Cancel/i);
    fireEvent.click(backBtn);
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });
});
