'use client';

import type React from 'react';
import { memo, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'outline' 
  | 'ghost' 
  | 'danger' 
  | 'glass'
  | 'premium'
  | 'success';

type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-primary text-primary-foreground shadow-lg shadow-primary/30
    hover:bg-primary/90 hover:shadow-primary/40
    active:scale-95
    disabled:bg-primary/50 disabled:shadow-none
  `,
  secondary: `
    bg-secondary text-secondary-foreground shadow-lg shadow-secondary/20
    hover:bg-secondary/90
    active:scale-95
    disabled:bg-secondary/40 disabled:shadow-none
  `,
  outline: `
    border-2 border-border text-foreground bg-transparent
    hover:bg-muted hover:border-primary/30
    active:scale-95
    disabled:border-muted/50 disabled:text-muted-foreground
  `,
  ghost: `
    text-muted-foreground bg-transparent
    hover:bg-muted hover:text-foreground
    active:scale-95
    disabled:text-muted/50
  `,
  danger: `
    bg-danger text-danger-foreground shadow-lg shadow-danger/30
    hover:bg-danger/90
    active:scale-95
    disabled:bg-danger/30
  `,
  glass: `
    glass text-foreground
    hover:bg-white/20 dark:hover:bg-slate-800/30
    active:scale-95
    disabled:opacity-50
  `,
  premium: `
    premium-gradient text-white shadow-xl shadow-accent/40
    hover:brightness-110 hover:shadow-accent/50
    active:scale-95
    border border-white/20
  `,
  success: `
    bg-emerald-600 text-white shadow-lg shadow-emerald-500/30
    hover:bg-emerald-700
    active:scale-95
    disabled:bg-emerald-300
  `
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-medium',
  md: 'px-5 py-2.5 text-sm font-semibold',
  lg: 'px-7 py-3.5 text-base font-bold',
  xl: 'px-10 py-5 text-lg font-black tracking-tight',
  icon: 'p-2.5 aspect-square',
};

export const Button = memo(
  forwardRef<HTMLButtonElement, ButtonProps>(
    (
      {
        className,
        variant = 'primary',
        size = 'md',
        isLoading = false,
        leftIcon,
        rightIcon,
        fullWidth = false,
        disabled,
        children,
        ...props
      },
      ref
    ) => {
      // Enforce mandatory aria-label for icon-only buttons
      if (size === 'icon' && !props['aria-label'] && !props['aria-labelledby']) {
        console.warn('Accessibility Error: Icon-only buttons must provide an `aria-label` for screen readers.');
      }

      const baseStyles = `
        inline-flex items-center justify-center gap-2.5
        rounded-xl min-h-[44px]
        transition-all duration-300 ease-out
        focus:outline-none focus:ring-4 focus:ring-primary/30
        disabled:cursor-not-allowed disabled:opacity-50
      `;

      return (
        <button
          ref={ref}
          className={twMerge(
            clsx(
              baseStyles,
              variantStyles[variant],
              sizeStyles[size],
              fullWidth && 'w-full',
              isLoading && 'opacity-80 cursor-wait',
              className
            )
          )}
          disabled={disabled || isLoading}
          {...props}
        >
          {isLoading ? (
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <>
              {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
              {typeof children === 'string' ? (
                <span className="truncate">{children}</span>
              ) : (
                children
              )}
              {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
            </>
          )}
        </button>
      );
    }
  )
);

Button.displayName = 'Button';

export default Button;