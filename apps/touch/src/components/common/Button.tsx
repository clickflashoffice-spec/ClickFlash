import React from 'react';

/**
 * Button Component Props
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant style */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Show loading state */
  loading?: boolean;
  /** Icon to display before text */
  icon?: React.ReactNode;
  /** Icon to display after text */
  iconRight?: React.ReactNode;
  /** Full width button */
  fullWidth?: boolean;
  /** Children content */
  children: React.ReactNode;
}

/**
 * Button Component
 * 
 * Standardized button component with consistent styling and accessibility.
 * Optimized for touch interactions with minimum 44x44px touch targets.
 * 
 * Features:
 * - Multiple variants (primary, secondary, danger, ghost, success)
 * - Multiple sizes (sm, md, lg) - all meet 44x44px minimum for touch
 * - Loading state
 * - Icon support
 * - Full width option
 * - Dark mode support
 * - Focus indicators for accessibility
 * - Touch-optimized sizing
 * 
 * Accessibility:
 * - Proper focus indicators
 * - Keyboard navigation support
 * - ARIA attributes when loading
 * - Minimum touch target size (44x44px)
 * 
 * Usage:
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click Me
 * </Button>
 * ```
 */
const Button: React.FC<ButtonProps> = React.memo(({ 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...props 
}) => {
  const baseClasses = "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation";
  
  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white focus:ring-blue-500 shadow-sm hover:shadow-md",
    secondary: "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white focus:ring-slate-500 shadow-sm hover:shadow-md",
    danger: "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white focus:ring-red-500 shadow-sm hover:shadow-md",
    ghost: "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-slate-500",
    success: "bg-green-600 hover:bg-green-700 active:bg-green-800 text-white focus:ring-green-500 shadow-sm hover:shadow-md"
  };
  
  // Touch-optimized sizes - all meet 44x44px minimum
  const sizeClasses = {
    sm: "px-4 py-2.5 text-sm gap-1.5 min-w-[44px] min-h-[44px]",
    md: "px-6 py-3 text-base gap-2 min-w-[44px] min-h-[44px]",
    lg: "px-8 py-4 text-lg gap-2 min-w-[44px] min-h-[44px]"
  };

  const iconSizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-7 h-7"
  };
  
  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg 
          className={`animate-spin ${iconSizeClasses[size]}`} 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!loading && icon && (
        <span className={iconSizeClasses[size]} aria-hidden="true">
          {icon}
        </span>
      )}
      {children && <span>{children}</span>}
      {!loading && iconRight && (
        <span className={iconSizeClasses[size]} aria-hidden="true">
          {iconRight}
        </span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;

