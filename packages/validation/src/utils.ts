import { z } from 'zod';

/**
 * Validate data against a Zod schema, throwing on failure.
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Validation failed: ${issues}`);
  }
  return result.data;
}

/**
 * Validate data against a Zod schema, returning null on failure.
 */
export function validateOrNull<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Validate partial data against a Zod object schema.
 */
export function validatePartial<T extends z.ZodRawShape>(schema: z.ZodObject<T>, data: unknown) {
  const partialSchema = schema.partial();
  const result = partialSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i: z.ZodIssue) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Partial validation failed: ${issues}`);
  }
  return result.data;
}

/**
 * Validate and return a typed result with success/error info.
 */
export function validateSafe<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  };
}

// =============================================================================
// XSS SANITIZATION
// =============================================================================

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

/**
 * Sanitize a string to prevent XSS attacks.
 * Escapes HTML entities and strips dangerous patterns.
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return '';

  // Replace HTML entities
  let sanitized = input.replace(/[&<>"'`/]/g, (char) => HTML_ENTITIES[char] || char);

  // Strip javascript: protocol
  sanitized = sanitized.replace(/javascript\s*:/gi, '');

  // Strip event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  // Strip data: URIs with script types
  sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, '');

  return sanitized;
}

/**
 * Sanitize all string values in an object recursively.
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeHtml(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject) as unknown as T;
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value);
    }
    return result as T;
  }
  return obj;
}

// =============================================================================
// CSRF TOKEN HELPERS
// =============================================================================

/**
 * Generate a CSRF token using crypto.
 */
export function generateCsrfToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Validate that the provided CSRF token matches the expected token.
 */
export function validateCsrfToken(provided: string | undefined, expected: string): boolean {
  if (!provided || !expected) return false;
  // Constant-time comparison to prevent timing attacks
  if (provided.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < provided.length; i++) {
    result |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}
