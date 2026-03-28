import React from "react";

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
interface SpinnerProps {
  size?: "sm" | "md" | "lg" | string;
  color?: "white" | "blue" | string;
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = React.memo(
  ({ size, color, className = "" }) => {
    const sizeClass =
      size === "sm" ? "h-4 w-4" : size === "lg" ? "h-16 w-16" : "h-12 w-12";
    const colorClass = color === "white" ? "border-white" : "border-blue-500";

    return (
      <div
        className={`flex justify-center items-center ${size === "sm" ? "" : "p-4"} ${className}`}
        role="status"
        aria-label="Loading"
      >
        <div
          className={`animate-spin rounded-full ${sizeClass} border-b-2 ${colorClass}`}
        ></div>
      </div>
    );
  },
);

Spinner.displayName = "Spinner";

export default Spinner;
