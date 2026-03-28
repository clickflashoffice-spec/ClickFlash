import React from 'react';

/**
 * Card Component Props
 */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Card Component
 * 
 * Reusable card container component with consistent styling.
 * 
 * Features:
 * - Light/dark mode support
 * - Consistent padding and border radius
 * - Extends standard HTML div attributes
 * - Customizable via className prop
 * 
 * Usage:
 * ```tsx
 * <Card className="my-custom-class">
 *   <h2>Card Title</h2>
 *   <p>Card content</p>
 * </Card>
 * ```
 */
const Card: React.FC<CardProps> = React.memo(({ children, className = '', ...props }) => {
  return (
    <div
      className={`premium-card ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;