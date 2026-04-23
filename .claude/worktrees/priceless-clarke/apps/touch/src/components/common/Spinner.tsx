import React from 'react';

/**
 * Spinner Component
 * 
 * Loading spinner component for displaying loading states throughout the application.
 * 
 * Features:
 * - Centered layout with padding
 * - Animated spinning indicator
 * - Blue color scheme matching app theme
 * - Responsive and accessible
 * 
 * Usage:
 * ```tsx
 * {loading && <Spinner />}
 * ```
 */
const Spinner: React.FC = React.memo(() => (
  <div className="flex justify-center items-center p-4" role="status" aria-label="Loading">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
));

Spinner.displayName = 'Spinner';

export default Spinner;
