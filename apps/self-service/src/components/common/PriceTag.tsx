import React from 'react';

interface PriceTagProps {
  amount: number;
  currency?: string;
  className?: string;
}

export const PriceTag: React.FC<PriceTagProps> = ({ amount, currency = 'USD', className = '' }) => {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100);

  return (
    <span className={`font-semibold text-brand-accent ${className}`}>
      {formatted}
    </span>
  );
};
