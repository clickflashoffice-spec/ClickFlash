import React, { memo, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
}

export const Input = memo<InputProps>(({
  error = false,
  icon,
  className = '',
  ...props
}) => (
  <div className="relative">
    {icon && (
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
        {icon}
      </div>
    )}
    <input
      className={`
        w-full rounded-lg border bg-white dark:bg-slate-800
        text-slate-900 dark:text-white placeholder-slate-400
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
        disabled:opacity-50 disabled:cursor-not-allowed
        ${error ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'}
        ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2
        ${className}
      `}
      {...props}
    />
  </div>
));

Input.displayName = 'Input';

export default Input;
