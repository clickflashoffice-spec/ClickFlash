import React from 'react';

/**
 * FormField Component Props
 */
interface FormFieldProps {
  /** Label text */
  label: string;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Show required indicator */
  required?: boolean;
  /** Field content (input, select, textarea, etc.) */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * FormField Component
 * 
 * Wrapper component for form fields with consistent label, error, and helper text styling.
 * 
 * Features:
 * - Consistent label styling
 * - Error message display
 * - Helper text support
 * - Required indicator
 * - Dark mode support
 * - Accessibility support
 * 
 * Usage:
 * ```tsx
 * <FormField label="Email" required error={errors.email}>
 *   <Input type="email" />
 * </FormField>
 * 
 * <FormField label="Description" helperText="Optional field">
 *   <textarea />
 * </FormField>
 * ```
 */
const FormField: React.FC<FormFieldProps> = React.memo(({
  label,
  error,
  helperText,
  required,
  children,
  className = ''
}) => {
  const fieldId = `field-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${fieldId}-error` : undefined;
  const helperId = helperText ? `${fieldId}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  // Clone children to add id and aria attributes
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      const childElement = child as React.ReactElement<any>;
      return React.cloneElement(childElement, {
        id: childElement.props.id || fieldId,
        'aria-invalid': error ? 'true' : 'false',
        'aria-describedby': describedBy,
        'aria-required': required,
        ...childElement.props
      } as any);
    }
    return child;
  });

  return (
    <div className={`mb-4 ${className}`}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">*</span>
        )}
      </label>
      {childrenWithProps}
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

FormField.displayName = 'FormField';

export default FormField;

