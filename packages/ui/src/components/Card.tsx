import type React from 'react';
import { memo } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'outline' | 'ghost';
  noPadding?: boolean;
}

export const Card = memo(({ 
  children, 
  className = '', 
  variant = 'default',
  noPadding = false,
  ...props 
}: CardProps) => {
  const variants = {
    default: 'bg-card text-card-foreground shadow-xl border border-border/50',
    glass: 'glass-card', // Using the established glass-card from index.css or new tokens
    outline: 'bg-transparent border-2 border-border',
    ghost: 'bg-transparent border-none'
  };

  return (
    <div
      className={twMerge(
        clsx(
          'rounded-2xl transition-all duration-500 ease-in-out',
          !noPadding && 'p-4 sm:p-5 md:p-6',
          variants[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
