import React, { memo, forwardRef, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  variant?: 'default' | 'glass';
}

export const Input = memo(
  forwardRef<HTMLInputElement, InputProps>(
    (
      {
        label,
        error,
        helperText,
        leftIcon,
        rightIcon,
        fullWidth = true,
        variant = 'default',
        className = '',
        id,
        required,
        ...props
      },
      ref
    ) => {
      const generatedId = useId();
      const inputId = id || generatedId;
      const errorId = error ? `${inputId}-error` : undefined;
      const helperId = helperText ? `${inputId}-helper` : undefined;
      const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

      const variantStyles = {
        default: `
          bg-background text-foreground border-border
          focus:ring-primary/20 focus:border-primary
        `,
        glass: 'glass-input' // Defined in tokens.css or index.css
      };

      return (
        <div className={clsx('flex flex-col gap-1.5', fullWidth ? 'w-full' : 'w-auto')}>
          {label && (
            <label
              htmlFor={inputId}
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground inline-flex items-center gap-1"
            >
              {label}
              {required && <span className="text-danger">*</span>}
            </label>
          )}
          
          <div className="relative group">
            {leftIcon && (
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                <span className="w-5 h-5">{leftIcon}</span>
              </div>
            )}
            
            <input
              ref={ref}
              id={inputId}
              className={twMerge(
                clsx(
                  'w-full px-4 py-3 rounded-xl border transition-all duration-300',
                  'focus:outline-none focus:ring-4 placeholder:text-muted-foreground/50',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  variantStyles[variant],
                  leftIcon && 'pl-11',
                  rightIcon && 'pr-11',
                  error ? 'border-danger focus:ring-danger/20' : 'border-border/60 shadow-sm',
                  className
                )
              )}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={describedBy}
              {...props}
            />

            {rightIcon && (
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                <span className="w-5 h-5">{rightIcon}</span>
              </div>
            )}
          </div>

          {error ? (
            <p id={errorId} className="text-xs font-medium text-danger animate-fadeIn">
              {error}
            </p>
          ) : helperText ? (
            <p id={helperId} className="text-xs text-muted-foreground">
              {helperText}
            </p>
          ) : null}
        </div>
      );
    }
  )
);

Input.displayName = 'Input';

export default Input;
