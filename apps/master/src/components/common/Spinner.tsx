import React, { memo } from 'react';

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  color?: 'blue' | 'white' | 'primary';
}

const colorClasses = {
  blue: 'border-blue-500',
  white: 'border-white',
  primary: 'border-slate-200 dark:border-slate-600',
};

const sizeClasses = {
  small: { container: 'p-2', spinner: 'h-4 w-4 border-[2px]' },
  medium: { container: 'p-3', spinner: 'h-6 w-6 border-[2px]' },
  large: { container: 'p-4', spinner: 'h-10 w-10 border-[3px]' },
};

export const Spinner: React.FC<SpinnerProps> = memo(({ 
  size = 'medium', 
  className = '',
  color = 'primary'
}) => {
  const sizeStyle = sizeClasses[size];
  const colorStyle = colorClasses[color];

  return (
    <div className={`flex items-center justify-center ${sizeStyle.container} ${className}`}>
      <div
        className={[
          'animate-spin rounded-full border-t-transparent',
          sizeStyle.spinner,
          colorStyle,
        ].join(' ')}
      />
    </div>
  );
});

Spinner.displayName = 'Spinner';

export default Spinner;
