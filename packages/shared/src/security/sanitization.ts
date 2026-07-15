import { z } from 'zod';

/**
 * Common Zod primitives with strict sanitization logic.
 */

// Email sanitization
export const emailSchema = z.string()
  .trim()
  .toLowerCase()
  .email('Invalid email address format');

// String sanitization (basic XSS prevention/trimming)
export const sanitizedStringSchema = z.string()
  .trim()
  .min(1)
  .transform((str) => str.replace(/[<>]/g, '')); // Strip < and > tags

// Password requirements
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(64, 'Password must not exceed 64 characters');

// Identifier (UUID/CUID)
export const idSchema = z.string().trim().min(1);

// Kiosk ID or Hardware ID sanitization
export const hardwareIdSchema = z.string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]+$/, 'Hardware ID contains invalid characters');

// Phone number (basic E.164-ish validation)
export const phoneSchema = z.string()
  .trim()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

// URL sanitization (must be HTTP/HTTPS)
export const urlSchema = z.string()
  .trim()
  .url()
  .refine(url => url.startsWith('http://') || url.startsWith('https://'), {
    message: 'URL must use HTTP or HTTPS protocol'
  });

// Date sanitization (ISO string)
export const dateSchema = z.string()
  .datetime({ offset: true })
  .or(z.date().transform(d => d.toISOString()));

// Pagination schema (safeguards against huge queries)
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
