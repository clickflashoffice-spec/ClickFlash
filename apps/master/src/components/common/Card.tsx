import { memo, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantClasses = {
  default: 'bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl',
  outlined: 'bg-transparent border border-white/10',
  elevated: 'bg-white/10 backdrop-blur-2xl shadow-2xl border border-white/20',
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
