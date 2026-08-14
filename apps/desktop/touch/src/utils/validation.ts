/**
 * Validation Utilities for Touch Kiosk
 */

/**
 * Validates access code format
 * - 3-50 characters
 * - Alphanumeric, hyphens, and underscores only
 */
export function validateAccessCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const regex = /^[a-zA-Z0-9_-]{3,50}$/;
  return regex.test(code.trim());
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

/**
 * Validates order code format
 * - 6-20 characters
 * - Alphanumeric and hyphens only
 */
export function validateOrderCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const regex = /^[A-Z0-9-]{6,20}$/i;
  return regex.test(code.trim());
}

/**
 * Sanitizes user input
 * - Removes HTML tags
 * - Trims whitespace
 * - Handles null/undefined
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return '';
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim();
}

/**
 * Validates image file extension
 * Supported: jpg, jpeg, png, webp, heic
 */
export function isValidImageFile(filename: string): boolean {
  if (!filename || typeof filename !== 'string') return false;
  
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  
  return validExtensions.includes(ext);
}

/**
 * Validates password strength
 * - At least 8 characters
 * - Contains uppercase, lowercase, and number
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates kiosk ID format
 * - Must start with CF-
 * - Followed by alphanumeric characters
 */
export function validateKioskId(kioskId: string): boolean {
  if (!kioskId || typeof kioskId !== 'string') return false;
  const regex = /^CF-[A-Z0-9]{4,12}$/i;
  return regex.test(kioskId.trim());
}
