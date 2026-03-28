import React from 'react';

/**
 * Input Component Props
 */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label text */
  label?: string;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Show required indicator */
  required?: boolean;
  /** Icon to display before input */
  icon?: React.ReactNode;
  /** Icon to display after input */
  iconRight?: React.ReactNode;
  /** Full width input */
  fullWidth?: boolean;
}

/**
 * Input Component
 * 
 * Standardized input component with consistent styling and accessibility.
 * 
 * Features:
 * - Label support
 * - Error and helper text
 * - Icon support (left and right)
 * - Required indicator
 * - Dark mode support
 * - Focus indicators for accessibility
 * - Full width option
 * 
 * Accessibility:
 * - Proper label association
 * - Error announcement
 * - Focus indicators
 * - ARIA attributes
 * 
 * Usage:
 * ```tsx
 * <Input 
 *   label="Email Address" 
 *   type="email" 
 *   required 
 *   error={errors.email}
 *   helperText="We'll never share your email"
 * />
 * 
 * <Input 
 *   label="Search" 
 *   icon={<SearchIcon />}
 *   placeholder="Search..."
 * />
 * ```
 */
const Input: React.FC<InputProps> = React.memo(({
  label,
  error,
  helperText,
  required,
  icon,
  iconRight,
  fullWidth = true,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  const baseInputClasses = "w-full px-4 py-2 text-base bg-white dark:bg-slate-800 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed";
  const stateClasses = error
    ? "border-red-500 focus:border-red-500 focus:ring-red-500 text-red-900 dark:text-red-200 placeholder-red-300 dark:placeholder-red-700"
    : "border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500";
  const iconPadding = icon ? "pl-10" : iconRight ? "pr-10" : "";



  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-label="required">*</span>
          )}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <span className="w-5 h-5" aria-hidden="true">
              {icon}
            </span>
          </div>
        )}
        <input
          id={inputId}
          className={`${baseInputClasses} ${stateClasses} ${iconPadding} ${className}`}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={describedBy}
          aria-required={required ? "true" : "false"}
          {...props}
        />
        {iconRight && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <span className="w-5 h-5" aria-hidden="true">
              {iconRight}
            </span>
          </div>
        )}
      </div>
      {error && (
        <p
          id={errorId}
          className="mt-1.5 text-sm text-red-600 dark:text-red-400"
          role="alert"
          aria-live="polite"
          aria-atomic="true"
        >
          {error}
        </p>
      )}
      {helperText && !error && (
        <p
          id={helperId}
          className="mt-1.5 text-sm text-slate-500 dark:text-slate-400"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

