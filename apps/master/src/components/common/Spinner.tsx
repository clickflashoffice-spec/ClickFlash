import React from 'react';
import { clsx, type ClassValue } from 'clsx';

/**
 * Spinner Component Props
 */
interface SpinnerProps {
  /** Size variant: 'small', 'medium', or 'large' */
  size?: 'small' | 'medium' | 'large';
  /** Optional CSS class names */
  className?: string;
}

/**
 * Spinner Component
 * 
 * Loading spinner component for displaying loading states throughout the application.
 * 
 * Features:
 * - Centered layout with padding
 * - Animated spinning indicator
 * - Blue color scheme matching app theme (customizable via className)
 * - Responsive and accessible
 * - Size variants (small, medium, large)
 * 
 * Usage:
 * ```tsx
 * {loading && <Spinner />}
 * {loading && <Spinner size="small" />}
 * {loading && <Spinner size="small" className="border-white" />}
 * ```
 */
const Spinner: React.FC<SpinnerProps> = React.memo(({ size = 'medium', className }) => {
  const sizeClasses = {
    small: { container: 'p-2', spinner: 'h-6 w-6 border-b-2' },
    medium: { container: 'p-3', spinner: 'h-8 w-8 border-b-2' },
    large: { container: 'p-4', spinner: 'h-12 w-12 border-b-2' }
  };

  const classes = sizeClasses[size];

  return (
    <div className={clsx('flex justify-center items-center', classes.container)} role="status" aria-label="Loading">
      <div className={clsx('animate-spin rounded-full border-blue-500', classes.spinner, className)}></div>
    </div>
  );
});

Spinner.displayName = 'Spinner';

export default Spinner;
