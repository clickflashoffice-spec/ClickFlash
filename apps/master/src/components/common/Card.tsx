import { memo, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantClasses = {
  default: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
  outlined: 'bg-transparent border border-slate-300 dark:border-slate-600',
  elevated: 'bg-white dark:bg-slate-800 shadow-lg border-0',
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card = memo<CardProps>(({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...props
}) => (
  <div
    className={`rounded-xl ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
    {...props}
  >
    {children}
  </div>
));

Card.displayName = 'Card';

export default Card;
